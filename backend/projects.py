from detail_layout import standard_detail
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from db import database
from models import Project, ProjectCategory, ProjectRevision
import schemas as s
from common import audit
from documents import DocumentStore, PageStore
from project_templates import blank, overview
from security import can, require, same_origin
from service_schema import CategoryInput, ProjectDocument, ProjectsPage

router = APIRouter()

def mirror(row, doc):
    row.draft, row.slug, row.title, row.category_id, row.featured = doc, doc["slug"], doc["title"], doc["category_id"], doc["featured"]

store = DocumentStore(Project, ProjectRevision, "project_id", ProjectDocument, "project", mirror)
page = PageStore("projects", ProjectsPage, overview)
published = Project.published
SORTS = {"featured": lambda: [published["featured"].as_boolean().desc(), Project.sort_order, Project.id],
         "newest": lambda: [published["year"].as_integer().desc().nulls_last(), Project.published_at.desc()],
         "oldest": lambda: [published["year"].as_integer().asc().nulls_last(), Project.published_at.asc()],
         "title": lambda: [published["title"].astext.asc()]}

def categories(db):
    return {row.id: {"id": row.id, "slug": row.slug, "name": row.name} for row in db.scalars(select(ProjectCategory))}

def card(row, cats):
    doc = row.published
    return {"slug": row.live_slug, "title": doc["title"], "category": cats.get(doc["category_id"], {"slug": "", "name": ""}),
            "location": doc["location"], "year": doc["year"], "status": doc["status"], "featured": doc["featured"],
            "cover_image": doc.get("cover_image"), "cover_alt": doc.get("cover_alt", ""), "description": doc["description"]}

def legacy(row, cats):
    """The older flat project shape still used by the homepage, service pages, sitemap and AI features."""
    doc, category = row.published, cats.get(row.published["category_id"], {"slug": "", "name": ""})
    gallery = [image["image"] for section in doc["sections"] if section["type"] == "gallery" and section.get("enabled", True) for image in section["images"]]
    text = " ".join(section["body"] for section in doc["sections"] if section["type"] == "rich_text" and section.get("enabled", True))
    return {"slug": row.live_slug, "title": doc["title"], "description": doc["description"], "location": doc["location"],
            "category": category["name"], "category_slug": category["slug"], "year": doc["year"], "area": doc["area"],
            "status": doc["status"], "image": doc.get("cover_image") or (gallery[0] if gallery else None), "gallery": gallery[:20],
            "concept": text[:2000], "challenges": "", "featured": doc["featured"], "published": True}

def legacy_cards(db, featured=False, category="", q=""):
    cats = categories(db)
    query = store.live()
    if featured:
        query = query.where(published["featured"].as_boolean().is_(True))
    if q:
        query = query.where(or_(*[published[key].astext.icontains(q, autoescape=True) for key in ("title", "description", "location")]))
    rows = [legacy(row, cats) for row in db.scalars(query.order_by(*SORTS["featured"]()))]
    return [row for row in rows if not category or category in (row["category"], row["category_slug"])]

def summary(row, cats):
    return {"id": row.id, "slug": row.slug, "live_slug": row.live_slug, "title": row.title, "category": cats.get(row.category_id),
            "location": row.draft.get("location", ""), "year": row.draft.get("year"), "featured": row.featured, "sort_order": row.sort_order,
            "status": row.status, "cover_image": row.draft.get("cover_image"), "unpublished_changes": row.status == "published" and row.draft != row.published,
            "updated": row.updated, "published_at": row.published_at, "sections": len(standard_detail(row.draft,"project").get("sections", []))}

def detail(db, row):
    return {**summary(row, categories(db)), "draft": standard_detail(row.draft,"project"), "published": standard_detail(row.published,"project") if row.published else None, "redirects": row.redirects,
            "revisions": store.revisions(db, row)}

def known_category(db, identifier):
    if not db.get(ProjectCategory, identifier):
        raise HTTPException(422, [{"loc": ["category_id"], "msg": "Choose an existing category."}])

# Public: only published projects are ever returned.
@router.get("/api/project-categories")
def public_categories(db=Depends(database)):
    # One expression object for SELECT and GROUP BY, so both render with the same bound parameter.
    category = published["category_id"].as_integer()
    counts = dict(db.execute(select(category, func.count()).where(Project.status == "published").group_by(category)).all())
    return {"items": [{"slug": row.slug, "name": row.name, "description": row.description, "count": counts.get(row.id, 0)}
                      for row in db.scalars(select(ProjectCategory).order_by(ProjectCategory.sort_order, ProjectCategory.name))]}

