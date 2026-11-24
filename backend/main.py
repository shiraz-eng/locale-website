import json
import re
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, UploadFile
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError
from starlette.responses import JSONResponse
import logging
from sqlalchemy import delete, func, select, or_, text
from argon2.exceptions import VerificationError
from google.genai import types
from db import database
from models import Consultation, Content, Inquiry, LoginSession, User
import schemas as s
import ai
import architecture_knowledge
import forms
import page_content
import navigation
import inquiries
import cms
import crm
import services as service_store
import projects as project_store
from project_templates import LEGACY_CATEGORIES
from common import AI_DAILY, AI_RATE, activity, config, media, public_query, serialize, track
from security import PERMISSIONS, same_origin, limit, quota, hasher, dummy_hash, new_session, cookie, secure, digest

from request_limits import RequestLimits

app = FastAPI(title="Atelier Arc API")
app.add_middleware(RequestLimits)
import media_storage
@app.get("/media/{filename}")
def image_file(filename: str, db=Depends(database)):
    return media_storage.response(db,filename)
app.include_router(forms.router)
app.include_router(page_content.router)
app.include_router(navigation.router)
app.include_router(inquiries.router)
app.include_router(crm.router)
app.include_router(cms.router)
app.include_router(service_store.router)
app.include_router(project_store.router)

@app.middleware("http")
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response

@app.exception_handler(SQLAlchemyError)
async def database_unavailable(request, error):
    # Classify connection failures without logging credentials, connection URLs, or SQL values.
    detail=str(getattr(error,"orig",error)).lower()
    reason=next((label for label in ["timeout","password authentication failed","max clients","too many clients","tenant or user not found","ssl","connection refused","could not translate","server closed"] if label in detail),"database operation")
    logging.getLogger("uvicorn.error").error("Database request failed: %s (%s)", type(error).__name__,reason)
    return JSONResponse({"detail": "The service is temporarily unavailable. Please try again shortly."},
                        status_code=503, headers={"Retry-After": "10", "Cache-Control": "no-store"})

@app.get("/api/health")
def health(db=Depends(database)):
    db.execute(text("SELECT 1"))
    return {"ok": True}

# Older shape still used by the homepage cards, sitemap and about page.
LEGACY_ICONS = {"house": "building", "building-2": "building", "sofa": "armchair", "drafting-compass": "messages"}

def legacy_service(item):
    return {"slug": item["slug"], "title": item["name"], "description": item["short_description"],
            "icon": LEGACY_ICONS.get(item["icon"], item["icon"]), "image": item["card_image"], "benefits": []}

@app.get("/api/content/{kind}")
def listing(kind: str, q: str = Query("", max_length=160), category: str = Query("", max_length=40),
            featured: bool = False, page: int = Query(1, ge=1, le=10000),
            size: int = Query(12, ge=1, le=100), db=Depends(database)):
    if kind == "services":
        items = [legacy_service(item) for item in service_store.published_services(db)]
        return {"items": items[(page - 1) * size:page * size], "total": len(items)}
    if kind == "projects":
        items = project_store.legacy_cards(db, featured, category, q)
        return {"items": items[(page - 1) * size:page * size], "total": len(items)}
    query = public_query(kind)
    if q:
        query = query.where(or_(*[Content.data[key].as_string().icontains(q, autoescape=True)
                                  for key in ("title", "description", "location")]))
    if category:
        query = query.where(Content.data["category"].as_string() == category)
    if featured:
        query = query.where(Content.data["featured"].as_boolean().is_(True))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    ordering = [Content.data["order"].as_integer(), Content.slug] if kind == "team" else [Content.slug]
    rows = db.scalars(query.order_by(*ordering).offset((page - 1) * size).limit(size))
    return {"items": [serialize(row) for row in rows], "total": total}

@app.get("/api/content/{kind}/{slug}")
def detail(kind: str, slug: s.Slug, db=Depends(database)):
    if kind == "services":
        match = next((item for item in service_store.published_services(db) if item["slug"] == slug), None)
        if not match:
            raise HTTPException(404, "Content not found.")
        return legacy_service(match)
    if kind == "projects":
        match = next((item for item in project_store.legacy_cards(db) if item["slug"] == slug), None)
        if not match:
            raise HTTPException(404, "Content not found.")
        return match
    row = db.scalar(public_query(kind).where(Content.slug == slug))
    if not row:
        raise HTTPException(404, "Content not found.")
    return serialize(row)

REQUEST_EVENTS = {"consultation": "consultation_request", "quotation": "quotation_request", "brief": "brief_submit"}

