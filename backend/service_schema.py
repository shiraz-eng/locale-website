"""Validated content schema for service and project pages and their overview pages.

Editors choose from these fixed section types, layouts, colours and icons. New field types are added
here by developers (with a migration if stored data must change), never from the dashboard.
"""
from typing import Annotated, Literal, Union
from pydantic import Field, StringConstraints, field_validator, model_validator
from schemas import Asset, Canonical, Href, Slug, Strict

def chars(limit: int, required: bool = False):
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=1 if required else 0, max_length=limit)]

SCHEMA_VERSION = 1
Icon = Literal["house", "building", "building-2", "armchair", "sofa", "hammer", "box", "compass", "ruler", "map", "map-pin",
               "layers", "lightbulb", "pencil-ruler", "drafting-compass", "trees", "sun", "leaf", "shield-check", "clock",
               "users", "messages", "sparkles", "image", "video", "play", "camera", "landmark", "store", "hotel", "warehouse",
               "layout-grid", "scan", "file-text", "file-check", "handshake", "award", "target", "route", "palette", "lamp",
               "bed", "key", "wrench", "chart", "hard-hat", "blocks", "fence", "calendar", "download", "heart", "gem", "check"]
SectionId = Annotated[str, StringConstraints(pattern=r"^[a-z0-9-]{4,40}$")]

class Appearance(Strict):
    background: Literal["white", "soft", "cream", "dark"] = "white"
    text: Literal["default", "muted", "light"] = "default"
    accent: Literal["gold", "ink", "sage"] = "gold"
    align: Literal["left", "center"] = "left"
    spacing: Literal["compact", "normal", "spacious"] = "normal"
    # Two consecutive "half" sections share one row on wide screens.
    width: Literal["full", "half"] = "full"

class Button(Strict):
    label: chars(60, True)
    href: Href
    style: Literal["primary", "secondary", "link"] = "primary"
    visible: bool = True
    icon: Icon | None = None

class Feature(Strict):
    title: chars(120, True)
    description: chars(600) = ""
    icon: Icon = "building"

class Step(Strict):
    title: chars(120, True)
    description: chars(600) = ""

# Only YouTube and Vimeo addresses; the page turns them into privacy-friendly embeds.
Video = Annotated[str, StringConstraints(max_length=300, pattern=r"^https://((www\.)?youtube\.com/(watch\?v=|embed/|shorts/)|youtu\.be/|(player\.)?vimeo\.com/(video/)?)[A-Za-z0-9_-]{4,20}([?&][^\s]*)?$")]

class Picture(Strict):
    image: Asset
    alt: chars(200, True)
    caption: chars(200) = ""
    category: chars(40) = ""  # gallery filter, e.g. Exterior
    video: Video | None = None

    @field_validator("video", mode="before")
    @classmethod
    def no_video(cls, value):
        return value or None

class Quote(Strict):
    quote: chars(1000, True)
    author: chars(120) = ""
    role: chars(120) = ""

class Question(Strict):
    question: chars(300, True)
    answer: chars(3000, True)

class Spec(Strict):
    label: chars(60, True)
    value: chars(160, True)
    icon: Icon = "building"

class Stat(Strict):
    value: chars(20, True)
    label: chars(120, True)
    icon: Icon = "award"

class Base(Strict):
    id: SectionId
    enabled: bool = True
    nav_label: chars(40) = ""  # when set, the section appears in the page's tab bar
    appearance: Appearance = Field(default_factory=Appearance)

class Hero(Base):
    type: Literal["hero"]
    eyebrow: chars(80) = ""
    heading: chars(160, True)
    subheading: chars(400) = ""
    image: Asset | None = None
    image_alt: chars(200) = ""
    buttons: list[Button] = Field(default_factory=list, max_length=3)
    layout: Literal["split", "full", "centered"] = "split"

class RichText(Base):
    type: Literal["rich_text"]
    heading: chars(160) = ""
    body: chars(12000, True)
    layout: Literal["narrow", "wide"] = "narrow"

class ImageText(Base):
    type: Literal["image_text"]
    heading: chars(160) = ""
    body: chars(6000) = ""
    image: Asset | None = None
    image_alt: chars(200) = ""
    buttons: list[Button] = Field(default_factory=list, max_length=2)
    layout: Literal["image-left", "image-right"] = "image-right"

class Features(Base):
    type: Literal["features"]
    heading: chars(160) = ""
    intro: chars(600) = ""
    items: list[Feature] = Field(default_factory=list, max_length=12)
    layout: Literal["grid-2", "grid-3", "grid-4", "compact", "strip"] = "grid-4"

class Benefits(Base):
    type: Literal["benefits"]
    heading: chars(160) = ""
    intro: chars(600) = ""
    items: list[Feature] = Field(default_factory=list, max_length=12)
    layout: Literal["list", "grid-2", "grid-3", "grid-4"] = "grid-3"

