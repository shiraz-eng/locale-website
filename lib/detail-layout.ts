import defaults from "../data/detail-templates.json";
import type {ProjectDoc,ServiceDoc,Section,Appearance} from "./services";
const appearance:Appearance={background:"white",text:"default",accent:"gold",align:"left",spacing:"normal"};
type Detail=ProjectDoc|ServiceDoc;
// Apply the shared template once; retain subsequent CMS layout and content edits.
export function standardDetail<D extends Detail>(document:D,force=false):D{
  const doc=structuredClone(document);
  if(!force&&("title" in doc?doc.layout_version===2:doc.layout_version===1))return doc;
  const project="title" in doc,sections=doc.sections,used=new Set<Section>();
  const ids=new Set(sections.map(section=>section.id));
  function pick(template:Section,predicate:(section:Section)=>boolean,change?:(existing:Section,template:Section)=>Section):Section{
    const existing=sections.find(section=>!used.has(section)&&predicate(section));
    if(existing){used.add(existing);return change?change(existing,template):existing}
    let id=template.id,n=2;while(ids.has(id))id=template.id+"-"+n++;
    ids.add(id);return {...structuredClone(template),id};
  }
  const name=project?doc.title:doc.name,description=project?doc.description:doc.short_description,image=project?doc.cover_image:doc.card_image;
  const hero=pick({id:"hero",type:"hero",enabled:true,appearance,eyebrow:project?"":"Atelier Arc",heading:name,subheading:description,image,image_alt:project?doc.cover_alt:doc.card_alt,layout:image?"full":"centered",buttons:[{label:project?"Start a Similar Project":"Start Your Project",href:"/contact?type=consultation&"+(project?"project=":"service=")+doc.slug,visible:true,style:"primary"}]},section=>section.type==="hero");
  let core:Section[];
  if(project){
    const facts=pick({id:"facts",type:"specs",enabled:true,appearance:{...appearance,spacing:"compact"},heading:"",source:"project",items:[],layout:"bar"},section=>section.type==="specs"&&section.source==="project");
    const overview=pick({id:"overview",type:"overview",enabled:true,appearance,nav_label:"Overview",heading:"Project Overview",body:description||"Project information will be shared by the studio.",facts:false,image:null,image_alt:"",video:null,caption:"",layout:"media-right"},section=>section.type==="overview",(old)=>({...old,nav_label:old.nav_label||"Overview",facts:false} as Section));
    const isDrawing=(section:Section)=>/drawing|plan|sketch/i.test(section.nav_label||section.id+" "+("heading" in section?section.heading:""));
    const gallery=pick({id:"gallery",type:"gallery",enabled:true,appearance,nav_label:"Gallery",heading:"Project Gallery",intro:"",images:image?[{image,alt:doc.cover_alt||name,caption:""}]:[],filters:true,layout:"grid-3"},section=>section.type==="gallery"&&!isDrawing(section)&&!/material/i.test(section.nav_label||section.id),(old)=>({...old,nav_label:old.nav_label||"Gallery",layout:"grid-3"} as Section));
    const drawings=pick({id:"drawings",type:"gallery",enabled:true,appearance,nav_label:"Drawings",heading:"Project Drawings",intro:"Project drawings will be added by the studio when available.",images:[],filters:false,layout:"grid-3"},section=>section.type==="gallery"&&isDrawing(section),(old)=>({...old,nav_label:old.nav_label||"Drawings",layout:"grid-3"} as Section));
    const materials=pick(defaults.materials as Section,section=>section.type==="materials"||/^materials$/i.test(section.nav_label||""));
    const workflow=pick(defaults.process as Section,section=>section.type==="project_process"||section.type==="process",(old,template)=>{
      if(old.type==="project_process")return {...old,nav_label:old.nav_label||"Process"};
      const target=template as Extract<Section,{type:"project_process"}>;
      return {...target,id:old.id,enabled:old.enabled,appearance:old.appearance,heading:("heading" in old&&old.heading)||target.heading,intro:"intro" in old?old.intro:target.intro,items:old.type==="process"?old.items.map((item,index)=>({...target.items[index%target.items.length],...item,duration:""})):target.items};
    });
    if(workflow.type==="project_process"&&!sections.some(section=>section.id===workflow.id&&section.type==="project_process"))workflow.cta_image=image;
    if(hero.type==="hero"){hero.layout=hero.image?"full":"centered";hero.appearance={...hero.appearance,align:"left"}}
    if(facts.type==="specs")facts.layout="bar";
    if(overview.type==="overview"){overview.nav_label="Overview";overview.layout="media-right"}
    gallery.nav_label="Gallery";drawings.nav_label="Drawings";materials.nav_label="Materials";workflow.nav_label="Process";
    if(workflow.type==="project_process")workflow.layout="steps";
    const video=pick(defaults.video as Section,section=>section.type==="project_videos");
    if(workflow.type==="project_process"){
      const legacy=workflow.videos||[];workflow.videos=[];
      if(legacy.length&&!sections.some(section=>section.type==="project_videos")&&video.type==="project_videos"){video.videos=legacy;video.inspiration=false;video.intro=""}
    }
    video.nav_label="Video";
    core=[hero,facts,overview,gallery,drawings,materials,video,workflow];
  }else{
    const templates=structuredClone(defaults.service) as Section[];
    const included=pick(templates[0],section=>section.type==="features"||(section.type==="benefits"&&/included/i.test(section.heading)),(old,template)=>({...old,type:"features",heading:("heading" in old&&old.heading)||("heading" in template?template.heading:""),layout:"grid-3"} as Section));
    const workflow=pick(templates[1],section=>section.type==="process",(old)=>({...old,layout:"timeline"} as Section));
    const projects=pick(templates[2],section=>section.type==="related_projects");
    const strengths=pick(templates[3],section=>section.type==="benefits"||section.type==="features",(old)=>({...old,type:"features",layout:"strip"} as Section));
    const consultation=pick(templates[4],section=>section.type==="cta");
    if(consultation.type==="cta"&&!sections.some(section=>section.id===consultation.id))consultation.buttons=consultation.buttons.map(button=>({...button,href:"/contact?type=consultation&service="+doc.slug}));
    core=[hero,included,workflow,projects,strengths,consultation];
  }
  const extra=sections.filter(section=>!used.has(section));
  // Retain authored concept, feature, FAQ, and other sections immediately after the introduction.
  const at=project?3:2;
  return {...doc,layout_version:project?2:1,sections:[...core.slice(0,at),...extra,...core.slice(at)]};
}
