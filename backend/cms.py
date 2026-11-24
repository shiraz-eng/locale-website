import io
import media_storage
import os
import secrets
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import String, cast, delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from db import database
from models import AuditLog, Consultation, Content, Inquiry, LoginSession, MediaAsset, Project, RateBucket, Service, User
import schemas as s
from common import AI_DAILY, audit, collection, config, kind_schema, media, serialize
from security import PERMISSIONS, can, hasher, require, same_origin, staff

router = APIRouter()
DRAFTABLE = ("blog", "team")

def permission_for(kind):
    return "settings" if kind == "settings" else "content"

def check(user, permission):
    if not can(user, permission):
        raise HTTPException(403, "You do not have permission for this action.")

def validated(schema, body):
    try:
        return schema.model_validate(body).model_dump(mode="json")
    except ValidationError as error:
        raise HTTPException(422, error.errors(include_context=False, include_input=False)) from None

@router.get("/api/admin/session")
def session(user=Depends(staff)):
    return {"email": user.email, "name": user.name, "role": user.role, "permissions": sorted(PERMISSIONS[user.role])}

@router.get("/api/admin/content/{kind}")
def manage_content(kind: str, user=Depends(staff), db=Depends(database)):
    check(user, permission_for(kind))
    return [{**serialize(row), "updated": row.updated, "created": row.created} for row in db.scalars(collection(kind).order_by(Content.slug))]

@router.get("/api/admin/content/{kind}/{slug}")
def content_detail(kind: str, slug: s.Slug, user=Depends(staff), db=Depends(database)):
    check(user, permission_for(kind))
    row = db.scalar(collection(kind).where(Content.slug == slug))
    if not row:
        raise HTTPException(404, "Content not found.")
    return {**serialize(row), "updated": row.updated, "created": row.created}

@router.put("/api/admin/content/{kind}/{slug}", dependencies=[Depends(same_origin)])
def save_content(kind: str, slug: s.Slug, body: dict, create: bool = False, previous: s.Slug | None = None,
                 user=Depends(staff), db=Depends(database)):
    schema = kind_schema(kind)
    check(user, permission_for(kind))
    if kind == "settings" and slug != "studio":
        raise HTTPException(400, "Studio settings use the studio record.")
    data = validated(schema, body)
    if previous and previous != slug:
        # Renaming is only allowed for drafts, so published URLs never break.
        old = db.scalar(collection(kind).where(Content.slug == previous))
        if kind not in DRAFTABLE or not old or old.data.get("published", True):
            raise HTTPException(409, "Only unpublished drafts can change their URL slug.")
        db.delete(old)
        create = True
    if create:
        statement = insert(Content).values(kind=kind, slug=slug, data=data).on_conflict_do_nothing()
        if db.execute(statement.returning(Content.slug)).scalar_one_or_none() is None:
            raise HTTPException(409, "This URL slug is already in use.")
    else:
        statement = update(Content).where(Content.kind == kind, Content.slug == slug).values(data=data, updated=func.now())
        if db.execute(statement.returning(Content.slug)).scalar_one_or_none() is None:
            raise HTTPException(404, "This record no longer exists.")
    audit(db, user, "create" if create else "update", kind, slug,
          {"title": data.get("title"), "published": data.get("published"), "renamed_from": previous})
    db.commit()
    return {"slug": slug, **data}

class Bulk(s.Strict):
    slugs: list[s.Slug]
    action: str

@router.post("/api/admin/content/{kind}/bulk", dependencies=[Depends(same_origin)])
def bulk(kind: str, body: Bulk, user=Depends(staff), db=Depends(database)):
    kind_schema(kind)
    check(user, "content")
    flags = {"publish": ("published", True), "unpublish": ("published", False), "feature": ("featured", True),
             "unfeature": ("featured", False)}
    if body.action not in (*flags, "delete") or kind == "settings" or not body.slugs[:200]:
        raise HTTPException(422, "Choose records and a supported action.")
    rows = list(db.scalars(collection(kind).where(Content.slug.in_(body.slugs[:200]))))
    if body.action == "delete":
        check(user, "content_delete")
        for row in rows:
            db.delete(row)
    else:
        key, value = flags[body.action]
        for row in rows:
            row.data = validated(kind_schema(kind), {**row.data, key: value})
    audit(db, user, body.action, kind, ",".join(row.slug for row in rows)[:160], {"count": len(rows)})
    db.commit()
    return {"ok": True, "count": len(rows)}

