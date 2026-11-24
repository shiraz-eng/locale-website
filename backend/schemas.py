from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, model_validator

Short = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
Long = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=12000)]
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=120)]
Asset = Annotated[str, StringConstraints(pattern=r"^(https://[^\s]+|/media/[a-f0-9]+\.(jpg|png)|/images/[a-z0-9.-]+|/portfolio/(?:[a-z0-9-]+/)*[a-z0-9-]+\.(?:webp|jpg|png))$", max_length=1200)]
Category = Literal["Residential", "Commercial", "Interior Design", "Urban Planning", "Renovation"]
Href = Annotated[str, StringConstraints(pattern=r"^(/|/[^/\s\\][^\s\\]*|#[A-Za-z0-9_-]+|https://[^\s]+|mailto:[^\s]+|tel:[^\s]+)$", max_length=300)]
Canonical = Annotated[str, StringConstraints(pattern=r"^(https://[^\s]+)?$", max_length=300)]

class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")

class Project(Strict):
    title: Short
    description: Long
    location: Short
    category: Category
    year: int = Field(ge=1800, le=2200)
    area: str = Field(max_length=80)
    status: Literal["Concept", "In Progress", "Completed"]
    image: Asset
    gallery: list[Asset] = Field(default_factory=list, max_length=20)
    concept: Long
    challenges: Long
    featured: bool = False
    published: bool = True
    project_type: str = Field(default="", max_length=80)
    seo_title: str = Field(default="", max_length=120)
    seo_description: str = Field(default="", max_length=240)
    og_image: Asset | None = None
    canonical: Canonical = ""

class Service(Strict):
    title: Short
    description: Long
    icon: Literal["building", "armchair", "map", "hammer", "box", "messages"] = "building"
    image: Asset | None = None
    benefits: list[Short] = Field(default_factory=list, max_length=10)
    seo_title: str = Field(default="", max_length=120)
    seo_description: str = Field(default="", max_length=240)
    og_image: Asset | None = None

class Article(Strict):
    title: Short
    description: Long
    body: Long
    image: Asset | None = None
    category: str = Field(default="Architecture", min_length=1, max_length=80)
    author_name: str = Field(default="", max_length=160)
    author_role: str = Field(default="", max_length=160)
    author_bio: str = Field(default="", max_length=1000)
    author_image: Asset | None = None
    tags: list[Short] = Field(default_factory=list, max_length=12)
    published: bool = False
    seo_title: str = Field(default="", max_length=120)
    seo_description: str = Field(default="", max_length=240)
    og_image: Asset | None = None
    canonical: Canonical = ""

Department = Literal["Leadership", "Architecture", "Interior Design", "Project Management", "Design & Visualization"]
Profile = Annotated[str, StringConstraints(pattern=r"^(https://[^\s]+)?$", max_length=300)]
OptionalHref = Annotated[str, StringConstraints(pattern=r"^(/[^\s]*|https://[^\s]+|mailto:[^\s]+)?$", max_length=300)]

class Member(Strict):
    title: Short  # full name
    position: Short  # designation
    department: Department
    description: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=600)]  # short bio
    full_bio: str = Field(default="", max_length=6000)
    image: Asset | None = None
    linkedin: Profile = ""
    instagram: Profile = ""
    public_email: EmailStr | None = None
    badge: str = Field(default="", max_length=30)
    order: int = Field(default=0, ge=0, le=9999)
    featured: bool = False
    published: bool = True

class Settings(Strict):
    title: Short
    headline: Short
    intro: Long
    email: EmailStr
    phone: Short
    location: Short
    logo: Asset | None = None
    hero_description: str = Field(default="", max_length=300)
    testimonials: list[Long] = Field(default_factory=list, max_length=8)
    free_consultation: bool = False
    careers_link: OptionalHref = ""
    open_roles_url: OptionalHref = ""
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    whatsapp: str = Field(default="", pattern=r"^(\+?[0-9]{8,15})?$", max_length=16)
    instagram: str = Field(default="", pattern=r"^(https://[^\s]+)?$", max_length=300)
    linkedin: str = Field(default="", pattern=r"^(https://[^\s]+)?$", max_length=300)

Requirement = Literal["Natural light", "Accessibility", "Energy efficiency", "Flexible layout", "Outdoor space", "Adaptive reuse"]
ServiceInterest = Literal["Architectural Design", "Interior Design", "Urban Planning", "Renovation and Remodeling", "3D Visualization", "Architecture Consultation"]