@app.post("/api/inquiries", status_code=201, dependencies=[Depends(same_origin)])
def create_inquiry(body: s.InquiryInput, request: Request, db=Depends(database)):
    limit(request, "inquiry", 30, 600)
    if body.website:
        raise HTTPException(422, "Please review the form and try again.")
    if body.submission_id:
        import hashlib
        lock = int.from_bytes(hashlib.sha256(str(body.submission_id).encode()).digest()[:8], "big", signed=True)
        db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock})
        prior = db.scalar(select(Inquiry.id).where(Inquiry.data["submission_id"].as_string() == str(body.submission_id)))
        if prior:
            return {"ok": True}
    snapshot = None
    answers = {}
    if body.form_id == "contact" or body.brief is None:
        snapshot = forms.published(db)
        if body.form_version != forms.version(snapshot):
            raise HTTPException(409, "The form has changed. Reload the page and submit again.")
        if body.kind not in {option["value"] for option in snapshot["request_options"]}:
            raise HTTPException(422,"Choose an available request type.")
        answers = forms.validate_answers(snapshot, body.answers)
        for key, value in answers.items():
            if key in forms.BUILTIN:
                setattr(body, key, value)
    data = body.model_dump(mode="json", exclude={"attribution", "brief", "conversation", "preferred_time", "website"})
    if snapshot:
        data.update(form_definition=snapshot, answers=answers)
    data["consultation"] = body.consultation or body.kind == "consultation"
    row = Inquiry(data=data, status="New", kind=body.kind, attribution=body.attribution.model_dump(),
                  brief=body.brief.model_dump() if body.brief else None,
                  conversation=[message.model_dump() for message in body.conversation] or None)
    db.add(row)
    db.flush()
    activity(db, row.id, "status", "website", previous=None, status=row.status or "New Inquiry")
    if body.kind == "consultation":
        db.add(Consultation(inquiry_id=row.id, status="Pending", preferred_time=body.preferred_time))
    source = body.attribution
    track(db, REQUEST_EVENTS.get(body.kind, "inquiry_submit"), body.kind, source.page, source.project, source.service)
    return {"ok": True}

@app.post("/api/events", status_code=204, dependencies=[Depends(same_origin)])
def event(body: s.Event, request: Request, db=Depends(database)):
    limit(request, "event", 600, 600)
    track(db, **body.model_dump())
    return Response(status_code=204)

@app.post("/api/admin/login", dependencies=[Depends(same_origin)])
def login(body: s.Credentials, request: Request, response: Response, db=Depends(database)):
    limit(request, "login", 10, 900)
    user = db.get(User, body.email.lower())
    try:
        valid = hasher.verify(user.password if user else dummy_hash, body.password)
    except VerificationError:
        valid = False
    if not user or not valid or user.role not in PERMISSIONS or not user.active:
        raise HTTPException(401, "Invalid email or password.")
    new_session(db, user, response)
    return {"email": user.email, "role": user.role}

@app.post("/api/admin/logout", dependencies=[Depends(same_origin)])
def logout(request: Request, response: Response, db=Depends(database)):
    token = request.cookies.get(cookie)
    if token:
        db.execute(delete(LoginSession).where(LoginSession.digest == digest(token)))
        db.commit()
    response.delete_cookie(cookie, path="/", secure=secure, httponly=True, samesite="lax")
    return {"ok": True}

def contents(messages):
    return [types.Content(role="model" if item.role == "assistant" else "user", parts=[types.Part(text=item.text)])
            for item in messages]

def ai_guard(request):
    limit(request, "ai", AI_RATE, 600)
    quota("ai-daily", AI_DAILY, 86400)

def catalog(db,query="",settings=None):
    data=architecture_knowledge.retrieve(db,query,settings)
    db.commit()
    return data


def cards(db, slugs):
    rows = {row["slug"]: row for row in project_store.legacy_cards(db)} if slugs else {}
    db.commit()
    return [rows[slug] for slug in slugs if slug in rows]

def clean_brief(result, services, context=None):
    data = result.model_dump()
    for key, value in data.items():
        if isinstance(value, list):
            data[key] = [str(item).strip()[:600] for item in value if str(item).strip()][:8]
        else:
            data[key] = str(value).strip()[:3000 if key in {"overview","concept_summary"} else 600 if key=="next_action" else 160]
    data["styles"] = [style[:160] for style in data["styles"][:8]]
    data["services"] = [slug for slug in dict.fromkeys(data["services"]) if slug in services][:6]
    data["concept_summary"]=data.get("concept_summary") or data["overview"]
    allowed={ref["url"]:ref for ref in (context or {}).get("references",[])}
    data["sources"]=[allowed[url] for url in dict.fromkeys(data.get("sources",[])) if url in allowed][:6]
    return s.Brief.model_validate(data).model_dump()

@app.post("/api/ai/assistant", dependencies=[Depends(same_origin)])
def assistant(body: s.Chat, request: Request, db=Depends(database)):
    settings=config(db,"ai",s.AiConfig)
    if not settings.assistant_enabled:
        raise HTTPException(503, "The project assistant is currently switched off. Please contact the studio directly.")
    ai_guard(request)
    if body.messages[-1].role != "user":
        raise HTTPException(422, "End the conversation with a user message.")
    data = catalog(db," ".join(message.text for message in body.messages[-6:]),settings)
    services = {row["slug"]: row for row in data["services"]}
    history = contents(body.messages)
    turn = ai.assistant(history, data)
    result = {"reply": turn.reply, "brief": None,
              "services": [services[slug] for slug in dict.fromkeys(turn.services) if slug in services][:3],
              "projects": cards(db, [slug for slug in dict.fromkeys(turn.projects) if slug in {p["slug"] for p in data["projects"]}][:3])}
    if turn.ready:
        result["brief"] = clean_brief(turn.brief if turn.brief is not None else ai.brief(history, data), services, data)
        result["brief_services"] = [services[slug] for slug in result["brief"]["services"]]
        track(db, "assistant_brief")
    return result

