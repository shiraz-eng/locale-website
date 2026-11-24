from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"

def created():
    return sa.Column("created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())

def staff_member():
    return sa.Column("assigned_to", sa.String(254), sa.ForeignKey("users.email", ondelete="SET NULL"))

def upgrade():
    op.add_column("users", sa.Column("name", sa.String(120), nullable=False, server_default=""))
    op.add_column("users", sa.Column("active", sa.Boolean, nullable=False, server_default=sa.true()))
    op.add_column("users", created())
    # Admins previously had every permission, which is the new owner role.
    op.execute("UPDATE users SET role = 'owner' WHERE role = 'admin'")
    op.add_column("content", sa.Column("updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.add_column("inquiries", staff_member())
    op.add_column("inquiries", sa.Column("contract_value", sa.Numeric(14, 2)))
    op.create_table("lead_activity", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("inquiry_id", sa.Integer, sa.ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False), sa.Column("detail", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("author", sa.String(254), nullable=False), created())
    op.create_index("ix_lead_activity_inquiry_id", "lead_activity", ["inquiry_id"])
    op.create_index("ix_lead_activity_kind", "lead_activity", ["kind"])
    op.execute("INSERT INTO lead_activity (inquiry_id, kind, detail, author, created) SELECT inquiry_id, 'status', "
               "json_build_object('previous', previous, 'status', status), author, created FROM lead_status_history")
    op.drop_table("lead_status_history")
    op.create_table("consultations", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("inquiry_id", sa.Integer, sa.ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="Pending"),
        sa.Column("preferred_time", sa.String(160), nullable=False, server_default=""),
        sa.Column("scheduled_at", sa.DateTime(timezone=True)), staff_member(),
        sa.Column("notes", sa.Text, nullable=False, server_default=""), created(),
        sa.Column("updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_consultations_inquiry_id", "consultations", ["inquiry_id"])
    op.create_index("ix_consultations_status", "consultations", ["status"])
    op.execute("INSERT INTO consultations (inquiry_id, status, scheduled_at, created) SELECT id, "
               "CASE WHEN consultation_at IS NULL THEN 'Pending' ELSE 'Confirmed' END, consultation_at, created "
               "FROM inquiries WHERE kind = 'consultation' OR consultation_at IS NOT NULL")
    op.drop_column("inquiries", "consultation_at")
    op.create_table("media_assets", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("url", sa.String(300), nullable=False, unique=True), sa.Column("name", sa.String(200), nullable=False, server_default=""),
        sa.Column("content_type", sa.String(40), nullable=False), sa.Column("width", sa.Integer, nullable=False),
        sa.Column("height", sa.Integer, nullable=False), sa.Column("size", sa.Integer, nullable=False),
        sa.Column("alt", sa.String(300), nullable=False, server_default=""),
        sa.Column("uploaded_by", sa.String(254), nullable=False), created())
    op.create_table("audit_logs", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("actor", sa.String(254), nullable=False), sa.Column("action", sa.String(40), nullable=False),
        sa.Column("entity", sa.String(40), nullable=False), sa.Column("entity_id", sa.String(160), nullable=False, server_default=""),
        sa.Column("detail", sa.JSON, nullable=False, server_default="{}"), created())
    op.create_index("ix_audit_logs_created", "audit_logs", ["created"])

def downgrade():
    op.drop_table("audit_logs")
    op.drop_table("media_assets")
    op.add_column("inquiries", sa.Column("consultation_at", sa.DateTime(timezone=True)))
    op.execute("UPDATE inquiries SET consultation_at = c.scheduled_at FROM (SELECT DISTINCT ON (inquiry_id) inquiry_id, "
               "scheduled_at FROM consultations WHERE scheduled_at IS NOT NULL ORDER BY inquiry_id, scheduled_at DESC) AS c "
               "WHERE c.inquiry_id = inquiries.id")
    op.drop_table("consultations")
    op.create_table("lead_status_history", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("inquiry_id", sa.Integer, sa.ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("previous", sa.String(30)), sa.Column("status", sa.String(30), nullable=False),
        sa.Column("author", sa.String(254), nullable=False), created())
    op.create_index("ix_lead_status_history_inquiry_id", "lead_status_history", ["inquiry_id"])
    op.execute("INSERT INTO lead_status_history (inquiry_id, previous, status, author, created) SELECT inquiry_id, "
               "detail->>'previous', detail->>'status', author, created FROM lead_activity WHERE kind = 'status'")
    op.drop_table("lead_activity")
    op.drop_column("inquiries", "contract_value")
    op.drop_column("inquiries", "assigned_to")
    op.drop_column("content", "updated")
    # Sales has no older equivalent; the previous code rejects unknown roles, so it is left as is rather
    # than widened to admin (which the next upgrade would turn into owner).
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'owner'")
    for name in ("created", "active", "name"):
        op.drop_column("users", name)
