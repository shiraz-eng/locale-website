import json
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import String, cast, func, or_, select
from db import database
from models import Consultation, Content, ConversionEvent, Inquiry, LeadActivity, LeadNote, Project, ProjectCategory, Service, User
import schemas as s
import ai
from common import AI_DAILY, activity, group, percent, source_of
from security import can, limit, quota, require, same_origin

router = APIRouter()
STAGES = ["New Inquiry", "Contacted", "Consultation Scheduled", "Proposal Sent", "Negotiation", "Contract Won"]
CLOSED = ("Contract Won", "Contract Lost")
priority_of = func.coalesce(Inquiry.priority, Inquiry.qualification["label"].as_string())
status_of = LeadActivity.detail["status"].as_string()

def inquiry(row):
    return {"id": row.id, **row.data, "status": row.status, "kind": row.kind, "attribution": row.attribution,
            "brief": row.brief, "qualification": row.qualification,
            "priority": row.priority or (row.qualification or {}).get("label"), "priority_override": row.priority,
            "assigned_to": row.assigned_to, "contract_value": float(row.contract_value) if row.contract_value is not None else None,
            "follow_up_at": row.follow_up_at, "next_action": row.next_action, "lost_reason": row.lost_reason,
            "has_conversation": bool(row.conversation), "messages": len(row.conversation or []), "created": row.created, "updated": row.updated}

def consultation(row, lead_row=None):
    data = {"id": row.id, "inquiry_id": row.inquiry_id, "status": row.status, "preferred_time": row.preferred_time,
            "scheduled_at": row.scheduled_at, "assigned_to": row.assigned_to, "notes": row.notes,
            "created": row.created, "updated": row.updated}
    if lead_row is not None:
        data["lead"] = {key: lead_row.data.get(key) for key in ("name", "email", "phone", "project_type", "location",
                                                                  "budget", "timeline", "description")}
        data["lead"].update(status=lead_row.status, brief_title=(lead_row.brief or {}).get("title", ""))
    return data

def lead_detail(db, row):
    notes = db.scalars(select(LeadNote).where(LeadNote.inquiry_id == row.id).order_by(LeadNote.created.desc()))
    events = db.scalars(select(LeadActivity).where(LeadActivity.inquiry_id == row.id).order_by(LeadActivity.created.desc(), LeadActivity.id.desc()))
    meetings = db.scalars(select(Consultation).where(Consultation.inquiry_id == row.id).order_by(Consultation.created.desc()))
    return {**inquiry(row), "conversation": row.conversation or [],
            "notes": [{"id": note.id, "author": note.author, "text": note.text, "created": note.created} for note in notes],
            "activity": [{"kind": item.kind, "detail": item.detail, "author": item.author, "created": item.created} for item in events],
            "consultations": [consultation(item) for item in meetings]}

def lead(db, identifier):
    row = db.get(Inquiry, identifier)
    if not row:
        raise HTTPException(404, "Inquiry not found.")
    return row

def staff_member(db, email):
    if email and not db.scalar(select(User.email).where(User.email == email.lower(), User.active.is_(True))):
        raise HTTPException(422, "Assign the lead to an active team member.")
    return email.lower() if email else None

def minimized(row):
    # Gemini never receives names, email addresses or phone numbers.
    data = {key: value for key, value in row.data.items() if key not in ("name", "email", "phone", "consent", "answers", "form_definition", "submission_id", "form_version", "form_id", "website")}
    visitor = [item["text"] for item in row.conversation or [] if item.get("role") == "user"]
    return {**data, "request_type": row.kind, "brief": row.brief, "visitor_messages": visitor[-12:]}

def stored(column):
    # Rows can hold SQL NULL or a JSON null depending on when they were written.
    return func.coalesce(cast(column, String), "null") != "null"