PLAN_CATEGORIES = {"Residential Architecture": "residential", "Commercial Architecture": "commercial",
                   "Interior Design": "interior", "Renovation": "renovation", "Urban Planning":"urban-planning"}

@app.post("/api/ai/brief", dependencies=[Depends(same_origin)])
def plan_brief(body: s.Plan, request: Request, db=Depends(database)):
    ai_guard(request)
    data = catalog(db," ".join(str(value) for value in body.model_dump().values()))
    services = {row["slug"]: row for row in data["services"]}
    result = clean_brief(ai.brief(json.dumps(body.model_dump()), data), services, data)
    track(db, "planner_complete", body.project_type)
    related = project_store.legacy_cards(db, category=PLAN_CATEGORIES.get(body.project_type, ""))[:3]
    db.commit()
    return {"brief": result, "services": [services[slug] for slug in result["services"]], "projects": related}

STOPWORDS = {"and", "the", "with", "for", "that", "show", "projects", "project", "want", "like", "some", "have", "are"}

def keyword_matches(query, rows):
    words = {word for word in re.findall(r"[a-z0-9]+", query.lower()) if len(word) > 2 and word not in STOPWORDS}
    scored = []
    for row in rows:
        haystack = " ".join(str(row.get(key, "")) for key in ("title", "description", "category", "location", "concept")).lower()
        hits = sorted(word for word in words if word in haystack)
        if hits:
            scored.append((len(hits), row, hits))
    scored.sort(key=lambda item: -item[0])
    return [{"project": row, "reason": "Mentions " + ", ".join(hits[:4]) + "."} for _, row, hits in scored[:5]]

@app.post("/api/ai/portfolio", dependencies=[Depends(same_origin)])
def portfolio(body: s.PortfolioQuery, request: Request, db=Depends(database)):
    rows = {row["slug"]: row for row in project_store.legacy_cards(db)[:80]}
    track(db, "portfolio_search")
    if not config(db, "ai", s.AiConfig).portfolio_enabled:
        return {"ai": False, "items": keyword_matches(body.query, list(rows.values()))}
    fields = ("slug", "title", "description", "category", "location", "year", "area", "status", "concept")
    try:
        ai_guard(request)
        matches = ai.recommend({"request": body.query},
                               [{key: value for key, value in row.items() if key in fields} for row in rows.values()])
        return {"ai": True, "items": [{"project": rows[match["project"]["slug"]], "reason": match["reason"]}
                                      for match in matches]}
    except HTTPException as error:
        # Keep search useful when Gemini is unavailable or the AI budget is spent.
        if error.status_code not in (429, 502, 503):
            raise
        return {"ai": False, "items": keyword_matches(body.query, list(rows.values()))}

@app.post("/api/ai/chat", dependencies=[Depends(same_origin)])
def chat(body: s.Chat, request: Request, db=Depends(database)):
    ai_guard(request)
    if body.messages[-1].role != "user":
        raise HTTPException(422, "End the conversation with a user message.")
    context=catalog(db," ".join(message.text for message in body.messages[-6:]))
    return ai.generate(ai.RULES + " Discuss relevant concepts, materials, colors, lighting and ventilation. "
                       "Use published context only for company facts: "+json.dumps(context), contents(body.messages))

@app.post("/api/ai/floor-plan", dependencies=[Depends(same_origin)])
def floor_plan(file: UploadFile, request: Request):
    ai_guard(request)
    data = file.file.read(8 * 1024 * 1024 + 1)
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "Floor plans must be under 8 MB.")
    mime = next((kind for prefix, kind in [(b"%PDF-", "application/pdf"), (b"\x89PNG\r\n\x1a\n", "image/png"),
        (b"\xff\xd8\xff", "image/jpeg")] if data.startswith(prefix)), None)
    if not mime:
        raise HTTPException(415, "Upload a PNG, JPEG or PDF floor plan.")
    return ai.generate(ai.CONCEPT + " Examine only visible features. If the plan is unreadable, say so. "
                       "Discuss layout, space, light, ventilation, accessibility and interiors.",
                       ["Review this floor plan.", types.Part.from_bytes(data=data, mime_type=mime)])

@app.post("/api/ai/recommend", dependencies=[Depends(same_origin)])
def recommend(body: s.Preferences, request: Request, db=Depends(database)):
    ai_guard(request)
    wanted = LEGACY_CATEGORIES.get(body.building_type, "")
    rows = sorted(project_store.legacy_cards(db), key=lambda row: row["category_slug"] != wanted)[:80]
    projects = [{key: value for key, value in row.items()
                 if key in ("slug", "title", "description", "category", "image", "area", "location", "year")} for row in rows]
    db.commit()
    return ai.recommend(body.model_dump(), projects)
