# Locale Website

Next.js App Router frontend, FastAPI backend, PostgreSQL with Alembic migrations, and Google Gemini design tools. The browser calls the Python API through same-origin Next.js rewrites. The database and API are private to the Compose network.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set a strong database password and a unique admin password of at least 14 characters. Set `ADMIN_EMAIL` to the administrator's email.
3. Optionally set `GEMINI_API_KEY`, `GEMINI_MODEL` and `GEMINI_FALLBACK_MODELS` (comma-separated, tried when the primary model is overloaded). Without a key, the AI tools show an availability error and portfolio search falls back to keyword matching.
4. Run `docker compose up --build`.
5. Open http://localhost:3000. Sign in at http://localhost:3000/admin with the seeded administrator credentials.

Migrations and initial seeding run at API startup. PostgreSQL and uploaded photos use separate named volumes. The startup password creates an account only when the email does not already exist. The seeded account is the **owner**. Owners add colleagues under **Team & Users** (see Roles below).

## Supabase database

The API can use a hosted Supabase Postgres database through `DATABASE_URL`. Nothing else changes: same SQLAlchemy models, same Alembic migrations, same seed.

The current setup is Supabase project **atelier-arc** (ref `aogjhmtzrxdzpagxsdms`, us-east-1):
- **Connection:** the session pooler at `aws-0-us-east-1.pooler.supabase.com:5432` with TLS.
- **Login role:** a dedicated `atelier_app` role, which is not a superuser, cannot bypass RLS, and can create objects only in its own schema.
- **Schema:** all tables live in a private `atelier` schema, which is set as the role's `search_path`. Supabase's Data API roles (`anon`, `authenticated`) have no access to it.
- **RLS:** migration `0005` enables row-level security on every table as defence in depth. With no policies, only the owning app role can read or write. Supabase's advisor reports this as an informational "RLS enabled, no policy" notice, which is intended.
- **Readable views:** migration `0009` adds read-only `view_*` views in the same schema (`view_projects`, `view_project_sections`, `view_project_gallery`, `view_services`, `view_service_sections`, `view_team`, `view_blog`, `view_settings`, `view_leads`). They lay the JSON-stored content out as ordinary columns for browsing in Supabase's Table Editor (choose the `atelier` schema). The application never reads them, they use `security_invoker`, and content is still edited in the admin. They show the working draft; the `state` column says whether it is live.

To set up another Supabase project:
1. In the SQL editor, create a login role and a private schema:
   ```sql
   create role atelier_app login password '…' noinherit;
   create schema atelier;
   grant usage, create on schema atelier to atelier_app;
   alter role atelier_app set search_path = atelier;
   ```
2. Set `DATABASE_URL` as shown in `.env.example`.
3. Start the API. Migrations and seeding run automatically.

The local `db` service still starts with Compose, but the API ignores it while `DATABASE_URL` is set. Uploaded images stay on the API's `media` volume, not in Supabase.

**Latency:** host the API in the same region as the database (AWS us-east-1 here). From far away, each query adds a network round trip (about 250 ms from this development machine). Pages then take several seconds, and the web server's `API_TIMEOUT_MS` (default 10 s) becomes the limit.

## Frontend preview

Run `pnpm install --frozen-lockfile`, then set `DEMO_MODE=true` and run `pnpm dev`. Demo mode displays illustrative portfolio records directly from the bundled fixtures. To connect to a running API instead, omit demo mode and set `API_ORIGIN` to its internal URL (the default is `http://127.0.0.1:8010`). Submissions, admin sign-in, and AI requests require a running API. Run `pnpm check` for TypeScript checks and `pnpm build` for a production build.

## Deployment configuration

Set `PUBLIC_ORIGIN` to the exact HTTPS origin and `COOKIE_SECURE=true`. Set the Next.js build-time and runtime `API_ORIGIN` to the internal API URL. FastAPI can use `DATABASE_URL` with the `postgresql+psycopg` dialect. Configure persistent storage and backups for PostgreSQL and uploads. Set ingress body limits and trusted proxy addresses for the deployment. The included Compose configuration targets a single API replica. Run Alembic as a separate release step if deploying multiple replicas.

