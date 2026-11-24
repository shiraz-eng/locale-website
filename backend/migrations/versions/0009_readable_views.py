"""Read-only views that lay the JSON-stored content out as ordinary columns.

For browsing in a table editor only: the application never reads them, and editing still happens in the admin.
security_invoker keeps each view under the caller's own table permissions and row-level security.
"""
from alembic import op

revision = "0009"
down_revision = "0008"

# The working copy (draft) is shown, as in the admin; "state" says whether it is live.
STATE = """case when {t}.status <> 'published' then 'Draft'
     when {t}.draft is distinct from {t}.published then 'Published, unpublished changes' else 'Published' end"""
ITEMS = "coalesce(jsonb_array_length(case when jsonb_typeof(s.value->'items') = 'array' then s.value->'items' when jsonb_typeof(s.value->'images') = 'array' then s.value->'images' end), 0)"

VIEWS = {
    "view_projects": f"""
        select p.id, p.draft->>'title' as title, p.slug, p.live_slug as live_url_slug, {STATE.format(t='p')} as state,
               c.name as category, p.draft->>'location' as location, (p.draft->>'year')::int as year, p.draft->>'area' as area,
               p.draft->>'status' as project_status, p.draft->>'style' as style, p.draft->>'client' as client,
               (p.draft->>'client_approved')::boolean as client_approved, p.featured, p.sort_order,
               p.draft->>'description' as description, p.draft->>'cover_image' as cover_image, p.draft->>'cover_alt' as cover_alt,
               p.draft->'seo'->>'title' as seo_title, p.draft->'seo'->>'description' as seo_description,
               jsonb_array_length(coalesce(p.draft->'sections', '[]'::jsonb)) as sections, p.published_at, p.created, p.updated
        from projects p left join project_categories c on c.id = p.category_id""",
    "view_project_sections": f"""
        select p.id as project_id, p.draft->>'title' as project, s.ordinality::int as position, s.value->>'type' as section_type,
               s.value->>'heading' as heading, coalesce((s.value->>'enabled')::boolean, true) as visible, s.value->>'layout' as layout,
               s.value->>'nav_label' as tab_label, s.value->'appearance'->>'background' as background,
               s.value->'appearance'->>'width' as width, {ITEMS} as items,
               coalesce(s.value->>'body', s.value->>'subheading', s.value->>'text', s.value->>'intro') as text
        from projects p cross join lateral jsonb_array_elements(coalesce(p.draft->'sections', '[]'::jsonb)) with ordinality s""",
    "view_project_gallery": """
        select p.id as project_id, p.draft->>'title' as project, s.value->>'heading' as gallery, g.ordinality::int as position,
               g.value->>'image' as image, g.value->>'alt' as alt_text, g.value->>'caption' as caption,
               g.value->>'category' as category, g.value->>'video' as video
        from projects p cross join lateral jsonb_array_elements(coalesce(p.draft->'sections', '[]'::jsonb)) s
             cross join lateral jsonb_array_elements(s.value->'images') with ordinality g
        where s.value->>'type' = 'gallery' and jsonb_typeof(s.value->'images') = 'array'""",
    "view_services": f"""
        select v.id, v.draft->>'name' as name, v.slug, v.live_slug as live_url_slug, {STATE.format(t='v')} as state,
               v.draft->>'category' as category, v.draft->>'icon' as icon, v.featured, v.sort_order,
               v.draft->>'short_description' as short_description,
               (select string_agg(h.value, ' | ' order by h.ordinality)
                  from jsonb_array_elements_text(coalesce(v.draft->'highlights', '[]'::jsonb)) with ordinality h) as highlights,
               v.draft->>'description' as description, v.draft->>'card_image' as card_image, v.draft->>'card_alt' as card_alt,
               v.draft->'seo'->>'title' as seo_title, v.draft->'seo'->>'description' as seo_description,
               jsonb_array_length(coalesce(v.draft->'sections', '[]'::jsonb)) as sections, v.published_at, v.created, v.updated
        from services v""",
    "view_service_sections": f"""
        select v.id as service_id, v.draft->>'name' as service, s.ordinality::int as position, s.value->>'type' as section_type,
               s.value->>'heading' as heading, coalesce((s.value->>'enabled')::boolean, true) as visible, s.value->>'layout' as layout,
               s.value->'appearance'->>'background' as background, {ITEMS} as items,
               coalesce(s.value->>'body', s.value->>'subheading', s.value->>'text', s.value->>'intro') as text
        from services v cross join lateral jsonb_array_elements(coalesce(v.draft->'sections', '[]'::jsonb)) with ordinality s""",
    "view_team": """
        select slug, data->>'title' as name, data->>'position' as designation, data->>'department' as department,
               data->>'badge' as badge, (data->>'order')::int as display_order, coalesce((data->>'featured')::boolean, false) as featured,
               coalesce((data->>'published')::boolean, true) as published, data->>'description' as short_bio,
               data->>'full_bio' as full_bio, data->>'image' as photo, data->>'linkedin' as linkedin,
               data->>'instagram' as instagram, data->>'public_email' as public_email, created, updated
        from content where kind = 'team'""",
    "view_blog": """
        select slug, data->>'title' as title, coalesce((data->>'published')::boolean, true) as published,
               data->>'description' as summary, data->>'body' as body, data->>'image' as image,
               data->>'seo_title' as seo_title, data->>'seo_description' as seo_description, created, updated
        from content where kind = 'blog'""",
    # One row per setting or page field; lists and nested values are shown as JSON text.
    "view_settings": """
        select c.kind as area, c.slug as page, f.key as field,
               case when json_typeof(f.value) in ('object', 'array') then f.value::text else f.value #>> '{}' end as value, c.updated
        from content c cross join lateral json_each(c.data) f
        where c.kind in ('settings', 'config', 'pages')""",
    "view_leads": """
        select i.id, i.created, i.kind as request_type, i.status, i.priority, i.data->>'name' as name, i.data->>'email' as email,
               i.data->>'phone' as phone, i.data->>'project_type' as project_type, i.data->>'service_interest' as service_interest,
               i.data->>'location' as location, i.data->>'budget' as budget, i.data->>'timeline' as timeline,
               i.data->>'description' as message, i.assigned_to, i.follow_up_at, i.next_action, i.contract_value, i.lost_reason,
               i.attribution->>'page' as from_page, i.attribution->>'project' as from_project,
               i.attribution->>'service' as from_service, i.attribution->>'utm_source' as utm_source,
               i.qualification->>'label' as ai_label, i.qualification->>'summary' as ai_summary, i.updated
        from inquiries i""",
}

def upgrade():
    for name, query in VIEWS.items():
        op.execute(f"create view {name} with (security_invoker = true) as {query}")

def downgrade():
    for name in reversed(VIEWS):
        op.execute(f"drop view if exists {name}")