@router.delete("/api/admin/content/{kind}/{slug}", dependencies=[Depends(same_origin)])
def delete_content(kind: str, slug: s.Slug, user=Depends(require("content_delete")), db=Depends(database)):
    kind_schema(kind)
    if kind == "settings":
        raise HTTPException(400, "Studio settings are required.")
    db.execute(delete(Content).where(Content.kind == kind, Content.slug == slug))
    audit(db, user, "delete", kind, slug)
    db.commit()
    return {"ok": True}

def asset(row, references=None):
    data = {"id": row.id, "url": row.url, "name": row.name, "content_type": row.content_type, "width": row.width,
            "height": row.height, "size": row.size, "alt": row.alt, "uploaded_by": row.uploaded_by, "created": row.created}
    if references is not None:
        data["references"] = references
    return data

def references(db, url):
    used = [f"{kind}/{slug}" for kind, slug in db.execute(select(Content.kind, Content.slug).where(
        cast(Content.data, String).contains(url, autoescape=True)))]
    # Service and project pages keep images in their draft and published documents.
    for model, label in ((Service, "services"), (Project, "projects")):
        used += [f"{label}/{slug}" for (slug,) in db.execute(select(model.slug).where(or_(
            cast(model.draft, String).contains(url, autoescape=True), cast(model.published, String).contains(url, autoescape=True))))]
    return used

@router.post("/api/admin/upload", dependencies=[Depends(same_origin)])
def upload(file: UploadFile, user=Depends(require("media")), db=Depends(database)):
    data = file.file.read(10 * 1024 * 1024 + 1)
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Images must be under 10 MB.")
    try:
        with Image.open(io.BytesIO(data), formats=["JPEG", "PNG"]) as image:
            if image.width * image.height > 24_000_000:
                raise ValueError()
            suffix = "png" if image.format == "PNG" else "jpg"
            name = f"{secrets.token_hex(20)}.{suffix}"
            # Re-encoding drops metadata and anything appended to the image data.
            clean = image.convert("RGBA" if suffix == "png" else "RGB")
    except (OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(415, "Upload a valid JPEG or PNG under 24 megapixels.") from None
    output=io.BytesIO()
    clean.save(output,format="PNG" if suffix=="png" else "JPEG")
    encoded=output.getvalue()
    if os.getenv("VERCEL"):
        media_storage.put(db,name,encoded,"image/png" if suffix=="png" else "image/jpeg")
    else:
        (media / name).write_bytes(encoded)
    row = MediaAsset(url=f"/media/{name}", name=os.path.basename(file.filename or name)[:200],
                     content_type="image/png" if suffix == "png" else "image/jpeg", width=clean.width, height=clean.height,
                     size=len(encoded), uploaded_by=user.email)
    db.add(row)
    audit(db, user, "upload", "media", row.url)
    db.commit()
    return asset(row)

@router.get("/api/admin/media")
def media_list(q: str = Query("", max_length=160), page: int = Query(1, ge=1, le=10000),
               user=Depends(require("media")), db=Depends(database)):
    query = select(MediaAsset)
    if q:
        query = query.where(or_(MediaAsset.name.icontains(q, autoescape=True), MediaAsset.alt.icontains(q, autoescape=True)))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(MediaAsset.created.desc(), MediaAsset.id.desc()).offset((page - 1) * 48).limit(48))
    return {"items": [asset(row) for row in rows], "total": total, "more": page * 48 < total}

@router.get("/api/admin/media/{identifier}")
def media_detail(identifier: int, user=Depends(require("media")), db=Depends(database)):
    row = db.get(MediaAsset, identifier)
    if not row:
        raise HTTPException(404, "Image not found.")
    return asset(row, references(db, row.url))

