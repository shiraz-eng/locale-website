"use client";
import {useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowDown,ArrowUp,Check,Clock,Copy,Eye,EyeOff,GripVertical,Layers,Pencil,Plus,Trash2} from "lucide-react";
import {request} from "../../lib/content";
import {icons,iconNames,type Button,type Feature,type IconName,type Section,type ServicesPage,type Stat} from "../../lib/services";
import {demoServicesIntro,demoServicesClosing} from "../../lib/demo-services";
import {serviceReferenceSections} from "../../lib/service-reference";
import {SectionForm,sectionTitle} from "./section-builder";
import {ImageInput,previewHref} from "./records";
import {Badge,Card,Empty,Loadable,Modal,PageHeader,formatDate,useAction,useAdmin,useApi} from "./ui";
type Row={id:number;slug:string;live_slug:string|null;name:string;category:string;featured:boolean;sort_order:number;status:string;card_image:string|null;unpublished_changes:boolean;updated:string;sections:number};
const status=(row:Row)=>row.status!=="published"?"Draft":row.unpublished_changes?"Unpublished changes":"Published";
export function ServicesListPage(){
  const router=useRouter();
  const {can,confirm}=useAdmin();
  const state=useApi<{items:Row[]}>("admin/services");
  const [q,setQ]=useState(""),[filter,setFilter]=useState(""),[category,setCategory]=useState(""),[drag,setDrag]=useState<number|null>(null);
  const action=useAction();
  const rows=state.data?.items??[];
  const shown=useMemo(()=>rows.filter(row=>(!q||(row.name+" "+row.slug+" "+row.category).toLowerCase().includes(q.toLowerCase()))&&(!filter||status(row)===filter)&&(!category||row.category===category)),[rows,q,filter,category]);
  const filtered=!!(q||filter||category);
  async function reorder(from:number,to:number){
    if(to<0||to>=rows.length||from===to)return;
    const next=[...rows];const [item]=next.splice(from,1);next.splice(to,0,item);
    state.setData({items:next});
    const saved=await action.run(()=>request<{items:Row[]}>("admin/services/reorder","POST",{ids:next.map(row=>row.id)}),"Order saved");
    if(saved)state.setData(saved);else state.reload();
  }
  async function run(row:Row,path:string,success:string,danger?:{title:string;body:string;action:string}){
    if(danger&&!await confirm({...danger,danger:true}))return;
    const result=await action.run(()=>request<{id:number}>(`admin/services/${row.id}${path}`,path?"POST":"DELETE",path?{}:undefined),success);
    if(result){if(path==="/duplicate")router.push(`/admin/services/${result.id}/edit`);else state.reload()}
  }
  const categories=[...new Set(rows.map(row=>row.category).filter(Boolean))];
  return <>
    <PageHeader title="Service Pages" description="Create, edit, and organize the pages that showcase your studio’s services."
      actions={<><Link className="ad-button" href="/admin/services/overview"><Pencil size={15}/> Edit overview page</Link><Link className="ad-button ad-primary" href="/admin/services/new"><Plus size={15}/> Add service</Link></>}/>
    {state.data&&<div className="ad-cms-summary">
      {[{label:"Total services",count:rows.length,Icon:Layers,tone:"gold"},{label:"Published",count:rows.filter(row=>row.status==="published").length,Icon:Check,tone:"green"},
        {label:"Drafts",count:rows.filter(row=>row.status!=="published").length,Icon:Clock,tone:"blue"},{label:"Unpublished changes",count:rows.filter(row=>row.status==="published"&&row.unpublished_changes).length,Icon:Eye,tone:"gold"}].map(({label,count,Icon,tone})=>
        <div className="ad-summary-card" key={label}><span className={"ad-summary-icon "+tone}><Icon size={24} aria-hidden="true"/></span><div><p>{label}</p><strong>{count}</strong></div></div>)}
    </div>}
    <Card className="ad-flush">
      <div className="ad-filters"><input type="search" placeholder="Search services" value={q} onChange={event=>setQ(event.target.value)} aria-label="Search services"/>
        <select value={filter} onChange={event=>setFilter(event.target.value)} aria-label="Status"><option value="">All statuses</option><option>Published</option><option>Unpublished changes</option><option>Draft</option></select>
        <select value={category} onChange={event=>setCategory(event.target.value)} aria-label="Category"><option value="">All categories</option>{categories.map(value=><option key={value}>{value}</option>)}</select></div>
      {filtered&&<p className="ad-bulk ad-small">Clear the filters to reorder services.</p>}
      <Loadable state={state} rows={6}>{()=>shown.length?<div className="ad-tablewrap"><table className="ad-table"><thead><tr><th aria-label="Order"></th><th>Service</th><th>Category</th><th>Sections</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
        {shown.map(row=>{const position=rows.findIndex(item=>item.id===row.id);return <tr key={row.id} draggable={!filtered} className={drag===position?"is-dragging":""} onDragStart={()=>setDrag(position)} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(drag!==null)void reorder(drag,position);setDrag(null)}} onDragEnd={()=>setDrag(null)}>
          <td><div className="ad-row" style={{flexWrap:"nowrap"}}><GripVertical size={15} className="ad-grip" aria-hidden="true"/><button className="ad-icon" aria-label={"Move "+row.name+" up"} disabled={filtered||position===0||action.pending} onClick={()=>void reorder(position,position-1)}><ArrowUp size={14}/></button><button className="ad-icon" aria-label={"Move "+row.name+" down"} disabled={filtered||position===rows.length-1||action.pending} onClick={()=>void reorder(position,position+1)}><ArrowDown size={14}/></button></div></td>
          <td><div className="ad-row" style={{flexWrap:"nowrap"}}>{row.card_image?<img className="ad-thumb" src={row.card_image} alt=""/>:<span className="ad-thumb"/>}<div><Link className="ad-cell-main" href={`/admin/services/${row.id}/edit`}>{row.name}</Link><div className="ad-muted ad-small">/services/{row.slug}{row.featured?" · featured":""}</div></div></div></td>
          <td>{row.category||"—"}</td><td>{row.sections}</td><td><Badge tone={status(row)==="Published"?"success":status(row)==="Draft"?"neutral":"attention"}>{status(row)}</Badge></td><td>{formatDate(row.updated)}</td>
          <td><div className="ad-row" style={{flexWrap:"nowrap"}}><Link className="ad-button" href={`/admin/services/${row.id}/edit`}>Edit</Link>
            <a className="ad-icon" href={previewHref("/services/"+row.slug)} target="_blank" rel="noreferrer" aria-label={"Preview "+row.name} title="Preview draft"><Eye size={16}/></a>
            <button className="ad-icon" aria-label={"Duplicate "+row.name} title="Duplicate" disabled={action.pending} onClick={()=>void run(row,"/duplicate","Duplicate created")}><Copy size={16}/></button>
            {row.status==="published"?<button className="ad-icon" aria-label={"Unpublish "+row.name} title="Unpublish" disabled={action.pending} onClick={()=>void run(row,"/unpublish","Unpublished",{title:"Unpublish “"+row.name+"”?",body:"It disappears from the website and navigation until you publish it again.",action:"Unpublish"})}><EyeOff size={16}/></button>
              :<button className="ad-button ad-gold" disabled={action.pending} onClick={()=>void run(row,"/publish","Published")}>Publish</button>}
            {can("content_delete")&&<button className="ad-icon" aria-label={"Delete "+row.name} title="Delete" disabled={action.pending} onClick={()=>void run(row,"","Deleted",{title:"Delete “"+row.name+"”?",body:"The page, its sections and its version history are removed permanently.",action:"Delete"})}><Trash2 size={16}/></button>}</div></td></tr>})}</tbody></table></div>
        :<Empty title={rows.length?"No services match":"No services yet"} action={<Link className="ad-button ad-primary" href="/admin/services/new">Add service</Link>}/>}</Loadable>
    </Card>
  </>
}
// /admin/services/new: a short form that creates the draft, then opens the section editor.
export function NewServicePage(){
  const router=useRouter();
  const [name,setName]=useState(""),[slug,setSlug]=useState(""),[touched,setTouched]=useState(false),[template,setTemplate]=useState("standard");
  const action=useAction();
  const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120);
  async function submit(event:FormEvent){event.preventDefault();const created=await action.run(()=>request<{id:number}>("admin/services","POST",{name,slug,template}),"Service created as a draft");if(created)router.push(`/admin/services/${created.id}/edit`)}
  return <>
    <PageHeader back="/admin/services" title="Add a service" description="The service is created as a draft with its own page. Edit its sections, preview it, then publish."/>
    <Card><form className="ad-stack" onSubmit={submit} style={{maxWidth:640}}>
      <label className="ad-field">Service name<input required maxLength={120} value={name} onChange={event=>{setName(event.target.value);if(!touched)setSlug(slugify(event.target.value))}}/></label>
      <label className="ad-field">URL slug<small>/services/{slug||"…"}</small><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} value={slug} onChange={event=>{setTouched(true);setSlug(event.target.value.toLowerCase())}}/></label>
      <fieldset className="ad-fieldset"><legend>Start from</legend><label className="ad-check"><input type="radio" name="template" checked={template==="standard"} onChange={()=>setTemplate("standard")}/> Default service page · Residential Architecture structure (hero, included services, process, selected projects, strengths, consultation)</label><label className="ad-check"><input type="radio" name="template" checked={template==="blank"} onChange={()=>setTemplate("blank")}/> Blank page with a hero only</label></fieldset>
      <div className="ad-actions"><Link className="ad-button" href="/admin/services">Cancel</Link><button className="ad-button ad-primary" disabled={action.pending}>Create draft</button></div></form></Card>
  </>
}
type OverviewState={draft:ServicesPage;published:ServicesPage|null;unpublished_changes:boolean};
export function ServicesOverviewPage(){
  const state=useApi<OverviewState>("admin/services-page");
  return <Loadable state={state} rows={8}>{data=><OverviewEditor initial={data}/>}</Loadable>
}
export function ButtonFields({value,onChange,label}:{value:Button;onChange:(value:Button)=>void;label:string}){
  return <div className="ad-form-grid ad-full ad-nested"><label className="ad-field">{label} text<input value={value.label} maxLength={60} onChange={event=>onChange({...value,label:event.target.value})}/></label><label className="ad-field">Destination<input value={value.href} onChange={event=>onChange({...value,href:event.target.value})}/></label>
    <label className="ad-field">Style<select value={value.style} onChange={event=>onChange({...value,style:event.target.value as Button["style"]})}><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="link">Text link</option></select></label><label className="ad-field">Icon (optional)<select value={value.icon??""} onChange={event=>onChange({...value,icon:(event.target.value||null) as IconName|null})}><option value="">None</option>{iconNames.map(name=><option key={name} value={name}>{name.replace(/-/g," ")}</option>)}</select></label>
    <label className="ad-check" style={{alignSelf:"end"}}><input type="checkbox" checked={value.visible} onChange={event=>onChange({...value,visible:event.target.checked})}/> Visible</label></div>
}
// Figures are shown only when "show" is on, so unverified numbers can be prepared without going live.
export function StatsEditor({stats,show,onChange,onShow}:{stats:Stat[];show:boolean;onChange:(stats:Stat[])=>void;onShow:(show:boolean)=>void}){
  const update=(index:number,patch:Partial<Stat>)=>onChange(stats.map((item,i)=>i===index?{...item,...patch}:item));
  return <div className="ad-stack"><label className="ad-check"><input type="checkbox" checked={show} onChange={event=>onShow(event.target.checked)}/> Show statistics on the page</label>
    <p className="ad-small">Publish only figures the studio can verify.</p>
    {stats.map((item,index)=><div key={index} className="ad-nested ad-form-grid"><label className="ad-field">Value<input value={item.value} maxLength={20} onChange={event=>update(index,{value:event.target.value})}/></label><label className="ad-field">Label<input value={item.label} maxLength={120} onChange={event=>update(index,{label:event.target.value})}/></label>
      <label className="ad-field">Icon<select value={item.icon??"award"} onChange={event=>update(index,{icon:event.target.value as IconName})}>{iconNames.map(name=><option key={name} value={name}>{name.replace(/-/g," ")}</option>)}</select></label>
      <div className="ad-row" style={{alignSelf:"end"}}><button type="button" className="ad-button ad-plain" onClick={()=>onChange(stats.filter((_,i)=>i!==index))}><Trash2 size={14}/> Remove</button></div></div>)}
    {stats.length<4&&<div><button type="button" className="ad-button" onClick={()=>onChange([...stats,{value:"",label:"",icon:"award"}])}><Plus size={14}/> Add statistic</button></div>}</div>
}
function OverviewSections({sections,templates,onChange}:{sections:Section[];templates:Section[];onChange:(sections:Section[])=>void}){
  return <div className="ad-stack">
    {sections.map((section,index)=><details key={section.id}>
      <summary>{sectionTitle(section)}</summary>
      <SectionForm section={section} index={index} catalog={{projects:[],categories:[]}} onChange={next=>onChange(sections.map((item,i)=>i===index?next:item))}/>
      <button type="button" className="ad-button ad-plain" onClick={()=>onChange(sections.filter(item=>item.id!==section.id))}>Remove section</button>
    </details>)}
    <div className="ad-row">{templates.filter(template=>!sections.some(section=>section.id===template.id)).map(template=>
      <button key={template.id} type="button" className="ad-button" onClick={()=>onChange([...sections,template])}><Plus size={14}/> Add {sectionTitle(template)}</button>)}</div>
  </div>;
}

