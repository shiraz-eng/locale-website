"use client";
import {useRef,useState} from "react";
import {Copy,Image as ImageIcon,Search,Trash2,Upload,X} from "lucide-react";
import {request} from "../../lib/content";
import {prepareUploadImage} from "../../lib/upload-image";
import {Card,Empty,Loadable,Modal,PageHeader,formatDate,useAction,useAdmin,useApi} from "./ui";
export type Asset={id:number;url:string;name:string;content_type:string;width:number;height:number;size:number;alt:string;uploaded_by:string;created:string;references?:string[]};
export async function uploadFile(file:File){
  if(file.size>10*1024*1024)throw new Error(file.name+" is larger than 10 MB.");
  const data=new FormData();data.set("file",await prepareUploadImage(file));
  return request<Asset>("admin/upload","POST",data);
}
function UploadButton({onDone,label="Upload images"}:{onDone:(assets:Asset[])=>void;label?:string}){
  const input=useRef<HTMLInputElement>(null);
  const action=useAction();
  async function upload(files:FileList){
    const list=[...files];
    const assets=await action.run(async()=>{const done:Asset[]=[];for(const file of list)done.push(await uploadFile(file));return done},list.length===1?"Image uploaded":list.length+" images uploaded");
    if(assets)onDone(assets);
  }
  return <><button type="button" className="ad-button ad-primary" disabled={action.pending} onClick={()=>input.current?.click()}><Upload size={15}/>{action.pending?"Uploading…":label}</button>
    <input ref={input} type="file" accept=".png,.jpg,.jpeg" multiple hidden onChange={event=>{if(event.target.files?.length)void upload(event.target.files);event.target.value=""}}/></>
}
function Grid({q,selected,onSelect,reloadKey}:{q:string;selected?:number;onSelect:(asset:Asset)=>void;reloadKey:number}){
  const state=useApi<{items:Asset[];total:number}>("admin/media?"+new URLSearchParams({q})+"&_="+reloadKey);
  return <Loadable state={state} rows={4}>{data=>data.items.length?<div className="ad-media">{data.items.map(item=><button type="button" key={item.id} className={"ad-tile"+(selected===item.id?" is-selected":"")} onClick={()=>onSelect(item)}><img src={item.url} alt={item.alt} loading="lazy"/><span>{item.name}</span></button>)}</div>:<Empty title={q?"No images match":"No images yet"} text="Uploaded JPEG and PNG images appear here and can be reused across the website."/>}</Loadable>
}
export function MediaPicker({onPick,onClose}:{onPick:(url:string)=>void;onClose:()=>void}){
  const [q,setQ]=useState(""),[key,setKey]=useState(0);
  return <Modal title="Choose an image" onClose={onClose} wide><div className="ad-row"><input type="search" placeholder="Search images" value={q} onChange={event=>setQ(event.target.value)} aria-label="Search images" style={{flex:1}}/><UploadButton label="Upload" onDone={assets=>{setKey(key+1);if(assets.length===1){onPick(assets[0].url);onClose()}}}/></div>
    <div style={{maxHeight:"60vh",overflow:"auto"}}><Grid q={q} reloadKey={key} onSelect={asset=>{onPick(asset.url);onClose()}}/></div></Modal>
}
function Details({id,onChanged}:{id:number;onChanged:()=>void}){
  const {toast,confirm}=useAdmin();
  const state=useApi<Asset>("admin/media/"+id);
  const action=useAction();
  return <Loadable state={state} rows={4}>{item=><div className="ad-stack">
    <img src={item.url} alt={item.alt} style={{width:"100%",borderRadius:8,border:"1px solid var(--border)"}}/>
    <dl className="ad-kv"><div><dt>Dimensions</dt><dd>{item.width} × {item.height}</dd></div><div><dt>Size</dt><dd>{Math.round(item.size/1024)} KB</dd></div><div><dt>Uploaded</dt><dd>{formatDate(item.created)}</dd></div><div><dt>By</dt><dd>{item.uploaded_by}</dd></div></dl>
    <form key={item.alt+item.name} className="ad-stack" onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);const value=await action.run(()=>request<Asset>("admin/media/"+id,"PATCH",{name:String(data.get("name")),alt:String(data.get("alt"))}),"Image details saved");if(value){state.setData(value);onChanged()}}}>
      <label className="ad-field">Name<input name="name" defaultValue={item.name} maxLength={200}/></label>
      <label className="ad-field">Alt text <small>Describe the image for screen readers and search engines</small><input name="alt" defaultValue={item.alt} maxLength={300}/></label>
      <button className="ad-button" disabled={action.pending}>Save details</button></form>
    <div><p className="ad-small"><strong>Used in</strong></p><p className="ad-small">{item.references?.length?item.references.join(", "):"Not used on the website yet"}</p></div>
    <div className="ad-row"><button className="ad-button" onClick={()=>void navigator.clipboard.writeText(location.origin+item.url).then(()=>toast("URL copied"))}><Copy size={15}/> Copy URL</button>
      <button className="ad-button ad-danger" disabled={action.pending||!!item.references?.length} title={item.references?.length?"Remove it from the pages above first":undefined} onClick={async()=>{if(await confirm({title:"Delete this image?",body:"The file will be removed permanently.",action:"Delete",danger:true})&&await action.run(()=>request("admin/media/"+id,"DELETE"),"Image deleted"))onChanged()}}><Trash2 size={15}/> Delete</button></div>
  </div>}</Loadable>
}
export default function MediaPage(){
  const [q,setQ]=useState(""),[selected,setSelected]=useState<number|null>(null),[key,setKey]=useState(0);
  return <>
    <PageHeader title="Media library" description="JPEG and PNG images up to 10 MB. Uploads are re-encoded on the server, which strips embedded metadata." actions={<UploadButton onDone={assets=>{setKey(key+1);setSelected(assets[0]?.id??null)}}/>}/>
    <div className="ad-library-tabs"><span><ImageIcon size={17} aria-hidden="true"/> Images</span></div>
    <div className="ad-main-side ad-library"><Card title="All images"><label className="ad-library-search"><Search size={17} aria-hidden="true"/><input type="search" placeholder="Search by name or alt text" value={q} onChange={event=>setQ(event.target.value)} aria-label="Search images"/></label><Grid q={q} reloadKey={key} selected={selected??undefined} onSelect={asset=>setSelected(asset.id)}/></Card>
      <Card title="Media details" actions={selected&&<button type="button" className="ad-icon" aria-label="Close media details" onClick={()=>setSelected(null)}><X size={17}/></button>}>{selected?<Details key={selected+"-"+key} id={selected} onChanged={()=>{setKey(key+1)}}/>:<p className="ad-muted ad-small">Select an image to preview it, edit its alt text, see where it’s used or delete it.</p>}</Card></div>
  </>
}
