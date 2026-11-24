"use client";
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {updateDocumentField} from "../../lib/document-fields";
import {ArrowDown,ArrowUp,Bold,Copy,Eye,EyeOff,GripVertical,History,Italic,Link2,List,Plus,Trash2} from "lucide-react";
import {refreshPublishedContent,request,type Project} from "../../lib/content";
import {icons,iconNames,type Appearance,type ProjectCategory,type Section,type SectionType,type Seo} from "../../lib/services";
import ServiceSections,{ServiceSection,type SectionContext} from "../service-sections";
import {fontClasses} from "../home/fonts";
import "../../app/(public)/home.css";
import "../../app/(public)/services/services-reference.css";
import "../../app/(public)/services/locale-services.css";
import {ImageInput,previewHref} from "./records";
import {Badge,Card,Loadable,formatDateTime,useAdmin,useApi} from "./ui";
type Kind="text"|"textarea"|"rich"|"image"|"icon"|"select"|"number"|"buttons"|"button"|"categories"|"projects"|"toggle";
type FieldSpec={key:string;label:string;kind:Kind;max?:number;help?:string;options?:readonly string[];required?:boolean;min?:number};
type ItemSpec={key:string;label:string;max:number;fields:FieldSpec[];make:()=>Record<string,unknown>};
type Spec={label:string;layouts:string[];fields:FieldSpec[];items?:ItemSpec;extraItems?:ItemSpec[];make:()=>Record<string,unknown>};
type Revision={id:number;version:number;kind:string;author:string;created:string};
export type BuilderDoc={slug:string;seo:Seo;sections:Section[]};
export type Detail<D extends BuilderDoc>={id:number;slug:string;live_slug:string|null;status:string;unpublished_changes:boolean;updated:string;published_at:string|null;draft:D;published:D|null;redirects:string[];revisions:Revision[]};
export type Setter<D>=<K extends keyof D>(key:K,value:D[K])=>void;
// What differs between entities (services, projects); everything else in the editor is shared.
export type EditorConfig<D extends BuilderDoc>={api:string;base:string;noun:string;label:(doc:D)=>string;summary:(doc:D)=>string;
  switcher:(item:Record<string,unknown>)=>string;context:(doc:D,catalog:Catalog,testimonials:string[])=>SectionContext;
  mediaLabel:string;template?:{name:string;description:string;sections:string[];apply:(doc:D)=>D};panels:(doc:D,set:Setter<D>,detail:Detail<D>,jump:(id:string)=>void,catalog:Catalog)=>{general:ReactNode;media:ReactNode}};