@router.get("/api/projects")
def public_projects(category: str = Query("", max_length=120), q: str = Query("", max_length=120),
                    sort: str = Query("featured", pattern="^(featured|newest|oldest|title)$"),
                    page_number: int = Query(1, ge=1, le=1000, alias="page"), size: int = Query(6, ge=1, le=48), db=Depends(database)):
    query = store.live()
    if category:
        match = db.scalar(select(ProjectCategory.id).where(ProjectCategory.slug == category))
        if match is None:
            return {"items": [], "total": 0, "page": page_number, "size": size}
        query = query.where(published["category_id"].as_integer() == match)
    if q:
        query = query.where(or_(*[published[key].astext.icontains(q, autoescape=True) for key in ("title", "description", "location")]))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    cats = categories(db)
    rows = db.scalars(query.order_by(*SORTS[sort]()).offset((page_number - 1) * size).limit(size))
    return {"items": [card(row, cats) for row in rows], "total": total, "page": page_number, "size": size}

@router.get("/api/projects/{slug}")
def public_project(slug: s.Slug, db=Depends(database)):
    row, moved = store.public(db, slug)
    if row:
        return {**standard_detail(row.published,"project"), "slug": row.live_slug, "category": categories(db).get(row.published["category_id"]), "updated": row.published_at}
    if moved:
        return {"redirect": moved}
    raise HTTPException(404, "Project not found.")

@router.get("/api/projects-page")
def public_overview(db=Depends(database)):
    return page.public(db)

# Admin
@router.get("/api/admin/projects")
def admin_projects(user=Depends(require("content")), db=Depends(database)):
    cats = categories(db)
    return {"items": [summary(row, cats) for row in db.scalars(select(Project).order_by(Project.sort_order, Project.title))],
            "categories": list(cats.values())}

class Create(s.Strict):
    title: s.Short
    slug: s.Slug
    category_id: int
    template: str = "standard"

@router.post("/api/admin/projects", status_code=201, dependencies=[Depends(same_origin)])
def create_project(body: Create, user=Depends(require("content")), db=Depends(database)):
    known_category(db, body.category_id)
    category = db.get(ProjectCategory, body.category_id)
    row = store.create(db, blank(body.title, body.slug, body.category_id, category.slug, body.template), user)
    db.commit()
    return detail(db, row)

@router.get("/api/admin/projects/by-slug/{slug}")
def draft_by_slug(slug: s.Slug, user=Depends(require("content")), db=Depends(database)):
    row = store.working(db, slug)
    return {**standard_detail(row.draft,"project"), "category": categories(db).get(row.draft["category_id"]), "updated": row.updated}

@router.get("/api/admin/projects/{identifier}")
def admin_project(identifier: int, user=Depends(require("content")), db=Depends(database)):
    return detail(db, store.get(db, identifier))

@router.put("/api/admin/projects/{identifier}", dependencies=[Depends(same_origin)])
def save_draft(identifier: int, body: dict, user=Depends(require("content")), db=Depends(database)):
    row = store.get(db, identifier)
    if isinstance(body.get("category_id"), int):
        known_category(db, body["category_id"])
    store.save(db, row, body, user)
    db.commit()
    return detail(db, row)

@router.post("/api/admin/projects/{identifier}/publish", dependencies=[Depends(same_origin)])
def publish(identifier: int, user=Depends(require("content")), db=Depends(database)):
    row = store.get(db, identifier)
    known_category(db, row.draft["category_id"])
    store.publish(db, row, user)
    db.commit()
    return detail(db, row)

@router.post("/api/admin/projects/{identifier}/unpublish", dependencies=[Depends(same_origin)])
def unpublish(identifier: int, user=Depends(require("content")), db=Depends(database)):
    row = store.get(db, identifier)
    store.unpublish(db, row, user)
    db.commit()
    return detail(db, row)

@router.post("/api/admin/projects/{identifier}/duplicate", status_code=201, dependencies=[Depends(same_origin)])
def duplicate(identifier: int, user=Depends(require("content")), db=Depends(database)):
    row = store.duplicate(db, store.get(db, identifier), user, lambda doc: {**doc, "title": (doc["title"] + " (copy)")[:160]})
    db.commit()
    return detail(db, row)

@router.delete("/api/admin/projects/{identifier}", dependencies=[Depends(same_origin)])
def delete_project(identifier: int, user=Depends(require("content_delete")), db=Depends(database)):
    store.remove(db, store.get(db, identifier), user)
    db.commit()
    return {"ok": True}

class Bulk(s.Strict):
    ids: list[int]
    action: str

@router.post("/api/admin/projects/bulk", dependencies=[Depends(same_origin)])
def bulk(body: Bulk, user=Depends(require("content")), db=Depends(database)):
    if body.action not in ("publish", "unpublish", "feature", "unfeature", "delete") or not body.ids[:200]:
        raise HTTPException(422, "Choose projects and a supported action.")
    if body.action == "delete" and not can(user, "content_delete"):
        raise HTTPException(403, "You do not have permission for this action.")
    rows = list(db.scalars(select(Project).where(Project.id.in_(body.ids[:200]))))
    for row in rows:
        if body.action == "publish":
            store.publish(db, row, user)
        elif body.action == "unpublish":
            store.unpublish(db, row, user)
        elif body.action == "delete":
            store.remove(db, row, user)
        else:
            # Featuring is a listing flag, so it applies to the draft and the live version together.
            flag = body.action == "feature"
            mirror(row, {**row.draft, "featured": flag})
            if row.published:
                row.published = {**row.published, "featured": flag}
            audit(db, user, body.action, "project", row.slug)
    db.commit()
    return {"ok": True, "count": len(rows)}

