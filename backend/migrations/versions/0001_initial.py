from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None

def upgrade():
    op.create_table("content", sa.Column("kind", sa.String(20), primary_key=True),
        sa.Column("slug", sa.String(120), primary_key=True), sa.Column("data", sa.JSON, nullable=False))
    op.create_table("inquiries", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("data", sa.JSON, nullable=False), sa.Column("status", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text, nullable=False),
        sa.Column("created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_inquiries_status", "inquiries", ["status"])
    op.create_table("users", sa.Column("email", sa.String(254), primary_key=True),
        sa.Column("password", sa.Text, nullable=False), sa.Column("role", sa.String(20), nullable=False))
    op.create_table("login_sessions", sa.Column("digest", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(254), sa.ForeignKey("users.email", ondelete="CASCADE"), nullable=False),
        sa.Column("expires", sa.DateTime(timezone=True), nullable=False))
    op.create_table("rate_buckets", sa.Column("key", sa.String(128), primary_key=True),
        sa.Column("hits", sa.Integer, nullable=False), sa.Column("expires", sa.Integer, nullable=False))
    op.create_index("ix_rate_buckets_expires", "rate_buckets", ["expires"])

def downgrade():
    for name in ("rate_buckets", "login_sessions", "users", "inquiries", "content"):
        op.drop_table(name)