class Process(Base):
    type: Literal["process"]
    heading: chars(160) = ""
    intro: chars(600) = ""
    items: list[Step] = Field(default_factory=list, max_length=8)
    layout: Literal["horizontal", "vertical", "timeline"] = "horizontal"

class Gallery(Base):
    type: Literal["gallery"]
    heading: chars(160) = ""
    intro: chars(600) = ""
    images: list[Picture] = Field(default_factory=list, max_length=40)
    filters: bool = False  # category buttons built from the images' categories
    layout: Literal["grid-2", "grid-3", "grid-4", "featured"] = "grid-3"

class RelatedProjects(Base):
    type: Literal["related_projects"]
    heading: chars(160) = ""
    intro: chars(600) = ""
    source: Literal["category", "manual"] = "category"
    categories: list[Slug] = Field(default_factory=list, max_length=8)  # project category slugs
    projects: list[Slug] = Field(default_factory=list, max_length=12)
    limit: int = Field(default=3, ge=1, le=12)
    link: Button | None = None
    layout: Literal["grid-2", "grid-3"] = "grid-3"

class Testimonials(Base):
    type: Literal["testimonials"]
    heading: chars(160) = ""
    source: Literal["studio", "manual"] = "studio"
    items: list[Quote] = Field(default_factory=list, max_length=8)
    layout: Literal["cards", "quote"] = "cards"

class Faq(Base):
    type: Literal["faq"]
    heading: chars(160) = ""
    intro: chars(600) = ""
    items: list[Question] = Field(default_factory=list, max_length=20)
    layout: Literal["accordion", "two-column"] = "accordion"

class Cta(Base):
    type: Literal["cta"]
    heading: chars(160, True)
    text: chars(400) = ""
    buttons: list[Button] = Field(default_factory=list, max_length=2)
    image: Asset | None = None
    image_alt: chars(200) = ""
    layout: Literal["band", "centered", "banner"] = "band"

class Overview(Base):
    type: Literal["overview"]
    heading: chars(160) = ""
    body: chars(6000, True)
    facts: bool = False  # project pages: list type, location, area, year and status beside the text
    image: Asset | None = None
    image_alt: chars(200) = ""
    video: Video | None = None  # shown only when set; the image becomes its poster
    caption: chars(120) = ""
    layout: Literal["media-right", "media-left"] = "media-right"

    @field_validator("video", mode="before")
    @classmethod
    def no_video(cls, value):
        return value or None

class Specs(Base):
    type: Literal["specs"]
    heading: chars(160) = ""
    # "project" shows the project's own details (category, location, year...); "manual" uses the items below.
    source: Literal["project", "manual"] = "manual"
    items: list[Spec] = Field(default_factory=list, max_length=10)
    layout: Literal["bar", "grid"] = "bar"

class Stats(Base):
    type: Literal["stats"]
    heading: chars(160) = ""
    items: list[Stat] = Field(default_factory=list, max_length=6)
    layout: Literal["row", "grid"] = "row"

class MaterialItem(Strict):
    category: chars(100, True)
    category_intro: chars(400) = ""
    title: chars(120, True)
    image: Asset
    description: chars(600) = ""
    tags: chars(240) = ""

class MaterialSection(Base):
    type: Literal["materials"]
    heading: chars(160, True) = "Materials & Finishes"
    intro: chars(600) = ""
    items: list[MaterialItem] = Field(default_factory=list, max_length=24)
    priorities: list[Feature] = Field(default_factory=list, max_length=8)
    strategy: list[Feature] = Field(default_factory=list, max_length=8)
    layout: Literal["grid"] = "grid"

class ProcessStage(Feature):
    image: Asset
    duration: chars(80) = ""

class ProcessPerson(Strict):
    title: chars(120, True)
    image: Asset

class ProjectVideos(Base):
    type: Literal["project_videos"]
    heading: chars(160, True) = "Video"
    intro: chars(600) = ""
    inspiration: bool = False
    videos: list[Picture] = Field(default_factory=list,max_length=8)
    layout: Literal["playlist"] = "playlist"

class ProjectProcess(Base):
    cta_image: Asset | None = None
    videos: list[Picture] = Field(default_factory=list,max_length=8)
    type: Literal["project_process"]
    heading: chars(160, True) = "Design & Build Process"
    intro: chars(600) = ""
    image: Asset | None = None
    image_alt: chars(200) = ""
    items: list[ProcessStage] = Field(default_factory=list, max_length=8)
    deliverables: list[Feature] = Field(default_factory=list, max_length=12)
    team: list[ProcessPerson] = Field(default_factory=list, max_length=8)
    team_intro: chars(400) = ""
    timeline_intro: chars(400) = ""
    cta_heading: chars(160) = ""
    cta_text: chars(400) = ""
    buttons: list[Button] = Field(default_factory=list, max_length=2)
    layout: Literal["steps"] = "steps"

Section = Annotated[Union[Hero, RichText, ImageText, Features, Benefits, Process, Gallery, RelatedProjects,
                          Testimonials, Faq, Cta, Stats, Specs, Overview, MaterialSection, ProjectProcess, ProjectVideos], Field(discriminator="type")]