The seeded project studies, team role descriptions, and contact information are illustrative. Replace them with approved studio content, photography, testimonials, and office details before public launch. Review the privacy page against the studio's actual data handling and jurisdiction.

## Lead generation and AI features

- **Calls to action.** The homepage, project pages, service pages, journal articles and the shared CTA band link to projects, consultations (`/contact?type=consultation`), quotations (`/contact?type=quotation`) and the AI planner. Project and service links carry `project`/`service` so the inquiry records what prompted it. The word “Free” appears only when **Settings → The studio offers a free initial consultation** is ticked. A WhatsApp button appears only when **Settings → Verified WhatsApp business number** is filled in.
- **Contact form.** Only name, email, a short description and privacy consent are required. Project type, location, budget, timeline, service and priorities are optional.
- **AI project assistant** (floating “Plan with AI” button). It asks about building type, location, size, rooms, style, budget and timeline a step at a time, suggests real services and projects from the database, then produces a structured brief with *Book Consultation*, *Request Quotation* and *Send Requirements to Architect*. Contact details are requested only at that point, with consent, and the transcript is stored with the lead.
- **`/plan-your-project`.** A five-step planner (type → property → style → budget/timeline → AI brief) followed by lead capture. No contact details are needed to generate a brief. Answers are kept in the tab's session storage only.
- **AI portfolio match** on `/projects`. Free-text requests are ranked by Gemini against real published projects only; unknown slugs are discarded. When Gemini is unavailable or the AI budget is spent, results come from keyword matching and are labelled as such.
- **Sales pipeline** (admin → Sales pipeline). Statuses: New Inquiry → Contacted → Consultation Scheduled → Proposal Sent → Negotiation → Contract Won / Contract Lost. Search and filter by status, priority, request type or overdue follow-up. Record consultation date, follow-up date, next action, lost reason and timestamped notes. Every status change is kept in the history.
- **AI lead qualification.** *Analyze with AI* extracts type, location, budget, timeline, requirements, services and missing information, and suggests *Ready for Consultation*, *Needs Follow-Up* or *Early Exploration* with a reason. Staff can override it at any time. AI never changes status or rejects leads.
- **AI response drafts.** First response, missing-information questions, consultation invitation, follow-up and proposal introduction. Drafts use placeholders for dates and terms. They are never sent automatically: staff edit them and send from their own mail client.
- **Metrics** (admin overview). Total, qualified, consultation and quotation requests, consultations, proposals, wins, inquiry → consultation and lead → contract rates, follow-ups due, stages, services, lead sources and 30-day conversion events, all computed from database rows. A lead that skips stages counts as having passed them.
- **AI insights** (admins). Gemini summarizes aggregate counts of services, styles, locations, monthly volume, stages, lost reasons, sources and portfolio coverage.

### Attribution and conversion events

On the first page view in a tab, the landing page, referring host (domain only) and `utm_source`/`utm_medium`/`utm_campaign` are kept in `sessionStorage` and attached to any inquiry sent from that tab. No cookies, IP addresses or cross-site identifiers are used. `conversion_events` records CTA clicks, assistant opens, WhatsApp clicks, portfolio searches, planner completions, assistant briefs and each type of submission, with path and project/service only.

### Limits and reliability

All visitors reach the API through the Next.js server, so per-address limits act as site-wide limits unless a trusted proxy that overwrites `X-Forwarded-For` sits in front. `AI_RATE_LIMIT` (default 120 per 10 minutes) and `AI_DAILY_LIMIT` (default 1000 per day, shared by all visitors and staff) bound Gemini spend. A model that fails is skipped for five minutes in favour of `GEMINI_FALLBACK_MODELS`. `experimental.proxyTimeout` is raised to 120 s so slower fallback calls are not cut off.

### SEO

Each page has its own title, description and canonical URL. Projects, services and articles add Open Graph images and JSON-LD (`ProfessionalService`, `CreativeWork`, `BreadcrumbList`, `Service`, `Article`). `/sitemap.xml` is generated from live content, and `/robots.txt` excludes `/admin` and `/api`. Set `PUBLIC_ORIGIN` to the production HTTPS origin so canonical and sitemap URLs are correct. Service pages live at `/services/<slug>` with process steps and related projects. No city landing pages were created: add them only when the studio has genuine local projects and content to publish.

