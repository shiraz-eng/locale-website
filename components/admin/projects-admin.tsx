"use client";
import {useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowDown,ArrowUp,Copy,Eye,EyeOff,GripVertical,Pencil,Plus,Star,Tags,Trash2} from "lucide-react";
import {request} from "../../lib/content";
import type {Button,ProjectsPage} from "../../lib/services";
import {ImageInput,previewHref} from "./records";
import {ButtonFields,StatsEditor} from "./services-admin";
import {Badge,Card,Empty,Loadable,Modal,PageHeader,formatDate,useAction,useAdmin,useApi} from "./ui";
type Category={id:number;slug:string;name:string;description:string;sort_order:number;projects:number};
type Row={id:number;slug:string;live_slug:string|null;title:string;category:{id:number;slug:string;name:string}|null;location:string;year:number|null;featured:boolean;sort_order:number;
  status:string;cover_image:string|null;unpublished_changes:boolean;updated:string;sections:number};
const status=(row:Row)=>row.status!=="published"?"Draft":row.unpublished_changes?"Unpublished changes":"Published";
const tone=(value:string)=>value==="Published"?"success":value==="Draft"?"neutral":"attention";
const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120);
const SORTS:Record<string,(a:Row,b:Row)=>number>={
  order:(a,b)=>a.sort_order-b.sort_order,
  updated:(a,b)=>b.updated.localeCompare(a.updated),
  title:(a,b)=>a.title.localeCompare(b.title),
  year:(a,b)=>(b.year??0)-(a.year??0)};