@router.patch("/api/admin/media/{identifier}", dependencies=[Depends(same_origin)])
def media_update(identifier: int, body: s.MediaUpdate, user=Depends(require("media")), db=Depends(database)):
    row = db.get(MediaAsset, identifier)
    if not row:
        raise HTTPException(404, "Image not found.")
    row.alt, row.name = body.alt, body.name or row.name
    db.commit()
    return asset(row, references(db, row.url))

@router.delete("/api/admin/media/{identifier}", dependencies=[Depends(same_origin)])
def media_delete(identifier: int, user=Depends(require("media")), db=Depends(database)):
    row = db.get(MediaAsset, identifier)
    if not row:
        raise HTTPException(404, "Image not found.")
    used = references(db, row.url)
    if used:
        raise HTTPException(409, "This image is still used by: " + ", ".join(used[:6]) + ". Replace it there first.")
    name=os.path.basename(row.url)
    media_storage.remove(db,name)
    if not os.getenv("VERCEL"):(media / name).unlink(missing_ok=True)
    audit(db, user, "delete", "media", row.url)
    db.delete(row)
    db.commit()
    return {"ok": True}

HERO = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85"
STUDIO = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85"
CIVIC = "https://images.unsplash.com/photo-1511818966892-d7d671e672a3?auto=format&fit=crop"

def default_site(db):
    settings = (db.get(Content, ("settings", "studio")) or Content(data={})).data
    consultation = "Get a Free Initial Consultation" if settings.get("free_consultation") else "Book a Consultation"
    return {
        "hero_kicker": "Independent Architecture & Design Studio",
        "hero_headline": settings.get("headline") or "We Design Spaces That Inspire Living",
        "hero_description": settings.get("hero_description") or "Thoughtful architecture, considered interiors, and spaces that feel distinctly yours.",
        "hero_primary": {"label": "Explore Our Projects", "href": "/projects"},
        "hero_secondary": {"label": consultation, "href": "/contact?type=consultation"},
        "hero_tertiary": {"label": "Plan your project with AI", "href": "/plan-your-project"},
        "hero_slides": [
            {"image": HERO, "label": "Residential architecture", "alt": "Contemporary residence with a low roof and broad glazed openings"},
            {"image": STUDIO, "label": "Interior architecture", "alt": "Light-filled interior with a warm natural material palette"},
            {"image": CIVIC, "label": "Architecture in the city", "alt": "Contemporary architecture seen from below"}],
        "paths_title": "Four ways to begin.",
        "paths_text": "Whether you are still collecting ideas or ready to brief an architect, choose the step that suits you.",
        "paths": [
            {"title": "Explore Our Projects", "text": "See how we have approached homes, workplaces, interiors and renovations.", "href": "/projects"},
            {"title": consultation, "text": "Talk through your site, brief and next steps with the studio.", "href": "/contact?type=consultation"},
            {"title": "Plan Your Project With AI", "text": "Answer a few questions and get a conceptual project brief in minutes. No sign-up needed.", "href": "/plan-your-project"},
            {"title": "Request a Quotation", "text": "Share your scope and we will reply with how we can help and what a proposal needs.", "href": "/contact?type=quotation"}],
        "about_title": "About " + (settings.get("title") or "the studio") + ".",
        "about_text": settings.get("intro") or "An architecture and interior design studio.",
        "about_image": STUDIO,
        "about_principles": [
            {"title": "Design with care", "text": "We start by listening, then test how a place can support everyday life."},
            {"title": "Build for change", "text": "We consider reuse, passive comfort, and durable materials from the first sketch."}],
        "cta_title": "Let’s Build Something Extraordinary.",
        "cta_text": "Tell us what you’re imagining. We’ll help you find the first step.",
        "cta_primary": {"label": consultation, "href": "/contact?type=consultation"},
        "cta_secondary": {"label": "Plan Your Project With AI", "href": "/plan-your-project"},
        "cta_tertiary": {"label": "Request a Quotation", "href": "/contact?type=quotation"},
        "footer_tagline": "Architecture and design for the way we live.",
    }

def site_record(db, slug):
    row = db.get(Content, ("pages", slug))
    return row.data if row else None

