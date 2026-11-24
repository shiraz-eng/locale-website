from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"

def upgrade():
    op.alter_column("inquiries", "status", type_=sa.String(30), server_default="New Inquiry")
    op.execute("UPDATE inquiries SET status = CASE status WHEN 'New' THEN 'New Inquiry' "
               "WHEN 'In Progress' THEN 'Contacted' WHEN 'Resolved' THEN 'Contacted' ELSE status END")
    for column in (sa.Column("kind", sa.String(20), nullable=False, server_default="inquiry"),
                   sa.Column("attribution", sa.JSON, nullable=False, server_default="{}"),
                   sa.Column("brief", sa.JSON), sa.Column("conversation", sa.JSON),
                   sa.Column("qualification", sa.JSON), sa.Column("priority", sa.String(30)),
                   sa.Column("consultation_at", sa.DateTime(timezone=True)), sa.Column("follow_up_at", sa.Date),
                   sa.Column("next_action", sa.Text, nullable=False, server_default=""),
                   sa.Column("lost_reason", sa.String(40)),
                   sa.Column("updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())):
        op.add_column("inquiries", column)
    op.execute("UPDATE inquiries SET kind = 'consultation' WHERE (data->>'consultation')::boolean IS TRUE")
    op.create_index("ix_inquiries_kind", "inquiries", ["kind"])
    timestamps = lambda: sa.Column("created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    lead = lambda: sa.Column("inquiry_id", sa.Integer, sa.ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False)
    op.create_table("lead_notes", sa.Column("id", sa.Integer, primary_key=True), lead(),
        sa.Column("author", sa.String(254), nullable=False), sa.Column("text", sa.Text, nullable=False), timestamps())
    op.create_index("ix_lead_notes_inquiry_id", "lead_notes", ["inquiry_id"])
    op.create_table("lead_status_history", sa.Column("id", sa.Integer, primary_key=True), lead(),
        sa.Column("previous", sa.String(30)), sa.Column("status", sa.String(30), nullable=False),
        sa.Column("author", sa.String(254), nullable=False), timestamps())
    op.create_index("ix_lead_status_history_inquiry_id", "lead_status_history", ["inquiry_id"])
    op.create_table("conversion_events", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(40), nullable=False), sa.Column("label", sa.String(60), nullable=False, server_default=""),
        sa.Column("path", sa.String(300), nullable=False, server_default=""),
        sa.Column("project", sa.String(120)), sa.Column("service", sa.String(120)), timestamps())
    op.create_index("ix_conversion_events_name", "conversion_events", ["name"])
    op.create_index("ix_conversion_events_created", "conversion_events", ["created"])
    # Free-text notes move into the timestamped notes table so nothing is kept twice.
    op.execute("INSERT INTO lead_notes (inquiry_id, author, text, created) "
               "SELECT id, 'imported', notes, created FROM inquiries WHERE notes <> ''")
    op.drop_column("inquiries", "notes")

def downgrade():
    op.add_column("inquiries", sa.Column("notes", sa.Text, nullable=False, server_default=""))
    op.execute("UPDATE inquiries SET notes = joined.text FROM (SELECT inquiry_id, string_agg(text, E'\\n\\n' ORDER BY created) AS text "
               "FROM lead_notes GROUP BY inquiry_id) AS joined WHERE joined.inquiry_id = inquiries.id")
    for name in ("conversion_events", "lead_status_history", "lead_notes"):
        op.drop_table(name)
    op.drop_index("ix_inquiries_kind", "inquiries")
    for name in ("kind", "attribution", "brief", "conversation", "qualification", "priority",
                 "consultation_at", "follow_up_at", "next_action", "lost_reason", "updated"):
        op.drop_column("inquiries", name)
    op.execute("UPDATE inquiries SET status = CASE status WHEN 'New Inquiry' THEN 'New' "
               "WHEN 'Contract Won' THEN 'Resolved' WHEN 'Contract Lost' THEN 'Resolved' ELSE 'In Progress' END")
    op.alter_column("inquiries", "status", type_=sa.String(20), server_default=None)
