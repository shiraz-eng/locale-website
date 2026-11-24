"use client";
import {useState,type FormEvent,type ReactNode} from "react";
import Link from "next/link";
import {ArrowDown,ArrowUp,Eye,Plus,Trash2} from "lucide-react";
import {request} from "../../lib/content";
import {fields,type RecordData,type Value} from "./fields";
import {FieldControl,ImageInput,previewHref} from "./records";
import {Badge,Card,Empty,Loadable,Modal,PageHeader,formatDateTime,useAction,useAdmin,useApi} from "./ui";
type LinkValue={label:string;href:string};
type Site={hero_kicker:string;hero_headline:string;hero_description:string;hero_primary:LinkValue;hero_secondary:LinkValue;hero_tertiary:LinkValue;hero_slides:{image:string;label:string;alt:string}[];
  paths_title:string;paths_text:string;paths:{title:string;text:string;href:string}[];about_title:string;about_text:string;about_image:string;about_principles:{title:string;text:string}[];
  cta_title:string;cta_text:string;cta_primary:LinkValue;cta_secondary:LinkValue;cta_tertiary:LinkValue;footer_tagline:string};
type SiteState={draft:Site;published:Site|null;unpublished_changes:boolean};
function Text({label,value,onChange,long,max=300,help}:{label:string;value:string;onChange:(value:string)=>void;long?:boolean;max?:number;help?:string}){
  return <label className={"ad-field"+(long?" ad-full":"")}>{label}{help&&<small>{help}</small>}{long?<textarea rows={3} maxLength={max} value={value} onChange={event=>onChange(event.target.value)}/>:<input maxLength={max} value={value} onChange={event=>onChange(event.target.value)}/>}</label>
}
function LinkInput({label,value,onChange}:{label:string;value:LinkValue;onChange:(value:LinkValue)=>void}){
  return <fieldset className="ad-full ad-form-grid" style={{border:0,padding:0,margin:0}}><Text label={label+" — text"} value={value.label} max={160} onChange={text=>onChange({...value,label:text})}/><Text label={label+" — destination"} value={value.href} help="A site path such as /contact?type=consultation, or a full https:// link" onChange={href=>onChange({...value,href})}/></fieldset>
}
function Repeater<T>({items,onChange,make,max,render,label}:{items:T[];onChange:(items:T[])=>void;make:()=>T;max:number;label:string;render:(item:T,update:(item:T)=>void)=>ReactNode}){
  const swap=(a:number,b:number)=>{const next=[...items];[next[a],next[b]]=[next[b],next[a]];onChange(next)};
  return <div className="ad-stack ad-full">{items.map((item,index)=><div key={index} className="ad-card" style={{background:"#fafafb"}}><div className="ad-spread"><strong className="ad-small">{label} {index+1}</strong><span className="ad-row">
    <button type="button" className="ad-icon" aria-label="Move up" disabled={index===0} onClick={()=>swap(index,index-1)}><ArrowUp size={15}/></button><button type="button" className="ad-icon" aria-label="Move down" disabled={index===items.length-1} onClick={()=>swap(index,index+1)}><ArrowDown size={15}/></button>
    <button type="button" className="ad-icon" aria-label={"Remove "+label.toLowerCase()} onClick={()=>onChange(items.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></span></div>
    <div className="ad-form-grid" style={{marginTop:8}}>{render(item,value=>onChange(items.map((entry,i)=>i===index?value:entry)))}</div></div>)}
    {items.length<max&&<div><button type="button" className="ad-button" onClick={()=>onChange([...items,make()])}><Plus size={15}/> Add {label.toLowerCase()}</button></div>}</div>
}
type FeaturedRow={id:number;title:string;featured:boolean;status:string};
function FeaturedProjects(){
  const state=useApi<{items:FeaturedRow[]}>("admin/projects");
  const action=useAction();
  async function toggle(row:FeaturedRow){if(await action.run(()=>request("admin/projects/bulk","POST",{ids:[row.id],action:row.featured?"unfeature":"feature"}),row.featured?"Removed from homepage":"Featured on homepage"))state.reload()}
  return <Card title="Featured projects" actions={<Link className="ad-link ad-small" href="/admin/projects">Manage projects</Link>}><p className="ad-small" style={{marginBottom:8}}>Featured projects are shown first in the homepage portfolio. Changes apply immediately.</p>
    <Loadable state={state} rows={3}>{data=><div className="ad-list">{data.items.filter(row=>row.status==="published").map(row=><label key={row.id} className="ad-check"><input type="checkbox" checked={row.featured===true} disabled={action.pending} onChange={()=>void toggle(row)}/> {row.title}</label>)}</div>}</Loadable></Card>
}
export function PagesPage(){
  const state=useApi<SiteState>("admin/site");
  return <Loadable state={state} rows={10}>{data=><SiteEditor initial={data} onSaved={value=>state.setData(value)}/>}</Loadable>
}
function SiteEditor({initial,onSaved}:{initial:SiteState;onSaved:(value:SiteState)=>void}){
  const {confirm}=useAdmin();
  const [site,setSite]=useState(initial.draft),[dirty,setDirty]=useState(false);
  const action=useAction();
  const set=<K extends keyof Site>(key:K)=>(value:Site[K])=>{setSite(current=>({...current,[key]:value}));setDirty(true)};
  async function saveDraft(){const value=await action.run(()=>request<SiteState>("admin/site","PUT",site),"Draft saved");if(value){setDirty(false);onSaved(value)}return value}
  async function publish(){
    if(dirty&&!await saveDraft())return;
    if(!await confirm({title:"Publish website changes?",body:"The homepage and footer will update for all visitors immediately.",action:"Publish"}))return;
    const value=await action.run(()=>request<SiteState>("admin/site/publish","POST",{}),"Website updated");if(value)onSaved(value);
  }
  async function preview(){if(dirty&&!await saveDraft())return;window.open(previewHref("/"),"_blank")}
  async function discard(){if(await confirm({title:"Discard unpublished changes?",body:"The draft will be replaced by the live version.",action:"Discard",danger:true})){const value=await action.run(()=>request<SiteState>("admin/site/discard","POST",{}),"Draft discarded");if(value)onSaved(value)}}
  const pending=dirty||initial.unpublished_changes;
  return <>
    <PageHeader title="Pages & Navigation" description="Find website pages and edit the homepage sections and footer." actions={<>{pending?<Badge tone="attention">Unpublished changes</Badge>:<Badge tone="success">Live version</Badge>}
      {initial.unpublished_changes&&!dirty&&<button className="ad-button ad-plain" onClick={discard} disabled={action.pending}>Discard draft</button>}
      <button className="ad-button" onClick={saveDraft} disabled={action.pending||!dirty}>Save draft</button><button className="ad-button" onClick={preview} disabled={action.pending}><Eye size={15}/> Preview</button><button className="ad-button ad-gold" onClick={publish} disabled={action.pending||!pending}>Publish</button></>}/>
    <div className="ad-main-side"><div className="ad-stack">
      <Card title="Homepage hero"><div className="ad-form-grid">
        <Text label="Small heading" value={site.hero_kicker} max={160} onChange={set("hero_kicker")}/><Text label="Headline" value={site.hero_headline} max={160} onChange={set("hero_headline")}/>
        <Text label="Supporting text" long value={site.hero_description} onChange={set("hero_description")}/>
        <LinkInput label="Main button" value={site.hero_primary} onChange={set("hero_primary")}/><LinkInput label="Second button" value={site.hero_secondary} onChange={set("hero_secondary")}/><LinkInput label="Text link" value={site.hero_tertiary} onChange={set("hero_tertiary")}/>
        <p className="ad-section-title ad-full">Hero images</p>
        <Repeater label="Slide" max={6} items={site.hero_slides} onChange={set("hero_slides")} make={()=>({image:"",label:"",alt:""})} render={(slide,update)=><><div className="ad-full"><ImageInput label="Image" required value={slide.image} onChange={image=>update({...slide,image})}/></div><Text label="Caption" value={slide.label} max={160} onChange={label=>update({...slide,label})}/><Text label="Alt text" value={slide.alt} max={160} help="Describe the image" onChange={alt=>update({...slide,alt})}/></>}/>
      </div></Card>
      <Card title="“Ways to begin” section"><div className="ad-form-grid"><Text label="Heading" value={site.paths_title} max={160} onChange={set("paths_title")}/><Text label="Intro" value={site.paths_text} onChange={set("paths_text")}/>
        <Repeater label="Card" max={4} items={site.paths} onChange={set("paths")} make={()=>({title:"",text:"",href:"/contact"})} render={(card,update)=><><Text label="Title" value={card.title} max={160} onChange={title=>update({...card,title})}/><Text label="Destination" value={card.href} onChange={href=>update({...card,href})}/><Text label="Text" long value={card.text} onChange={text=>update({...card,text})}/></>}/></div></Card>
      <Card title="About section"><div className="ad-form-grid"><Text label="Heading" value={site.about_title} max={160} onChange={set("about_title")}/><div/><Text label="Text" long max={12000} value={site.about_text} onChange={set("about_text")}/>
        <div className="ad-full"><ImageInput label="Main image" required value={site.about_image} onChange={set("about_image")}/></div>
        <Repeater label="Principle" max={4} items={site.about_principles} onChange={set("about_principles")} make={()=>({title:"",text:""})} render={(item,update)=><><Text label="Title" value={item.title} max={160} onChange={title=>update({...item,title})}/><Text label="Text" long value={item.text} onChange={text=>update({...item,text})}/></>}/></div></Card>
      <Card title="Closing call to action"><div className="ad-form-grid"><Text label="Heading" value={site.cta_title} max={160} onChange={set("cta_title")}/><Text label="Text" value={site.cta_text} onChange={set("cta_text")}/>
        <LinkInput label="Main button" value={site.cta_primary} onChange={set("cta_primary")}/><LinkInput label="Second button" value={site.cta_secondary} onChange={set("cta_secondary")}/><LinkInput label="Third button" value={site.cta_tertiary} onChange={set("cta_tertiary")}/></div></Card>
      <Card title="Footer"><Text label="Tagline" value={site.footer_tagline} max={160} onChange={set("footer_tagline")}/></Card>
    </div><div className="ad-stack">
      <FeaturedProjects/>
      <Card title="Website pages"><div className="ad-page-directory">{staticPages.map(([path,label])=>{
        const editor=path==="/"?"/admin/pages":path==="/projects"?"/admin/projects/overview":path==="/services"?"/admin/services/overview":"/admin/pages"+path;
        return <Link key={path} href={editor}><strong>{label}</strong><small>{path}</small></Link>;
      })}</div></Card>
      <Card title="Site settings"><div className="ad-list ad-small"><Link href="/admin/services/overview">Services overview</Link><Link href="/admin/services">Service pages</Link><Link href="/admin/settings">Studio identity and contact details</Link><Link href="/admin/seo">Search and social previews</Link></div></Card>
    </div></div>
  </>
}
const staticPages:[string,string][]=[["/","Homepage"],["/projects","Projects"],["/services","Services"],["/about","About"],["/team","Team"],["/contact","Contact"],["/blog","Blog"],["/plan-your-project","Plan your project"],["/ai-design","AI design lab"]];
type Seo={pages:Record<string,{title:string;description:string;og_image:string|null}>;records:{kind:string;slug:string;id?:number;title:string;description:string;seo_title:string;seo_description:string;og_image:string|null;canonical:string;published:boolean}[]};
const issues=(title:string,description:string)=>[...(!title?["Missing title"]:title.length>60?["Title over 60 characters"]:[]),...(!description?["Missing description"]:description.length>160?["Description over 160 characters"]:[])];
export function SeoPage(){
  const state=useApi<Seo>("admin/seo");
  const [editing,setEditing]=useState<{kind:string;slug:string;title:string;description:string;image:string}|null>(null);
  const action=useAction();
  async function save(){
    if(!editing||!state.data)return;
    const body={seo_title:editing.title,seo_description:editing.description,og_image:editing.image||null};
    const ok=editing.kind==="page"?await action.run(()=>request<Seo>("admin/seo/pages","PUT",{pages:{...state.data!.pages,[editing.slug]:{title:editing.title,description:editing.description,og_image:editing.image||null}}}),"Page SEO saved")
      :await action.run(()=>request("admin/seo/"+editing.kind+"/"+editing.slug,"PATCH",body),"SEO saved");
    if(ok){setEditing(null);state.reload()}
  }
  return <>
    <PageHeader title="SEO" description="Titles, descriptions and sharing images used for search results and social previews. Good metadata helps people choose your pages; it cannot guarantee rankings."/>
    <Loadable state={state} rows={8}>{data=><>
      <Card title="Site pages" className="ad-flush"><div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>Page</th><th>Title</th><th>Description</th><th>Checks</th><th></th></tr></thead><tbody>{staticPages.map(([path,name])=>{const page=data.pages[path]??{title:"",description:"",og_image:null};const found=issues(page.title||"default",page.description||"default");
        return <tr key={path}><td><span className="ad-cell-main">{name}</span><div className="ad-muted ad-small">{path}</div></td><td>{page.title||<span className="ad-muted">Default</span>}</td><td style={{maxWidth:320}}>{page.description||<span className="ad-muted">Default</span>}</td><td>{found.length?found.map(item=><Badge key={item} tone="attention">{item}</Badge>):<Badge tone="success">OK</Badge>}</td><td><button className="ad-button" onClick={()=>setEditing({kind:"page",slug:path,title:page.title,description:page.description,image:page.og_image??""})}>Edit</button></td></tr>})}</tbody></table></div></Card>
      <Card title="Projects, services and articles" className="ad-flush">{data.records.length?<div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>Content</th><th>Search title</th><th>Meta description</th><th>Checks</th><th></th></tr></thead><tbody>{data.records.map(row=>{const title=row.seo_title||row.title,description=row.seo_description||row.description;const found=issues(title,description);
        return <tr key={row.kind+row.slug}><td><span className="ad-cell-main">{row.title}</span><div className="ad-muted ad-small">/{row.kind==="blog"?"blog":row.kind}/{row.slug}{!row.published&&" · draft"}</div></td><td>{title}{!row.seo_title&&<div className="ad-muted ad-small">From title</div>}</td><td style={{maxWidth:320}}><span className="ad-small">{description.slice(0,120)}{description.length>120?"…":""}</span>{!row.seo_description&&<div className="ad-muted ad-small">From description</div>}</td>
          <td><div className="ad-row">{found.length?found.map(item=><Badge key={item} tone="attention">{item}</Badge>):<Badge tone="success">OK</Badge>}{!row.og_image&&<Badge tone="attention">No sharing image</Badge>}</div></td><td>{row.kind==="services"||row.kind==="projects"?<Link className="ad-button" href={`/admin/${row.kind}/${row.id}/edit`}>Edit in {row.kind==="services"?"service":"project"}</Link>:<button className="ad-button" onClick={()=>setEditing({kind:row.kind,slug:row.slug,title:row.seo_title,description:row.seo_description,image:row.og_image??""})}>Edit</button>}</td></tr>})}</tbody></table></div>:<Empty title="No content yet"/>}</Card>
    </>}</Loadable>
    {editing&&<Modal title={"Edit SEO · "+editing.slug} onClose={()=>setEditing(null)}><div className="ad-stack">
      <label className="ad-field">Search title <small>{editing.title.length}/60 recommended · leave empty for the default</small><input value={editing.title} maxLength={120} onChange={event=>setEditing({...editing,title:event.target.value})}/></label>
      <label className="ad-field">Meta description <small>{editing.description.length}/160 recommended</small><textarea rows={3} value={editing.description} maxLength={240} onChange={event=>setEditing({...editing,description:event.target.value})}/></label>
      <ImageInput label="Social sharing image" value={editing.image} onChange={image=>setEditing({...editing,image})}/>
      <div className="ad-actions"><button className="ad-button" onClick={()=>setEditing(null)}>Cancel</button><button className="ad-button ad-primary" onClick={save} disabled={action.pending}>Save</button></div></div></Modal>}
  </>
}
type Audit={items:{actor:string;action:string;entity:string;entity_id:string;detail:Record<string,unknown>;created:string}[];more:boolean};
function AuditLog(){
  const [page,setPage]=useState(1);
  const state=useApi<Audit>("admin/audit?page="+page);
  return <Card title="Audit log" className="ad-flush"><Loadable state={state} rows={6}>{data=>data.items.length?<><div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Item</th></tr></thead><tbody>{data.items.map((item,index)=><tr key={index}><td>{formatDateTime(item.created)}</td><td>{item.actor}</td><td>{item.action.replace(/_/g," ")}</td><td>{item.entity} <span className="ad-muted">{item.entity_id}</span></td></tr>)}</tbody></table></div>
    <div className="ad-pager"><span>Page {page}</span><span className="ad-row">{page>1&&<button className="ad-button" onClick={()=>setPage(page-1)}>Newer</button>}{data.more&&<button className="ad-button" onClick={()=>setPage(page+1)}>Older</button>}</span></div></>:<Empty title="No recorded changes yet"/>}</Loadable></Card>
}
export function SettingsPage(){
  const {can}=useAdmin();
  const state=useApi<RecordData>("admin/content/settings/studio");
  return <>
    <PageHeader title="Settings" description="Studio identity, contact details and sales preferences used across the website."/>
    <Loadable state={state} rows={8}>{record=><SettingsForm key={String(record.updated)} record={record} onSaved={state.reload}/>}</Loadable>
    {can("audit")&&<AuditLog/>}
  </>
}
function SettingsForm({record,onSaved}:{record:RecordData;onSaved:()=>void}){
  const [values,setValues]=useState<Record<string,Value>>(()=>Object.fromEntries(fields.settings.map(field=>[field.key,record[field.key]??field.initial??(field.type==="check"?false:field.type==="lines"?[]:"")])));
  const action=useAction();
  const sections=[...new Set(fields.settings.map(field=>field.section??"Studio"))];
  async function save(event:FormEvent){event.preventDefault();const body=Object.fromEntries(fields.settings.map(field=>[field.key,field.type==="image"&&!values[field.key]?null:values[field.key]]));if(await action.run(()=>request("admin/content/settings/studio","PUT",body),"Settings saved"))onSaved()}
  return <form className="ad-stack" onSubmit={save}>{sections.map(section=><Card key={section} title={section}><div className="ad-form-grid">{fields.settings.filter(field=>(field.section??"Studio")===section).map(field=><FieldControl key={field.key} field={field} value={values[field.key]} change={value=>setValues(current=>({...current,[field.key]:value}))}/>)}</div></Card>)}
    <div><button className="ad-button ad-primary" disabled={action.pending}>{action.pending?"Saving…":"Save settings"}</button></div></form>
}
