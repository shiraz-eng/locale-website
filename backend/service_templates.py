"""Starting content for service pages. These are ordinary records once created; editors change everything."""
import json
import secrets
from sqlalchemy import text as sql
from service_schema import ServiceDocument, ServicesPage

def photo(identifier, width=1600):
    return f"https://images.unsplash.com/photo-{identifier}?auto=format&fit=crop&w={width}&q=80"

def section_id():
    return secrets.token_hex(5)

PROCESS = [
    {"title": "Discovery", "description": "Understand your needs and goals"},
    {"title": "Concept", "description": "Develop design concepts and layouts"},
    {"title": "Design Development", "description": "Detailed plans, materials, and 3D views"},
    {"title": "Execution", "description": "Site coordination and construction support"},
    {"title": "Handover", "description": "Final delivery with quality assurance"},
]
BENEFITS = [
    {"title": "Personalized Design", "description": "Tailored to your needs", "icon": "gem"},
    {"title": "Comfort & Functionality", "description": "Spaces that truly work for you", "icon": "leaf"},
    {"title": "Long-Term Value", "description": "A smart, lasting investment", "icon": "layers"},
    {"title": "Sustainable Approach", "description": "Efficient and responsible design", "icon": "sun"},
]

def faq(name):
    return [
        {"question": f"How does a {name.lower()} project start?",
         "answer": "With an initial consultation where we discuss your site, brief, priorities and the information we will need."},
        {"question": "Can you work with my existing drawings or consultants?",
         "answer": "Yes. Share what you have and we will explain how it fits into the design process."},
        {"question": "How are fees and timelines agreed?",
         "answer": "They depend on scope, so we confirm them in a written proposal after we understand your project."},
    ]

def page_sections(spec):
    slug, name = spec["slug"], spec["name"]
    start = {"label": "Start Your Project", "href": f"/contact?type=consultation&service={slug}", "style": "primary", "visible": True}
    consult = {"label": "Start a Consultation", "href": f"/contact?type=consultation&service={slug}", "style": "primary", "visible": True}
    gallery = [{"image": photo(identifier, 1200), "alt": alt, "caption": ""} for identifier, alt in spec.get("gallery", [])]
    categories = spec.get("categories", [])
    return [
        {"id": section_id(), "type": "hero", "eyebrow": "", "heading": name, "subheading": spec["short"],
         "image": photo(spec["image"]), "image_alt": spec["alt"], "buttons": [start], "layout": "full"},
        {"id": section_id(), "type": "features", "heading": "", "intro": "",
         "items": [{"title": item["title"], "description": "", "icon": item["icon"]} for item in spec["offers"]][:6], "layout": "strip"},
        {"id": section_id(), "type": "overview", "heading": "Overview", "body": spec["description"], "facts": False,
         "image": gallery[0]["image"] if gallery else photo(spec["image"], 1200), "image_alt": gallery[0]["alt"] if gallery else spec["alt"], "video": None, "caption": ""},
        {"id": section_id(), "type": "process", "heading": "Our Process", "intro": "", "items": PROCESS, "layout": "timeline"},
        {"id": section_id(), "type": "related_projects", "heading": "Featured Projects", "intro": "", "source": "category",
         "categories": categories, "projects": [], "limit": 3, "layout": "grid-3", "enabled": bool(categories),
         "link": {"label": "View All Projects", "href": f"/projects?category={categories[0]}" if categories else "/projects", "style": "link", "visible": True}},
        {"id": section_id(), "type": "benefits", "heading": "Key Benefits", "intro": "", "items": BENEFITS, "layout": "grid-4"},
        {"id": section_id(), "type": "gallery", "heading": "Project gallery", "intro": "", "images": gallery, "layout": "grid-3", "enabled": False},
        {"id": section_id(), "type": "faq", "heading": "Frequently asked questions", "intro": "", "items": faq(name), "layout": "accordion", "enabled": False},
        {"id": section_id(), "type": "cta", "heading": "Let's Start Your Project",
         "text": "Share your vision with our team and take the first step towards your next space.",
         "buttons": [consult], "image": photo(spec["image"], 1600), "image_alt": "", "layout": "banner"},
    ]

def document(spec):
    return ServiceDocument.model_validate({
        "name": spec["name"], "slug": spec["slug"], "category": spec["category"], "short_description": spec["short"],
        "description": spec["description"], "icon": spec["icon"], "featured": spec.get("featured", False),
        "card_image": photo(spec["image"], 1200), "card_alt": spec["alt"],
        "seo": {"title": f"{spec['name']} Services", "description": spec["short"][:160]},
        "sections": page_sections(spec)}).model_dump(mode="json")

def blank(name, slug):
    return ServiceDocument.model_validate({"layout_version":1,"name": name, "slug": slug, "short_description": "Describe this service in one or two sentences.",
        "sections": [{"id": section_id(), "type": "hero", "eyebrow": "Services", "heading": name, "buttons": []}]}).model_dump(mode="json")

