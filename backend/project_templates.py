"""Starting content for project pages and categories. Ordinary records once created; editors change everything."""
import json
from sqlalchemy import text as sql
from service_schema import ProjectDocument, ProjectsPage
from service_templates import photo, section_id

CATEGORIES = [("residential", "Residential"), ("commercial", "Commercial"), ("interior", "Interior"), ("renovation", "Renovation"),
              ("hospitality", "Hospitality"), ("landscape", "Landscape"), ("urban-planning", "Urban Planning")]
LEGACY_CATEGORIES = {"Residential": "residential", "Commercial": "commercial", "Interior Design": "interior",
                     "Renovation": "renovation", "Urban Planning": "urban-planning"}
PROCESS = [
    {"title": "Discovery", "description": "Understanding needs & site context"},
    {"title": "Concept", "description": "Developing design direction & layouts"},
    {"title": "Design Development", "description": "Detailed plans, materials & 3D views"},
    {"title": "Execution", "description": "Construction & quality supervision"},
    {"title": "Handover", "description": "Final delivery & post-project support"},
]
# {slug} is replaced with the project's current URL slug when the page renders.
ENQUIRE = {"label": "Start a Similar Project", "href": "/contact?type=consultation&project={slug}", "style": "primary", "visible": True}

def sections(title, description, images, category_slug, concept="", challenges=""):
    cover = images[0]["image"] if images else None
    name = dict(CATEGORIES).get(category_slug, "")
    half = {"width": "half"}
    return [
        {"id": section_id(), "type": "hero", "eyebrow": f"{name} Project" if name else "", "heading": title, "subheading": description, "image": cover,
         "image_alt": images[0]["alt"] if images else "", "buttons": [ENQUIRE], "layout": "full"},
        {"id": section_id(), "type": "overview", "nav_label": "Overview", "heading": "Project Overview", "body": description, "facts": True,
         "image": images[1]["image"] if len(images) > 1 else cover, "image_alt": images[1]["alt"] if len(images) > 1 else "", "video": None, "caption": ""},
        {"id": section_id(), "type": "image_text", "heading": "Design Concept", "body": concept or "Describe the design concept.", "image": None,
         "image_alt": "", "buttons": [], "layout": "image-left", "enabled": bool(concept), "appearance": half},
        # Left empty and hidden: features should come from the real project, not a template.
        {"id": section_id(), "type": "features", "heading": "Key Features", "intro": "", "items": [], "layout": "compact", "enabled": False, "appearance": half},
        {"id": section_id(), "type": "gallery", "nav_label": "Gallery", "heading": "Project Gallery", "intro": "", "images": images, "layout": "featured",
         "filters": True, "enabled": bool(images)},
        {"id": section_id(), "type": "process", "nav_label": "Process", "heading": "Design Process", "intro": "", "items": PROCESS, "layout": "timeline"},
        {"id": section_id(), "type": "rich_text", "heading": "Challenges & Solutions", "body": challenges or "Describe the challenges and how the design responded.",
         "layout": "wide", "enabled": bool(challenges)},
        {"id": section_id(), "type": "related_projects", "heading": "Related Projects", "intro": "", "source": "category",
         "categories": [], "projects": [], "limit": 3, "layout": "grid-3",
         "link": {"label": "View All Projects", "href": "/projects", "style": "link", "visible": True}},
        {"id": section_id(), "type": "cta", "heading": "Planning something similar?",
         "text": "Tell us about your site and brief. We will explain how we can help and what happens next.",
         "buttons": [ENQUIRE], "image": cover, "image_alt": "", "layout": "banner"},
    ]

def from_legacy(slug, data, category_id, category_slug):
    """Convert a project from the old content table without losing any of its text, images or SEO."""
    images, seen = [], set()
    for url in [data.get("image"), *data.get("gallery", [])]:
        if url and url not in seen:
            seen.add(url)
            images.append({"image": url, "alt": f"{data['title']}, view {len(images) + 1}" if images else f"{data['title']}, {data.get('location', '')}".strip(", "), "caption": ""})
    return ProjectDocument.model_validate({
        "title": data["title"], "slug": slug, "category_id": category_id, "location": data.get("location", ""),
        "year": data.get("year"), "area": data.get("area", ""), "status": data.get("status", "Completed"),
        "description": data["description"][:600], "featured": data.get("featured", False),
        "cover_image": data.get("image"), "cover_alt": images[0]["alt"] if images else "",
        "seo": {"title": data.get("seo_title", ""), "description": data.get("seo_description", ""),
                "og_image": data.get("og_image"), "canonical": data.get("canonical", "")},
        "sections": sections(data["title"], data["description"][:400], images, category_slug, data.get("concept", ""), data.get("challenges", ""))}
    ).model_dump(mode="json")

