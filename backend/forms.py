"""Published contact form definitions stored in the existing CMS content table."""
import hashlib
import json
import re
import secrets
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field, StringConstraints, model_validator
from sqlalchemy import select
from schemas import Strict, Short
from models import Content
from db import database
from documents import PageStore
from security import require, same_origin

FieldKey = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]{0,39}$")]
Text = Annotated[str, StringConstraints(max_length=4000)]
CORE = {"name": "text", "email": "email", "description": "textarea"}
BUILTIN = {"name", "email", "phone", "description", "project_type", "location", "budget",
           "timeline", "service_interest", "requirements", "preferred_time"}

class FormField(Strict):
    key: FieldKey
    label: Short
    type: Literal["text", "email", "tel", "textarea", "select", "checkboxes"] = "text"
    placeholder: str = Field(default="", max_length=200)
    required: bool = False
    visible: bool = True
    options: list[Short] = Field(default_factory=list, max_length=40)
    min_length: int = Field(default=0, ge=0, le=4000)
    max_length: int = Field(default=160, ge=1, le=4000)
    width: Literal["half", "full"] = "half"

    @model_validator(mode="after")
    def valid(self):
        if self.min_length > self.max_length:
            raise ValueError("Minimum length exceeds maximum length.")
        if len(set(self.options)) != len(self.options):
            raise ValueError("Options must be unique.")
        if self.visible and self.type in {"select", "checkboxes"} and not self.options:
            raise ValueError("Choice fields need at least one option.")
        if self.key == "name" and self.max_length > 160:
            raise ValueError("Names support at most 160 characters.")
        if self.key == "email" and self.max_length > 254:
            raise ValueError("Emails support at most 254 characters.")
        if self.key == "description" and self.min_length < 10:
            raise ValueError("Messages need a minimum of 10 characters.")
        if self.key in CORE and (self.type != CORE[self.key] or not self.required or not self.visible):
            raise ValueError("Name, email and message must remain visible and required.")
        if self.key in BUILTIN and self.key not in CORE:
            expected = "checkboxes" if self.key == "requirements" else None
            if expected and self.type != expected:
                raise ValueError("Design priorities must use checkboxes.")
            if not expected and self.type == "checkboxes":
                raise ValueError("This built-in field accepts one value.")
        return self

class RequestOption(Strict):
    value: Literal["inquiry","consultation","quotation"]
    label: Short

class ContactDefinition(Strict):
    schema_version: Literal[1] = 1
    request_options: list[RequestOption] = Field(default_factory=lambda:[
        RequestOption(value="inquiry",label="General inquiry"),
        RequestOption(value="consultation",label="Consultation"),
        RequestOption(value="quotation",label="Quotation"),
    ], min_length=1,max_length=3)
    consent_label: str = Field(default="I agree that the studio may store these details to respond to my request.",min_length=1,max_length=500)
    title: Short = "Tell us about your project"
    submit_label: Short = "Send inquiry"
    success_message: Short = "Your inquiry has been received. The studio will reply by email."
    fields: list[FormField] = Field(min_length=3, max_length=24)

    @model_validator(mode="after")
    def valid(self):
        if len({option.value for option in self.request_options}) != len(self.request_options):
            raise ValueError("Request types must be unique.")
        keys = [item.key for item in self.fields]
        if len(keys) != len(set(keys)) or not set(CORE).issubset(keys):
            raise ValueError("Field keys must be unique and include name, email and description.")
        reserved = {"website", "consent", "kind", "form_id", "answers", "submission_id", "form_version"}
        if reserved.intersection(keys):
            raise ValueError("This field key is reserved.")
        return self

def default():
    def field(key, label, type="text", **kwargs):
        return {"key": key, "label": label, "type": type, **kwargs}
    return ContactDefinition(fields=[
        field("name", "Name", required=True),
        field("email", "Email", "email", required=True, max_length=254),
        field("phone", "Phone", "tel", max_length=50),
        field("description", "Tell us about your project", "textarea", required=True,
              min_length=10, max_length=4000, width="full", placeholder="What are you planning, and where?"),
        field("project_type", "Project type", "select", options=["Residential", "Commercial", "Interior Design", "Urban Planning", "Renovation"]),
        field("location", "Location", placeholder="City or area"),
        field("budget", "Budget range", "select", options=["Under $100k", "$100k–$250k", "$250k–$500k", "$500k+"]),
        field("timeline", "Timeline", "select", options=["As soon as possible", "Within 3 months", "3–6 months", "6–12 months", "More than a year", "Not sure yet"]),
        field("service_interest", "Service of interest", "select", options=["Architectural Design", "Interior Design", "Urban Planning", "Renovation and Remodeling", "3D Visualization", "Architecture Consultation"]),
        field("preferred_time", "Preferred days or times", placeholder="e.g. weekday mornings or after 5 pm"),
        field("requirements", "Design priorities", "checkboxes", width="full",
              options=["Natural light", "Accessibility", "Energy efficiency", "Flexible layout", "Outdoor space", "Adaptive reuse"]),
    ]).model_dump(mode="json")