### Database migration `0002`

Extends `inquiries` with request kind, attribution, brief, conversation, AI qualification, staff priority, consultation and follow-up dates, next action, lost reason and `updated`. Adds `lead_notes`, `lead_status_history` and `conversion_events`. Existing statuses map `New`→`New Inquiry` and `In Progress`/`Resolved`→`Contacted`. Existing notes move into `lead_notes`, and the old `notes` column is dropped. Downgrading restores the column with the notes joined back.

## Studio admin (`/admin`)

A sidebar dashboard (Overview, Business, Website, AI, Management) with global search, notifications, breadcrumbs, toasts, confirmation dialogs and per-page loading and empty states. It is built with the existing CSS approach and no extra UI dependencies (`app/admin/admin.css`, `components/admin/*`).

| Area | What it does |
| --- | --- |
| Dashboard | Leads, new inquiries, consultations booked, proposals sent, contracts won and lead conversion for Today, 7 days, 30 days or a custom range; inquiry trend, lead sources, recent inquiries, upcoming consultations, recent activity, on-demand AI insights. All computed from database rows. |
| Leads | Filterable table (status, priority, request type, assignee, follow-up due), bulk stage moves, and a detail page with assignment, follow-up date, next action, contract value, notes, activity history, linked consultations, source attribution, AI analysis and AI reply drafts. |
| Sales pipeline | Kanban board for the seven stages. Drag cards or use each card's "Move to" menu (keyboard accessible). Moving to Contract Won asks for confirmation; nothing is marked won automatically. |
| Consultations | Pending / Confirmed / Completed / Cancelled with the customer's preferred time, the agreed time, assignee and notes. Times are entered by staff; no calendar booking is made. |
| Projects, Services, Blog | Tables with search, filters, sorting and bulk publish, unpublish, feature or delete, plus an editor with media picker, gallery ordering, draft/publish, preview, search-result preview and SEO fields. Slugs can change only while a record is an unpublished draft, so live URLs never break. |
| Team Members | `/admin/team`: profiles with name, designation, department, short and full biography, photograph (upload, replace or remove), LinkedIn, Instagram, an optional public email, badge, display order, featured and published flags. Search, department filter, publish/unpublish and delete (owner/admin). Only published members appear on `/team` and the homepage; staff see drafts in preview. Deleting a member keeps the photo in the media library. |
| Pages & Sections | Structured forms for the homepage hero (text, buttons, slides), "ways to begin" cards, about section, closing call to action and footer tagline, with Save draft, Preview, Publish and Discard. Featured projects are chosen here too. |
| Media library | Upload (re-encoded JPEG/PNG), search, alt text, usage list and safe delete (blocked while any content references the image). Files uploaded before the library existed are registered at startup. |
| SEO | Titles, descriptions and sharing images for static pages and every project, service and article, with length and missing-field checks. |
| AI | Submitted assistant conversations, submitted project briefs, and AI configuration (switch the assistant and portfolio matching on or off, studio guidance for the assistant, model and daily-usage status). The API key is never sent to the browser. |
| Analytics | Conversion events over time, funnel, top calls to action, pages and projects that drive requests, and lead sources with win rates. |
| Team & Users (`/admin/users`), Settings | Add colleagues, change roles, reset passwords and deactivate access (revokes sessions; at least one active owner is required). Studio settings and the owner-only audit log. |

**Roles** (enforced on every API route in `backend/security.py`):
- **Owner:** everything, including team, AI configuration and audit log.
- **Admin:** business and website management, but not team or audit.
- **Editor:** projects, services, blog, pages, media and SEO. Their dashboard shows no customer data.
- **Sales:** leads, consultations, pipeline and AI conversations and briefs.
- Every role can see analytics.

**Preview:** `/preview?path=…` checks the staff session with the API, turns on Next.js draft mode, and shows drafts with a banner and `noindex`. Only same-site paths are accepted.