type Problem={path:string;message:string};
const heading:FieldSpec={key:"heading",label:"Heading",kind:"text",max:160};
const intro:FieldSpec={key:"intro",label:"Introduction",kind:"textarea",max:600};
const feature:ItemSpec={key:"items",label:"Item",max:12,fields:[{key:"title",label:"Title",kind:"text",max:120,required:true},{key:"description",label:"Description",kind:"textarea",max:600},{key:"icon",label:"Icon",kind:"icon"}],make:()=>({title:"New item",description:"",icon:"building"})};
// The fixed registry of section types editors can use; mirrors backend/service_schema.py.
export const SPECS:Record<SectionType,Spec>={
  project_videos:{label:"Video playlist",layouts:["playlist"],fields:[heading,intro,{key:"inspiration",label:"These are inspiration films by other architects",kind:"toggle"}],items:{key:"videos",label:"Video",max:8,fields:[{key:"image",label:"Poster image",kind:"image",required:true},{key:"alt",label:"Video title",kind:"text",required:true,max:200},{key:"caption",label:"Caption / creator credit",kind:"text",max:200},{key:"video",label:"YouTube or Vimeo URL",kind:"text",required:true,max:300}],make:()=>({image:"",alt:"",caption:"",video:""})},make:()=>({heading:"Video",intro:"",inspiration:false,videos:[]})},
  materials:{label:"Materials & finishes",layouts:["grid"],fields:[heading,intro],items:{key:"items",label:"Material",max:24,fields:[{key:"title",label:"Name",kind:"text",required:true},{key:"category",label:"Category",kind:"text",required:true},{key:"category_intro",label:"Category introduction",kind:"textarea"},{key:"image",label:"Image",kind:"image",required:true},{key:"description",label:"Description",kind:"textarea"},{key:"tags",label:"Characteristics (comma separated)",kind:"text"}],make:()=>({title:"Material",category:"Exterior",category_intro:"",image:"",description:"",tags:""})},extraItems:[{...feature,key:"priorities",label:"Palette priority",max:8},{...feature,key:"strategy",label:"Material strategy",max:8}],make:()=>({heading:"Materials & Finishes",intro:"",items:[],priorities:[],strategy:[]})},
  project_process:{label:"Detailed process",layouts:["steps"],fields:[heading,intro,{key:"image",label:"Concept image",kind:"image"},{key:"image_alt",label:"Image description",kind:"text"},{key:"team_intro",label:"Team introduction",kind:"textarea"},{key:"timeline_intro",label:"Timeline introduction",kind:"textarea"},{key:"cta_image",label:"Call to action background image",kind:"image"},{key:"cta_heading",label:"Call to action heading",kind:"text"},{key:"cta_text",label:"Call to action text",kind:"textarea"},{key:"buttons",label:"Buttons",kind:"buttons",max:2}],items:{...feature,max:8,fields:[...feature.fields,{key:"image",label:"Stage image",kind:"image",required:true},{key:"duration",label:"Duration",kind:"text"}],make:()=>({...feature.make(),image:"",duration:""})},extraItems:[{key:"videos",label:"Project video",max:8,fields:[{key:"image",label:"Poster image",kind:"image",required:true},{key:"alt",label:"Video title / description",kind:"text",max:200,required:true},{key:"caption",label:"Playlist title",kind:"text",max:200},{key:"video",label:"YouTube or Vimeo URL",kind:"text",max:300,required:true}],make:()=>({image:"",alt:"",caption:"",category:"",video:""})},{...feature,key:"deliverables",label:"Deliverable",max:12},{key:"team",label:"Team role",max:8,fields:[{key:"title",label:"Role",kind:"text",required:true,max:120},{key:"image",label:"Portrait",kind:"image",required:true}],make:()=>({title:"Architect",image:""})}],make:()=>({heading:"Design & Build Process",intro:"",image:null,image_alt:"",items:[],deliverables:[],team:[],team_intro:"",timeline_intro:"",cta_heading:"",cta_text:"",buttons:[]})},
  hero:{label:"Hero",layouts:["split","full","centered"],fields:[{key:"eyebrow",label:"Small heading",kind:"text",max:80},{...heading,required:true,help:"Wrap words in *asterisks* to show them in the gold accent colour."},{key:"subheading",label:"Subheading",kind:"textarea",max:400},{key:"image",label:"Image",kind:"image"},{key:"image_alt",label:"Image alt text",kind:"text",max:200,help:"Describe the image for screen readers and search engines."},{key:"buttons",label:"Buttons",kind:"buttons",max:3}],make:()=>({eyebrow:"",heading:"New heading",subheading:"",image:null,image_alt:"",buttons:[]})},
  rich_text:{label:"Rich text",layouts:["narrow","wide"],fields:[heading,{key:"body",label:"Text",kind:"rich",max:12000,required:true}],make:()=>({heading:"",body:"Write your text here."})},
  image_text:{label:"Image + text",layouts:["image-right","image-left"],fields:[heading,{key:"body",label:"Text",kind:"rich",max:6000},{key:"image",label:"Image",kind:"image"},{key:"image_alt",label:"Image alt text",kind:"text",max:200},{key:"buttons",label:"Buttons",kind:"buttons",max:2}],make:()=>({heading:"New section",body:"",image:null,image_alt:"",buttons:[]})},
  features:{label:"Features grid",layouts:["grid-4","grid-3","grid-2","compact","strip"],fields:[heading,intro],items:feature,make:()=>({heading:"What We Offer",intro:"",items:[feature.make()]})},
  benefits:{label:"Benefits",layouts:["grid-3","grid-2","grid-4","list"],fields:[heading,intro],items:feature,make:()=>({heading:"Why work with us",intro:"",items:[feature.make()]})},
  process:{label:"Process steps",layouts:["horizontal","vertical","timeline"],fields:[heading,intro],items:{key:"items",label:"Step",max:8,fields:[{key:"title",label:"Title",kind:"text",max:120,required:true},{key:"description",label:"Description",kind:"textarea",max:600}],make:()=>({title:"New step",description:""})},make:()=>({heading:"Our process",intro:"",items:[{title:"Discover",description:""}]})},
  gallery:{label:"Image / video gallery",layouts:["featured","grid-3","grid-2","grid-4"],fields:[heading,intro,{key:"filters",label:"Show category filter buttons (built from each image’s category)",kind:"toggle"}],items:{key:"images",label:"Image",max:40,fields:[{key:"image",label:"Image",kind:"image",required:true},{key:"alt",label:"Alt text",kind:"text",max:200,required:true},{key:"caption",label:"Caption",kind:"text",max:200},{key:"category",label:"Category",kind:"text",max:40,help:"e.g. Exterior, Interior, Landscape, Details"},{key:"video",label:"Video link (optional)",kind:"text",max:300,help:"A YouTube or Vimeo address. The image above becomes its poster; leave empty for a photo."}],make:()=>({image:"",alt:"",caption:"",category:"",video:null})},make:()=>({heading:"Project gallery",intro:"",images:[],filters:false})},
  related_projects:{label:"Related projects",layouts:["grid-3","grid-2"],fields:[heading,intro,{key:"source",label:"Choose projects by",kind:"select",options:["category","manual"]},{key:"categories",label:"Project categories (leave empty for all)",kind:"categories"},{key:"projects",label:"Projects (when choosing manually)",kind:"projects"},{key:"limit",label:"How many to show",kind:"number",min:1,max:12},{key:"link",label:"Heading link (optional)",kind:"button"}],make:()=>({heading:"Related projects",intro:"",source:"category",categories:[],projects:[],limit:3,link:null})},
  testimonials:{label:"Testimonials",layouts:["cards","quote"],fields:[heading,{key:"source",label:"Source",kind:"select",options:["studio","manual"],help:"“studio” uses the approved testimonials from Settings. Only publish real client quotes."}],items:{key:"items",label:"Testimonial",max:8,fields:[{key:"quote",label:"Quote",kind:"textarea",max:1000,required:true},{key:"author",label:"Name",kind:"text",max:120},{key:"role",label:"Role or project",kind:"text",max:120}],make:()=>({quote:"",author:"",role:""})},make:()=>({heading:"What clients say",source:"studio",items:[]})},
  faq:{label:"FAQ",layouts:["accordion","two-column"],fields:[heading,intro],items:{key:"items",label:"Question",max:20,fields:[{key:"question",label:"Question",kind:"text",max:300,required:true},{key:"answer",label:"Answer",kind:"rich",max:3000,required:true}],make:()=>({question:"New question?",answer:"Answer."})},make:()=>({heading:"Frequently asked questions",intro:"",items:[{question:"New question?",answer:"Answer."}]})},
  cta:{label:"Call to action",layouts:["band","centered","banner"],fields:[{...heading,required:true},{key:"text",label:"Text",kind:"textarea",max:400},{key:"buttons",label:"Buttons",kind:"buttons",max:2},{key:"image",label:"Background image (banner layout)",kind:"image"},{key:"image_alt",label:"Image alt text",kind:"text",max:200}],make:()=>({heading:"Ready to start?",text:"",buttons:[{label:"Get a Consultation",href:"/contact?type=consultation",style:"primary",visible:true}]})},
  specs:{label:"Project specifications",layouts:["bar","grid"],fields:[heading,{key:"source",label:"Show",kind:"select",options:["project","manual"],help:"“project” shows this project’s category, location, year, area, status, style and (if approved) client. “manual” uses the items below."}],items:{key:"items",label:"Specification",max:10,fields:[{key:"label",label:"Label",kind:"text",max:60,required:true},{key:"value",label:"Value",kind:"text",max:160,required:true},{key:"icon",label:"Icon",kind:"icon"}],make:()=>({label:"",value:"",icon:"building"})},make:()=>({heading:"",source:"manual",items:[]})},
  overview:{label:"Overview with media",layouts:["media-right","media-left"],fields:[heading,{key:"body",label:"Text",kind:"rich",max:6000,required:true},{key:"facts",label:"Show the project’s details (type, location, area, year, status) beside the text",kind:"toggle"},{key:"image",label:"Image",kind:"image"},{key:"image_alt",label:"Image alt text",kind:"text",max:200},{key:"video",label:"Video link (optional)",kind:"text",max:300,help:"YouTube or Vimeo. The image becomes its poster with a play button. Leave empty when there is no video."},{key:"caption",label:"Video caption",kind:"text",max:120,help:"e.g. Project walkthrough (2:18)"}],make:()=>({heading:"Overview",body:"Describe this in a few sentences.",facts:false,image:null,image_alt:"",video:null,caption:""})},
  stats:{label:"Statistics",layouts:["row","grid"],fields:[heading],items:{key:"items",label:"Statistic",max:6,fields:[{key:"value",label:"Value",kind:"text",max:20,required:true},{key:"label",label:"Label",kind:"text",max:120,required:true},{key:"icon",label:"Icon",kind:"icon"}],make:()=>({value:"",label:"",icon:"award"})},make:()=>({heading:"",items:[]})},
};
const defaultAppearance:Appearance={background:"white",text:"default",accent:"gold",align:"left",spacing:"normal"};
const newId=()=>crypto.randomUUID().replace(/-/g,"").slice(0,10);
export const sectionTitle=(section:Section)=>("heading" in section&&section.heading)||SPECS[section.type].label;
const Problems=createContext<Problem[]>([]);
function useProblem(path:string){return useContext(Problems).find(problem=>problem.path===path)?.message}
export function Field({path,label,help,max,value,children}:{path:string;label:string;help?:ReactNode;max?:number;value?:string;children:ReactNode}){
  const problem=useProblem(path);
  return <label className={"ad-field"+(problem?" ad-invalid":"")}><span className="ad-spread">{label}{max&&typeof value==="string"&&<small>{value.length}/{max}</small>}</span>{help&&<small>{help}</small>}{children}{problem&&<small className="ad-error" role="alert">{problem}</small>}</label>
}
export function RichEditor({value,onChange,max,label,path,help}:{value:string;onChange:(value:string)=>void;max?:number;label:string;path:string;help?:string}){
  const area=useRef<HTMLTextAreaElement>(null);
  function wrap(before:string,after=before,placeholder="text"){
    const element=area.current;if(!element)return;
    const {selectionStart:start,selectionEnd:end}=element;
    const chosen=value.slice(start,end)||placeholder;
    onChange(value.slice(0,start)+before+chosen+after+value.slice(end));
    requestAnimationFrame(()=>{element.focus();element.setSelectionRange(start+before.length,start+before.length+chosen.length)});
  }
  return <Field path={path} label={label} max={max} value={value} help={help??"Supports **bold**, *italic*, [links](/contact), “- ” bullet lists and “### ” subheadings."}>
    <span className="ad-row ad-toolbar" role="toolbar" aria-label={label+" formatting"}><button type="button" className="ad-icon" aria-label="Bold" onClick={()=>wrap("**")}><Bold size={14}/></button><button type="button" className="ad-icon" aria-label="Italic" onClick={()=>wrap("*")}><Italic size={14}/></button>
      <button type="button" className="ad-icon" aria-label="Link" onClick={()=>wrap("[","](/contact)","link text")}><Link2 size={14}/></button><button type="button" className="ad-icon" aria-label="Bullet list" onClick={()=>wrap("\n- ","","list item")}><List size={14}/></button></span>
    <textarea ref={area} rows={6} value={value} maxLength={max} onChange={event=>onChange(event.target.value)}/></Field>
}
export function IconPicker({value,onChange}:{value:string;onChange:(value:string)=>void}){
  const Current=icons[value as keyof typeof icons]??icons.building;
  return <span className="ad-row" style={{flexWrap:"nowrap"}}><span className="ad-icon-preview"><Current size={18}/></span><select value={value} onChange={event=>onChange(event.target.value)}>{iconNames.map(name=><option key={name} value={name}>{name.replace(/-/g," ")}</option>)}</select></span>
}
type Value=unknown;
export type Catalog={projects:Project[];categories:ProjectCategory[]};
function ButtonsEditor({value,onChange,max,path}:{value:Record<string,Value>[];onChange:(value:Record<string,Value>[])=>void;max:number;path:string}){
  const update=(index:number,patch:Record<string,Value>)=>onChange(value.map((item,i)=>i===index?{...item,...patch}:item));
  return <div className="ad-stack ad-full">{value.map((button,index)=><div key={index} className="ad-nested">
    <div className="ad-form-grid"><Field path={`${path}.${index}.label`} label="Button text" max={60} value={String(button.label??"")}><input value={String(button.label??"")} maxLength={60} onChange={event=>update(index,{label:event.target.value})}/></Field>
      <Field path={`${path}.${index}.href`} label="Destination" help="A site path like /contact, or a full https:// link"><input value={String(button.href??"")} onChange={event=>update(index,{href:event.target.value})}/></Field>
      <Field path={`${path}.${index}.style`} label="Style"><select value={String(button.style)} onChange={event=>update(index,{style:event.target.value})}><option value="primary">Primary</option><option value="secondary">Secondary (outline)</option><option value="link">Text link</option></select></Field>
      <Field path={`${path}.${index}.icon`} label="Icon (optional)"><select value={String(button.icon??"")} onChange={event=>update(index,{icon:event.target.value||null})}><option value="">None</option>{iconNames.map(name=><option key={name} value={name}>{name.replace(/-/g," ")}</option>)}</select></Field>
      <label className="ad-check" style={{alignSelf:"end"}}><input type="checkbox" checked={button.visible!==false} onChange={event=>update(index,{visible:event.target.checked})}/> Visible</label></div>
    <div className="ad-row"><button type="button" className="ad-button ad-plain" disabled={index===0} onClick={()=>{const next=[...value];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next)}}><ArrowUp size={14}/></button><button type="button" className="ad-button ad-plain" onClick={()=>onChange(value.filter((_,i)=>i!==index))}><Trash2 size={14}/> Remove</button></div></div>)}
    {value.length<max&&<div><button type="button" className="ad-button" onClick={()=>onChange([...value,{label:"Get a Consultation",href:"/contact?type=consultation",style:"primary",visible:true}])}><Plus size={14}/> Add button</button></div>}</div>
}
export function Input({spec,value,onChange,path,catalog}:{spec:FieldSpec;value:Value;onChange:(value:Value)=>void;path:string;catalog:Catalog}){
  const text=String(value??""),problem=useProblem(path);
  switch(spec.kind){
    case "rich":return <div className="ad-full"><RichEditor label={spec.label} path={path} value={text} max={spec.max} onChange={onChange} help={spec.help}/></div>;
    case "image":return <div className="ad-full"><ImageInput label={spec.label} help={spec.help} value={text} required={spec.required} onChange={url=>onChange(url||null)}/>{problem&&<small className="ad-error" role="alert">{problem}</small>}</div>;
    case "icon":return <Field path={path} label={spec.label}><IconPicker value={text||"building"} onChange={onChange}/></Field>;
    case "select":return <Field path={path} label={spec.label} help={spec.help}><select value={text} onChange={event=>onChange(event.target.value)}>{spec.options?.map(option=><option key={option} value={option}>{option}</option>)}</select></Field>;
    case "number":return <Field path={path} label={spec.label}><input type="number" min={spec.min} max={spec.max} value={Number(value??spec.min??0)} onChange={event=>onChange(Number(event.target.value))}/></Field>;
    case "toggle":return <label className="ad-check ad-full"><input type="checkbox" checked={Boolean(value)} onChange={event=>onChange(event.target.checked)}/> {spec.label}</label>;
    case "buttons":return <div className="ad-full"><p className="ad-section-title">{spec.label}</p><ButtonsEditor path={path} value={(value as Record<string,Value>[])??[]} max={spec.max??2} onChange={onChange}/></div>;
    case "button":return <div className="ad-full"><p className="ad-section-title">{spec.label}</p><ButtonsEditor path={path} value={value?[value as unknown as Record<string,Value>]:[]} max={1} onChange={list=>onChange((list[0]??null) as Value)}/></div>;
    case "categories":{const list=(value as string[])??[];return <fieldset className="ad-full ad-fieldset"><legend>{spec.label}</legend><div className="ad-row">{catalog.categories.map(category=><label key={category.slug} className="ad-check"><input type="checkbox" checked={list.includes(category.slug)} onChange={event=>onChange(event.target.checked?[...list,category.slug]:list.filter(item=>item!==category.slug))}/> {category.name}</label>)}</div></fieldset>}
    case "projects":{const list=(value as string[])??[];return <fieldset className="ad-full ad-fieldset"><legend>{spec.label}</legend><div className="ad-checklist">{catalog.projects.map(project=><label key={project.slug} className="ad-check"><input type="checkbox" checked={list.includes(project.slug)} onChange={event=>onChange(event.target.checked?[...list,project.slug].slice(0,12):list.filter(item=>item!==project.slug))}/> {project.title}</label>)}</div></fieldset>}
    case "textarea":return <div className="ad-full"><Field path={path} label={spec.label} help={spec.help} max={spec.max} value={text}><textarea rows={3} maxLength={spec.max} value={text} onChange={event=>onChange(event.target.value)}/></Field></div>;
    default:return <Field path={path} label={spec.label} help={spec.help} max={spec.max} value={text}><input value={text} maxLength={spec.max} required={spec.required} onChange={event=>onChange(event.target.value)}/></Field>;
  }
}
function ItemsEditor({spec,items,onChange,path,catalog}:{spec:ItemSpec;items:Record<string,Value>[];onChange:(items:Record<string,Value>[])=>void;path:string;catalog:Catalog}){
  const [open,setOpen]=useState<number|null>(items.length===1?0:null),[drag,setDrag]=useState<number|null>(null);
  const move=(from:number,to:number)=>{if(to<0||to>=items.length)return;const next=[...items];const [item]=next.splice(from,1);next.splice(to,0,item);onChange(next);setOpen(to)};
  const problems=useContext(Problems);
  return <div className="ad-stack"><p className="ad-section-title">{spec.label}s ({items.length}/{spec.max})</p>
    {items.map((item,index)=>{const label=String(item.title??item.question??item.value??item.alt??item.quote??"").slice(0,60)||spec.label+" "+(index+1);const invalid=problems.some(problem=>problem.path.startsWith(`${path}.${index}.`));
      return <div key={index} className={"ad-item"+(drag===index?" is-dragging":"")+(invalid?" ad-invalid":"")} draggable onDragStart={()=>setDrag(index)} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(drag!==null)move(drag,index);setDrag(null)}} onDragEnd={()=>setDrag(null)}>
        <div className="ad-item-head"><GripVertical size={15} className="ad-grip" aria-hidden="true"/><button type="button" className="ad-item-title" aria-expanded={open===index} onClick={()=>setOpen(open===index?null:index)}>{label}</button>
          <button type="button" className="ad-icon" aria-label={"Move "+label+" up"} disabled={index===0} onClick={()=>move(index,index-1)}><ArrowUp size={14}/></button><button type="button" className="ad-icon" aria-label={"Move "+label+" down"} disabled={index===items.length-1} onClick={()=>move(index,index+1)}><ArrowDown size={14}/></button>
          <button type="button" className="ad-icon" aria-label={"Duplicate "+label} disabled={items.length>=spec.max} onClick={()=>{const next=[...items];next.splice(index+1,0,structuredClone(item));onChange(next);setOpen(index+1)}}><Copy size={14}/></button>
          <button type="button" className="ad-icon" aria-label={"Delete "+label} onClick={()=>{onChange(items.filter((_,i)=>i!==index));setOpen(null)}}><Trash2 size={14}/></button></div>
        {open===index&&<div className="ad-form-grid ad-item-body">{spec.fields.map(field=><Input key={field.key} spec={field} path={`${path}.${index}.${field.key}`} catalog={catalog} value={item[field.key]} onChange={value=>onChange(items.map((entry,i)=>i===index?{...entry,[field.key]:value}:entry))}/>)}</div>}</div>})}
    {items.length<spec.max&&<div><button type="button" className="ad-button" onClick={()=>{onChange([...items,spec.make()]);setOpen(items.length)}}><Plus size={14}/> Add {spec.label.toLowerCase()}</button></div>}</div>
}
function AppearanceEditor({value,onChange,path}:{value:Appearance;onChange:(value:Appearance)=>void;path:string}){
  const options:[keyof Appearance,string,string[]][]=[["background","Background",["white","soft","cream","dark"]],["text","Text colour",["default","muted","light"]],["accent","Accent colour",["gold","ink","sage"]],["align","Text alignment",["left","center"]],["spacing","Section spacing",["compact","normal","spacious"]],["width","Width (two half sections in a row share it)",["full","half"]]];
  return <div className="ad-form-grid">{options.map(([key,label,choices])=><Field key={key} path={`${path}.${key}`} label={label}><select value={value[key]??"full"} onChange={event=>onChange({...value,[key]:event.target.value})}>{choices.map(choice=><option key={choice} value={choice}>{choice}</option>)}</select></Field>)}</div>
}
export function SectionForm({section,index,onChange,catalog,focus}:{section:Section;index:number;onChange:(section:Section)=>void;catalog:Catalog;focus?:string}){
  const spec=SPECS[section.type];
  const data=section as unknown as Record<string,Value>;
  const path=`sections.${index}`;
  return <div className="ad-stack">
    {!focus&&<Card title={spec.label+" content"} actions={<label className="ad-check"><input type="checkbox" checked={section.enabled} onChange={event=>onChange({...section,enabled:event.target.checked})}/> Visible on the page</label>}>
      <div className="ad-form-grid"><Field path={`${path}.nav_label`} label="Tab label (optional)" max={40} value={section.nav_label??""} help="Adds this section to the tab bar under the hero. Tabs appear when two or more sections have a label."><input value={section.nav_label??""} maxLength={40} onChange={event=>onChange({...section,nav_label:event.target.value})}/></Field>
        {spec.fields.map(field=><Input key={field.key} spec={field} path={`${path}.${field.key}`} catalog={catalog} value={data[field.key]} onChange={value=>onChange({...section,[field.key]:value} as Section)}/>)}</div></Card>}
    {spec.extraItems?.filter(extra=>extra.key!=="videos"&&(!focus||extra.key===focus)).map(extra=><Card key={extra.key} title={extra.label}><ItemsEditor spec={extra} path={`${path}.${extra.key}`} catalog={catalog} items={(data[extra.key] as Record<string,Value>[])??[]} onChange={items=>onChange({...section,[extra.key]:items} as Section)}/></Card>)}
    {!focus&&spec.items&&<Card title={spec.label+" items"}><ItemsEditor spec={spec.items} path={`${path}.${spec.items.key}`} catalog={catalog} items={(data[spec.items.key] as Record<string,Value>[])??[]} onChange={items=>onChange({...section,[spec.items!.key]:items} as Section)}/></Card>}
    {!focus&&<Card title="Layout and appearance"><div className="ad-stack"><Field path={`${path}.layout`} label="Layout variant"><select value={String(data.layout)} onChange={event=>onChange({...section,layout:event.target.value} as Section)}>{spec.layouts.map(layout=><option key={layout} value={layout}>{layout.replace(/-/g," ")}</option>)}</select></Field>
      <AppearanceEditor path={`${path}.appearance`} value={section.appearance} onChange={appearance=>onChange({...section,appearance})}/></div></Card>}
  </div>
}
function SearchPreview({path,title,description}:{path:string;title:string;description:string}){
  return <div className="ad-preview-card" aria-label="Search result preview"><span className="ad-serp-url">{typeof location!=="undefined"?location.host:""}{path}</span><span className="ad-serp-title">{title}</span><span className="ad-small">{description.slice(0,160)}</span></div>
}
export async function send(path:string,method:string,body?:unknown){
  const response=await fetch("/api/"+path,{method,headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(response.ok){
    if(method!=="GET")await refreshPublishedContent();
    return {data,problems:[] as Problem[]};
  }
  const detail=data?.detail;
  // Pydantic reports a path for each problem; turn it into the form's field paths.
  const problems:Problem[]=Array.isArray(detail)?detail.map((item:{loc:(string|number)[];msg:string})=>({path:item.loc.filter((part,position)=>!(position===0&&part==="body")&&!/^(hero|rich_text|image_text|features|benefits|process|gallery|related_projects|testimonials|faq|cta|stats)$/.test(String(part))).join("."),message:item.msg})):[];
  throw Object.assign(new Error(typeof detail==="string"?detail:"Please fix the highlighted fields."),{problems});
}
export function DocumentEditor<D extends BuilderDoc>({id,config}:{id:string;config:EditorConfig<D>}){
  const state=useApi<Detail<D>>(config.api+"/"+id);
  return <Loadable state={state} rows={12}>{detail=><Editor key={detail.id} initial={detail} config={config}/>}</Loadable>
}
function Editor<D extends BuilderDoc>({initial,config}:{initial:Detail<D>;config:EditorConfig<D>}){
  const router=useRouter();
  const {toast,confirm,can}=useAdmin();
  const [detail,setDetail]=useState(initial),[doc,setDoc]=useState<D>(initial.draft),[baseline,setBaseline]=useState(JSON.stringify(initial.draft));
  const [panel,setPanel]=useState<string>("general"),[problems,setProblems]=useState<Problem[]>([]),[busy,setBusy]=useState(""),[drag,setDrag]=useState<number|null>(null);
  const [previewMode,setPreviewMode]=useState<"section"|"page">("section"),[revision,setRevision]=useState<{version:number;doc:D}|null>(null),[adding,setAdding]=useState(false);
  const siblings=useApi<{items:(Record<string,unknown>&{id:number;status:string})[]}>(config.api);
  const projects=useApi<{items:Project[]}>("content/projects?size=100");
  const categories=useApi<{items:ProjectCategory[]}>("admin/project-categories");
  const settings=useApi<{testimonials?:string[]}>("content/settings/studio");
  const dirty=JSON.stringify(doc)!==baseline;
  const catalog:Catalog=useMemo(()=>({projects:projects.data?.items??[],categories:categories.data?.items??[]}),[projects.data,categories.data]);
  const context:SectionContext=useMemo(()=>config.context(doc,catalog,settings.data?.testimonials??[]),[config,doc,catalog,settings.data]);
  const apply=useCallback((value:Detail<D>)=>{setDetail(value);setDoc(value.draft);setBaseline(JSON.stringify(value.draft));setProblems([])},[]);
  const save=useCallback(async(quiet=false)=>{
    setBusy("Saving…");
    try{const {data}=await send(config.api+"/"+detail.id,"PUT",doc);apply(data);if(!quiet)toast("Draft saved. Publish updates to show these changes on the website.");return true}
    catch(error){setProblems((error as {problems?:Problem[]}).problems??[]);toast((error as Error).message,"error");return false}
    finally{setBusy("")}
  },[apply,config.api,detail.id,doc,toast]);
  // Warn before leaving with unsaved changes, both for reloads and for links inside the admin.
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault()};
    const click=(event:MouseEvent)=>{const link=(event.target as HTMLElement).closest("a");if(link&&link.target!=="_blank"&&link.href&&!link.href.startsWith("mailto:")&&!window.confirm("You have unsaved changes. Leave without saving?")){event.preventDefault();event.stopPropagation()}};
    addEventListener("beforeunload",unload);document.addEventListener("click",click,true);
    return()=>{removeEventListener("beforeunload",unload);document.removeEventListener("click",click,true)};
  },[dirty]);
  useEffect(()=>{const keys=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key==="s"){event.preventDefault();void save()}};addEventListener("keydown",keys);return()=>removeEventListener("keydown",keys)},[save]);
  async function act(path:string,label:string,success:string){
    setBusy(label);
    try{const {data}=await send(path,"POST",{});apply(data);toast(success);return data as Detail<D>}
    catch(error){setProblems((error as {problems?:Problem[]}).problems??[]);toast((error as Error).message,"error");return null}
    finally{setBusy("")}
  }
  async function publish(){
    if(dirty&&!await save(true))return;
    if(!await confirm({title:"Publish “"+config.label(doc)+"”?",body:detail.live_slug&&detail.live_slug!==doc.slug?`The page moves to ${config.base}/${doc.slug}; the old ${config.base}/${detail.live_slug} will redirect there.`:"Visitors will see this version immediately.",action:"Publish"}))return;
    await act(`${config.api}/${detail.id}/publish`,"Publishing…","Published");
  }
  async function preview(){if(dirty&&!await save(true))return;window.open(previewHref(config.base+"/"+doc.slug),"_blank")}
  async function remove(){
    if(!await confirm({title:"Delete “"+config.label(doc)+"”?",body:"The page, its sections and its version history are removed permanently. Links to it will show “not found”.",action:"Delete",danger:true}))return;
    setBusy("Deleting…");
    try{await request(config.api+"/"+detail.id,"DELETE");toast("Deleted");setBaseline(JSON.stringify(doc));router.push("/admin"+config.base)}catch(error){toast((error as Error).message,"error")}finally{setBusy("")}
  }
  async function duplicate(){
    if(dirty&&!await save(true))return;
    const copy=await act(`${config.api}/${detail.id}/duplicate`,"Duplicating…","Duplicate created as a draft");
    if(copy)router.push(`/admin${config.base}/${copy.id}/edit`);
  }
  async function showRevision(item:Revision){
    try{const data=await request<{version:number;document:D}>(`${config.api}/${detail.id}/revisions/${item.id}`);setRevision({version:data.version,doc:data.document});setPreviewMode("page")}catch(error){toast((error as Error).message,"error")}
  }
  async function restore(item:Revision){
    if(!await confirm({title:`Restore version ${item.version}?`,body:"It replaces the current draft. Visitors keep seeing the published page until you publish again.",action:"Restore"}))return;
    if(dirty&&!await confirm({title:"Discard unsaved changes?",body:"Your unsaved edits will be lost.",action:"Discard",danger:true}))return;
    if(await act(`${config.api}/${detail.id}/restore/${item.id}`,"Restoring…",`Version ${item.version} restored to the draft`))setRevision(null);
  }
  const sections=doc.sections;
  const setSections=(next:Section[])=>setDoc(current=>({...current,sections:next}) as D);
  const focusedField=panel.endsWith(":videos")?"videos":panel.endsWith(":team")?"team":undefined;
  const selectedPanel=focusedField?panel.slice(0,-focusedField.length-1):panel;
  const index=sections.findIndex(section=>"s:"+section.id===selectedPanel);
  function addSection(type:SectionType){
    const section={id:newId(),type,enabled:true,appearance:{...defaultAppearance},layout:SPECS[type].layouts[0],...SPECS[type].make()} as unknown as Section;
    const at=index>=0?index+1:sections.length;
    setSections([...sections.slice(0,at),section,...sections.slice(at)]);setPanel("s:"+section.id);setAdding(false);
  }
  function moveSection(from:number,to:number){if(to<0||to>=sections.length)return;const next=[...sections];const [item]=next.splice(from,1);next.splice(to,0,item);setSections(next)}
  const invalidSection=(i:number)=>problems.some(problem=>problem.path.startsWith(`sections.${i}.`));
  const status=detail.status==="published"?(detail.unpublished_changes||dirty?"Unpublished changes":"Published"):"Draft";
  const set:Setter<D>=(key,value)=>setDoc(current=>updateDocumentField(current,key,value));
  const {general,media}=config.panels(doc,set,detail,id=>setPanel("s:"+id),catalog);
  const seo=<Card title="Search engine listing"><div className="ad-stack"><SearchPreview path={config.base+"/"+doc.slug} title={doc.seo.title||config.label(doc)} description={doc.seo.description||config.summary(doc)}/>
    <Field path="seo.title" label="SEO title" max={120} value={doc.seo.title} help={"About 60 characters works best. Leave empty to use the "+config.noun+" name."}><input value={doc.seo.title} maxLength={120} onChange={event=>set("seo",{...doc.seo,title:event.target.value})}/></Field>
    <Field path="seo.description" label="Meta description" max={240} value={doc.seo.description} help={"About 150 characters. Leave empty to use the "+(config.noun==="service"?"short description":"project description")+"."}><textarea rows={3} maxLength={240} value={doc.seo.description} onChange={event=>set("seo",{...doc.seo,description:event.target.value})}/></Field>
    <ImageInput label="Open Graph (social sharing) image" value={doc.seo.og_image??""} onChange={url=>set("seo",{...doc.seo,og_image:url||null})}/>
    <Field path="seo.canonical" label="Canonical URL" help="Only when this content is published first on another site (https:// address). Leave empty normally."><input value={doc.seo.canonical} onChange={event=>set("seo",{...doc.seo,canonical:event.target.value})}/></Field></div></Card>;
  const versions=<Card title="Version history"><div className="ad-stack"><p className="ad-small">Every save and publish is kept. Restoring copies a version into the draft; publish it to make it live.</p>
    <div className="ad-list">{detail.revisions.map(item=><div key={item.id} className="ad-spread"><span><strong>Version {item.version}</strong> <Badge tone={item.kind==="publish"?"success":"neutral"}>{item.kind==="publish"?"Published":item.kind==="restore"?"Restored":item.kind==="create"?"Created":"Draft"}</Badge><br/><span className="ad-small ad-muted">{item.author} · {formatDateTime(item.created)}</span></span>
      <span className="ad-row"><button type="button" className="ad-button" onClick={()=>void showRevision(item)}>Preview</button><button type="button" className="ad-button" onClick={()=>void restore(item)} disabled={!!busy}>Restore</button></span></div>)}</div></div></Card>;
  const current=index>=0?sections[index]:null;
  const previewDoc=revision?.doc??doc;
  const quickLinks=[{key:"general",label:"Basic information"},{key:"media",label:"Cover image"},
    ...sections.map(section=>({key:"s:"+section.id,label:section.type==="hero"?"Hero & introduction":section.type==="specs"?"Project details":section.nav_label||sectionTitle(section)})),
    ...sections.filter(section=>section.type==="project_process").flatMap(section=>[{key:"s:"+section.id+":team",label:"Project team"}]),
    {key:"seo",label:"SEO & settings"},{key:"versions",label:"Version history"}];
  return <Problems.Provider value={problems}><div className="ad-builder">
    <header className="ad-builder-head"><div><Link className="ad-back" href={"/admin"+config.base}>← All {config.noun==="service"?"services":"projects"}</Link><h1 className="ad-row">Edit {config.noun} <Badge tone={status==="Published"?"success":status==="Draft"?"neutral":"attention"}>{status}</Badge></h1>
      <p className="ad-editor-title">{config.label(doc)||"Untitled"}</p><p className="ad-small" aria-live="polite">{busy||(dirty?"Unsaved changes":"All changes saved")}{detail.live_slug&&<> · <a className="ad-link" href={config.base+"/"+detail.live_slug} target="_blank" rel="noreferrer">View live page</a></>}</p></div>
      <div className="ad-actions"><button className="ad-button" onClick={()=>void duplicate()} disabled={!!busy}><Copy size={15}/> Duplicate</button>{can("content_delete")&&<button className="ad-button" onClick={()=>void remove()} disabled={!!busy}><Trash2 size={15}/> Delete</button>}
        {detail.status==="published"&&<button className="ad-button" onClick={()=>void act(`${config.api}/${detail.id}/unpublish`,"Unpublishing…","Unpublished — removed from the website")} disabled={!!busy}><EyeOff size={15}/> Unpublish</button>}
        <button className="ad-button" onClick={()=>void preview()} disabled={!!busy}><Eye size={15}/> Preview</button><button className="ad-button" onClick={()=>void save()} disabled={!!busy||!dirty}>Save draft</button>
        <button className="ad-button ad-gold" onClick={()=>void publish()} disabled={!!busy||status==="Published"}>{dirty?"Save & publish":"Publish updates"}</button></div></header>
    {problems.length>0&&<div className="ad-banner ad-critical" role="alert"><span>{problems.length} field{problems.length===1?" needs":"s need"} attention: {problems.slice(0,3).map(problem=>problem.path.replace(/\./g," › ")+": "+problem.message).join(" · ")}</span></div>}
    <div className="ad-builder-grid">
      <aside className="ad-builder-nav" aria-label="Editor navigation">
        <Card title={config.noun==="service"?"Services":"Projects"}><select aria-label={"Switch "+config.noun} value={detail.id} onChange={event=>router.push(`/admin${config.base}/${event.target.value}/edit`)}>{siblings.data?.items.map(item=><option key={item.id} value={item.id}>{config.switcher(item)}{item.status!=="published"?" (draft)":""}</option>)??<option>{config.label(doc)}</option>}</select></Card>
        <Card title="Edit content"><div className="ad-navlist ad-guided-nav">{quickLinks.map(item=><button key={item.key} type="button" aria-current={panel===item.key?"page":undefined} onClick={()=>setPanel(item.key)}>{item.label}</button>)}</div></Card>
        <details className="ad-advanced"><summary>Advanced layout tools</summary>
        <Card title="Sections" actions={<button type="button" className="ad-button" onClick={()=>setAdding(!adding)} aria-expanded={adding}><Plus size={14}/> Add</button>}>
          {adding&&<div className="ad-add-grid">{(Object.keys(SPECS) as SectionType[]).map(type=><button key={type} type="button" className="ad-button" onClick={()=>addSection(type)}>{SPECS[type].label}</button>)}</div>}
          <ol className="ad-sections">{sections.map((section,i)=><li key={section.id} className={(panel==="s:"+section.id?"is-active ":"")+(drag===i?"is-dragging ":"")+(invalidSection(i)?"ad-invalid":"")} draggable onDragStart={()=>setDrag(i)} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(drag!==null)moveSection(drag,i);setDrag(null)}} onDragEnd={()=>setDrag(null)}>
            <GripVertical size={14} className="ad-grip" aria-hidden="true"/><button type="button" className="ad-section-name" onClick={()=>setPanel("s:"+section.id)}><span className="ad-muted ad-small">{SPECS[section.type].label}</span><span>{sectionTitle(section)}</span></button>
            <span className="ad-section-tools"><button type="button" className="ad-icon" aria-label={(section.enabled?"Hide ":"Show ")+sectionTitle(section)} title={section.enabled?"Hide":"Show"} onClick={()=>setSections(sections.map(item=>item.id===section.id?{...item,enabled:!item.enabled}:item))}>{section.enabled?<Eye size={14}/>:<EyeOff size={14}/>}</button>
              <button type="button" className="ad-icon" aria-label={"Move "+sectionTitle(section)+" up"} disabled={i===0} onClick={()=>moveSection(i,i-1)}><ArrowUp size={14}/></button><button type="button" className="ad-icon" aria-label={"Move "+sectionTitle(section)+" down"} disabled={i===sections.length-1} onClick={()=>moveSection(i,i+1)}><ArrowDown size={14}/></button>
              <button type="button" className="ad-icon" aria-label={"Duplicate "+sectionTitle(section)} disabled={sections.length>=40} onClick={()=>{const copy={...structuredClone(section),id:newId()};setSections([...sections.slice(0,i+1),copy,...sections.slice(i+1)]);setPanel("s:"+copy.id)}}><Copy size={14}/></button>
              <button type="button" className="ad-icon" aria-label={"Delete "+sectionTitle(section)} onClick={async()=>{if(await confirm({title:"Delete the “"+sectionTitle(section)+"” section?",body:"You can undo by restoring an earlier version.",action:"Delete",danger:true})){setSections(sections.filter(item=>item.id!==section.id));setPanel("general")}}}><Trash2 size={14}/></button></span></li>)}</ol>
          {!sections.length&&<p className="ad-small ad-muted">No sections yet. Add a Hero to start.</p>}</Card></details>
      </aside>
      <main className="ad-builder-main" aria-label="Edit content">{panel==="general"&&config.template&&<details className="ad-advanced"><summary>Default layout template</summary><Card title={config.template.name}><p className="ad-small">{config.template.description}</p><ol className="ad-template-flow" aria-label="Default section order">{config.template.sections.map((label,index)=><li key={label}><span>{index+1}</span>{label}</li>)}</ol><button className="ad-button" style={{marginTop:12}} onClick={()=>setDoc(current=>config.template!.apply(current))}>Apply default structure to draft</button><p className="ad-small" style={{marginTop:8}}>Existing content is retained. Review the sections, save the draft, and preview before publishing.</p></Card></details>}{panel==="general"?general:panel==="media"?media:panel==="seo"?seo:panel==="versions"?versions:current?<SectionForm key={current.id+(focusedField??"")} focus={focusedField} section={current} index={index} catalog={catalog} onChange={next=>setSections(sections.map(item=>item.id===next.id?next:item))}/>:general}</main>
      <aside className="ad-builder-preview" aria-label="Live preview">
        <Card title={revision?`Previewing version ${revision.version}`:"Live preview"} actions={<div className="ad-row">{revision?<button className="ad-button" onClick={()=>setRevision(null)}>Back to draft</button>:<div className="ad-range" role="group" aria-label="Preview scope"><button type="button" className={previewMode==="section"?"is-active":""} onClick={()=>setPreviewMode("section")}>Section</button><button type="button" className={previewMode==="page"?"is-active":""} onClick={()=>setPreviewMode("page")}>Page</button></div>}</div>}>
          <div className="ad-preview-frame"><div className={"aa-home "+fontClasses+" sv-preview sv-detail "+(config.noun==="project"?"pj-page pj-reference-detail":"sv-reference locale-services")}>{previewMode==="section"&&current&&!revision?<ServiceSection section={{...current,enabled:true}} context={context}/>:<ServiceSections sections={previewDoc.sections} context={context}/>}</div></div>
          <div className={"ad-editor-status "+(detail.status==="published"?"is-live":"")}><strong>{status==="Published"?"Published and live":status==="Draft"?"Draft — not published":"Live page has unpublished changes"}</strong><span>{dirty?"Save your draft to keep these edits.":"Last saved: "+formatDateTime(detail.updated)}</span></div><p className="ad-small ad-muted" style={{marginTop:8}}>{previewMode==="section"&&current&&!current.enabled?"This section is hidden on the page. ":""}Unsaved edits show here immediately. Use Preview for the full page with navigation.</p></Card>
      </aside>
    </div>
  </div></Problems.Provider>
}
