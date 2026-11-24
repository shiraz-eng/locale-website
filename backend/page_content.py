"""Section documents for existing public pages, using the shared section registry."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from schemas import Strict, Asset
from service_schema import Section, Seo, Feature
from documents import PageStore
from db import database
from models import Content
from security import require, same_origin

PAGES = {
    "about":"About", "team":"Team", "blog":"Blog", "contact":"Contact",
    "plan-your-project":"Plan your project", "ai-design":"AI design lab", "privacy":"Privacy",
}
INTERACTIVE={"team","blog","contact","plan-your-project","ai-design"}

class TeamContent(Strict):
    team_image: Asset | None = "/portfolio/team/studio-team.png"
    team_image_alt: str = Field(default="Illustrative studio team collaborating around a design table",max_length=200)
    team_image_caption: str = Field(default="Studio culture · illustrative image",max_length=160)
    directory_heading: str = Field(max_length=160)
    directory_intro: str = Field(max_length=600)
    leadership_heading: str = Field(max_length=160)
    leadership_intro: str = Field(max_length=600)
    culture_heading: str = Field(max_length=160)
    culture: list[Feature] = Field(max_length=6)
    cta_heading: str = Field(max_length=160)
    cta_text: str = Field(max_length=600)
    careers_heading: str = Field(max_length=160)
    careers_text: str = Field(max_length=600)

class PageDocument(Strict):
    schema_version: Literal[1] = 1
    heading: str = Field(default="",max_length=160)
    description: str = Field(default="",max_length=1000)
    hero_image: Asset | None = None
    team_content: TeamContent | None = None
    sections: list[Section] = Field(default_factory=list,max_length=30)
    after_sections: list[Section] = Field(default_factory=list,max_length=30)
    show_original: bool = True
    seo: Seo = Field(default_factory=Seo)

def store(slug):
    if slug not in PAGES:
        raise HTTPException(404,"Page not found.")
    return PageStore("page-"+slug,PageDocument,lambda:PageDocument().model_dump(mode="json"))

def state(slug,db):
    return store(slug).state(db)

router=APIRouter()

@router.get("/api/pages/{slug}")
def page(slug:str,db=Depends(database)):
    page_store=store(slug)
    # Absence means the existing page keeps its original presentation.
    return page_store.read(db,page_store.slug)

@router.get("/api/admin/page-content/{slug}")
def admin_page(slug:str,user=Depends(require("pages")),db=Depends(database)):
    return state(slug,db)

@router.put("/api/admin/page-content/{slug}",dependencies=[Depends(same_origin)])
def save(slug:str,body:PageDocument,user=Depends(require("pages")),db=Depends(database)):
    page_store=store(slug)
    if slug in INTERACTIVE and not body.show_original:
        raise HTTPException(422,"Keep the interactive page body enabled to preserve forms and content lists.")
    import secrets
    db.add(Content(kind="page_revision",slug=secrets.token_hex(12),data={"page":slug,"document":page_store.state(db)["draft"]}))
    page_store.save(db,body.model_dump(mode="json"),user)
    db.commit()
    return state(slug,db)

@router.post("/api/admin/page-content/{slug}/publish",dependencies=[Depends(same_origin)])
def publish(slug:str,user=Depends(require("pages")),db=Depends(database)):
    store(slug).publish(db,user)
    db.commit()
    return state(slug,db)

@router.get("/api/admin/page-content/{slug}/revisions")
def revisions(slug:str,user=Depends(require("pages")),db=Depends(database)):
    store(slug)
    from sqlalchemy import select
    rows=db.scalars(select(Content).where(Content.kind=="page_revision",Content.data["page"].as_string()==slug).order_by(Content.created.desc()).limit(20))
    return {"items":[{"id":row.slug,"created":row.created,"document":row.data["document"]} for row in rows]}