def lead_filters(query, user, q="", status="", priority="", kind="", assigned="", due=False, ai_data=""):
    if ai_data == "conversation":
        query = query.where(stored(Inquiry.conversation))
    elif ai_data == "brief":
        query = query.where(stored(Inquiry.brief))
    if status:
        query = query.where(Inquiry.status == status)
    if priority:
        query = query.where(priority_of == priority)
    if kind:
        query = query.where(Inquiry.kind == kind)
    if assigned == "me":
        query = query.where(Inquiry.assigned_to == user.email)
    elif assigned == "none":
        query = query.where(Inquiry.assigned_to.is_(None))
    elif assigned:
        query = query.where(Inquiry.assigned_to == assigned)
    if due:
        query = query.where(Inquiry.follow_up_at <= date.today(), Inquiry.status.not_in(CLOSED))
    if q:
        query = query.where(cast(Inquiry.data, String).icontains(q, autoescape=True))
    return query

@router.get("/api/admin/inquiries")
def inquiries(q: str = Query("", max_length=160), status: str = Query("", max_length=30),
              priority: str = Query("", max_length=30), kind: str = Query("", max_length=20),
              assigned: str = Query("", max_length=254), due: bool = False, page: int = Query(1, ge=1, le=10000),
              sort: str = Query("created", pattern="^(created|follow_up|value)$"),
              ai_data: str = Query("", pattern="^(|conversation|brief)$"),
              user=Depends(require("leads")), db=Depends(database)):
    query = lead_filters(select(Inquiry), user, q, status, priority, kind, assigned, due, ai_data)
    order = {"created": [Inquiry.created.desc()], "follow_up": [Inquiry.follow_up_at.asc().nulls_last()],
             "value": [Inquiry.contract_value.desc().nulls_last()]}[sort]
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = list(db.scalars(query.order_by(*order, Inquiry.id.desc()).offset((page - 1) * 25).limit(25)))
    return {"items": [inquiry(row) for row in rows], "total": total, "more": page * 25 < total}

@router.get("/api/admin/inquiries/{identifier}")
def inquiry_detail(identifier: int, user=Depends(require("leads")), db=Depends(database)):
    return lead_detail(db, lead(db, identifier))

def change_status(db, row, status, user):
    if status != row.status:
        activity(db, row.id, "status", user.email, previous=row.status, status=status)
        row.status = status

@router.patch("/api/admin/inquiries/{identifier}", dependencies=[Depends(same_origin)])
def update_inquiry(identifier: int, body: s.InquiryUpdate, user=Depends(require("leads")), db=Depends(database)):
    row = lead(db, identifier)
    change_status(db, row, body.status, user)
    assignee = staff_member(db, body.assigned_to)
    changes = {"assigned_to": (row.assigned_to, assignee), "priority": (row.priority, body.priority),
               "follow_up_at": (row.follow_up_at, body.follow_up_at), "next_action": (row.next_action, body.next_action),
               "contract_value": (row.contract_value, body.contract_value)}
    for key, (before, after) in changes.items():
        if before != after and not (before is None and after == ""):
            activity(db, row.id, key, user.email, value=str(after) if after is not None else None)
    row.assigned_to, row.priority, row.next_action = assignee, body.priority, body.next_action
    row.follow_up_at, row.contract_value = body.follow_up_at, body.contract_value
    row.lost_reason = body.lost_reason if body.status == "Contract Lost" else None
    db.commit()
    return lead_detail(db, row)

@router.post("/api/admin/inquiries/{identifier}/stage", dependencies=[Depends(same_origin)])
def move_stage(identifier: int, body: s.Stage, user=Depends(require("pipeline")), db=Depends(database)):
    row = lead(db, identifier)
    change_status(db, row, body.status, user)
    if body.status != "Contract Lost":
        row.lost_reason = None
    db.commit()
    return inquiry(row)

@router.post("/api/admin/inquiries/{identifier}/notes", dependencies=[Depends(same_origin)])
def add_note(identifier: int, body: s.Note, user=Depends(require("leads")), db=Depends(database)):
    row = lead(db, identifier)
    db.add(LeadNote(inquiry_id=row.id, author=user.email, text=body.text))
    activity(db, row.id, "note", user.email)
    db.commit()
    return lead_detail(db, row)