INITIAL = [
    {"slug": "residential-architecture", "legacy": "architectural-design", "name": "Residential Architecture", "category": "Architecture", "icon": "house", "featured": True,
     "short": "Custom homes that blend functionality, aesthetics and your lifestyle.", "image": "1600596542815-ffad4c1539a9",
     "alt": "Contemporary white residence with large glazed openings",
     "description": "We design homes around the way you live: how light moves through the day, where the family gathers and what each room needs to do. From a first site sketch to coordinated drawings, every decision is tested against your brief.",
     "offers": [{"title": "Custom Home Design", "icon": "house", "description": "Homes shaped around your site, routine and priorities."},
                {"title": "Villas & Farmhouses", "icon": "trees", "description": "Larger residences that work with landscape and outdoor living."},
                {"title": "Multi-Unit Housing", "icon": "building", "description": "Apartments and townhouses with liveable, efficient plans."},
                {"title": "Site & Space Planning", "icon": "compass", "description": "Orientation, access and layout studies before design begins."}],
     "categories": ["residential"], "gallery": [("1600585154340-be6161a56a0c", "Modern house at dusk with warm interior light"), ("1564013799919-ab600027ffc6", "House with a pool and garden")]},
    {"slug": "commercial-architecture", "name": "Commercial Architecture", "category": "Architecture", "icon": "building-2", "featured": True,
     "short": "Purpose-driven commercial spaces for business, retail and hospitality.", "image": "1486406146926-c627a92ad1ab",
     "alt": "Glass-fronted commercial building",
     "description": "We design workplaces, retail and hospitality spaces that support the people who use them and the way the business operates, balancing identity, efficiency and comfort.",
     "offer_heading": "Project Types",
     "offers": [{"title": "Office Buildings", "icon": "building-2", "description": "Workplaces with clear circulation and space for collaboration."},
                {"title": "Retail Spaces", "icon": "store", "description": "Shopfronts and interiors designed around the customer journey."},
                {"title": "Hospitality", "icon": "hotel", "description": "Hotels, restaurants and cafés with a distinct sense of place."},
                {"title": "Mixed-Use Developments", "icon": "layers", "description": "Buildings that combine living, working and public uses."}],
     "categories": ["commercial"], "gallery": [("1497366216548-37526070297c", "Bright open-plan office interior")]},
    {"slug": "interior-design", "name": "Interior Design", "category": "Interiors", "icon": "sofa", "featured": True,
     "short": "Thoughtful interior spaces that reflect your style and enhance living.", "image": "1618221195710-dd6b41faaea6",
     "alt": "Light-filled living room with natural materials",
     "description": "We plan interiors that feel calm, work hard and age well, from layout and joinery to lighting, finishes and furniture.",
     "offer_heading": "Our Interior Design Services",
     "offers": [{"title": "Residential Interiors", "icon": "house", "description": "Homes that feel personal, practical and calm."},
                {"title": "Commercial Interiors", "icon": "building", "description": "Workplaces and venues that express the brand."},
                {"title": "Space Planning", "icon": "layout-grid", "description": "Layouts that make the most of every square metre."},
                {"title": "Furniture & Styling", "icon": "armchair", "description": "Furniture, lighting and finishes selected as one palette."}],
     "categories": ["interior"], "gallery": [("1600607687939-ce8a6c25118c", "Interior with timber and natural stone"), ("1600573472550-8090b5e0745e", "Open-plan interior with a staircase and pool view")]},
    {"slug": "renovation", "name": "Renovation & Remodeling", "category": "Architecture", "icon": "hammer",
     "short": "Transform existing spaces with modern, efficient and timeless design.", "image": "1600566753190-17f0baa2a6c3",
     "alt": "Renovated house with a timber-clad extension",
     "description": "We help existing buildings work better: reorganising layouts, improving light and comfort, and adding space with care for what is already there.",
     "offer_heading": "Our Renovation Services",
     "offers": [{"title": "Home Renovation", "icon": "house", "description": "Whole-home updates planned around how you live now."},
                {"title": "Interior Upgrades", "icon": "sofa", "description": "Kitchens, bathrooms and living spaces refreshed."},
                {"title": "Space Reconfiguration", "icon": "scan", "description": "New layouts within the existing structure."},
                {"title": "Facade Modernization", "icon": "building", "description": "Updated exteriors with better performance."}],
     "categories": ["renovation"]},
    {"slug": "visualization", "name": "3D Visualization", "category": "Visualization", "icon": "box",
     "short": "Realistic 3D views and walkthroughs to bring ideas to life before you build.", "image": "1600585154340-be6161a56a0c",
     "alt": "Modern house at dusk with warm interior light",
     "description": "Renderings and walkthroughs let you see, refine and agree on a design before construction, so decisions are made with confidence.",
     "offer_heading": "Our Visualization Services",
     "offers": [{"title": "Architectural Renders", "icon": "image", "description": "Still images of interiors and exteriors."},
                {"title": "Virtual Walkthroughs", "icon": "play", "description": "Move through the design as if it were built."},
                {"title": "3D Animations", "icon": "box", "description": "Animated sequences for presentations and approvals."},
                {"title": "Material & Lighting Study", "icon": "sun", "description": "Compare finishes and daylight at different times."}]},
    {"slug": "consultation", "name": "Architectural Consultation", "category": "Consulting", "icon": "drafting-compass",
     "short": "Expert advice, feasibility studies and tailored solutions for your project.", "image": "1503387762-592deb58ef4e",
     "alt": "Architect sketching plans at a desk",
     "description": "Professional guidance to plan, evaluate and shape your project before you commit, from early feasibility to design reviews.",
     "offer_heading": "What We Provide",
     "offers": [{"title": "Project Feasibility", "icon": "chart", "description": "Early studies of what your site and brief allow."},
                {"title": "Design Guidance", "icon": "lightbulb", "description": "Independent reviews and options for your design."},
                {"title": "Site Analysis", "icon": "map-pin", "description": "Orientation, access, context and constraints."},
                {"title": "Regulatory Support", "icon": "file-text", "description": "Help preparing information for planning and approvals."}]},
    {"slug": "urban-planning", "name": "Urban Planning", "category": "Planning", "icon": "map",
     "short": "Masterplans and public spaces that connect people, places and movement.", "image": "1477959858617-67f85cf4f1df",
     "alt": "City skyline viewed from above",
     "description": "We plan neighbourhoods and public spaces at the scale of the street and the city, with a focus on walkability, landscape and long-term flexibility.",
     "offers": [{"title": "Masterplanning", "icon": "map", "description": "Frameworks for neighbourhoods and large sites."},
                {"title": "Public Realm", "icon": "trees", "description": "Streets, squares and landscapes for everyday life."},
                {"title": "Mobility & Streets", "icon": "route", "description": "Movement networks that put people first."},
                {"title": "Community Engagement", "icon": "users", "description": "Workshops that bring local knowledge into the plan."}],
     "categories": ["urban-planning"]},
]

