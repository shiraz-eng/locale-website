import json
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from service_templates import ensure_initial_services

revision = "0007"
down_revision = "0006"
OLD_ICONS = {"house": "building", "building-2": "building", "sofa": "armchair", "hammer": "hammer", "box": "box",
             "drafting-compass": "messages", "map": "map"}

def upgrade():
    op.create_table("services", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True), sa.Column("live_slug", sa.String(120), unique=True),
        sa.Column("redirects", JSONB, nullable=False, server_default="[]"), sa.Column("name", sa.String(160), nullable=False),
        sa.Column("category", sa.String(60), nullable=False, server_default=""), sa.Column("featured", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"), sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("schema_version", sa.Integer, nullable=False, server_default="1"), sa.Column("draft", JSONB, nullable=False),
        sa.Column("published", JSONB), sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_services_status", "services", ["status"])
    op.create_table("service_revisions", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("service_id", sa.Integer, sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer, nullable=False), sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("document", JSONB, nullable=False), sa.Column("author", sa.String(254), nullable=False),
        sa.Column("created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_service_revisions_service_id", "service_revisions", ["service_id"])
    # Same defence in depth as migration 0005.
    op.execute("ALTER TABLE services ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE service_revisions ENABLE ROW LEVEL SECURITY")
    connection = op.get_bind()
    existing = {slug: data for slug, data in connection.execute(sa.text("SELECT slug, data FROM content WHERE kind = 'services'"))}
    if existing:
        # Existing databases: move services into the new table, keeping their SEO text and old URLs.
        ensure_initial_services(connection, existing)
        op.execute("DELETE FROM content WHERE kind = 'services'")

def downgrade():
    connection = op.get_bind()
    for slug, doc in connection.execute(sa.text("SELECT live_slug, published FROM services WHERE status = 'published'")):
        offers = next((section["items"] for section in doc["sections"] if section["type"] == "features"), [])
        data = {"title": doc["name"], "description": doc["short_description"], "icon": OLD_ICONS.get(doc["icon"], "building"),
                "image": doc.get("card_image"), "benefits": [item["title"] for item in offers][:10],
                "seo_title": doc["seo"]["title"], "seo_description": doc["seo"]["description"]}
        connection.execute(sa.text("INSERT INTO content (kind, slug, data) VALUES ('services', :slug, CAST(:data AS json)) "
                                   "ON CONFLICT DO NOTHING"), {"slug": slug, "data": json.dumps(data)})
    op.drop_table("service_revisions")
    op.drop_table("services")