def write_page(db, slug, data):
    db.execute(insert(Content).values(kind="pages", slug=slug, data=data).on_conflict_do_update(
        index_elements=[Content.kind, Content.slug], set_={"data": data, "updated": func.now()}))

@router.get("/api/site")
def public_site(db=Depends(database)):
    ai_settings = config(db, "ai", s.AiConfig)
    return {"content": site_record(db, "site") or default_site(db), "seo": (site_record(db, "seo") or {}).get("pages", {}),
            "ai": {"assistant": ai_settings.assistant_enabled, "portfolio": ai_settings.portfolio_enabled,
                   "introduction":ai_settings.introduction,"example_questions":ai_settings.example_questions,"style_presets":ai_settings.style_presets}}

@router.get("/api/admin/site")
def admin_site(user=Depends(require("pages")), db=Depends(database)):
    published = site_record(db, "site")
    draft = site_record(db, "site-draft")
    return {"draft": draft or published or default_site(db), "published": published,
            "unpublished_changes": draft is not None and draft != published}

@router.put("/api/admin/site", dependencies=[Depends(same_origin)])
def save_site(body: dict, user=Depends(require("pages")), db=Depends(database)):
    data = validated(s.SiteContent, body)
    write_page(db, "site-draft", data)
    audit(db, user, "save_draft", "pages", "site")
    db.commit()
    return admin_site(user, db)

@router.post("/api/admin/site/publish", dependencies=[Depends(same_origin)])
def publish_site(user=Depends(require("pages")), db=Depends(database)):
    draft = site_record(db, "site-draft")
    if not draft:
        raise HTTPException(409, "There is no draft to publish.")
    write_page(db, "site", validated(s.SiteContent, draft))
    audit(db, user, "publish", "pages", "site")
    db.commit()
    return admin_site(user, db)

@router.post("/api/admin/site/discard", dependencies=[Depends(same_origin)])
def discard_site(user=Depends(require("pages")), db=Depends(database)):
    db.execute(delete(Content).where(Content.kind == "pages", Content.slug == "site-draft"))
    audit(db, user, "discard_draft", "pages", "site")
    db.commit()
    return admin_site(user, db)

@router.get("/api/admin/seo")
def seo_overview(user=Depends(require("seo")), db=Depends(database)):
    pages = (site_record(db, "seo") or {}).get("pages", {})
    records = []
    for row in db.scalars(select(Service).order_by(Service.sort_order)):
        seo = row.draft.get("seo", {})
        records.append({"kind": "services", "slug": row.slug, "id": row.id, "title": row.name, "description": row.draft["short_description"],
                        "seo_title": seo.get("title", ""), "seo_description": seo.get("description", ""),
                        "og_image": seo.get("og_image") or row.draft.get("card_image"), "canonical": seo.get("canonical", ""),
                        "published": row.status == "published"})
    for row in db.scalars(select(Project).order_by(Project.sort_order)):
        seo = row.draft.get("seo", {})
        records.append({"kind": "projects", "slug": row.slug, "id": row.id, "title": row.title, "description": row.draft["description"],
                        "seo_title": seo.get("title", ""), "seo_description": seo.get("description", ""),
                        "og_image": seo.get("og_image") or row.draft.get("cover_image"), "canonical": seo.get("canonical", ""),
                        "published": row.status == "published"})
    for row in db.scalars(select(Content).where(Content.kind == "blog").order_by(Content.slug)):
        data = row.data
        records.append({"kind": row.kind, "slug": row.slug, "title": data.get("title", ""), "description": data.get("description", ""),
                        "seo_title": data.get("seo_title", ""), "seo_description": data.get("seo_description", ""),
                        "og_image": data.get("og_image") or data.get("image"), "canonical": data.get("canonical", ""),
                        "published": data.get("published", True)})
    return {"pages": pages, "records": records}

@router.put("/api/admin/seo/pages", dependencies=[Depends(same_origin)])
def save_page_seo(body: s.PagesSeo, user=Depends(require("seo")), db=Depends(database)):
    write_page(db, "seo", body.model_dump(mode="json"))
    audit(db, user, "update", "seo", "pages")
    db.commit()
    return seo_overview(user, db)

