"use client";
import {useState} from "react";
import {ArrowDown,ArrowUp,Trash2} from "lucide-react";
import type {EditablePageContent} from "../../lib/server";
import type {Section,SectionType} from "../../lib/services";
import type {Project} from "../../lib/content";
import type {ProjectCategory} from "../../lib/services";
import {request} from "../../lib/content";
import {ImageInput} from "./records";
import TeamPageContent from "./team-page-content";
import {SectionForm,SPECS,sectionTitle} from "./section-builder";
import {Card,Loadable,PageHeader,useAction,useAdmin,useApi} from "./ui";
type State={draft:EditablePageContent;published:EditablePageContent|null;unpublished_changes:boolean};
const interactive=["team","blog","contact","plan-your-project","ai-design"];
const layout={background:"white",text:"default",accent:"gold",align:"left",spacing:"normal"} as const;
export default function PageContentEditor({slug}:{slug:string}){
  const state=useApi<State>("admin/page-content/"+slug);
  return <Loadable state={state}>{data=><Editor key={JSON.stringify(data)} slug={slug} initial={data} onSaved={state.setData}/>}</Loadable>;
}
function Sections({value,onChange}:{value:Section[];onChange:(value:Section[])=>void}){
  const projects=useApi<{items:Project[]}>("content/projects?size=100");
  const categories=useApi<{items:ProjectCategory[]}>("admin/project-categories");
  const move=(index:number,delta:number)=>{const next=[...value];[next[index],next[index+delta]]=[next[index+delta],next[index]];onChange(next)};
  return <div className="ad-stack">
    {value.map((section,index)=><details key={section.id} className="ad-nested"><summary>{sectionTitle(section)}</summary>
      <div className="ad-row">
        <button className="ad-icon" aria-label="Move section up" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={16}/></button>
        <button className="ad-icon" aria-label="Move section down" disabled={index===value.length-1} onClick={()=>move(index,1)}><ArrowDown size={16}/></button>
        <button className="ad-icon" aria-label="Remove section" onClick={()=>onChange(value.filter(item=>item.id!==section.id))}><Trash2 size={16}/></button>
      </div>
      <SectionForm section={section} index={index} catalog={{projects:projects.data?.items??[],categories:categories.data?.items??[]}} onChange={next=>onChange(value.map((item,i)=>i===index?next:item))}/>
    </details>)}
    {value.length<30&&<label className="ad-field">Add section<select value="" onChange={event=>{
      const type=event.target.value as SectionType;
      const spec=SPECS[type];
      onChange([...value,{...spec.make(),id:crypto.randomUUID().replaceAll("-","").slice(0,12),type,enabled:true,appearance:layout,layout:spec.layouts[0]} as Section]);
    }}><option value="">Choose a section type</option>{Object.entries(SPECS).map(([key,spec])=><option key={key} value={key}>{spec.label}</option>)}</select></label>}
  </div>;
}
function Editor({slug,initial,onSaved}:{slug:string;initial:State;onSaved:(value:State)=>void}){
  const [doc,setDoc]=useState(initial.draft);
  const history=useApi<{items:{id:string;created:string;document:EditablePageContent}[]}>("admin/page-content/"+slug+"/revisions");
  const action=useAction(),{confirm}=useAdmin();
  const dirty=JSON.stringify(doc)!==JSON.stringify(initial.draft);
  async function save(){const value=await action.run(()=>request<State>("admin/page-content/"+slug,"PUT",doc),"Page draft saved");if(value)onSaved(value);return value}
  async function publish(){
    if(!await confirm({title:"Publish page content?",action:"Publish"}))return;
    if(dirty&&!await save())return;
    const value=await action.run(()=>request<State>("admin/page-content/"+slug+"/publish","POST",{}),"Page content published");
    if(value)onSaved(value);
  }
  return <>
    <PageHeader title={"Edit "+slug.replaceAll("-"," ")} back="/admin/pages" description="Use predefined sections and appearance controls to extend this page." actions={<>
      <button className="ad-button" disabled={!dirty||action.pending} onClick={()=>void save()}>Save draft</button>
      <a className="ad-button" href={"/preview?path=/"+slug} target="_blank" rel="noreferrer">Preview saved draft</a>
      <button className="ad-button ad-primary" disabled={action.pending||!(dirty||initial.unpublished_changes)} onClick={()=>void publish()}>Publish</button>
    </>}/>
    <Card title="Page introduction"><div className="ad-form-grid">
      <label className="ad-field">Heading<input value={doc.heading} maxLength={160} onChange={event=>setDoc({...doc,heading:event.target.value})}/></label>
      <label className="ad-field">Description<textarea value={doc.description} maxLength={1000} onChange={event=>setDoc({...doc,description:event.target.value})}/></label>
      {["contact","blog","plan-your-project","team"].includes(slug)&&<div className="ad-full"><ImageInput label="Header image" value={doc.hero_image||""} onChange={url=>setDoc({...doc,hero_image:url||null})}/></div>}
      <label className="ad-check"><input type="checkbox" checked={doc.show_original} disabled={interactive.includes(slug)} onChange={event=>setDoc({...doc,show_original:event.target.checked})}/> Include existing page body</label>
    </div>{interactive.includes(slug)&&<p className="ad-small">The existing forms or published content list stay available on this page.</p>}</Card>
    {slug==="team"&&<TeamPageContent value={doc.team_content} onChange={team_content=>setDoc({...doc,team_content})}/>}
    <Card title="Sections before page body"><Sections value={doc.sections} onChange={sections=>setDoc({...doc,sections})}/></Card>
    <Card title="Sections after page body"><Sections value={doc.after_sections} onChange={after_sections=>setDoc({...doc,after_sections})}/></Card>
    <Card title="Search and social metadata"><div className="ad-form-grid">
      <label className="ad-field">SEO title<input value={doc.seo.title} maxLength={120} onChange={event=>setDoc({...doc,seo:{...doc.seo,title:event.target.value}})}/></label>
      <label className="ad-field">Meta description<textarea value={doc.seo.description} maxLength={240} onChange={event=>setDoc({...doc,seo:{...doc.seo,description:event.target.value}})}/></label>
    </div></Card>
    <Card title="Saved revisions"><div className="ad-list">{history.data?.items.map(revision=><button className="ad-button" key={revision.id} onClick={async()=>{
      if(await confirm({title:"Restore this version to the draft?",action:"Restore"}))setDoc(revision.document);
    }}>Restore {new Date(revision.created).toLocaleString()}</button>)}</div></Card>
  </>;
}