Status = Literal["New", "In Progress", "Completed", "Closed", "New Inquiry", "Contacted", "Consultation Scheduled", "Proposal Sent", "Negotiation", "Contract Won", "Contract Lost"]
Priority = Literal["Ready for Consultation", "Needs Follow-Up", "Early Exploration"]
LostReason = Literal["Budget", "Timeline", "Chose another firm", "Project postponed", "No response", "Scope mismatch", "Other"]
RequestKind = Literal["inquiry", "consultation", "quotation", "brief"]
PlanType = Literal["Residential Architecture", "Commercial Architecture", "Interior Design", "Renovation", "3D Visualization", "Landscape", "Custom", "Mosque / Masjid Architecture", "Urban Planning"]
Style = Literal["Modern", "Minimalist", "Contemporary", "Luxury", "Traditional", "Sustainable"]
Line = Annotated[str, StringConstraints(strip_whitespace=True, max_length=600)]
Brief160 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)]

class Attribution(Strict):
    page: str = Field(default="", max_length=300)
    landing: str = Field(default="", max_length=300)
    referrer: str = Field(default="", max_length=120)
    utm_source: str = Field(default="", max_length=120)
    utm_medium: str = Field(default="", max_length=120)
    utm_campaign: str = Field(default="", max_length=120)
    project: Slug | None = None
    service: Slug | None = None

class BriefReference(Strict):
    title: str = Field(max_length=160)
    url: str = Field(pattern=r"^/(?:projects/[a-z0-9-]+|services/[a-z0-9-]+|contact)$",max_length=300)

class Brief(Strict):
    title: Brief160 = ""
    overview: str = Field(default="", max_length=3000)
    project_type: Brief160 = ""
    location: Brief160 = ""
    size: Brief160 = ""
    budget: Brief160 = ""
    timeline: Brief160 = ""
    styles: list[Brief160] = Field(default_factory=list, max_length=8)
    design_preferences: list[Line] = Field(default_factory=list, max_length=12)
    space_requirements: list[Line] = Field(default_factory=list, max_length=16)
    considerations: list[Line] = Field(default_factory=list, max_length=12)
    services: list[Slug] = Field(default_factory=list, max_length=6)
    questions: list[Line] = Field(default_factory=list, max_length=12)
    design_recommendations: list[Line] = Field(default_factory=list,max_length=8)
    functional_zones: list[Line] = Field(default_factory=list,max_length=8)
    suggested_spaces: list[Line] = Field(default_factory=list,max_length=8)
    materials: list[Line] = Field(default_factory=list,max_length=8)
    color_palette: list[Line] = Field(default_factory=list,max_length=8)
    lighting_ventilation: list[Line] = Field(default_factory=list,max_length=8)
    sustainability: list[Line] = Field(default_factory=list,max_length=8)
    budget_considerations: list[Line] = Field(default_factory=list,max_length=8)
    timeline_considerations: list[Line] = Field(default_factory=list,max_length=8)
    concept_summary: str = Field(default="",max_length=3000)
    next_action: str = Field(default="",max_length=600)
    sources: list[BriefReference] = Field(default_factory=list,max_length=10)

class Message(Strict):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=4000)

class InquiryInput(Strict):
    form_id: Literal["contact"] | None = None
    form_version: str = Field(default="", max_length=40)
    answers: dict[str, str | list[str]] = Field(default_factory=dict, max_length=24)
    submission_id: UUID | None = None
    website: str = Field(default="", max_length=200)
    name: Short
    email: EmailStr
    phone: str = Field(default="", max_length=50)
    kind: RequestKind = "inquiry"
    project_type: Short | None = None
    budget: str = Field(default="", max_length=100)
    timeline: str = Field(default="", max_length=100)
    location: str = Field(default="", max_length=160)
    description: Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=4000)]
    consultation: bool = False
    preferred_time: str = Field(default="", max_length=160)
    consent: Literal[True]
    service_interest: Short | None = None
    requirements: list[Short] = Field(default_factory=list, max_length=40)
    attribution: Attribution = Field(default_factory=Attribution)
    brief: Brief | None = None
    conversation: list[Message] = Field(default_factory=list, max_length=40)

class InquiryUpdate(Strict):
    status: Status
    priority: Priority | None = None
    assigned_to: EmailStr | None = None
    contract_value: Decimal | None = Field(default=None, ge=0, le=Decimal("999999999999"), decimal_places=2)
    follow_up_at: date | None = None
    next_action: str = Field(default="", max_length=1000)
    lost_reason: LostReason | None = None

class Stage(Strict):
    status: Status

ConsultationStatus = Literal["Pending", "Confirmed", "Completed", "Cancelled"]

class ConsultationInput(Strict):
    status: ConsultationStatus = "Pending"
    preferred_time: str = Field(default="", max_length=160)
    scheduled_at: datetime | None = None
    assigned_to: EmailStr | None = None
    notes: str = Field(default="", max_length=8000)

class Link(Strict):
    label: Short
    href: Href

class Slide(Strict):
    image: Asset
    label: Short
    alt: Short

class Principle(Strict):
    title: Short
    text: Long

class PathCard(Strict):
    title: Short
    text: str = Field(default="", max_length=300)
    href: Href