export function ProjectsListPage(){
  const router=useRouter();
  const {can,confirm}=useAdmin();
  const state=useApi<{items:Row[]}>("admin/projects");
  const [q,setQ]=useState(""),[filter,setFilter]=useState(""),[category,setCategory]=useState(""),[featured,setFeatured]=useState(""),[sort,setSort]=useState("order");
  const [selected,setSelected]=useState<number[]>([]),[drag,setDrag]=useState<number|null>(null);
  const action=useAction();
  const rows=useMemo(()=>state.data?.items??[],[state.data]);
  const shown=useMemo(()=>rows.filter(row=>(!q||[row.title,row.slug,row.location,row.category?.name??""].join(" ").toLowerCase().includes(q.toLowerCase()))
    &&(!filter||status(row)===filter)&&(!category||row.category?.slug===category)&&(!featured||String(row.featured)===featured)).sort(SORTS[sort]),[rows,q,filter,category,featured,sort]);
  const ordering=!(q||filter||category||featured)&&sort==="order";
  const categories=useMemo(()=>[...new Map(rows.flatMap(row=>row.category?[[row.category.slug,row.category.name] as const]:[])).entries()],[rows]);
  async function reorder(from:number,to:number){
    if(to<0||to>=rows.length||from===to)return;
    const next=[...rows];const [item]=next.splice(from,1);next.splice(to,0,item);
    state.setData({items:next.map((row,index)=>({...row,sort_order:index}))});
    const saved=await action.run(()=>request<{items:Row[]}>("admin/projects/reorder","POST",{ids:next.map(row=>row.id)}),"Order saved");
    if(saved)state.setData(saved);else state.reload();
  }
  async function run(row:Row,path:string,success:string,danger?:{title:string;body:string;action:string}){
    if(danger&&!await confirm({...danger,danger:true}))return;
    const result=await action.run(()=>request<{id:number}>(`admin/projects/${row.id}${path}`,path?"POST":"DELETE",path?{}:undefined),success);
    if(result){if(path==="/duplicate")router.push(`/admin/projects/${result.id}/edit`);else state.reload()}
  }
  async function bulk(kind:string){
    if(!kind||!selected.length)return;
    const labels:Record<string,string>={publish:"Publish",unpublish:"Unpublish",feature:"Feature",unfeature:"Unfeature",delete:"Delete"};
    if((kind==="delete"||kind==="unpublish")&&!await confirm({title:`${labels[kind]} ${selected.length} project${selected.length===1?"":"s"}?`,
      body:kind==="delete"?"The pages, their sections and version history are removed permanently.":"They disappear from the website until published again.",action:labels[kind],danger:kind==="delete"}))return;
    const result=await action.run(()=>request<{count:number}>("admin/projects/bulk","POST",{ids:selected,action:kind}),`${labels[kind]}: done`);
    if(result){setSelected([]);state.reload()}
  }
  const allShown=shown.length>0&&shown.every(row=>selected.includes(row.id));
  return <>
    <PageHeader title="Projects" description="Each project has its own page built from sections. Only published projects appear on the website."
      actions={<><Link className="ad-button" href="/admin/projects/categories"><Tags size={15}/> Categories</Link><Link className="ad-button" href="/admin/projects/overview"><Pencil size={15}/> Edit portfolio page</Link><Link className="ad-button ad-primary" href="/admin/projects/new"><Plus size={15}/> Add project</Link></>}/>
    <Card className="ad-flush">
      <div className="ad-filters"><input type="search" placeholder="Search projects" value={q} onChange={event=>setQ(event.target.value)} aria-label="Search projects"/>
        <select value={filter} onChange={event=>setFilter(event.target.value)} aria-label="Status"><option value="">All statuses</option><option>Published</option><option>Unpublished changes</option><option>Draft</option></select>
        <select value={category} onChange={event=>setCategory(event.target.value)} aria-label="Category"><option value="">All categories</option>{categories.map(([slug,name])=><option key={slug} value={slug}>{name}</option>)}</select>
        <select value={featured} onChange={event=>setFeatured(event.target.value)} aria-label="Featured"><option value="">Featured or not</option><option value="true">Featured</option><option value="false">Not featured</option></select>
        <select value={sort} onChange={event=>setSort(event.target.value)} aria-label="Sort"><option value="order">Display order</option><option value="updated">Recently updated</option><option value="title">Title A–Z</option><option value="year">Year (newest)</option></select></div>
      {selected.length>0?<div className="ad-bulk"><strong>{selected.length} selected</strong><select aria-label="Bulk action" defaultValue="" disabled={action.pending} onChange={event=>{void bulk(event.target.value);event.target.value=""}}>
        <option value="">Choose an action…</option><option value="publish">Publish</option><option value="unpublish">Unpublish</option><option value="feature">Mark as featured</option><option value="unfeature">Remove featured</option>{can("content_delete")&&<option value="delete">Delete</option>}</select>
        <button className="ad-button ad-plain" onClick={()=>setSelected([])}>Clear</button></div>
        :!ordering&&rows.length>1&&<p className="ad-bulk ad-small">Clear the filters and sort by display order to reorder projects.</p>}
      <Loadable state={state} rows={6}>{()=>shown.length?<div className="ad-tablewrap"><table className="ad-table"><thead><tr>
        <th><input type="checkbox" aria-label="Select all shown projects" checked={allShown} onChange={event=>setSelected(event.target.checked?[...new Set([...selected,...shown.map(row=>row.id)])]:selected.filter(id=>!shown.some(row=>row.id===id)))}/></th>
        <th aria-label="Order"></th><th>Project</th><th>Category</th><th>Location</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
        {shown.map(row=>{const position=rows.findIndex(item=>item.id===row.id);return <tr key={row.id} draggable={ordering} className={drag===position?"is-dragging":""} onDragStart={()=>setDrag(position)} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(drag!==null&&ordering)void reorder(drag,position);setDrag(null)}} onDragEnd={()=>setDrag(null)}>
          <td><input type="checkbox" aria-label={"Select "+row.title} checked={selected.includes(row.id)} onChange={event=>setSelected(event.target.checked?[...selected,row.id]:selected.filter(id=>id!==row.id))}/></td>
          <td><div className="ad-row" style={{flexWrap:"nowrap"}}><GripVertical size={15} className="ad-grip" aria-hidden="true"/><button className="ad-icon" aria-label={"Move "+row.title+" up"} disabled={!ordering||position===0||action.pending} onClick={()=>void reorder(position,position-1)}><ArrowUp size={14}/></button><button className="ad-icon" aria-label={"Move "+row.title+" down"} disabled={!ordering||position===rows.length-1||action.pending} onClick={()=>void reorder(position,position+1)}><ArrowDown size={14}/></button></div></td>
          <td><div className="ad-row" style={{flexWrap:"nowrap"}}>{row.cover_image?<img className="ad-thumb" src={row.cover_image} alt=""/>:<span className="ad-thumb"/>}<div><Link className="ad-cell-main" href={`/admin/projects/${row.id}/edit`}>{row.title}</Link><div className="ad-muted ad-small">/projects/{row.slug}{row.featured&&<> · <Star size={11} aria-hidden="true"/> featured</>}</div></div></div></td>
          <td>{row.category?.name??"—"}</td><td>{row.location||"—"}</td><td><Badge tone={tone(status(row))}>{status(row)}</Badge></td><td>{formatDate(row.updated)}</td>
          <td><div className="ad-row" style={{flexWrap:"nowrap"}}><Link className="ad-button" href={`/admin/projects/${row.id}/edit`}>Edit</Link>
            <a className="ad-icon" href={previewHref("/projects/"+row.slug)} target="_blank" rel="noreferrer" aria-label={"Preview "+row.title} title="Preview draft"><Eye size={16}/></a>
            <button className="ad-icon" aria-label={"Duplicate "+row.title} title="Duplicate" disabled={action.pending} onClick={()=>void run(row,"/duplicate","Duplicate created")}><Copy size={16}/></button>
            {row.status==="published"?<button className="ad-icon" aria-label={"Unpublish "+row.title} title="Unpublish" disabled={action.pending} onClick={()=>void run(row,"/unpublish","Unpublished",{title:"Unpublish “"+row.title+"”?",body:"It disappears from the website until you publish it again.",action:"Unpublish"})}><EyeOff size={16}/></button>
              :<button className="ad-button ad-gold" disabled={action.pending} onClick={()=>void run(row,"/publish","Published")}>Publish</button>}
            {can("content_delete")&&<button className="ad-icon" aria-label={"Delete "+row.title} title="Delete" disabled={action.pending} onClick={()=>void run(row,"","Deleted",{title:"Delete “"+row.title+"”?",body:"The page, its sections and its version history are removed permanently.",action:"Delete"})}><Trash2 size={16}/></button>}</div></td></tr>})}</tbody></table></div>
        :<Empty title={rows.length?"No projects match":"No projects yet"} action={<Link className="ad-button ad-primary" href="/admin/projects/new">Add project</Link>}/>}</Loadable>
    </Card>
  </>
}