def staff_ai(request):
    limit(request, "staff-ai", 60, 600)
    quota("ai-daily", AI_DAILY, 86400)

@router.post("/api/admin/inquiries/{identifier}/qualify", dependencies=[Depends(same_origin)])
def qualify(identifier: int, request: Request, user=Depends(require("leads")), db=Depends(database)):
    staff_ai(request)
    row = lead(db, identifier)
    services = list(db.scalars(select(Service.name).where(Service.status == "published")))
    details = minimized(row)
    db.commit()
    row.qualification = ai.qualify(details, services).model_dump()
    activity(db, row.id, "ai_analysis", user.email, label=row.qualification["label"])
    db.commit()
    return lead_detail(db, row)

@router.post("/api/admin/inquiries/{identifier}/draft", dependencies=[Depends(same_origin)])
def draft(identifier: int, body: s.DraftRequest, request: Request, user=Depends(require("leads")), db=Depends(database)):
    staff_ai(request)
    row = lead(db, identifier)
    settings = db.get(Content, ("settings", "studio"))
    details = {**minimized(row), "missing_information": (row.qualification or {}).get("missing", [])}
    name = row.data.get("name", "").split()
    db.commit()
    result = ai.draft(body.type, details, settings.data["title"] if settings else "the studio")
    # The name is filled in locally so it never leaves the server.
    return {"subject": result.subject, "body": result.body.replace("[Name]", name[0] if name else "there")}

@router.get("/api/admin/pipeline")
def board(q: str = Query("", max_length=160), assigned: str = Query("", max_length=254),
          user=Depends(require("pipeline")), db=Depends(database)):
    query = lead_filters(select(Inquiry), user, q=q, assigned=assigned)
    columns = []
    for stage in [*STAGES, "Contract Lost"]:
        scoped = query.where(Inquiry.status == stage)
        totals = scoped.subquery()
        count, value = db.execute(select(func.count(), func.coalesce(func.sum(totals.c.contract_value), 0))).one()
        rows = db.scalars(scoped.order_by(Inquiry.updated.desc()).limit(60))
        columns.append({"status": stage, "count": count, "value": float(value), "items": [inquiry(row) for row in rows]})
    return {"columns": columns}

@router.get("/api/admin/consultations")
def consultations(status: str = Query("", max_length=20), q: str = Query("", max_length=160),
                  assigned: str = Query("", max_length=254), user=Depends(require("consultations")), db=Depends(database)):
    query = select(Consultation, Inquiry).join(Inquiry, Inquiry.id == Consultation.inquiry_id)
    if status:
        query = query.where(Consultation.status == status)
    if assigned == "me":
        query = query.where(Consultation.assigned_to == user.email)
    if q:
        query = query.where(or_(cast(Inquiry.data, String).icontains(q, autoescape=True),
                                Consultation.notes.icontains(q, autoescape=True)))
    rows = db.execute(query.order_by(Consultation.scheduled_at.asc().nulls_first(), Consultation.created.desc()).limit(200))
    return {"items": [consultation(item, row) for item, row in rows]}

def save_consultation(db, row, body, user):
    for key in ("status", "scheduled_at"):
        if getattr(row, key) != getattr(body, key):
            activity(db, row.inquiry_id, "consultation", user.email, consultation=row.id, **{key: str(getattr(body, key))})
    row.status, row.preferred_time, row.scheduled_at = body.status, body.preferred_time, body.scheduled_at
    row.assigned_to, row.notes = staff_member(db, body.assigned_to), body.notes

@router.post("/api/admin/inquiries/{identifier}/consultations", dependencies=[Depends(same_origin)])
def create_consultation(identifier: int, body: s.ConsultationInput, user=Depends(require("consultations")), db=Depends(database)):
    row = lead(db, identifier)
    item = Consultation(inquiry_id=row.id, status="Pending")
    db.add(item)
    db.flush()
    save_consultation(db, item, body, user)
    db.commit()
    return consultation(item, row)