store = PageStore("contact-form", ContactDefinition, default)
router = APIRouter()

def version(doc):
    return hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest()[:20]

def published(db):
    return ContactDefinition.model_validate(store.public(db)).model_dump(mode="json")

def validate_answers(doc, answers):
    fields = {field["key"]: field for field in doc["fields"] if field["visible"]}
    if set(answers) - set(fields):
        raise HTTPException(422, "The form has changed. Reload it and try again.")
    clean = {}
    for key, field in fields.items():
        value = answers.get(key, [] if field["type"] == "checkboxes" else "")
        if field["type"] == "checkboxes":
            if not isinstance(value, list) or len(value) > 40 or any(item not in field["options"] for item in value):
                raise HTTPException(422, field["label"] + ": choose valid options.")
            value = list(dict.fromkeys(value))
        else:
            if not isinstance(value, str):
                raise HTTPException(422, field["label"] + ": enter text.")
            value = value.strip()
            if value and not field["min_length"] <= len(value) <= field["max_length"]:
                raise HTTPException(422, field["label"] + ": check the text length.")
            if value and field["type"] == "select" and value not in field["options"]:
                raise HTTPException(422, field["label"] + ": choose a valid option.")
            if value and field["type"] == "email":
                from pydantic import TypeAdapter, EmailStr, ValidationError
                try:
                    TypeAdapter(EmailStr).validate_python(value)
                except ValidationError:
                    raise HTTPException(422, field["label"] + ": enter a valid email.") from None
        if field["required"] and not value:
            raise HTTPException(422, field["label"] + " is required.")
        clean[key] = value
    return clean

@router.get("/api/forms/contact")
def public_form(db=Depends(database)):
    doc = published(db)
    return {"definition": doc, "version": version(doc)}

@router.get("/api/admin/forms/contact")
def form_state(user=Depends(require("pages")), db=Depends(database)):
    revisions = db.scalars(select(Content).where(Content.kind == "form_revision").order_by(Content.created.desc()).limit(20))
    return {**store.state(db), "revisions": [{"id": row.slug, "created": row.created} for row in revisions]}

@router.put("/api/admin/forms/contact", dependencies=[Depends(same_origin)])
def save_form(body: ContactDefinition, user=Depends(require("pages")), db=Depends(database)):
    doc = body.model_dump(mode="json")
    db.add(Content(kind="form_revision", slug=secrets.token_hex(12), data=store.state(db)["draft"]))
    store.save(db, doc, user)
    db.commit()
    return form_state(user, db)

@router.post("/api/admin/forms/contact/publish", dependencies=[Depends(same_origin)])
def publish_form(user=Depends(require("pages")), db=Depends(database)):
    store.publish(db, user)
    db.commit()
    return form_state(user, db)

@router.get("/api/admin/forms/contact/revisions/{identifier}")
def form_revision(identifier: str, user=Depends(require("pages")), db=Depends(database)):
    row = db.get(Content, ("form_revision", identifier))
    if not row:
        raise HTTPException(404, "Revision not found.")
    return row.data


@router.get("/api/admin/cms-overview")
def cms_overview(user=Depends(require("dashboard")), db=Depends(database)):
    from sqlalchemy import func
    from models import Project, Service
    count = lambda query: db.scalar(select(func.count()).select_from(query.subquery()))
    return {"content": {
        "projects": count(select(Project).where(Project.status == "published")),
        "drafts": count(select(Project).where(Project.status != "published")),
        "services": count(select(Service).where(Service.status == "published")),
        "articles": count(select(Content).where(Content.kind == "blog", Content.data["published"].as_boolean().is_(True))),
    }}
