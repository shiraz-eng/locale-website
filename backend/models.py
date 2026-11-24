from sqlalchemy import Column, String, Integer, Date, DateTime, JSON, Boolean, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from db import Base

class Content(Base):
    __tablename__ = "content"
    kind = Column(String(20), primary_key=True)
    slug = Column(String(120), primary_key=True)
    data = Column(JSON, nullable=False)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class Inquiry(Base):
    __tablename__ = "inquiries"
    id = Column(Integer, primary_key=True)
    data = Column(JSON, nullable=False)
    status = Column(String(30), nullable=False, default="New Inquiry", index=True)
    kind = Column(String(20), nullable=False, default="inquiry", index=True)
    attribution = Column(JSON, nullable=False, default=dict)
    brief = Column(JSON)
    conversation = Column(JSON)
    # AI analysis is advisory; priority holds a staff override and wins when set.
    qualification = Column(JSON)
    priority = Column(String(30))
    assigned_to = Column(ForeignKey("users.email", ondelete="SET NULL"), index=True)
    contract_value = Column(Numeric(14, 2))
    follow_up_at = Column(Date)
    next_action = Column(Text, nullable=False, default="")
    lost_reason = Column(String(40))
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class LeadNote(Base):
    __tablename__ = "lead_notes"
    id = Column(Integer, primary_key=True)
    inquiry_id = Column(ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False, index=True)
    author = Column(String(254), nullable=False)
    text = Column(Text, nullable=False)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class LeadActivity(Base):
    __tablename__ = "lead_activity"
    id = Column(Integer, primary_key=True)
    inquiry_id = Column(ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(30), nullable=False, index=True)
    detail = Column(JSON, nullable=False, default=dict)
    author = Column(String(254), nullable=False)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class Consultation(Base):
    __tablename__ = "consultations"
    id = Column(Integer, primary_key=True)
    inquiry_id = Column(ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="Pending", index=True)
    # What the visitor asked for, in their words; scheduled_at is set by staff once agreed.
    preferred_time = Column(String(160), nullable=False, default="")
    scheduled_at = Column(DateTime(timezone=True))
    assigned_to = Column(ForeignKey("users.email", ondelete="SET NULL"), index=True)
    notes = Column(Text, nullable=False, default="")
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class MediaAsset(Base):
    __tablename__ = "media_assets"
    id = Column(Integer, primary_key=True)
    url = Column(String(300), nullable=False, unique=True)
    name = Column(String(200), nullable=False, default="")
    content_type = Column(String(40), nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    size = Column(Integer, nullable=False)
    alt = Column(String(300), nullable=False, default="")
    uploaded_by = Column(String(254), nullable=False)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    actor = Column(String(254), nullable=False)
    action = Column(String(40), nullable=False)
    entity = Column(String(40), nullable=False)
    entity_id = Column(String(160), nullable=False, default="")
    detail = Column(JSON, nullable=False, default=dict)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True)
    # slug/name/category mirror the draft for admin listing; live_slug and published hold what visitors see.
    slug = Column(String(120), nullable=False, unique=True)
    live_slug = Column(String(120), unique=True)
    redirects = Column(JSONB, nullable=False, default=list)
    name = Column(String(160), nullable=False)
    category = Column(String(60), nullable=False, default="")
    featured = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="draft", index=True)
    schema_version = Column(Integer, nullable=False, default=1)
    draft = Column(JSONB, nullable=False)
    published = Column(JSONB)
    published_at = Column(DateTime(timezone=True))
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class ServiceRevision(Base):
    __tablename__ = "service_revisions"
    id = Column(Integer, primary_key=True)
    service_id = Column(ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    kind = Column(String(20), nullable=False)
    document = Column(JSONB, nullable=False)
    author = Column(String(254), nullable=False)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class ProjectCategory(Base):
    __tablename__ = "project_categories"
    id = Column(Integer, primary_key=True)
    slug = Column(String(120), nullable=False, unique=True)
    name = Column(String(80), nullable=False)
    description = Column(Text, nullable=False, default="")
    sort_order = Column(Integer, nullable=False, default=0)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    # Columns mirror the draft for admin listing; live_slug and published hold what visitors see.
    slug = Column(String(120), nullable=False, unique=True)
    live_slug = Column(String(120), unique=True)
    redirects = Column(JSONB, nullable=False, default=list)
    title = Column(String(160), nullable=False)
    category_id = Column(ForeignKey("project_categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    featured = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="draft", index=True)
    schema_version = Column(Integer, nullable=False, default=1)
    draft = Column(JSONB, nullable=False)
    published = Column(JSONB)
    published_at = Column(DateTime(timezone=True))
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class ProjectRevision(Base):
    __tablename__ = "project_revisions"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    kind = Column(String(20), nullable=False)
    document = Column(JSONB, nullable=False)
    author = Column(String(254), nullable=False)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class ConversionEvent(Base):
    __tablename__ = "conversion_events"
    id = Column(Integer, primary_key=True)
    name = Column(String(40), nullable=False, index=True)
    label = Column(String(60), nullable=False, default="")
    path = Column(String(300), nullable=False, default="")
    project = Column(String(120))
    service = Column(String(120))
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

class User(Base):
    __tablename__ = "users"
    email = Column(String(254), primary_key=True)
    password = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)
    name = Column(String(120), nullable=False, default="")
    active = Column(Boolean, nullable=False, default=True)
    created = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class LoginSession(Base):
    __tablename__ = "login_sessions"
    digest = Column(String(64), primary_key=True)
    email = Column(ForeignKey("users.email", ondelete="CASCADE"), nullable=False, index=True)
    expires = Column(DateTime(timezone=True), nullable=False)

class RateBucket(Base):
    __tablename__ = "rate_buckets"
    key = Column(String(128), primary_key=True)
    hits = Column(Integer, nullable=False)
    expires = Column(Integer, nullable=False, index=True)