export function NewProjectPage(){
  const router=useRouter();
  const categories=useApi<{items:Category[]}>("admin/project-categories");
  const [title,setTitle]=useState(""),[slug,setSlug]=useState(""),[touched,setTouched]=useState(false),[category,setCategory]=useState(0),[template,setTemplate]=useState("standard");
  const action=useAction();
  const chosen=category||categories.data?.items[0]?.id||0;
  async function submit(event:FormEvent){
    event.preventDefault();
    const created=await action.run(()=>request<{id:number}>("admin/projects","POST",{title,slug,category_id:chosen,template}),"Project created as a draft");
    if(created)router.push(`/admin/projects/${created.id}/edit`);
  }
  return <>
    <PageHeader back="/admin/projects" title="Add a project" description="The project is created as a draft. Fill in its details and sections, preview it, then publish."/>
    <Card><form className="ad-stack" onSubmit={submit} style={{maxWidth:640}}>
      <label className="ad-field">Project title<input required maxLength={160} value={title} onChange={event=>{setTitle(event.target.value);if(!touched)setSlug(slugify(event.target.value))}}/></label>
      <label className="ad-field">URL slug<small>/projects/{slug||"…"}</small><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} value={slug} onChange={event=>{setTouched(true);setSlug(event.target.value.toLowerCase())}}/></label>
      <label className="ad-field">Category<select required value={chosen} onChange={event=>setCategory(Number(event.target.value))}>{categories.data?.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <fieldset className="ad-fieldset"><legend>Project layout</legend>
        <label className="ad-check"><input type="radio" name="template" checked={template==="standard"} onChange={()=>setTemplate("standard")}/> Default project page · Lakeside Villa structure (hero, project facts, Overview, Gallery, Drawings, Materials, Video, Process)</label>
      </fieldset><div className="ad-actions"><Link className="ad-button" href="/admin/projects">Cancel</Link><button className="ad-button ad-primary" disabled={action.pending||!chosen}>Create draft</button></div></form></Card>
  </>
}

