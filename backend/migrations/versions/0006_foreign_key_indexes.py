from alembic import op

revision = "0006"
down_revision = "0005"
INDEXES = [("ix_inquiries_assigned_to", "inquiries", "assigned_to"),
           ("ix_consultations_assigned_to", "consultations", "assigned_to"),
           ("ix_login_sessions_email", "login_sessions", "email")]

def upgrade():
    for name, table, column in INDEXES:
        op.create_index(name, table, [column])

def downgrade():
    for name, table, _ in INDEXES:
        op.drop_index(name, table)