function OverviewEditor({initial}:{initial:OverviewState}){
  const {confirm}=useAdmin();
  const [page,setPage]=useState(initial.draft),[saved,setSaved]=useState(JSON.stringify(initial.draft)),[pending,setPending]=useState(initial.unpublished_changes);
  const action=useAction();
  const dirty=JSON.stringify(page)!==saved;
  const set=<K extends keyof ServicesPage>(key:K,value:ServicesPage[K])=>setPage(current=>({...current,[key]:value}));
  async function saveDraft(){const result=await action.run(()=>request<OverviewState>("admin/services-page","PUT",page),"Draft saved");if(result){setPage(result.draft);setSaved(JSON.stringify(result.draft));setPending(result.unpublished_changes)}return result}
  async function publish(){if(dirty&&!await saveDraft())return;if(!await confirm({title:"Publish the services page?",body:"Visitors will see these changes immediately.",action:"Publish"}))return;const result=await action.run(()=>request<OverviewState>("admin/services-page/publish","POST",{}),"Services page published");if(result)setPending(result.unpublished_changes)}
  const updateBenefit=(index:number,patch:Partial<Feature>)=>set("benefits",page.benefits.map((item,i)=>i===index?{...item,...patch}:item));
  return <>
    <PageHeader back="/admin/services" title="Services overview page" description="The /services page: hero, introduction, call to action and trust highlights. The service cards come from the services list."
      actions={<>{dirty||pending?<Badge tone="attention">Unpublished changes</Badge>:<Badge tone="success">Live version</Badge>}<button className="ad-button" disabled={action.pending||!dirty} onClick={()=>void saveDraft()}>Save draft</button>
        <button className="ad-button" disabled={action.pending} onClick={async()=>{if(!dirty||await saveDraft())window.open(previewHref("/services"),"_blank")}}><Eye size={15}/> Preview</button><button className="ad-button ad-gold" disabled={action.pending||!(dirty||pending)} onClick={()=>void publish()}>Publish</button></>}/>
    <div className="ad-main-side"><div className="ad-stack">
      <Card title="Hero"><div className="ad-form-grid"><label className="ad-field">Small heading<input value={page.eyebrow} maxLength={80} onChange={event=>set("eyebrow",event.target.value)}/></label><label className="ad-field">Heading<small>Wrap words in *asterisks* for the gold accent.</small><input required value={page.heading} maxLength={160} onChange={event=>set("heading",event.target.value)}/></label>
        <label className="ad-field ad-full">Subheading<textarea rows={2} value={page.subheading} maxLength={400} onChange={event=>set("subheading",event.target.value)}/></label>
        <div className="ad-full"><ImageInput label="Hero image" required value={page.hero_image} onChange={value=>set("hero_image",value)}/></div><label className="ad-field ad-full">Hero image alt text<input value={page.hero_alt} maxLength={200} onChange={event=>set("hero_alt",event.target.value)}/></label>
        {page.buttons.map((button,index)=><ButtonFields key={index} label={"Button "+(index+1)} value={button} onChange={value=>set("buttons",page.buttons.map((item,i)=>i===index?value:item))}/>)}</div></Card>
      <Card title="Services list"><div className="ad-form-grid"><label className="ad-field">Small heading<input value={page.services_eyebrow??""} maxLength={80} onChange={event=>set("services_eyebrow",event.target.value)}/></label><label className="ad-field">Heading (optional)<input value={page.services_heading} maxLength={160} onChange={event=>set("services_heading",event.target.value)}/></label><label className="ad-field">Introduction (optional)<input value={page.services_intro} maxLength={600} onChange={event=>set("services_intro",event.target.value)}/></label>
        {page.services_button?<><ButtonFields label="Heading button" value={page.services_button} onChange={value=>set("services_button",value)}/><div className="ad-full"><button type="button" className="ad-button ad-plain" onClick={()=>set("services_button",null)}><Trash2 size={14}/> Remove button</button></div></>
          :<div className="ad-full"><button type="button" className="ad-button" onClick={()=>set("services_button",{label:"View All Services",href:"#services",style:"secondary",visible:true})}><Plus size={14}/> Add heading button</button></div>}</div></Card>
      <Card title="Hero statistics"><StatsEditor stats={page.stats??[]} show={page.show_stats??false} onChange={value=>set("stats",value)} onShow={value=>set("show_stats",value)}/></Card>
      <Card title="Call to action"><div className="ad-form-grid"><label className="ad-field">Heading<input value={page.cta_heading} maxLength={160} onChange={event=>set("cta_heading",event.target.value)}/></label><label className="ad-field">Text<input value={page.cta_text} maxLength={400} onChange={event=>set("cta_text",event.target.value)}/></label>
        {page.cta_button&&<ButtonFields label="Button" value={page.cta_button} onChange={value=>set("cta_button",value)}/>}<p className="ad-small ad-full">Only say “free” if the studio offers a free consultation.</p></div></Card>
      <Card title="Advantage sidebar"><div className="ad-stack"><div className="ad-form-grid"><label className="ad-field">Small heading<input value={page.advantage_eyebrow??""} maxLength={80} onChange={event=>set("advantage_eyebrow",event.target.value)}/></label><label className="ad-field">Heading<input value={page.advantage_heading??""} maxLength={160} onChange={event=>set("advantage_heading",event.target.value)}/></label>
        <div className="ad-full"><ImageInput label="Sidebar image (optional)" value={page.advantage_image??""} onChange={value=>set("advantage_image",value||null)}/></div><label className="ad-field ad-full">Image alt text<input value={page.advantage_alt??""} maxLength={200} onChange={event=>set("advantage_alt",event.target.value)}/></label></div>{page.benefits.map((item,index)=>{const Icon=icons[item.icon]??icons.building;return <div key={index} className="ad-nested ad-form-grid"><label className="ad-field">Title<input value={item.title} maxLength={120} onChange={event=>updateBenefit(index,{title:event.target.value})}/></label><label className="ad-field">Text<input value={item.description} maxLength={600} onChange={event=>updateBenefit(index,{description:event.target.value})}/></label>
        <label className="ad-field">Icon<span className="ad-row" style={{flexWrap:"nowrap"}}><span className="ad-icon-preview"><Icon size={18}/></span><select value={item.icon} onChange={event=>updateBenefit(index,{icon:event.target.value as Feature["icon"]})}>{iconNames.map(name=><option key={name} value={name}>{name.replace(/-/g," ")}</option>)}</select></span></label>
        <div className="ad-row" style={{alignSelf:"end"}}><button type="button" className="ad-button ad-plain" onClick={()=>set("benefits",page.benefits.filter((_,i)=>i!==index))}><Trash2 size={14}/> Remove</button></div></div>})}
        {page.benefits.length<6&&<div><button type="button" className="ad-button" onClick={()=>set("benefits",[...page.benefits,{title:"New highlight",description:"",icon:"award"}])}><Plus size={14}/> Add highlight</button></div>}</div></Card>
    </div><div className="ad-stack">
      <Card title="Before selected projects"><OverviewSections sections={page.before_projects??[]} templates={demoServicesIntro} onChange={value=>set("before_projects",value)}/></Card>
      <Card title="After selected projects"><p className="ad-small">Reference layout sections include editable approach cards, material images, and FAQs. Add a section below, then save and publish.</p><OverviewSections sections={page.after_projects??[]} templates={[...serviceReferenceSections,...demoServicesClosing]} onChange={value=>set("after_projects",value)}/></Card>
      <Card title="Selected projects"><div className="ad-stack"><label className="ad-check"><input type="checkbox" checked={page.show_projects} onChange={event=>set("show_projects",event.target.checked)}/> Show featured projects</label><label className="ad-field">Heading<input value={page.projects_heading} maxLength={160} onChange={event=>set("projects_heading",event.target.value)}/></label></div></Card>
      <Card title="Search engine listing"><div className="ad-stack"><label className="ad-field">SEO title<input value={page.seo.title} maxLength={120} onChange={event=>set("seo",{...page.seo,title:event.target.value})}/></label><label className="ad-field">Meta description<textarea rows={3} value={page.seo.description} maxLength={240} onChange={event=>set("seo",{...page.seo,description:event.target.value})}/></label></div></Card>
    </div></div>
  </>
}
