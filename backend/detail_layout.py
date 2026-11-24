"""Versioned detail-page defaults; read adaptation does not mutate saved or published records."""
import copy
import json
import re
from pathlib import Path

_path=Path(__file__).resolve().parents[1]/"data/detail-templates.json"
if not _path.is_file():_path=Path(__file__).with_name("detail-templates.json")
DEFAULTS=json.loads(_path.read_text(encoding="utf-8"))
APPEARANCE={"background":"white","text":"default","accent":"gold","align":"left","spacing":"normal"}

def standard_detail(document,kind,force=False):
    doc=copy.deepcopy(document)
    if not force and ((kind=="project" and doc.get("layout_version")==2) or (kind!="project" and doc.get("layout_version")==1)):
        return doc
    project=kind=="project"
    sections=doc.get("sections",[])
    used=set()
    ids={section["id"] for section in sections}
    def pick(template,predicate,change=None):
        for index,section in enumerate(sections):
            if index not in used and predicate(section):
                used.add(index)
                return change(section,copy.deepcopy(template)) if change else section
        result=copy.deepcopy(template)
        identifier=result["id"]
        number=2
        while identifier in ids:
            identifier=f"{result['id']}-{number}"
            number+=1
        ids.add(identifier)
        result["id"]=identifier
        return result
    def base(identifier,type,**values):
        return {"id":identifier,"type":type,"enabled":True,"appearance":copy.deepcopy(APPEARANCE),**values}
    name=doc["title"] if project else doc["name"]
    description=doc.get("description","") if project else doc.get("short_description","")
    image=doc.get("cover_image") if project else doc.get("card_image")
    alt=doc.get("cover_alt","") if project else doc.get("card_alt","")
    hero=pick(base("hero","hero",eyebrow="" if project else "Atelier Arc",heading=name,subheading=description,
                   image=image,image_alt=alt,layout="full" if image else "centered",
                   buttons=[{"label":"Start a Similar Project" if project else "Start Your Project","href":
                             "/contact?type=consultation&"+("project=" if project else "service=")+doc["slug"],"style":"primary","visible":True}]),lambda s:s["type"]=="hero")
    if project:
        facts=pick(base("facts","specs",heading="",source="project",items=[],layout="bar",appearance={**APPEARANCE,"spacing":"compact"}),lambda s:s["type"]=="specs" and s.get("source")=="project")
        overview=pick(base("overview","overview",nav_label="Overview",heading="Project Overview",body=description or "Project information will be shared by the studio.",facts=False,
                           image=None,image_alt="",video=None,caption="",layout="media-right"),lambda s:s["type"]=="overview",
                      lambda s,t:{**s,"nav_label":s.get("nav_label") or "Overview","facts":False})
        def drawing(s):
            return bool(re.search(r"drawing|plan|sketch",s.get("nav_label") or s["id"]+" "+s.get("heading",""),re.I))
        gallery=pick(base("gallery","gallery",nav_label="Gallery",heading="Project Gallery",intro="",images=[{"image":image,"alt":alt or name,"caption":""}] if image else [],filters=True,layout="grid-3"),
                     lambda s:s["type"]=="gallery" and not drawing(s) and not re.search("material",s.get("nav_label") or s["id"],re.I),lambda s,t:{**s,"nav_label":s.get("nav_label") or "Gallery","layout":"grid-3"})
        drawings=pick(base("drawings","gallery",nav_label="Drawings",heading="Project Drawings",intro="Project drawings will be added by the studio when available.",images=[],filters=False,layout="grid-3"),
                      lambda s:s["type"]=="gallery" and drawing(s),lambda s,t:{**s,"nav_label":s.get("nav_label") or "Drawings","layout":"grid-3"})
        materials=pick(DEFAULTS["materials"],lambda s:s["type"]=="materials" or s.get("nav_label","").lower()=="materials")
        def process(s,t):
            if s["type"]=="project_process":return {**s,"nav_label":s.get("nav_label") or "Process"}
            return {**t,**{key:s[key] for key in ["id","enabled","appearance","heading","intro"] if key in s},
                    "heading":s.get("heading") or t["heading"],"items":[{**t["items"][i%len(t["items"])],**item,"duration":""} for i,item in enumerate(s["items"])]}
        workflow=pick(DEFAULTS["process"],lambda s:s["type"] in {"project_process","process"},process)
        if not any(s["id"]==workflow["id"] and s["type"]=="project_process" for s in sections):workflow["cta_image"]=image
        # Every project shares the Lakeside shell; authored content and visibility remain editable.
        hero.update(layout="full" if hero.get("image") else "centered",appearance={**hero.get("appearance",APPEARANCE),"align":"left"})
        facts.update(layout="bar")
        overview.update(nav_label="Overview",layout="media-right")
        gallery.update(nav_label="Gallery",layout="grid-3")
        drawings.update(nav_label="Drawings",layout="grid-3")
        materials.update(nav_label="Materials")
        workflow.update(nav_label="Process",layout="steps")
        video=pick(DEFAULTS["video"],lambda s:s["type"]=="project_videos")
        legacy_videos=workflow.get("videos",[])
        workflow["videos"]=[]
        if legacy_videos and not any(s["type"]=="project_videos" for s in sections):
            video.update(videos=legacy_videos,inspiration=False,intro="")
        video["nav_label"]="Video"
        core=[hero,facts,overview,gallery,drawings,materials,video,workflow]
    else:
        templates=DEFAULTS["service"]
        included=pick(templates[0],lambda s:s["type"]=="features" or (s["type"]=="benefits" and "included" in s.get("heading","").lower()),lambda s,t:{**s,"type":"features","heading":s.get("heading") or t["heading"],"layout":"grid-3"})
        workflow=pick(templates[1],lambda s:s["type"]=="process",lambda s,t:{**s,"layout":"timeline"})
        projects=pick(templates[2],lambda s:s["type"]=="related_projects")
        strengths=pick(templates[3],lambda s:s["type"] in {"benefits","features"},lambda s,t:{**s,"type":"features","layout":"strip"})
        consultation=pick(templates[4],lambda s:s["type"]=="cta")
        if not any(s["id"]==consultation["id"] for s in sections):
            for button in consultation["buttons"]:button["href"]="/contact?type=consultation&service="+doc["slug"]
        core=[hero,included,workflow,projects,strengths,consultation]
    extra=[s for i,s in enumerate(sections) if i not in used]
    at=3 if project else 2
    return {**doc,"layout_version":2 if project else 1,"sections":core[:at]+extra+core[at:]}