@router.patch("/api/admin/seo/{kind}/{slug}", dependencies=[Depends(same_origin)])
def save_record_seo(kind: str, slug: s.Slug, body: s.SeoUpdate, user=Depends(require("seo")), db=Depends(database)):
    if kind in ("services", "projects"):
        raise HTTPException(409, "Edit this page's SEO in its editor so it goes through draft and publish.")
    if kind != "blog":
        raise HTTPException(404, "Collection not found.")
    row = db.scalar(collection(kind).where(Content.slug == slug))
    if not row:
        raise HTTPException(404, "Content not found.")
    row.data = validated(kind_schema(kind), {**row.data, **body.model_dump(mode="json")})
    audit(db, user, "update_seo", kind, slug)
    db.commit()
    return {"ok": True}

def member(row):
    return {"email": row.email, "name": row.name, "role": row.role, "active": row.active, "created": row.created}

@router.get("/api/admin/team")
def team(user=Depends(staff), db=Depends(database)):
    query = select(User).order_by(User.name, User.email)
    if not can(user, "team"):
        query = query.where(User.active.is_(True))
    return {"items": [member(row) for row in db.scalars(query)], "roles": {role: sorted(perms) for role, perms in PERMISSIONS.items()}}

@router.post("/api/admin/team", status_code=201, dependencies=[Depends(same_origin)])
def add_member(body: s.TeamCreate, request: Request, user=Depends(require("team")), db=Depends(database)):
    email = body.email.lower()
    if db.get(User, email):
        raise HTTPException(409, "A team member with this email already exists.")
    db.add(User(email=email, name=body.name, role=body.role, password=hasher.hash(body.password), active=True))
    audit(db, user, "create", "user", email, {"role": body.role})
    db.commit()
    return member(db.get(User, email))

@router.patch("/api/admin/team/{email}", dependencies=[Depends(same_origin)])
def update_member(email: str, body: s.TeamUpdate, user=Depends(require("team")), db=Depends(database)):
    row = db.get(User, email.lower())
    if not row:
        raise HTTPException(404, "Team member not found.")
    owners = db.scalar(select(func.count()).select_from(User).where(User.role == "owner", User.active.is_(True), User.email != row.email))
    if row.role == "owner" and row.active and (body.role != "owner" or not body.active) and owners == 0:
        raise HTTPException(409, "Keep at least one active owner.")
    if not body.active or body.password:
        # Revoke existing sessions when access is removed or the password changes.
        db.execute(delete(LoginSession).where(LoginSession.email == row.email))
    changes = {key: getattr(body, key) for key in ("role", "active", "name") if getattr(row, key) != getattr(body, key)}
    row.name, row.role, row.active = body.name, body.role, body.active
    if body.password:
        row.password = hasher.hash(body.password)
        changes["password"] = "reset"
    audit(db, user, "update", "user", row.email, changes)
    db.commit()
    return member(row)

@router.get("/api/admin/audit")
def audit_log(page: int = Query(1, ge=1, le=10000), entity: str = Query("", max_length=40),
              user=Depends(require("audit")), db=Depends(database)):
    query = select(AuditLog)
    if entity:
        query = query.where(AuditLog.entity == entity)
    rows = list(db.scalars(query.order_by(AuditLog.created.desc(), AuditLog.id.desc()).offset((page - 1) * 50).limit(51)))
    return {"items": [{"actor": row.actor, "action": row.action, "entity": row.entity, "entity_id": row.entity_id,
                       "detail": row.detail, "created": row.created} for row in rows[:50]], "more": len(rows) > 50}