@router.patch("/api/admin/consultations/{identifier}", dependencies=[Depends(same_origin)])
def update_consultation(identifier: int, body: s.ConsultationInput, user=Depends(require("consultations")), db=Depends(database)):
    item = db.get(Consultation, identifier)
    if not item:
        raise HTTPException(404, "Consultation not found.")
    save_consultation(db, item, body, user)
    db.commit()
    return consultation(item, db.get(Inquiry, item.inquiry_id))

def date_range(start, end):
    end = end or date.today()
    start = start or end - timedelta(days=29)
    if start > end or (end - start).days > 366:
        raise HTTPException(422, "Choose a range of up to one year with the start before the end.")
    return (datetime.combine(start, time.min, timezone.utc), datetime.combine(end + timedelta(days=1), time.min, timezone.utc),
            start, end)

def trend(db, column, low, high, first, last, where=()):
    monthly = (last - first).days > 92
    bucket = func.to_char(column, "YYYY-MM" if monthly else "YYYY-MM-DD")
    counts = group(db, select(bucket, func.count()).where(column >= low, column < high, *where).group_by(bucket))
    keys, day = [], first
    while day <= last:
        key = day.strftime("%Y-%m" if monthly else "%Y-%m-%d")
        if key not in keys:
            keys.append(key)
        day += timedelta(days=1)
    return [{"key": key, "count": counts.get(key, 0)} for key in keys]

def stage_events(db, stage, low, high):
    return db.scalar(select(func.count(func.distinct(LeadActivity.inquiry_id))).where(
        LeadActivity.kind == "status", status_of == stage, LeadActivity.created >= low, LeadActivity.created < high))

@router.get("/api/admin/dashboard")
def dashboard(start: date | None = None, end: date | None = None, user=Depends(require("dashboard")), db=Depends(database)):
    low, high, first, last = date_range(start, end)
    published = func.coalesce(Content.data["published"].as_boolean(), True)
    result = {"range": {"start": first, "end": last}, "content": {
        "projects": db.scalar(select(func.count()).select_from(Project).where(Project.status == "published")),
        "drafts": db.scalar(select(func.count()).select_from(Project).where(Project.status == "draft"))
                  + db.scalar(select(func.count()).select_from(Content).where(Content.kind == "blog", published.is_(False))),
        "services": db.scalar(select(func.count()).select_from(Service).where(Service.status == "published")),
        "articles": db.scalar(select(func.count()).select_from(Content).where(Content.kind == "blog", published.is_(True)))}}
    if can(user, "leads"):
        window = (Inquiry.created >= low, Inquiry.created < high)
        total = db.scalar(select(func.count()).select_from(Inquiry).where(*window))
        cohort = select(Inquiry.id).where(*window)
        won_cohort = db.scalar(select(func.count(func.distinct(LeadActivity.inquiry_id))).where(
            LeadActivity.kind == "status", status_of == "Contract Won", LeadActivity.inquiry_id.in_(cohort)))
        sources = Counter(source_of(value) for value in db.scalars(select(Inquiry.attribution).where(*window)))
        result.update(metrics={
            "total": total,
            "new": db.scalar(select(func.count()).select_from(Inquiry).where(*window, Inquiry.status == "New Inquiry")),
            "consultations": db.scalar(select(func.count()).select_from(Consultation).where(
                Consultation.status.in_(["Confirmed", "Completed"]), Consultation.updated >= low, Consultation.updated < high)),
            "proposals": stage_events(db, "Proposal Sent", low, high),
            "won": stage_events(db, "Contract Won", low, high),
            "conversion": percent(won_cohort, total)},
            trend=trend(db, Inquiry.created, low, high, first, last), sources=dict(sources.most_common(8)),
            recent=[inquiry(row) for row in db.scalars(select(Inquiry).where(*window).order_by(Inquiry.created.desc()).limit(6))],
            activity=[{"kind": item.kind, "detail": item.detail, "author": item.author, "created": item.created,
                       "inquiry_id": item.inquiry_id, "name": name} for item, name in db.execute(
                select(LeadActivity, Inquiry.data["name"].as_string()).join(Inquiry, Inquiry.id == LeadActivity.inquiry_id)
                .order_by(LeadActivity.created.desc(), LeadActivity.id.desc()).limit(10))])
    if can(user, "consultations"):
        rows = db.execute(select(Consultation, Inquiry).join(Inquiry, Inquiry.id == Consultation.inquiry_id).where(
            Consultation.status.in_(["Pending", "Confirmed"]),
            or_(Consultation.scheduled_at.is_(None), Consultation.scheduled_at >= datetime.now(timezone.utc)))
            .order_by(Consultation.scheduled_at.asc().nulls_last(), Consultation.created.asc()).limit(6))
        result["upcoming"] = [consultation(item, row) for item, row in rows]
    return result