class Seo(Strict):
    title: chars(120) = ""
    description: chars(240) = ""
    og_image: Asset | None = None
    canonical: Canonical = ""

class ServiceDocument(Strict):
    layout_version: Literal[0,1] = 0
    schema_version: Literal[1] = SCHEMA_VERSION
    name: chars(120, True)
    slug: Slug
    category: chars(60) = ""
    short_description: chars(300, True)
    highlights: list[chars(80)] = Field(default_factory=list, max_length=4)
    description: chars(4000) = ""
    icon: Icon = "building"
    featured: bool = False
    card_image: Asset | None = None
    card_alt: chars(200) = ""
    seo: Seo = Field(default_factory=Seo)
    sections: list[Section] = Field(default_factory=list, max_length=40)

    @model_validator(mode="after")
    def unique_sections(self):
        ids = [section.id for section in self.sections]
        if len(ids) != len(set(ids)):
            raise ValueError("Each section needs a unique id.")
        return self

    @field_validator("highlights", mode="before")
    @classmethod
    def drop_blank(cls, value):
        return [item for item in value if isinstance(item, str) and item.strip()] if isinstance(value, list) else value

class ServicesPage(Strict):
    schema_version: Literal[1] = SCHEMA_VERSION
    eyebrow: chars(80) = ""
    heading: chars(160, True)
    subheading: chars(400) = ""
    hero_image: Asset
    hero_alt: chars(200) = ""
    buttons: list[Button] = Field(default_factory=list, max_length=2)
    services_heading: chars(160) = ""
    services_intro: chars(600) = ""
    cta_heading: chars(160) = ""
    cta_text: chars(400) = ""
    cta_button: Button | None = None
    services_eyebrow: chars(80) = ""
    services_button: Button | None = None
    # Figures appear only when show_stats is on; publish verified numbers only.
    stats: list[Stat] = Field(default_factory=list, max_length=4)
    show_stats: bool = False
    advantage_eyebrow: chars(80) = ""
    advantage_heading: chars(160) = ""
    advantage_image: Asset | None = None
    advantage_alt: chars(200) = ""
    benefits: list[Feature] = Field(default_factory=list, max_length=6)
    show_projects: bool = True
    projects_heading: chars(160) = ""
    before_projects: list[Section] = Field(default_factory=list, max_length=8)
    after_projects: list[Section] = Field(default_factory=list, max_length=8)
    seo: Seo = Field(default_factory=Seo)

class ProjectDocument(Strict):
    layout_version: Literal[0,1,2] = 0
    schema_version: Literal[1] = SCHEMA_VERSION
    title: chars(160, True)
    slug: Slug
    category_id: int = Field(ge=1)
    location: chars(160) = ""
    year: int | None = Field(default=None, ge=1800, le=2200)
    area: chars(80) = ""
    status: Literal["Concept", "In Progress", "Completed"] = "Completed"
    style: chars(120) = ""
    client: chars(160) = ""
    client_approved: bool = False  # the client name is only shown when the client agreed to it
    description: chars(600, True)
    featured: bool = False
    cover_image: Asset | None = None
    cover_alt: chars(200) = ""
    seo: Seo = Field(default_factory=Seo)
    sections: list[Section] = Field(default_factory=list, max_length=40)

    @model_validator(mode="after")
    def unique_sections(self):
        ids = [section.id for section in self.sections]
        if len(ids) != len(set(ids)):
            raise ValueError("Each section needs a unique id.")
        return self

class ProjectsPage(Strict):
    schema_version: Literal[1] = SCHEMA_VERSION
    eyebrow: chars(80) = ""
    heading: chars(160, True)
    description: chars(400) = ""
    hero_image: Asset
    hero_alt: chars(200) = ""
    buttons: list[Button] = Field(default_factory=list, max_length=2)
    page_size: Literal[6, 9, 12] = 6
    default_sort: Literal["featured", "newest", "oldest", "title"] = "featured"
    cta_heading: chars(160) = ""
    cta_text: chars(400) = ""
    cta_buttons: list[Button] = Field(default_factory=list, max_length=2)
    showreel: Video | None = None  # "Watch Showreel" appears only when set
    stats: list[Stat] = Field(default_factory=list, max_length=4)
    show_stats: bool = False
    show_gallery: bool = True  # strip of images from published projects' galleries
    gallery_heading: chars(160) = ""
    seo: Seo = Field(default_factory=Seo)

    @field_validator("showreel", mode="before")
    @classmethod
    def no_showreel(cls, value):
        return value or None

class CategoryInput(Strict):
    name: chars(80, True)
    slug: Slug
    description: chars(300) = ""

def upgrade(document: dict) -> dict:
    """Bring stored documents up to the current schema version before validation (only v1 exists so far)."""
    return {**document, "schema_version": document.get("schema_version", SCHEMA_VERSION)}