class Order(s.Strict):
    ids: list[int]

@router.post("/api/admin/projects/reorder", dependencies=[Depends(same_origin)])
def reorder(body: Order, user=Depends(require("content")), db=Depends(database)):
    store.reorder(db, body.ids, user)
    db.commit()
    return admin_projects(user, db)

@router.get("/api/admin/projects/{identifier}/revisions/{revision}")
def revision_detail(identifier: int, revision: int, user=Depends(require("content")), db=Depends(database)):
    item = store.revision_of(db, store.get(db, identifier), revision)
    return {"id": item.id, "version": item.version, "kind": item.kind, "author": item.author, "created": item.created, "document": item.document}

@router.post("/api/admin/projects/{identifier}/restore/{revision}", dependencies=[Depends(same_origin)])
def restore(identifier: int, revision: int, user=Depends(require("content")), db=Depends(database)):
    row = store.get(db, identifier)
    store.restore(db, row, revision, user)
    db.commit()
    return detail(db, row)

def category_rows(db):
    used = dict(db.execute(select(Project.category_id, func.count()).group_by(Project.category_id)).all())
    return {"items": [{"id": row.id, "slug": row.slug, "name": row.name, "description": row.description, "sort_order": row.sort_order,
                       "projects": used.get(row.id, 0)} for row in db.scalars(select(ProjectCategory).order_by(ProjectCategory.sort_order, ProjectCategory.name))]}

@router.get("/api/admin/project-categories")
def admin_categories(user=Depends(require("content")), db=Depends(database)):
    return category_rows(db)

def free_category_slug(db, slug, own=None):
    if db.scalar(select(ProjectCategory.id).where(ProjectCategory.slug == slug, ProjectCategory.id != (own or 0))):
        raise HTTPException(409, "Another category already uses this slug.")

@router.post("/api/admin/project-categories", status_code=201, dependencies=[Depends(same_origin)])
def create_category(body: CategoryInput, user=Depends(require("content")), db=Depends(database)):
    free_category_slug(db, body.slug)
    db.add(ProjectCategory(slug=body.slug, name=body.name, description=body.description,
                           sort_order=(db.scalar(select(func.max(ProjectCategory.sort_order))) or 0) + 1))
    audit(db, user, "create", "project_category", body.slug)
    db.commit()
    return category_rows(db)

@router.put("/api/admin/project-categories/{identifier}", dependencies=[Depends(same_origin)])
def update_category(identifier: int, body: CategoryInput, user=Depends(require("content")), db=Depends(database)):
    row = db.get(ProjectCategory, identifier)
    if not row:
        raise HTTPException(404, "Category not found.")
    free_category_slug(db, body.slug, identifier)
    row.slug, row.name, row.description = body.slug, body.name, body.description
    audit(db, user, "update", "project_category", body.slug)
    db.commit()
    return category_rows(db)

@router.delete("/api/admin/project-categories/{identifier}", dependencies=[Depends(same_origin)])
def delete_category(identifier: int, user=Depends(require("content_delete")), db=Depends(database)):
    row = db.get(ProjectCategory, identifier)
    if not row:
        raise HTTPException(404, "Category not found.")
    in_use = db.scalar(select(func.count()).select_from(Project).where(or_(
        Project.category_id == identifier, published["category_id"].as_integer() == identifier)))
    if in_use:
        raise HTTPException(409, f"{in_use} project{'s use' if in_use != 1 else ' uses'} this category. Move them to another category first.")
    audit(db, user, "delete", "project_category", row.slug)
    db.delete(row)
    db.commit()
    return category_rows(db)

@router.post("/api/admin/project-categories/reorder", dependencies=[Depends(same_origin)])
def reorder_categories(body: Order, user=Depends(require("content")), db=Depends(database)):
    rows = {row.id: row for row in db.scalars(select(ProjectCategory))}
    if sorted(body.ids) != sorted(rows):
        raise HTTPException(422, "Send every category exactly once.")
    for position, identifier in enumerate(body.ids):
        rows[identifier].sort_order = position
    audit(db, user, "reorder", "project_category")
    db.commit()
    return category_rows(db)

@router.get("/api/admin/projects-page")
def admin_overview(user=Depends(require("content")), db=Depends(database)):
    return page.state(db)

@router.put("/api/admin/projects-page", dependencies=[Depends(same_origin)])
def save_overview(body: dict, user=Depends(require("content")), db=Depends(database)):
    page.save(db, body, user)
    db.commit()
    return page.state(db)

@router.post("/api/admin/projects-page/publish", dependencies=[Depends(same_origin)])
def publish_overview(user=Depends(require("content")), db=Depends(database)):
    page.publish(db, user)
    db.commit()
    return page.state(db)