export function ProjectCategoriesPage(){
  const {can,confirm}=useAdmin();
  const state=useApi<{items:Category[]}>("admin/project-categories");
  const [editing,setEditing]=useState<Category|null|"new">(null),[drag,setDrag]=useState<number|null>(null);
  const action=useAction();
  const rows=state.data?.items??[];
  async function reorder(from:number,to:number){
    if(to<0||to>=rows.length||from===to)return;
    const next=[...rows];const [item]=next.splice(from,1);next.splice(to,0,item);
    state.setData({items:next});
    const saved=await action.run(()=>request<{items:Category[]}>("admin/project-categories/reorder","POST",{ids:next.map(row=>row.id)}),"Order saved");
    if(saved)state.setData(saved);else state.reload();
  }
  async function remove(row:Category){
    if(!await confirm({title:"Delete “"+row.name+"”?",body:"The category disappears from the portfolio filters.",action:"Delete",danger:true}))return;
    const saved=await action.run(()=>request<{items:Category[]}>("admin/project-categories/"+row.id,"DELETE"),"Category deleted");
    if(saved)state.setData(saved);
  }
  return <>
    <PageHeader back="/admin/projects" title="Project categories" description="Categories become the filter tabs on the portfolio page, in this order. A category that projects still use cannot be deleted."
      actions={<button className="ad-button ad-primary" onClick={()=>setEditing("new")}><Plus size={15}/> Add category</button>}/>
    <Card className="ad-flush"><Loadable state={state} rows={5}>{()=>rows.length?<div className="ad-tablewrap"><table className="ad-table"><thead><tr><th aria-label="Order"></th><th>Category</th><th>Slug</th><th>Projects</th><th>Actions</th></tr></thead><tbody>
      {rows.map((row,position)=><tr key={row.id} draggable className={drag===position?"is-dragging":""} onDragStart={()=>setDrag(position)} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(drag!==null)void reorder(drag,position);setDrag(null)}} onDragEnd={()=>setDrag(null)}>
        <td><div className="ad-row" style={{flexWrap:"nowrap"}}><GripVertical size={15} className="ad-grip" aria-hidden="true"/><button className="ad-icon" aria-label={"Move "+row.name+" up"} disabled={position===0||action.pending} onClick={()=>void reorder(position,position-1)}><ArrowUp size={14}/></button><button className="ad-icon" aria-label={"Move "+row.name+" down"} disabled={position===rows.length-1||action.pending} onClick={()=>void reorder(position,position+1)}><ArrowDown size={14}/></button></div></td>
        <td><span className="ad-cell-main">{row.name}</span>{row.description&&<div className="ad-muted ad-small">{row.description}</div>}</td><td className="ad-muted">{row.slug}</td><td>{row.projects}</td>
        <td><div className="ad-row" style={{flexWrap:"nowrap"}}><button className="ad-button" onClick={()=>setEditing(row)}>Edit</button>
          {can("content_delete")&&<button className="ad-icon" aria-label={"Delete "+row.name} title={row.projects?"In use by projects":"Delete"} disabled={action.pending||row.projects>0} onClick={()=>void remove(row)}><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></table></div>
      :<Empty title="No categories yet" action={<button className="ad-button ad-primary" onClick={()=>setEditing("new")}>Add category</button>}/>}</Loadable></Card>
    {editing&&<CategoryForm initial={editing==="new"?null:editing} onClose={()=>setEditing(null)} onSaved={data=>{state.setData(data);setEditing(null)}}/>}
  </>
}
function CategoryForm({initial,onClose,onSaved}:{initial:Category|null;onClose:()=>void;onSaved:(data:{items:Category[]})=>void}){
  const [name,setName]=useState(initial?.name??""),[slug,setSlug]=useState(initial?.slug??""),[description,setDescription]=useState(initial?.description??""),[touched,setTouched]=useState(!!initial);
  const action=useAction();
  async function submit(event:FormEvent){
    event.preventDefault();
    const saved=await action.run(()=>request<{items:Category[]}>("admin/project-categories"+(initial?"/"+initial.id:""),initial?"PUT":"POST",{name,slug,description}),initial?"Category saved":"Category added");
    if(saved)onSaved(saved);
  }
  return <Modal title={initial?"Edit category":"Add a category"} onClose={onClose}><form className="ad-stack" onSubmit={submit}>
    <label className="ad-field">Name<input required maxLength={60} value={name} onChange={event=>{setName(event.target.value);if(!touched)setSlug(slugify(event.target.value))}}/></label>
    <label className="ad-field">Slug<small>Used in filter links: /projects?category={slug||"…"}{initial&&initial.slug!==slug?" — existing links to the old slug will show all projects":""}</small><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={60} value={slug} onChange={event=>{setTouched(true);setSlug(event.target.value.toLowerCase())}}/></label>
    <label className="ad-field">Description (optional)<textarea rows={2} maxLength={300} value={description} onChange={event=>setDescription(event.target.value)}/></label>
    <div className="ad-actions"><button type="button" className="ad-button" onClick={onClose}>Cancel</button><button className="ad-button ad-primary" disabled={action.pending}>{initial?"Save":"Add category"}</button></div></form></Modal>
}

type OverviewState={draft:ProjectsPage;published:ProjectsPage|null;unpublished_changes:boolean};
export function ProjectsOverviewPage(){
  const state=useApi<OverviewState>("admin/projects-page");
  return <Loadable state={state} rows={8}>{data=><OverviewEditor initial={data}/>}</Loadable>
}
const blankButton:Button={label:"",href:"/contact",style:"secondary",visible:true};
function ButtonList({buttons,max,onChange}:{buttons:Button[];max:number;onChange:(buttons:Button[])=>void}){
  return <>{buttons.map((button,index)=><div key={index} className="ad-full ad-stack"><ButtonFields label={"Button "+(index+1)} value={button} onChange={value=>onChange(buttons.map((item,i)=>i===index?value:item))}/>
    <div><button type="button" className="ad-button ad-plain" onClick={()=>onChange(buttons.filter((_,i)=>i!==index))}><Trash2 size={14}/> Remove button</button></div></div>)}
    {buttons.length<max&&<div className="ad-full"><button type="button" className="ad-button" onClick={()=>onChange([...buttons,{...blankButton}])}><Plus size={14}/> Add button</button></div>}</>
}
function OverviewEditor({initial}:{initial:OverviewState}){
  const {confirm}=useAdmin();
  const [page,setPage]=useState(initial.draft),[saved,setSaved]=useState(JSON.stringify(initial.draft)),[pending,setPending]=useState(initial.unpublished_changes);
  const action=useAction();
  const dirty=JSON.stringify(page)!==saved;
  const set=<K extends keyof ProjectsPage>(key:K,value:ProjectsPage[K])=>setPage(current=>({...current,[key]:value}));
  async function saveDraft(){const result=await action.run(()=>request<OverviewState>("admin/projects-page","PUT",page),"Draft saved");if(result){setPage(result.draft);setSaved(JSON.stringify(result.draft));setPending(result.unpublished_changes)}return result}
  async function publish(){if(dirty&&!await saveDraft())return;if(!await confirm({title:"Publish the portfolio page?",body:"Visitors will see these changes immediately.",action:"Publish"}))return;const result=await action.run(()=>request<OverviewState>("admin/projects-page/publish","POST",{}),"Portfolio page published");if(result)setPending(result.unpublished_changes)}
  return <>
    <PageHeader back="/admin/projects" title="Portfolio page" description="The /projects page: hero, listing options and closing call to action. Project cards come from published projects; tabs come from the categories."
      actions={<>{dirty||pending?<Badge tone="attention">Unpublished changes</Badge>:<Badge tone="success">Live version</Badge>}<button className="ad-button" disabled={action.pending||!dirty} onClick={()=>void saveDraft()}>Save draft</button>
        <button className="ad-button" disabled={action.pending} onClick={async()=>{if(!dirty||await saveDraft())window.open(previewHref("/projects"),"_blank")}}><Eye size={15}/> Preview</button><button className="ad-button ad-gold" disabled={action.pending||!(dirty||pending)} onClick={()=>void publish()}>Publish</button></>}/>
    <div className="ad-main-side"><div className="ad-stack">
      <Card title="Hero"><div className="ad-form-grid"><label className="ad-field">Small heading<input value={page.eyebrow} maxLength={80} onChange={event=>set("eyebrow",event.target.value)}/></label><label className="ad-field">Heading<small>Wrap words in *asterisks* for the gold accent.</small><input required value={page.heading} maxLength={160} onChange={event=>set("heading",event.target.value)}/></label>
        <label className="ad-field ad-full">Description<textarea rows={3} value={page.description} maxLength={600} onChange={event=>set("description",event.target.value)}/></label>
        <div className="ad-full"><ImageInput label="Hero image" required value={page.hero_image} onChange={value=>set("hero_image",value)}/></div><label className="ad-field ad-full">Hero image alt text<input value={page.hero_alt} maxLength={200} onChange={event=>set("hero_alt",event.target.value)}/></label>
        <ButtonList buttons={page.buttons} max={2} onChange={value=>set("buttons",value)}/>
        <label className="ad-field ad-full">Showreel video (optional)<small>A YouTube or Vimeo link. “Watch Showreel” appears only when this is set.</small><input value={page.showreel??""} maxLength={300} onChange={event=>set("showreel",event.target.value||null)}/></label></div></Card>
      <Card title="Statistics strip"><StatsEditor stats={page.stats??[]} show={page.show_stats??false} onChange={value=>set("stats",value)} onShow={value=>set("show_stats",value)}/></Card>
      <Card title="Project gallery strip"><div className="ad-stack"><label className="ad-check"><input type="checkbox" checked={page.show_gallery!==false} onChange={event=>set("show_gallery",event.target.checked)}/> Show a scrolling strip of images from published projects’ galleries</label><label className="ad-field">Heading<input value={page.gallery_heading??""} maxLength={160} onChange={event=>set("gallery_heading",event.target.value)}/></label></div></Card>
      <Card title="Closing call to action"><div className="ad-form-grid"><label className="ad-field">Heading (leave empty to hide)<input value={page.cta_heading} maxLength={160} onChange={event=>set("cta_heading",event.target.value)}/></label><label className="ad-field">Text<input value={page.cta_text} maxLength={400} onChange={event=>set("cta_text",event.target.value)}/></label>
        <ButtonList buttons={page.cta_buttons} max={2} onChange={value=>set("cta_buttons",value)}/></div></Card>
    </div><div className="ad-stack">
      <Card title="Listing"><div className="ad-stack"><label className="ad-field">Projects per page<select value={page.page_size} onChange={event=>set("page_size",Number(event.target.value) as ProjectsPage["page_size"])}>{[6,9,12].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className="ad-field">Default order<select value={page.default_sort} onChange={event=>set("default_sort",event.target.value as ProjectsPage["default_sort"])}><option value="featured">Featured first, then display order</option><option value="newest">Newest year first</option><option value="oldest">Oldest year first</option><option value="title">Name A–Z</option></select></label></div></Card>
      <Card title="Search engine listing"><div className="ad-stack"><label className="ad-field">SEO title<input value={page.seo.title} maxLength={120} onChange={event=>set("seo",{...page.seo,title:event.target.value})}/></label><label className="ad-field">Meta description<textarea rows={3} value={page.seo.description} maxLength={240} onChange={event=>set("seo",{...page.seo,description:event.target.value})}/></label>
        <ImageInput label="Social sharing image" value={page.seo.og_image??""} onChange={url=>set("seo",{...page.seo,og_image:url||null})}/></div></Card>
    </div></div>
  </>
}