def overview():
    return ServicesPage.model_validate({
        "eyebrow": "Our Services", "heading": "Architecture & Design Services",
        "subheading": "Comprehensive architectural, interior and design solutions, from concept to completion.",
        "hero_image": photo("1600585154340-be6161a56a0c"), "hero_alt": "Modern house at dusk with warm interior light",
        "buttons": [{"label": "Plan Your Project", "href": "/plan-your-project", "style": "primary", "visible": True},
                    {"label": "Explore Services", "href": "#services", "style": "link", "visible": True}],
        "services_heading": "", "services_intro": "",
        "cta_heading": "Not Sure Which Service You Need?", "cta_text": "Tell us about your project and our team will guide you with the right approach.",
        "cta_button": {"label": "Book a Consultation", "href": "/contact?type=consultation", "style": "primary", "visible": True},
        "benefits": [{"title": "Client-Centric Approach", "description": "Your vision, our expertise.", "icon": "leaf"},
                     {"title": "End-to-End Delivery", "description": "From concept to completion.", "icon": "layers"},
                     {"title": "Quality & Reliability", "description": "Built with precision and care.", "icon": "shield-check"},
                     {"title": "Sustainable Design", "description": "Spaces for a better tomorrow.", "icon": "sun"}],
        "show_projects": True, "projects_heading": "Selected projects"}).model_dump(mode="json")

def ensure_initial_services(connection, existing=None):
    """Create the initial services when the table is empty. `existing` maps old slugs to legacy content to keep."""
    if connection.execute(sql("SELECT count(*) FROM services")).scalar():
        return
    existing = existing or {}
    for order, spec in enumerate(INITIAL):
        legacy = existing.get(spec.get("legacy", spec["slug"]))
        doc = document(spec)
        if legacy and legacy.get("seo_title"):
            doc["seo"]["title"] = legacy["seo_title"][:120]
        if legacy and legacy.get("seo_description"):
            doc["seo"]["description"] = legacy["seo_description"][:240]
        redirects = [spec["legacy"]] if spec.get("legacy") else []
        identifier = connection.execute(sql(
            "INSERT INTO services (slug, live_slug, redirects, name, category, featured, sort_order, status, schema_version, draft, published, published_at) "
            "VALUES (:slug, :slug, CAST(:redirects AS jsonb), :name, :category, :featured, :sort_order, 'published', 1, "
            "CAST(:doc AS jsonb), CAST(:doc AS jsonb), now()) RETURNING id"),
            {"slug": spec["slug"], "redirects": json.dumps(redirects), "name": doc["name"], "category": doc["category"],
             "featured": doc["featured"], "sort_order": order, "doc": json.dumps(doc)}).scalar()
        connection.execute(sql("INSERT INTO service_revisions (service_id, version, kind, document, author) "
                               "VALUES (:id, 1, 'publish', CAST(:doc AS jsonb), 'system')"), {"id": identifier, "doc": json.dumps(doc)})