@router.get("/api/admin/search")
def search(q: str = Query(..., min_length=2, max_length=120), user=Depends(staff), db=Depends(database)):
    results = []
    if can(user, "leads"):
        for row in db.scalars(select(Inquiry).where(cast(Inquiry.data, String).icontains(q, autoescape=True))
                              .order_by(Inquiry.created.desc()).limit(6)):
            results.append({"type": "Lead", "title": row.data.get("name", ""), "subtitle": row.status, "href": f"/admin/leads/{row.id}"})
    if can(user, "content"):
        for row in db.scalars(select(Service).where(Service.name.icontains(q, autoescape=True)).limit(5)):
            results.append({"type": "Service", "title": row.name, "subtitle": row.status, "href": f"/admin/services/{row.id}/edit"})
        for row in db.scalars(select(Project).where(Project.title.icontains(q, autoescape=True)).limit(5)):
            results.append({"type": "Project", "title": row.title, "subtitle": row.status, "href": f"/admin/projects/{row.id}/edit"})
        for row in db.scalars(select(Content).where(Content.kind.in_(["blog", "team"]),
                                                    Content.data["title"].as_string().icontains(q, autoescape=True)).limit(8)):
            results.append({"type": {"blog": "Article", "team": "Team member"}[row.kind],
                            "title": row.data.get("title", ""), "subtitle": "/" + row.slug, "href": f"/admin/{row.kind}/{row.slug}"})
    return {"items": results}

@router.get("/api/admin/notifications")
def notifications(user=Depends(staff), db=Depends(database)):
    items = []
    if can(user, "leads"):
        week = datetime.now(timezone.utc) - timedelta(days=7)
        for row in db.scalars(select(Inquiry).where(Inquiry.status == "New Inquiry", Inquiry.created >= week)
                              .order_by(Inquiry.created.desc()).limit(5)):
            items.append({"kind": "lead", "text": f"New {row.kind} from {row.data.get('name', 'a visitor')}",
                          "href": f"/admin/leads/{row.id}", "created": row.created})
        due = db.scalar(select(func.count()).select_from(Inquiry).where(
            Inquiry.follow_up_at <= date.today(), Inquiry.status.not_in(["Contract Won", "Contract Lost"])))
        if due:
            items.append({"kind": "follow_up", "text": f"{due} follow-up{'s' if due != 1 else ''} due", "href": "/admin/leads?due=1"})
    if can(user, "consultations"):
        pending = db.scalar(select(func.count()).select_from(Consultation).where(Consultation.status == "Pending"))
        if pending:
            items.append({"kind": "consultation", "text": f"{pending} consultation request{'s' if pending != 1 else ''} awaiting scheduling",
                          "href": "/admin/consultations?status=Pending"})
    if can(user, "pages") and site_record(db, "site-draft") not in (None, site_record(db, "site")):
        items.append({"kind": "draft", "text": "Website content has unpublished changes", "href": "/admin/pages"})
    return {"items": items}

@router.get("/api/admin/ai-config")
def ai_config(user=Depends(require("ai_config")), db=Depends(database)):
    now = int(datetime.now(timezone.utc).timestamp())
    used = db.scalar(select(func.coalesce(func.sum(RateBucket.hits), 0)).where(
        RateBucket.key.like("quota:ai-daily:%"), RateBucket.expires > now))
    return {"settings": config(db, "ai", s.AiConfig).model_dump(), "model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
            "fallbacks": [name for name in os.getenv("GEMINI_FALLBACK_MODELS", "").split(",") if name.strip()],
            "key_configured": bool(os.getenv("GEMINI_API_KEY")), "daily_limit": AI_DAILY, "used_today": used,
            "rate_limit": int(os.getenv("AI_RATE_LIMIT", "120")),
            "services":[{"slug":row.live_slug,"name":row.published["name"]} for row in db.scalars(select(Service).where(Service.status=="published",Service.published.is_not(None)).order_by(Service.sort_order))]}

@router.put("/api/admin/ai-config", dependencies=[Depends(same_origin)])
def save_ai_config(body: s.AiConfig, user=Depends(require("ai_config")), db=Depends(database)):
    available=set(db.scalars(select(Service.live_slug).where(Service.status=="published",Service.published.is_not(None))))
    if set(body.approved_services)-available:raise HTTPException(422,"Choose only currently published services.")
    data = body.model_dump()
    db.execute(insert(Content).values(kind="config", slug="ai", data=data).on_conflict_do_update(
        index_elements=[Content.kind, Content.slug], set_={"data": data, "updated": func.now()}))
    audit(db, user, "update", "ai_config", "ai", {"changed_fields":list(data)})
    db.commit()
    return ai_config(user, db)
