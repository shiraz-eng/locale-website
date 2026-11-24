"""Bounded, lexical retrieval over published website records; no CRM or draft access."""
import re
from sqlalchemy import select
from models import Content,Project,Service
from common import config
import schemas as s

DOMAIN = """Conceptual architecture and interior-design consultant. Cover residential and commercial buildings,
interiors, renovations, urban planning, sustainable design, spatial circulation, materials, color, daylight,
lighting and ventilation. First establish use, location/climate, site/area, occupants, access, required spaces
and existing conditions. Offer options and tradeoffs, not certified designs. Do not assume missing dimensions.
For mosque/masjid concepts ask congregation capacity and locally verified qibla direction; consider clear prayer
rows, dignified inclusive access, locally appropriate family/women's facilities, shoe storage, ablution/wudu and
toilets separated from clean prayer circulation, slip resistance, ventilation, acoustics, peak arrival/egress and
community uses. Confirm all areas, direction, accessibility, fire/egress and local requirements with an architect.
Materials: discuss wet/dry use, wear, cleaning, moisture, slip resistance, local availability and maintenance.
Colors: suggest coordinated base/accent tones and test physical samples under daylight and artificial light.
Sustainability: consider orientation, shading, cross-ventilation, efficient lighting, durable lower-impact finishes
and water use subject to climate and consultant checks. For renovation, identify structural/services surveys.
Budgets: repeat only the visitor's own figures; discuss scope, contingencies, procurement and tradeoffs without
inventing prices. Scheduling: name indicative phases and dependencies without promising durations or dates.
Distinguish design suggestions from existing project facts and studio capabilities."""

STOP={"the","and","for","with","want","would","design","project","please","that","this","have"}
def terms(query):
    return set(re.findall(r"[\w-]{3,}",query.lower()))-STOP

def retrieve(db,query,settings=None):
    settings=settings or config(db,"ai",s.AiConfig)
    sources=set(settings.knowledge_sources);wanted=terms(query);records=[];refs=[]
    def add(kind,title,url,text,**extra):
        text=str(text).strip()[:1100]
        if not text:return
        records.append({"source":kind,"title":str(title)[:160],"url":url,"text":text,**extra})
    # Fetch only the published JSON. Never use row.draft or serialize whole ORM records.
    services=list(db.execute(select(Service.live_slug,Service.published).where(Service.status=="published",Service.published.is_not(None)).order_by(Service.sort_order).limit(60)))
    allowed=set(settings.approved_services)
    services=[(slug,doc) for slug,doc in services if not allowed or slug in allowed]
    service_cards=[{"slug":slug,"title":doc["name"],"description":doc.get("short_description","")[:240]} for slug,doc in sorted(services,key=lambda row:sum(word in str(row[1]).lower() for word in wanted),reverse=True)[:12]]
    projects=list(db.execute(select(Project.live_slug,Project.published).where(Project.status=="published",Project.published.is_not(None)).order_by(Project.featured.desc(),Project.sort_order).limit(60)))
    def rank(row):
        _,doc=row
        hay=" ".join(str(doc.get(key,"")) for key in ["name","title","short_description","description","location","style"]).lower()
        return sum(word in hay for word in wanted)
    selected_services=sorted(services,key=rank,reverse=True)[:4]
    selected_projects=sorted(projects,key=rank,reverse=True)[:4]
    if "services" in sources:
        for slug,doc in selected_services:add("service",doc["name"],"/services/"+slug,doc.get("description") or doc.get("short_description",""))
    if "services" not in sources:service_cards=[]
    project_cards=[]
    if "projects" in sources:
        for slug,doc in selected_projects:
            project_cards.append({"slug":slug,**{key:doc.get(key,"") for key in ["title","location","status","area","year"]},"description":doc.get("description","")[:240]})
            add("project",doc["title"],"/projects/"+slug,doc.get("description",""),status=doc.get("status",""))
    for kind,rows in [("service",selected_services),("project",selected_projects)]:
        for slug,doc in rows:
            url=("/services/" if kind=="service" else "/projects/")+slug
            if "styles" in sources and doc.get("style"):add("style",doc.get("title",doc.get("name","")),url,doc["style"])
            for section in doc.get("sections",[]):
                if section.get("enabled",True) is False:continue
                if section.get("type")=="materials" and "materials" in sources:
                    for item in section.get("items",[])[:6]:
                        add("material",item.get("title","Material"),url," ".join([section.get("intro",""),item.get("description",""),item.get("tags","")]))
                if section.get("type")=="faq" and "faqs" in sources:
                    for item in section.get("items",[])[:4]:add("faq",item["question"],url,item["answer"])
    if "studio" in sources:
        row=db.get(Content,("settings","studio"))
        if row:add("studio",row.data.get("title","Studio"),"/contact",row.data.get("intro",""),location=row.data.get("location",""))
    if "faqs" in sources:
        for item in settings.faqs:add("faq",item.question,"/contact",item.answer)
    # Stable relevance ranking, then a strict context budget. Empty overlap retains useful general facts.
    records.sort(key=lambda r:sum(word in (r["title"]+" "+r["text"]).lower() for word in wanted),reverse=True)
    knowledge=[];budget=6500
    for record in records:
        cost=len(str(record))
        if cost>budget:continue
        knowledge.append(record);budget-=cost
        if len(knowledge)>=10:break
    for record in knowledge:
        if record["url"] not in {r["url"] for r in refs}:refs.append({"title":record["title"],"url":record["url"]})
    return {"services":service_cards,"projects":project_cards,"knowledge":knowledge,"references":refs,
        "studio_preferences":{"guidance":settings.guidance,"domain_knowledge":settings.domain_knowledge[:3000],
            "material_guidance":settings.material_guidance,"style_presets":settings.style_presets,
            "tone":settings.tone,"consultation_cta":settings.consultation_cta}}
