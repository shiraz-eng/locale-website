import hashlib
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, Request
from argon2 import PasswordHasher
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from db import database, Session
from models import LoginSession, RateBucket, User

hasher = PasswordHasher()
dummy_hash = hasher.hash(secrets.token_urlsafe(32))
secure = os.getenv("COOKIE_SECURE", "true").lower() == "true"
cookie = "__Host-atelier" if secure else "atelier"
origin = os.getenv("PUBLIC_ORIGIN", "http://localhost:3000").rstrip("/")

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

allowed_origins={origin,*[value.strip().rstrip("/") for value in os.getenv("PUBLIC_ORIGINS", "").split(",") if value.strip()]}

def same_origin(request: Request):
    if request.headers.get("origin") not in allowed_origins:
        raise HTTPException(403, "Request origin is not allowed.")

def limit(request: Request, scope: str, maximum: int, seconds: int):
    # Trust only the address resolved by Uvicorn's configured proxy policy.
    address = request.client.host if request.client else "unknown"
    count(f"{scope}:{digest(address)}", maximum, seconds)

def quota(scope: str, maximum: int, seconds: int):
    # Shared by every visitor, so it bounds total spend even if per-client limits are evaded.
    count("quota:" + scope, maximum, seconds)

def count(prefix: str, maximum: int, seconds: int):
    now = int(time.time())
    expires = (now // seconds + 1) * seconds
    key = f"{prefix}:{expires}"
    with Session.begin() as db:
        db.execute(delete(RateBucket).where(RateBucket.expires <= now))
        statement = insert(RateBucket).values(key=key, hits=1, expires=expires)
        hits = db.execute(statement.on_conflict_do_update(
            index_elements=[RateBucket.key], set_={"hits": RateBucket.hits + 1}
        ).returning(RateBucket.hits)).scalar_one()
    if hits > maximum:
        raise HTTPException(429, "Too many requests. Please try again later.",
                            headers={"Retry-After": str(expires - now)})

def new_session(db, user, response):
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    db.execute(delete(LoginSession).where(LoginSession.expires <= now))
    db.add(LoginSession(digest=digest(token), email=user.email, expires=now + timedelta(hours=8)))
    db.commit()
    response.set_cookie(cookie, token, max_age=28800, httponly=True, secure=secure, samesite="lax", path="/")

BUSINESS = {"leads", "consultations", "pipeline", "ai_data"}
WEBSITE = {"content", "media", "seo", "pages"}
MANAGEMENT = {"insights", "settings", "ai_config", "content_delete", "inquiry_delete"}
PERMISSIONS = {
    "owner": {"dashboard", "analytics", "team", "audit", *BUSINESS, *WEBSITE, *MANAGEMENT},
    "admin": {"dashboard", "analytics", *BUSINESS, *WEBSITE, *MANAGEMENT},
    "editor": {"dashboard", "analytics", *WEBSITE},
    "sales": {"dashboard", "analytics", *BUSINESS},
}

def staff(request: Request, db=Depends(database)):
    token = request.cookies.get(cookie)
    if not token:
        raise HTTPException(401, "Sign in to continue.")
    user = db.scalar(select(User).join(LoginSession, LoginSession.email == User.email).where(
        LoginSession.digest == digest(token), LoginSession.expires > datetime.now(timezone.utc)))
    if not user:
        raise HTTPException(401, "Your session has expired.")
    if user.role not in PERMISSIONS or not user.active:
        raise HTTPException(403, "Staff access required.")
    db.commit()
    return user

def can(user, permission):
    return permission in PERMISSIONS.get(user.role, ())

def require(permission: str):
    def check(user=Depends(staff)):
        if not can(user, permission):
            raise HTTPException(403, "You do not have permission for this action.")
        return user
    return check
