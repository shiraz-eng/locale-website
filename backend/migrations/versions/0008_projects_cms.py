import json
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from project_templates import LEGACY_CATEGORIES, ensure_categories, ensure_initial_projects

revision = "0008"
down_revision = "0007"

def timestamps():
    return [sa.Column("created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())]

def recategorize(connection, mapping):
    """Rewrite related-project categories inside every stored service document (draft, published, revisions)."""
    def convert(doc):
        if not doc:
            return doc
        for section in doc.get("sections", []):
            if section.get("type") == "related_projects":
                section["categories"] = [mapping.get(value, value) for value in section.get("categories", [])]
        return doc
    for table, columns in (("services", ("draft", "published")), ("service_revisions", ("document",))):
        for row in connection.execute(sa.text(f"SELECT id, {', '.join(columns)} FROM {table}")).mappings():
            values = {column: json.dumps(convert(row[column])) if row[column] else None for column in columns}
            assignments = ", ".join(f"{column} = CAST(:{column} AS jsonb)" for column in columns)
            connection.execute(sa.text(f"UPDATE {table} SET {assignments} WHERE id = :id"), {**values, "id": row["id"]})

def upgrade():
    op.create_table("project_categories", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True), sa.Column("name", sa.String(80), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""), sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        *timestamps())
    op.create_table("projects", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True), sa.Column("live_slug", sa.String(120), unique=True),
        sa.Column("redirects", JSONB, nullable=False, server_default="[]"), sa.Column("title", sa.String(160), nullable=False),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("project_categories.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("featured", sa.Boolean, nullable=False, server_default=sa.false()), sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"), sa.Column("schema_version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("draft", JSONB, nullable=False), sa.Column("published", JSONB), sa.Column("published_at", sa.DateTime(timezone=True)), *timestamps())
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_projects_category_id", "projects", ["category_id"])
    # Public filtering reads the published snapshot.
    op.execute("CREATE INDEX ix_projects_published_category ON projects (((published->>'category_id')::int)) WHERE status = 'published'")
    op.create_table("project_revisions", sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer, nullable=False), sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("document", JSONB, nullable=False), sa.Column("author", sa.String(254), nullable=False),
        sa.Column("created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_project_revisions_project_id", "project_revisions", ["project_id"])
    for table in ("project_categories", "projects", "project_revisions"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    connection = op.get_bind()
    ensure_categories(connection)
    legacy = {slug: data for slug, data in connection.execute(sa.text("SELECT slug, data FROM content WHERE kind = 'projects'"))}
    if legacy:
        ensure_initial_projects(connection, legacy)
        op.execute("DELETE FROM content WHERE kind = 'projects'")
    recategorize(connection, LEGACY_CATEGORIES)

def downgrade():
    connection = op.get_bind()
    back = {slug: legacy for legacy, slug in LEGACY_CATEGORIES.items()}
    for slug, live, draft, published, status in connection.execute(sa.text("SELECT slug, live_slug, draft, published, status FROM projects")):
        doc = published if status == "published" and published else draft
        category = connection.execute(sa.text("SELECT slug FROM project_categories WHERE id = :id"), {"id": doc["category_id"]}).scalar()
        text = {section["heading"]: section.get("body", "") for section in doc["sections"] if section["type"] == "rich_text"}
        gallery = next((section["images"] for section in doc["sections"] if section["type"] == "gallery"), [])
        data = {"title": doc["title"], "description": doc["description"], "location": doc["location"] or "—",
                "category": back.get(category, "Residential"), "year": doc["year"] or 2024, "area": doc["area"], "status": doc["status"],
                "image": doc.get("cover_image") or (gallery[0]["image"] if gallery else "/images/placeholder.jpg"),
                "gallery": [item["image"] for item in gallery][:20], "concept": text.get("Design Concept") or doc["description"],
                "challenges": text.get("Challenges & Solutions") or doc["description"], "featured": doc["featured"],
                "published": status == "published", "seo_title": doc["seo"]["title"], "seo_description": doc["seo"]["description"],
                "og_image": doc["seo"]["og_image"], "canonical": doc["seo"]["canonical"]}
        connection.execute(sa.text("INSERT INTO content (kind, slug, data) VALUES ('projects', :slug, CAST(:data AS json)) ON CONFLICT DO NOTHING"),
                           {"slug": live or slug, "data": json.dumps(data)})
    recategorize(connection, back)
    op.drop_table("project_revisions")
    op.drop_table("projects")
    op.drop_table("project_categories")