def blank(title, slug, category_id, category_slug, template="standard"):
    images = [{"image": photo("1600596542815-ffad4c1539a9", 1600), "alt": "Contemporary residence", "caption": ""}]
    doc = {"title": title, "slug": slug, "category_id": category_id, "description": "Describe this project in one or two sentences.",
           "cover_image": images[0]["image"], "cover_alt": images[0]["alt"], "status": "In Progress"}
    doc["sections"] = sections(title, doc["description"], images, category_slug) if template == "standard" else \
        [{"id": section_id(), "type": "hero", "heading": title, "image": images[0]["image"], "image_alt": images[0]["alt"], "buttons": [ENQUIRE]}]
    # Legacy blank requests also receive the shared project structure.
    from detail_layout import standard_detail
    return ProjectDocument.model_validate(standard_detail(doc,"project")).model_dump(mode="json")

def overview():
    return ProjectsPage.model_validate({
        "eyebrow": "Our Portfolio", "heading": "Our Projects",
        "description": "A curated collection of architectural and interior projects that reflect our design vision, craftsmanship and attention to detail.",
        "hero_image": photo("1600596542815-ffad4c1539a9"), "hero_alt": "Contemporary residence with broad glazed openings",
        "buttons": [{"label": "Start a Project", "href": "/contact?type=consultation", "style": "primary", "visible": True},
                    {"label": "Contact Us", "href": "/contact", "style": "secondary", "visible": True}],
        "page_size": 6, "default_sort": "featured",
        "cta_heading": "Have a project in mind?", "cta_text": "Share your brief and we will help you take the first step.",
        "cta_buttons": [{"label": "Book a Consultation", "href": "/contact?type=consultation", "style": "primary", "visible": True},
                        {"label": "Plan Your Project With AI", "href": "/plan-your-project", "style": "secondary", "visible": True}]}).model_dump(mode="json")

def ensure_categories(connection):
    if not connection.execute(sql("SELECT count(*) FROM project_categories")).scalar():
        for order, (slug, name) in enumerate(CATEGORIES):
            connection.execute(sql("INSERT INTO project_categories (slug, name, sort_order) VALUES (:slug, :name, :order)"),
                               {"slug": slug, "name": name, "order": order})
    return {slug: identifier for identifier, slug in connection.execute(sql("SELECT id, slug FROM project_categories"))}

def ensure_initial_projects(connection, legacy):
    """Create project pages from old-style records ({slug: data}) when the projects table is empty."""
    categories = ensure_categories(connection)
    if connection.execute(sql("SELECT count(*) FROM projects")).scalar():
        return
    for order, (slug, data) in enumerate(sorted(legacy.items())):
        category_slug = LEGACY_CATEGORIES.get(data.get("category"), "residential")
        doc = from_legacy(slug, data, categories[category_slug], category_slug)
        published = data.get("published", True) is not False
        identifier = connection.execute(sql(
            "INSERT INTO projects (slug, live_slug, redirects, title, category_id, featured, sort_order, status, schema_version, draft, published, published_at) "
            "VALUES (:slug, :live, '[]', :title, :category, :featured, :order, :status, 1, CAST(:doc AS jsonb), "
            "CAST(:published AS jsonb), CASE WHEN :is_live THEN now() END) RETURNING id"),
            {"slug": slug, "live": slug if published else None, "title": doc["title"], "category": doc["category_id"],
             "featured": doc["featured"], "order": order, "status": "published" if published else "draft", "doc": json.dumps(doc),
             "published": json.dumps(doc) if published else None, "is_live": published}).scalar()
        connection.execute(sql("INSERT INTO project_revisions (project_id, version, kind, document, author) "
                               "VALUES (:id, 1, :kind, CAST(:doc AS jsonb), 'system')"),
                           {"id": identifier, "kind": "publish" if published else "create", "doc": json.dumps(doc)})
