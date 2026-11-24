from detail_layout import standard_detail
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from db import database
from models import Service, ServiceRevision
import schemas as s
from documents import DocumentStore, PageStore
from security import require, same_origin
from service_schema import ServiceDocument, ServicesPage
from service_templates import blank, document, overview

router = APIRouter()

def mirror(row, doc):
    row.draft, row.slug, row.name, row.category, row.featured = doc, doc["slug"], doc["name"], doc["category"], doc["featured"]

store = DocumentStore(Service, ServiceRevision, "service_id", ServiceDocument, "service", mirror)
page = PageStore("services", ServicesPage, overview)

def card(doc, slug):
    return {"slug": slug, "name": doc["name"], "category": doc["category"], "short_description": doc["short_description"], "highlights": doc.get("highlights", []),
            "icon": doc["icon"], "featured": doc["featured"], "card_image": doc.get("card_image"), "card_alt": doc.get("card_alt", "")}

def published_services(db):
    return [card(row.published, row.live_slug) for row in db.scalars(store.live().order_by(Service.sort_order, Service.name))]

def summary(row):
    return {"id": row.id, "slug": row.slug, "live_slug": row.live_slug, "name": row.name, "category": row.category,
            "featured": row.featured, "sort_order": row.sort_order, "status": row.status, "card_image": row.draft.get("card_image"),
            "unpublished_changes": row.status == "published" and row.draft != row.published, "updated": row.updated,
            "published_at": row.published_at, "sections": len(standard_detail(row.draft,"service").get("sections", []))}

def detail(db, row):
    return {**summary(row), "draft": standard_detail(row.draft,"service"), "published": standard_detail(row.published,"service") if row.published else None, "redirects": row.redirects, "revisions": store.revisions(db, row)}

# Public: only published content is ever returned.
@router.get("/api/services")
def public_services(db=Depends(database)):
    return {"items": published_services(db)}

@router.get("/api/services/{slug}")
def public_service(slug: s.Slug, db=Depends(database)):
    row, moved = store.public(db, slug)
    if row:
        return {**standard_detail(row.published,"service"), "slug": row.live_slug, "updated": row.published_at}
    if moved:
        return {"redirect": moved}
    raise HTTPException(404, "Service not found.")

@router.get("/api/services-page")
def public_overview(db=Depends(database)):
    return page.public(db)

# Admin
@router.get("/api/admin/services")
def admin_services(user=Depends(require("content")), db=Depends(database)):
    return {"items": [summary(row) for row in db.scalars(select(Service).order_by(Service.sort_order, Service.name))]}

class Create(s.Strict):
    name: s.Short
    slug: s.Slug
    template: str = "standard"

@router.post("/api/admin/services", status_code=201, dependencies=[Depends(same_origin)])
def create_service(body: Create, user=Depends(require("content")), db=Depends(database)):
    spec = {"slug": body.slug, "name": body.name, "category": "", "icon": "building", "image": "1600596542815-ffad4c1539a9",
            "alt": "Contemporary residence", "short": "Describe this service in one or two sentences.",
            "description": "Explain what this service includes, who it is for and how you work.",
            "offers": [{"title": "First offering", "icon": "building", "description": "Describe it briefly."}]}
    row = store.create(db, blank(body.name, body.slug) if body.template == "blank" else document(spec), user)
    db.commit()
    return detail(db, row)

@router.get("/api/admin/services/by-slug/{slug}")
def draft_by_slug(slug: s.Slug, user=Depends(require("content")), db=Depends(database)):
    # Used by preview mode: the working draft, found by its draft or live URL.
    row = store.working(db, slug)
    return {**standard_detail(row.draft,"service"), "updated": row.updated}

@router.get("/api/admin/services/{identifier}")
def admin_service(identifier: int, user=Depends(require("content")), db=Depends(database)):
    return detail(db, store.get(db, identifier))

@router.put("/api/admin/services/{identifier}", dependencies=[Depends(same_origin)])
def save_draft(identifier: int, body: dict, user=Depends(require("content")), db=Depends(database)):
    row = store.get(db, identifier)
    store.save(db, row, body, user)
    db.commit()
    return detail(db, row)

@router.post("/api/admin/services/{identifier}/publish", dependencies=[Depends(same_origin)])
def publish(identifier: int, user=Depends(require("content")), db=Depends(database)):
    row = store.get(db, identifier)
    store.publish(db, row, user)
    db.commit()
    return detail(db, row)

@router.post("/api/admin/services/{identifier}/unpublish", dependencies=[Depends(same_origin)])
def unpublish(identifier: int, user=Depends(require("content")), db=Depends(database)):
    row = store.get(db, identifier)
    store.unpublish(db, row, user)
    db.commit()
    return detail(db, row)

@router.post("/api/admin/services/{identifier}/duplicate", status_code=201, dependencies=[Depends(same_origin)])
def duplicate(identifier: int, user=Depends(require("content")), db=Depends(database)):
    row = store.duplicate(db, store.get(db, identifier), user, lambda doc: {**doc, "name": (doc["name"] + " (copy)")[:120]})
    db.commit()
    return detail(db, row)

@router.delete("/api/admin/services/{identifier}", dependencies=[Depends(same_origin)])
def delete_service(identifier: int, user=Depends(require("content_delete")), db=Depends(database)):
    store.remove(db, store.get(db, identifier), user)
    db.commit()
    return {"ok": True}

class Order(s.Strict):
    ids: list[int]

@router.post("/api/admin/services/reorder", dependencies=[Depends(same_origin)])
def reorder(body: Order, user=Depends(require("content")), db=Depends(database)):
    store.reorder(db, body.ids, user)
    db.commit()
    return admin_services(user, db)

@router.get("/api/admin/services/{identifier}/revisions/{revision}")
def revision_detail(identifier: int, revision: int, user=Depends(require("content")), db=Depends(database)):
    item = store.revision_of(db, store.get(db, identifier), revision)
    return {"id": item.id, "version": item.version, "kind": item.kind, "author": item.author, "created": item.created, "document": item.document}

@router.post("/api/admin/services/{identifier}/restore/{revision}", dependencies=[Depends(same_origin)])
def restore(identifier: int, revision: int, user=Depends(require("content")), db=Depends(database)):
    row = store.get(db, identifier)
    store.restore(db, row, revision, user)
    db.commit()
    return detail(db, row)

@router.get("/api/admin/services-page")
def admin_overview(user=Depends(require("content")), db=Depends(database)):
    return page.state(db)

@router.put("/api/admin/services-page", dependencies=[Depends(same_origin)])
def save_overview(body: dict, user=Depends(require("content")), db=Depends(database)):
    page.save(db, body, user)
    db.commit()
    return page.state(db)

@router.post("/api/admin/services-page/publish", dependencies=[Depends(same_origin)])
def publish_overview(user=Depends(require("content")), db=Depends(database)):
    page.publish(db, user)
    db.commit()
    return page.state(db)
