"use client";
import {useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowDown,ArrowUp,Eye,EyeOff,ExternalLink,ImageOff,Plus,Trash2,Upload} from "lucide-react";
import {departments,request} from "../../lib/content";
import {fields,type CollectionKind,type Field,type RecordData,type Value} from "./fields";
import {MediaPicker,uploadFile} from "./media";
import {Badge,Card,Empty,Loadable,PageHeader,formatDate,useAction,useAdmin,useApi} from "./ui";
type Kind=Exclude<CollectionKind,"settings">;
const labels:Record<Kind,{one:string;many:string;path:string}>={blog:{one:"article",many:"Blog",path:"/blog/"},team:{one:"team member",many:"Team members",path:"/team#"}};
const draftable=(kind:string)=>kind==="blog"||kind==="team";
const isPublished=(record:RecordData)=>record.published!==false;
export const previewHref=(path:string)=>"/preview?path="+encodeURIComponent(path);
function startingValue(field:Field):Value{
  if(field.initial!==undefined)return field.initial;
  if(field.options)return field.options[0];
  if(field.type==="check")return false;
  if(field.type==="lines"||field.type==="gallery")return [];
  return "";
}
export function ImageInput({value,onChange,label,required,help}:{value:string;onChange:(value:string)=>void;label:string;required?:boolean;help?:string}){
  const [picking,setPicking]=useState(false),[uploading,setUploading]=useState(false);
  const {toast}=useAdmin();
  async function upload(file:File){
    if(!["image/jpeg","image/png"].includes(file.type)){toast("Choose a JPEG or PNG image.","error");return}
    if(file.size>10*1024*1024){toast("Images must be under 10 MB.","error");return}
    setUploading(true);
    try{onChange((await uploadFile(file)).url);toast("Image uploaded. Save your changes to keep this selection.")}catch(error){toast((error as Error).message,"error")}finally{setUploading(false)}
  }
  return <div className="ad-field">{label}<div className="ad-image-field">{value?<img src={value} alt=""/>:<span className="ad-thumb" style={{width:96,height:72,display:"grid",placeItems:"center"}}><ImageOff size={18}/></span>}
    <div className="ad-stack" style={{flex:1,gap:6}}><input value={value} onChange={event=>onChange(event.target.value)} required={required} aria-label={label+" URL"} placeholder="Choose from the library or paste an image URL"/>
      <div className="ad-row"><label className="ad-button"><Upload size={15}/>{uploading?"Uploading…":value?"Replace":"Upload"}<input type="file" accept="image/jpeg,image/png" hidden disabled={uploading} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);event.target.value=""}}/></label><button type="button" className="ad-button" onClick={()=>setPicking(true)}>Choose from library</button>{value&&!required&&<button type="button" className="ad-button ad-plain" onClick={()=>onChange("")}>Remove</button>}</div>{help&&<small>{help}</small>}</div></div>
    {picking&&<MediaPicker onPick={onChange} onClose={()=>setPicking(false)}/>}</div>
}
export function FieldControl({field,value,change}:{field:Field;value:Value|undefined;change:(value:Value)=>void}){
  const [picking,setPicking]=useState(false);
  const list=Array.isArray(value)?value:[];
  const [lines,setLines]=useState(list.join("\n"));
  const help=field.help&&<small>{field.help}</small>;
  if(field.type==="image")return <div className="ad-full"><ImageInput label={field.label} help={field.help} value={String(value??"")} onChange={change} required={field.required}/></div>;
  if(field.type==="gallery")return <div className="ad-field ad-full">{field.label}<div className="ad-gallery">{list.map((url,index)=><div key={url+index} className="ad-gallery-item"><img src={url} alt=""/><span className="ad-grow">{url}</span>
    <button type="button" className="ad-icon" aria-label="Move image up" disabled={index===0} onClick={()=>{const next=[...list];[next[index-1],next[index]]=[next[index],next[index-1]];change(next)}}><ArrowUp size={15}/></button>
    <button type="button" className="ad-icon" aria-label="Move image down" disabled={index===list.length-1} onClick={()=>{const next=[...list];[next[index+1],next[index]]=[next[index],next[index+1]];change(next)}}><ArrowDown size={15}/></button>
    <button type="button" className="ad-icon" aria-label="Remove image" onClick={()=>change(list.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div>)}
    <div><button type="button" className="ad-button" onClick={()=>setPicking(true)}><Plus size={15}/> Add image</button></div></div>{picking&&<MediaPicker onPick={url=>change([...list,url])} onClose={()=>setPicking(false)}/>}</div>;
  if(field.type==="check")return <label className="ad-check ad-full"><input type="checkbox" checked={Boolean(value)} onChange={event=>change(event.target.checked)}/> {field.label}</label>;
  if(field.options)return <label className="ad-field">{field.label}<select value={String(value??"")} onChange={event=>change(event.target.value)}>{field.options.map(option=><option key={option}>{option}</option>)}</select>{help}</label>;
  if(field.type==="long"||field.type==="lines")return <label className="ad-field ad-full">{field.label}{help}<textarea required={field.required} rows={field.key==="body"?14:4} value={field.type==="lines"?lines:String(value??"")} onChange={event=>{const text=event.target.value;if(field.type==="lines"){setLines(text);change(text.split("\n").map(line=>line.trim()).filter(Boolean))}else change(text)}}/></label>;
  return <label className="ad-field">{field.label}<input required={field.required||field.type==="number"} type={field.type==="number"?"number":field.type==="email"?"email":"text"} value={String(value??"")} onChange={event=>change(field.type==="number"&&event.target.value!==""?Number(event.target.value):event.target.value)}/>{help}</label>;
}
export function RecordsPage({kind}:{kind:Kind}){
  const {can,confirm}=useAdmin();
  const state=useApi<RecordData[]>("admin/content/"+kind);
  const team=kind==="team";
  const [q,setQ]=useState(""),[status,setStatus]=useState(""),[category,setCategory]=useState(""),[sort,setSort]=useState(team?"order":"updated"),[selected,setSelected]=useState<string[]>([]);
  const action=useAction();
  const rows=useMemo(()=>(state.data??[]).filter(row=>(!q||(row.title+" "+(row.location??"")+" "+(row.position??"")+" "+row.slug).toLowerCase().includes(q.toLowerCase()))&&(!status||(status==="published")===isPublished(row))&&(!category||row.category===category||row.department===category))
    .sort((a,b)=>sort==="title"?a.title.localeCompare(b.title):sort==="year"?Number(b.year??0)-Number(a.year??0):sort==="order"?Number(a.order??0)-Number(b.order??0)||a.title.localeCompare(b.title):String(b.updated??"").localeCompare(String(a.updated??""))),[state.data,q,status,category,sort]);
  async function single(row:RecordData,value:"publish"|"unpublish"|"delete"){
    if(value==="delete"&&!await confirm({title:"Delete “"+row.title+"”?",body:"The profile is removed from the website. Its photograph stays in the media library.",action:"Delete",danger:true}))return;
    if(await action.run(()=>request("admin/content/"+kind+"/bulk","POST",{slugs:[row.slug],action:value}),value==="delete"?"Deleted":value==="publish"?"Published":"Moved to drafts"))state.reload();
  }
  async function bulk(value:string){
    if(!value)return;
    if(value==="delete"&&!await confirm({title:"Delete "+selected.length+" "+labels[kind].one+(selected.length===1?"":"s")+"?",body:"This cannot be undone. Published pages will stop working.",action:"Delete",danger:true}))return;
    if(await action.run(()=>request("admin/content/"+kind+"/bulk","POST",{slugs:selected,action:value}),"Updated "+selected.length+" "+labels[kind].one+(selected.length===1?"":"s"))){setSelected([]);state.reload()}
  }
  return <>
    <PageHeader title={labels[kind].many} description={draftable(kind)?"Drafts stay private until published. Published records appear on the public website immediately.":"Services appear on the website and in the AI assistant’s catalog."} actions={<Link className="ad-button ad-primary" href={"/admin/"+kind+"/new"}><Plus size={15}/> Add {labels[kind].one}</Link>}/>
    <Card className="ad-flush">
      <div className="ad-filters"><input type="search" placeholder={"Search "+labels[kind].many.toLowerCase()} value={q} onChange={event=>setQ(event.target.value)} aria-label="Search"/>
        {draftable(kind)&&<select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Visibility"><option value="">All</option><option value="published">Published</option><option value="draft">Drafts</option></select>}
        {team&&<select value={category} onChange={event=>setCategory(event.target.value)} aria-label="Department"><option value="">All departments</option>{departments.map(value=><option key={value}>{value}</option>)}</select>}
        <select value={sort} onChange={event=>setSort(event.target.value)} aria-label="Sort">{team&&<option value="order">Display order</option>}<option value="updated">Recently updated</option><option value="title">Title A–Z</option></select></div>
      {selected.length>0&&<div className="ad-bulk"><strong>{selected.length} selected</strong><select aria-label="Bulk action" defaultValue="" disabled={action.pending} onChange={event=>{void bulk(event.target.value);event.target.value=""}}><option value="">Choose an action…</option>{draftable(kind)&&<><option value="publish">Publish</option><option value="unpublish">Unpublish (make draft)</option></>}{team&&<><option value="feature">Feature on homepage</option><option value="unfeature">Remove from homepage</option></>}{can("content_delete")&&<option value="delete">Delete</option>}</select><button className="ad-button ad-plain" onClick={()=>setSelected([])}>Clear</button></div>}
      <Loadable state={state} rows={6}>{()=>rows.length?<div className="ad-tablewrap"><table className="ad-table"><thead><tr><th><input type="checkbox" aria-label="Select all" checked={selected.length===rows.length} onChange={event=>setSelected(event.target.checked?rows.map(row=>row.slug):[])}/></th><th>{team?"Name":"Title"}</th>{team&&<><th>Designation</th><th>Department</th><th>Order</th></>}<th>Status</th><th>Updated</th><th>{team?"Actions":""}</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.slug}><td><input type="checkbox" aria-label={"Select "+row.title} checked={selected.includes(row.slug)} onChange={event=>setSelected(list=>event.target.checked?[...list,row.slug]:list.filter(slug=>slug!==row.slug))}/></td>
          <td><div className="ad-row" style={{flexWrap:"nowrap"}}>{row.image?<img className={"ad-thumb"+(team?" ad-avatar-thumb":"")} src={String(row.image)} alt=""/>:<span className={"ad-thumb"+(team?" ad-avatar-thumb":"")}/>}<div><Link className="ad-cell-main" href={"/admin/"+kind+"/"+row.slug}>{row.title}</Link>{!team&&<div className="ad-muted ad-small">{labels[kind].path}{row.slug}</div>}</div></div></td>
          {team&&<><td>{String(row.position??"")}</td><td>{String(row.department??"—")}</td><td>{String(row.order??0)}</td></>}
          <td><div className="ad-row">{draftable(kind)?<Badge>{isPublished(row)?"Published":"Draft"}</Badge>:<Badge>Published</Badge>}{row.featured===true&&<Badge>Featured</Badge>}</div></td>
          <td>{formatDate(row.updated)}</td>
          <td><div className="ad-row" style={{flexWrap:"nowrap"}}>{team?<><Link className="ad-button" href={"/admin/team/"+row.slug}>Edit</Link><button className="ad-icon" disabled={action.pending} onClick={()=>void single(row,isPublished(row)?"unpublish":"publish")} aria-label={(isPublished(row)?"Unpublish ":"Publish ")+row.title} title={isPublished(row)?"Unpublish":"Publish"}>{isPublished(row)?<EyeOff size={16}/>:<Eye size={16}/>}</button>{can("content_delete")&&<button className="ad-icon" disabled={action.pending} onClick={()=>void single(row,"delete")} aria-label={"Delete "+row.title} title="Delete"><Trash2 size={16}/></button>}</>
            :<a className="ad-icon" href={isPublished(row)?labels[kind].path+row.slug:previewHref(labels[kind].path+row.slug)} target="_blank" rel="noreferrer" aria-label={(isPublished(row)?"View ":"Preview ")+row.title}>{isPublished(row)?<ExternalLink size={16}/>:<Eye size={16}/>}</a>}</div></td></tr>)}</tbody></table></div>
        :<Empty title={state.data?.length?"Nothing matches these filters":"No "+labels[kind].many.toLowerCase()+" yet"} action={<Link className="ad-button ad-primary" href={"/admin/"+kind+"/new"}>Add {labels[kind].one}</Link>}/>}</Loadable>
    </Card>
  </>
}
function SearchPreview({title,description,path}:{title:string;description:string;path:string}){
  return <div className="ad-preview-card" aria-label="Search result preview"><span className="ad-serp-url">{typeof location!=="undefined"?location.host:""}{path}</span><span className="ad-serp-title">{title||"Untitled"}</span><span className="ad-small">{description.slice(0,160)||"Add a description to control this text."}</span></div>
}
export function RecordFormPage({kind,slug}:{kind:Kind;slug:string}){
  const isNew=slug==="new";
  const state=useApi<RecordData>(isNew?null:"admin/content/"+kind+"/"+slug);
  if(!isNew&&!state.data)return <Loadable state={state} rows={10}>{()=>null}</Loadable>;
  return <RecordForm key={state.data?.updated??"new"} kind={kind} record={isNew?null:state.data}/>
}
function RecordForm({kind,record}:{kind:Kind;record:RecordData|null}){
  const router=useRouter();
  const {can,confirm}=useAdmin();
  const [slug,setSlug]=useState(record?.slug??""),[slugTouched,setSlugTouched]=useState(false);
  // Records saved before drafts existed have no flag and are live, matching the public API.
  const [values,setValues]=useState<Record<string,Value>>(()=>Object.fromEntries(fields[kind].map(field=>[field.key,record?.[field.key]??(record&&field.key==="published"?true:startingValue(field))])));
  const action=useAction();
  const published=draftable(kind)?values.published===true:true;
  const slugEditable=!record||(draftable(kind)&&record.published===false);
  const path=labels[kind].path+(slug||"your-url");
  async function save(publish?:boolean){
    const body=Object.fromEntries(fields[kind].map(field=>{const value=field.key==="published"&&publish!==undefined?publish:values[field.key];return [field.key,(field.type==="image"||field.type==="email")&&!value?null:value]}));
    const query=!record?"?create=true":record.slug!==slug?"?previous="+record.slug:"";
    const saved=await action.run(()=>request<RecordData>("admin/content/"+kind+"/"+slug+query,"PUT",body),publish===true?"Published":publish===false?"Moved to drafts":"Saved");
    if(saved){setValues(current=>({...current,published:saved.published??current.published}));if(!record||record.slug!==slug)router.replace("/admin/"+kind+"/"+slug);else router.refresh()}
  }
  async function remove(){
    if(!record||!await confirm({title:"Delete “"+record.title+"”?",body:"This removes it from the website permanently.",action:"Delete",danger:true}))return;
    if(await action.run(()=>request("admin/content/"+kind+"/"+record.slug,"DELETE"),"Deleted"))router.push("/admin/"+kind);
  }
  const sections=[...new Set(fields[kind].map(field=>field.section??"Details"))];
  const main=sections.filter(section=>section!=="Visibility"&&section!=="Search engine listing");
  const set=(key:string)=>(value:Value)=>{
    setValues(current=>({...current,[key]:value}));
    if(key==="title"&&!record&&!slugTouched)setSlug(String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120));
  };
  const form=(list:string[])=>list.map(section=><Card key={section} title={section}><div className="ad-form-grid">{fields[kind].filter(field=>(field.section??"Details")===section&&field.key!=="published").map(field=><FieldControl key={field.key} field={field} value={values[field.key]} change={set(field.key)}/>)}</div></Card>);
  return <form className="ad-grid" onSubmit={(event:FormEvent)=>{event.preventDefault();void save()}}>
    <PageHeader back={"/admin/"+kind} title={<span className="ad-row">{record?String(values.title||record.title):"Add "+labels[kind].one}{draftable(kind)&&record&&<Badge>{published?"Published":"Draft"}</Badge>}</span>}
      actions={<>{record&&<a className="ad-button" href={previewHref(kind==="team"?"/team":labels[kind].path+record.slug)} target="_blank" rel="noreferrer"><Eye size={15}/> Preview</a>}
        {record&&can("content_delete")&&<button type="button" className="ad-button" onClick={remove} disabled={action.pending}><Trash2 size={15}/> Delete</button>}
        <button className="ad-button ad-primary" disabled={action.pending}>{action.pending?"Saving…":"Save"}</button></>}/>
    <div className="ad-main-side"><div className="ad-stack">
      <Card title="URL"><label className="ad-field">URL slug <small>{slugEditable?"Lowercase letters, numbers and hyphens.":"Published URLs are fixed so existing links and search results keep working."}</small><input required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} readOnly={!slugEditable} onChange={event=>{setSlugTouched(true);setSlug(event.target.value.toLowerCase())}}/></label></Card>
      {form(main)}
    </div><div className="ad-stack">
      {draftable(kind)&&<Card title="Visibility"><div className="ad-stack"><p className="ad-small">{published?"Visible on the public website.":"Draft — only visible to signed-in staff through Preview."}</p>
        {record&&<button type="button" className={"ad-button "+(published?"":"ad-gold")} disabled={action.pending} onClick={()=>void save(!published)}>{published?"Unpublish":"Publish now"}</button>}
        {!record&&<label className="ad-check"><input type="checkbox" checked={values.published===true} onChange={event=>set("published")(event.target.checked)}/> Publish when saved</label>}
        {kind==="team"&&<label className="ad-check"><input type="checkbox" checked={values.featured===true} onChange={event=>set("featured")(event.target.checked)}/> Feature on the homepage</label>}</div></Card>}
      {kind!=="team"&&<Card title="Search engine listing"><div className="ad-stack"><SearchPreview title={String(values.seo_title||values.title||"")} description={String(values.seo_description||values.description||"")} path={path}/>
        <div className="ad-stack">{fields[kind].filter(field=>field.section==="Search engine listing").map(field=><FieldControl key={field.key} field={field} value={values[field.key]} change={set(field.key)}/>)}</div></div></Card>}
    </div></div>
  </form>
}
