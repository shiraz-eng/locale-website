"""Small inquiry workspace over existing inquiry, note and activity records."""
import csv
import io
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import String, cast, case, delete, func, select
from starlette.responses import Response
from db import database
from models import Inquiry, LeadNote
from schemas import Strict
from security import require, same_origin
from common import activity, audit

router = APIRouter()
Status = Literal["New", "Contacted", "In Progress", "Completed", "Closed"]
LEGACY = {"New Inquiry": "New", "Consultation Scheduled": "In Progress", "Proposal Sent": "In Progress",
          "Negotiation": "In Progress", "Contract Won": "Completed", "Contract Lost": "Closed"}
simple_status = case(LEGACY, value=Inquiry.status, else_=Inquiry.status)

def query_rows(q, status):
    query = select(Inquiry)
    if q:
        query = query.where(cast(Inquiry.data, String).icontains(q, autoescape=True))
    if status:
        query = query.where(simple_status == status)
    return query

def serialize(row):
    return {"id": row.id, "data": row.data, "kind": row.kind,
            "status": LEGACY.get(row.status, row.status), "created": row.created,
            "source": row.attribution, "brief": row.brief}

def get(db, identifier):
    row = db.get(Inquiry, identifier)
    if not row:
        raise HTTPException(404, "Inquiry not found.")
    return row

@router.get("/api/admin/messages")
def listing(q: str = Query("", max_length=160), status: Status | None = None, page: int = Query(1, ge=1, le=10000),
            user=Depends(require("leads")), db=Depends(database)):
    query = query_rows(q, status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(Inquiry.created.desc(), Inquiry.id.desc()).offset((page-1)*25).limit(25))
    return {"items": [serialize(row) for row in rows], "total": total, "more": page*25 < total}

@router.get("/api/admin/messages/export")
def export(q: str = Query("", max_length=160), status: Status | None = None,
           user=Depends(require("leads")), db=Depends(database)):
    rows = list(db.scalars(query_rows(q, status).order_by(Inquiry.created.desc()).limit(5001)))
    if len(rows) > 5000:
        raise HTTPException(422, "Filter the list to 5,000 inquiries or fewer before exporting.")
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Phone", "Project type", "Location", "Message", "Status", "Submitted", "Source", "Requirements", "Additional answers"])
    def safe(value):
        value = str(value or "")
        return "'" + value if value.lstrip().startswith(("=", "+", "-", "@")) else value
    for row in rows:
        data = row.data
        writer.writerow([safe(value) for value in [
            row.id, data.get("name"), data.get("email"), data.get("phone"), data.get("project_type"), data.get("location"),
            data.get("description"), LEGACY.get(row.status, row.status), row.created.isoformat(),
            (row.attribution or {}).get("page"), ", ".join(data.get("requirements") or []), str(data.get("answers") or {}),
        ]])
    audit(db, user, "export", "inquiries", detail={"count": len(rows)})
    db.commit()
    return Response(output.getvalue(), media_type="text/csv", headers={
        "Content-Disposition": 'attachment; filename="inquiries.csv"', "Cache-Control": "private, no-store"})

@router.get("/api/admin/messages/{identifier}")
def detail(identifier: int, user=Depends(require("leads")), db=Depends(database)):
    row = get(db, identifier)
    notes = db.scalars(select(LeadNote).where(LeadNote.inquiry_id == identifier).order_by(LeadNote.created.desc()))
    return {**serialize(row), "notes": [{"id": note.id, "text": note.text, "author": note.author, "created": note.created} for note in notes]}

class Update(Strict):
    status: Status

@router.patch("/api/admin/messages/{identifier}", dependencies=[Depends(same_origin)])
def update(identifier: int, body: Update, user=Depends(require("leads")), db=Depends(database)):
    row = get(db, identifier)
    activity(db, identifier, "status", user.email, previous=row.status, status=body.status)
    row.status = body.status
    db.commit()
    return detail(identifier, user, db)

class Note(Strict):
    text: str = Field(min_length=1, max_length=8000)

@router.post("/api/admin/messages/{identifier}/notes", dependencies=[Depends(same_origin)])
def note(identifier: int, body: Note, user=Depends(require("leads")), db=Depends(database)):
    get(db, identifier)
    db.add(LeadNote(inquiry_id=identifier, author=user.email, text=body.text))
    db.commit()
    return detail(identifier, user, db)

@router.delete("/api/admin/messages/{identifier}", dependencies=[Depends(same_origin)])
def remove(identifier: int, user=Depends(require("inquiry_delete")), db=Depends(database)):
    row = get(db, identifier)
    audit(db, user, "delete", "inquiry", identifier)
    db.delete(row)
    db.commit()
    return {"ok": True}
