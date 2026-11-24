from typing import Literal
from pydantic import Field
from fastapi import APIRouter, Depends
from schemas import Strict, Href, Short
from documents import PageStore
from db import database
from security import require, same_origin

class MenuItem(Strict):
    label: Short
    href: Href
    visible: bool = True
    services: bool = False

class FooterColumn(Strict):
    title: Short
    links: list[MenuItem] = Field(default_factory=list, max_length=12)

class Navigation(Strict):
    schema_version: Literal[1] = 1
    links: list[MenuItem] = Field(default_factory=list, max_length=12)
    cta: MenuItem
    footer_tagline: str = Field(default="", max_length=300)
    footer_columns: list[FooterColumn] = Field(default_factory=list, max_length=3)

    # The service submenu belongs to one navigation item so its ARIA IDs stay unique.
    @classmethod
    def defaults(cls):
        return cls(links=[
            MenuItem(label=label, href=href, services=href == "/services")
            for label, href in [("Home","/"),("About","/about"),("Projects","/projects"),("Services","/services"),
                               ("Team","/team"),("Plan with AI","/plan-your-project"),("Journal","/blog"),("Contact","/contact")]
        ], cta=MenuItem(label="Book Consultation",href="/contact?type=consultation"),
           footer_tagline="Architecture and design for the way we live.",
           footer_columns=[
               FooterColumn(title="Explore",links=[MenuItem(label=label,href=href) for label,href in
                    [("Projects","/projects"),("Services","/services"),("Studio","/about"),("Team","/team"),("Journal","/blog")]]),
               FooterColumn(title="Services",links=[MenuItem(label=label,href=href) for label,href in
                    [("Residential","/services/residential-architecture"),("Commercial","/services/commercial-architecture"),
                     ("Interiors","/services/interior-design"),("Plan your project","/plan-your-project"),("All services","/services")]]),
           ]).model_dump(mode="json")

store=PageStore("navigation",Navigation,Navigation.defaults)
router=APIRouter()

@router.get("/api/navigation")
def published(db=Depends(database)):
    return store.public(db)

@router.get("/api/admin/navigation")
def state(user=Depends(require("pages")),db=Depends(database)):
    return store.state(db)

@router.put("/api/admin/navigation",dependencies=[Depends(same_origin)])
def save(body:Navigation,user=Depends(require("pages")),db=Depends(database)):
    if sum(item.services for item in body.links)>1:
        from fastapi import HTTPException
        raise HTTPException(422,"Only one Services dropdown is supported.")
    from models import Content
    import secrets
    db.add(Content(kind="menu_revision",slug=secrets.token_hex(12),data=store.state(db)["draft"]))
    store.save(db,body.model_dump(mode="json"),user)
    db.commit()
    return store.state(db)

@router.post("/api/admin/navigation/publish",dependencies=[Depends(same_origin)])
def publish(user=Depends(require("pages")),db=Depends(database)):
    store.publish(db,user)
    db.commit()
    return store.state(db)


@router.get("/api/admin/navigation/revisions")
def revisions(user=Depends(require("pages")),db=Depends(database)):
    from models import Content
    from sqlalchemy import select
    rows=db.scalars(select(Content).where(Content.kind=="menu_revision").order_by(Content.created.desc()).limit(20))
    return {"items":[{"id":row.slug,"created":row.created,"document":row.data} for row in rows]}
