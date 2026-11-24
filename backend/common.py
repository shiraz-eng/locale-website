import os
from pathlib import Path
from fastapi import HTTPException
from sqlalchemy import func, select
from models import AuditLog, Content, ConversionEvent, LeadActivity
import schemas as s

media = Path(os.getenv("UPLOAD_DIR", "uploads"))
media.mkdir(parents=True, exist_ok=True)
AI_RATE = int(os.getenv("AI_RATE_LIMIT", "120"))
AI_DAILY = int(os.getenv("AI_DAILY_LIMIT", "1000"))
# Services and projects have their own tables and editors; /api/content/{services,projects} are read-only adapters.
kinds = {"blog": s.Article, "team": s.Member, "settings": s.Settings}

def kind_schema(kind):
    if kind not in kinds:
        raise HTTPException(404, "Collection not found.")
    return kinds[kind]

def serialize(row):
    return {"slug": row.slug, **row.data}

def collection(kind):
    kind_schema(kind)
    return select(Content).where(Content.kind == kind)

def public_query(kind):
    query = collection(kind)
    if kind == "blog":
        return query.where(Content.data["published"].as_boolean().is_(True))
    if kind == "team":
        # Records created before drafts existed have no flag and stay public.
        return query.where(func.coalesce(Content.data["published"].as_boolean(), True).is_(True))
    return query

def track(db, name, label="", path="", project=None, service=None):
    db.add(ConversionEvent(name=name, label=label[:60], path=path[:300], project=project, service=service))
    db.commit()

def audit(db, user, action, entity, entity_id="", detail=None):
    db.add(AuditLog(actor=user.email if hasattr(user, "email") else str(user), action=action, entity=entity,
                    entity_id=str(entity_id)[:160], detail=detail or {}))

def activity(db, inquiry_id, kind, author, **detail):
    db.add(LeadActivity(inquiry_id=inquiry_id, kind=kind, author=author, detail=detail))

def group(db, query):
    return {str(key): count for key, count in db.execute(query) if key is not None}

def percent(part, whole):
    return round(part * 100 / whole, 1) if whole else 0

def source_of(attribution):
    attribution = attribution or {}
    return attribution.get("utm_source") or attribution.get("referrer") or "Direct"

def config(db, slug, schema):
    row = db.get(Content, ("config", slug))
    return schema.model_validate(row.data if row else {})