@router.get("/api/admin/analytics")
def analytics(start: date | None = None, end: date | None = None, user=Depends(require("analytics")), db=Depends(database)):
    low, high, first, last = date_range(start, end)
    window = (ConversionEvent.created >= low, ConversionEvent.created < high)
    events = group(db, select(ConversionEvent.name, func.count()).where(*window).group_by(ConversionEvent.name))
    labels = group(db, select(ConversionEvent.label, func.count()).where(*window, ConversionEvent.name == "cta_click")
                   .group_by(ConversionEvent.label).order_by(func.count().desc()).limit(12))
    paths = group(db, select(ConversionEvent.path, func.count()).where(*window, ConversionEvent.path != "")
                  .group_by(ConversionEvent.path).order_by(func.count().desc()).limit(10))
    projects = group(db, select(ConversionEvent.project, func.count()).where(*window, ConversionEvent.project.is_not(None))
                     .group_by(ConversionEvent.project).order_by(func.count().desc()).limit(10))
    leads = db.execute(select(Inquiry.attribution, Inquiry.status, Inquiry.kind).where(Inquiry.created >= low, Inquiry.created < high)).all()
    by_source = defaultdict(lambda: {"leads": 0, "won": 0})
    for attribution, status, _ in leads:
        by_source[source_of(attribution)]["leads"] += 1
        by_source[source_of(attribution)]["won"] += status == "Contract Won"
    submissions = sum(events.get(name, 0) for name in ("inquiry_submit", "consultation_request", "quotation_request", "brief_submit"))
    return {"range": {"start": first, "end": last}, "events": events, "cta_labels": labels, "paths": paths,
            "projects": projects, "sources": dict(by_source), "kinds": dict(Counter(kind for _, _, kind in leads)),
            "trend": trend(db, ConversionEvent.created, low, high, first, last),
            "funnel": [["CTA clicks", events.get("cta_click", 0)], ["Assistant opened", events.get("assistant_open", 0)],
                       ["Briefs generated", events.get("planner_complete", 0) + events.get("assistant_brief", 0)],
                       ["Requests submitted", submissions]]}

def pipeline(db):
    history = defaultdict(set)
    for identifier, status in db.execute(select(LeadActivity.inquiry_id, status_of).where(LeadActivity.kind == "status")):
        history[identifier].add(status)
    rows = db.execute(select(Inquiry.id, Inquiry.status, Inquiry.kind, priority_of, Inquiry.attribution,
                             Inquiry.data["service_interest"].as_string(), Inquiry.data["consultation"].as_boolean(),
                             Inquiry.follow_up_at)).all()
    reached, current, sources, services, kinds = Counter(), Counter(), Counter(), Counter(), Counter()
    qualified = requests = due = 0
    for identifier, status, kind, priority, attribution, service, consultation_flag, follow_up in rows:
        # A lead that skipped stages (e.g. straight to Contract Won) still counts as having passed them.
        top = max((STAGES.index(value) for value in history[identifier] | {status} if value in STAGES), default=0)
        reached.update(STAGES[:top + 1])
        current[status] += 1
        kinds[kind] += 1
        sources[source_of(attribution)] += 1
        services[service or (attribution or {}).get("service") or "Not specified"] += 1
        qualified += priority == "Ready for Consultation"
        requests += kind == "consultation" or bool(consultation_flag)
        due += bool(follow_up and follow_up <= date.today() and status not in CLOSED)
    total = len(rows)
    return {"total": total, "qualified": qualified, "consultation_requests": requests,
            "quotation_requests": kinds["quotation"], "consultations": reached["Consultation Scheduled"],
            "proposals": reached["Proposal Sent"], "won": reached["Contract Won"], "lost": current["Contract Lost"],
            "inquiry_to_consultation": percent(reached["Consultation Scheduled"], total),
            "lead_to_contract": percent(reached["Contract Won"], total), "follow_ups_due": due,
            "stages": {stage: current[stage] for stage in [*STAGES, "Contract Lost"]}, "kinds": dict(kinds),
            "sources": dict(sources), "services": dict(services)}