**Backend layout:** `main.py` holds the public, auth and AI routes. `crm.py` holds leads, pipeline, consultations, dashboard, analytics and insights. `cms.py` holds content, site pages, media, SEO, team, audit, search, notifications and AI configuration. Shared helpers live in `common.py`.

### Services CMS (`/admin/services`)

Every service page is built from database content. Nothing about individual services is hard-coded.

- **Storage:** the `services` table has relational columns (slug, live slug, old-URL redirects, name, category, featured, display order, status, timestamps) plus two validated JSONB documents: `draft` and `published`. Each document holds the general fields, the card image, SEO and an ordered list of sections. `service_revisions` keeps every save, publish and restore.
- **Section registry:** hero, rich text, image + text, features grid, benefits, process steps, gallery, related projects, testimonials, FAQ, call to action and statistics.
  - Every section has its own fields and nested items, plus a layout variant and an appearance: background (white, soft, cream, dark), text colour, accent (gold, ink, sage), alignment and spacing.
  - Editors can add, hide, duplicate, delete and drag to reorder sections and items.
  - Only the fixed options in `backend/service_schema.py` are accepted. There is no custom CSS or HTML, links must be site paths, `#anchors`, https, mailto or tel, and rich text is a small Markdown subset rendered without HTML injection. New section or field types are added by developers in that file and in `components/service-sections.tsx`.
- **Editor** (`/admin/services/[id]/edit`):
  - **Left:** a service switcher, page settings and the section navigator.
  - **Centre:** the forms, with rich-text toolbar, image upload or library, icon picker, buttons editor and repeatable items.
  - **Right:** a live preview using the public components.
  - Also: save status, inline validation messages from the server, an unsaved-changes guard, Ctrl+S and version history with restore.
- **Draft, preview and publish:** saving changes the draft only. Preview uses draft mode, and Publish copies the draft to the live version. Changing a published slug keeps the old URL working with a permanent redirect. Unpublishing removes the page from the website and navigation, and unpublished or unknown URLs return 404. Public pages render per request, so changes appear as soon as they are published.
- **Overview page** (`/admin/services/overview`): hero, call to action, trust highlights, selected projects and SEO, with its own draft and publish.
- **Navigation:** the Services dropdown lists published services in display order.
- **Compatibility:** `/api/content/services` still returns the older card shape for the homepage, about page and sitemap.

### Database migration `0007`
- Creates `services` and `service_revisions` with row-level security, and moves the six existing services out of the `content` table.
- Adds Commercial Architecture.
- Renames Architectural Design to Residential Architecture: the old `/services/architectural-design` URL redirects permanently, and the old SEO text is kept.
- Fresh installs get the seven starter services from the seed.
- Downgrading restores simple content rows.

### Database migration `0004`
Adds `content.created`. Team profiles now require a department; existing profiles get Leadership when the title or position mentions principal, founder, director or partner, and Architecture otherwise. Staff can change it in the admin. New settings: `careers_link` (Join Our Team button, defaults to /contact) and `open_roles_url` (the View Open Roles button appears only when this is set).

### Database migration `0003`
- Adds user name, active flag and created date. Existing `admin` users become `owner` because they had full access.
- Adds `content.updated`, plus `inquiries.assigned_to` and `contract_value`.
- New tables: `lead_activity` (replaces and imports `lead_status_history`), `consultations` (imported from consultation requests and `consultation_at`, which is dropped), `media_assets` and `audit_logs`.
- Downgrade restores the previous tables. The `sales` role is left unchanged on downgrade so a later upgrade can't widen it.

## Data handling

Uploaded project images are decoded and re-encoded as JPEG or PNG. Floor plans are sent to Gemini for analysis and are not saved by the application. Design-lab chat history lives in the active browser page. The assistant keeps its conversation in the tab's session storage and stores it on the server only when the visitor submits a request with consent. AI qualification and drafts send the inquiry without name, email or phone (the visitor's own description is included). The draft greeting name is filled in on the server after generation. AI inquiry insights use aggregate counts and exclude names, contact details, notes, and free-text messages.