class SiteContent(Strict):
    hero_kicker: Short
    hero_headline: Short
    hero_description: str = Field(default="", max_length=300)
    hero_primary: Link
    hero_secondary: Link
    hero_tertiary: Link
    hero_slides: list[Slide] = Field(min_length=1, max_length=6)
    paths_title: Short
    paths_text: str = Field(default="", max_length=300)
    paths: list[PathCard] = Field(default_factory=list, max_length=4)
    about_title: Short
    about_text: Long
    about_image: Asset
    about_principles: list[Principle] = Field(default_factory=list, max_length=4)
    cta_title: Short
    cta_text: str = Field(default="", max_length=300)
    cta_primary: Link
    cta_secondary: Link
    cta_tertiary: Link
    footer_tagline: Short

class PageSeo(Strict):
    title: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=240)
    og_image: Asset | None = None

StaticPath = Literal["/", "/projects", "/services", "/about", "/team", "/contact", "/blog", "/plan-your-project", "/ai-design"]

class PagesSeo(Strict):
    pages: dict[StaticPath, PageSeo] = Field(default_factory=dict)

class SeoUpdate(Strict):
    seo_title: str = Field(default="", max_length=120)
    seo_description: str = Field(default="", max_length=240)
    og_image: Asset | None = None

class AiFaq(Strict):
    question: str = Field(min_length=1,max_length=300)
    answer: str = Field(min_length=1,max_length=1000)

class AiConfig(Strict):
    assistant_enabled: bool = True
    portfolio_enabled: bool = True
    guidance: str = Field(default="", max_length=2000)
    introduction: str = Field(default="Tell me what you would like to build or redesign. I can help explore concepts and prepare a brief for your architect. Advice is conceptual; costs, schedules and approvals require professional confirmation.",max_length=600)
    domain_knowledge: str = Field(default="",max_length=6000)
    faqs: list[AiFaq] = Field(default_factory=list,max_length=15)
    approved_services: list[Slug] = Field(default_factory=list,max_length=60)
    style_presets: list[Short] = Field(default_factory=lambda:["Modern","Minimalist","Contemporary","Luxury","Traditional","Sustainable"],max_length=12)
    material_guidance: str = Field(default="",max_length=2000)
    tone: Literal["professional","warm","concise"] = "professional"
    consultation_cta: str = Field(default="Discuss the concept and next steps with the studio.",max_length=300)
    example_questions: list[Annotated[str,StringConstraints(min_length=1,max_length=300)]] = Field(default_factory=lambda:["Help me plan a home for my family.","Which finishes suit a busy apartment interior?","What should I consider for a mosque prayer hall and wudu facilities?"],max_length=6)
    knowledge_sources: list[Literal["projects","services","materials","styles","faqs","studio"]] = Field(default_factory=lambda:["projects","services","materials","styles","faqs","studio"],max_length=6)


Role = Literal["owner", "admin", "editor", "sales"]
Password = Annotated[str, StringConstraints(min_length=14, max_length=256)]

class TeamCreate(Strict):
    email: EmailStr
    name: str = Field(default="", max_length=120)
    role: Role
    password: Password

class TeamUpdate(Strict):
    name: str = Field(default="", max_length=120)
    role: Role
    active: bool = True
    password: Password | None = None

class MediaUpdate(Strict):
    alt: str = Field(default="", max_length=300)
    name: str = Field(default="", max_length=200)

class Note(Strict):
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]

class DraftRequest(Strict):
    type: Literal["first_response", "missing_info", "consultation_invite", "follow_up", "proposal_intro"]

class Event(Strict):
    name: Literal["cta_click", "whatsapp_click", "assistant_open", "portfolio_search"]
    label: str = Field(default="", max_length=60)
    path: str = Field(default="", max_length=300)
    project: Slug | None = None
    service: Slug | None = None

class Plan(Strict):
    project_type: PlanType
    location: str = Field(default="", max_length=160)
    size: str = Field(default="", max_length=120)
    floors: str = Field(default="", max_length=40)
    rooms: str = Field(default="", max_length=600)
    requirements: str = Field(default="", max_length=2000)
    styles: list[Brief160] = Field(default_factory=list, max_length=12)
    budget: str = Field(default="", max_length=100)
    start: str = Field(default="", max_length=40)
    timeline: str = Field(default="", max_length=100)

class PortfolioQuery(Strict):
    query: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=600)]

class Credentials(Strict):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)

class Chat(Strict):
    messages: list[Message] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def bounded_context(self):
        if sum(len(message.text) for message in self.messages)>24000:
            raise ValueError("This conversation is too long. Start a new conversation or shorten the messages.")
        return self

class Preferences(Strict):
    building_type: Category
    style: Short
    space: Short
    budget: str = Field(default="", max_length=100)
    preferences: str = Field(default="", max_length=2000)