def summaries(db):
    month = func.to_char(Inquiry.created, "YYYY-MM")
    interests = Inquiry.data["project_type"].as_string()
    budget = Inquiry.data["budget"].as_string()
    service = Inquiry.data["service_interest"].as_string()
    requirements, styles, locations, projects = Counter(), Counter(), Counter(), Counter()
    for values, brief, location, attribution in db.execute(select(
            Inquiry.data["requirements"], Inquiry.brief, Inquiry.data["location"].as_string(), Inquiry.attribution)):
        if isinstance(values, list):
            requirements.update(set(values))
        brief = brief or {}
        styles.update(set(brief.get("styles", [])))
        requirements.update(set(brief.get("space_requirements", [])[:6]))
        place = (location or brief.get("location") or "").strip()[:60]
        if place:
            locations[place.title()] += 1
        if (attribution or {}).get("project"):
            projects[attribution["project"]] += 1
    return {
        "months": group(db, select(month, func.count()).group_by(month).order_by(month.desc()).limit(12)),
        "interests": group(db, select(interests, func.count()).group_by(interests)),
        "services_requested": group(db, select(service, func.count()).group_by(service)),
        "requirements": dict(requirements.most_common(25)),
        "design_styles": dict(styles),
        "locations": dict(locations.most_common(15)),
        "inquiries_by_portfolio_project": dict(projects),
        "budgets": group(db, select(budget, func.count()).where(budget != "").group_by(budget)),
        "lost_reasons": group(db, select(Inquiry.lost_reason, func.count()).group_by(Inquiry.lost_reason)),
        "open_follow_ups_due": db.scalar(select(func.count()).select_from(Inquiry).where(
            Inquiry.follow_up_at <= date.today(), Inquiry.status.not_in(CLOSED))),
        "unassigned_open_leads": db.scalar(select(func.count()).select_from(Inquiry).where(
            Inquiry.assigned_to.is_(None), Inquiry.status.not_in(CLOSED))),
        "pending_consultations": db.scalar(select(func.count()).select_from(Consultation).where(Consultation.status == "Pending")),
    }

@router.post("/api/admin/insights", dependencies=[Depends(same_origin)])
def insights(request: Request, user=Depends(require("insights")), db=Depends(database)):
    limit(request, "insights", 5, 600)
    quota("ai-daily", AI_DAILY, 86400)
    data = {**summaries(db), "portfolio_categories": group(db, select(ProjectCategory.name, func.count()).join(
        Project, Project.category_id == ProjectCategory.id).where(Project.status == "published").group_by(ProjectCategory.name))}
    data["pipeline"] = pipeline(db)
    db.commit()
    if not data["interests"]:
        raise HTTPException(409, "Collect inquiries before generating insights.")
    return ai.generate("You analyze aggregate lead data for an architecture studio. Summarize: the most requested "
                       "services and project types, common customer requirements, popular design styles, frequently "
                       "requested locations, changes in monthly inquiry volume, where opportunities stall or are lost "
                       "and the recorded reasons, which channels bring leads, follow-up opportunities (overdue follow-ups, "
                       "unassigned leads, pending consultations), and portfolio improvements (for example categories in "
                       "demand but thinly represented in the portfolio). Ground every point in the counts, quote the "
                       "numbers, and say when data is insufficient. Do not invent figures.",
                       json.dumps(data, default=str))
