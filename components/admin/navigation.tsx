"use client";
import {useState} from "react";
import {ArrowDown,ArrowUp,Plus,Trash2} from "lucide-react";
import {request} from "../../lib/content";
import type {MenuItem,NavigationContent} from "../../lib/navigation";
import {Card,Loadable,PageHeader,useAction,useAdmin,useApi} from "./ui";

type State={draft:NavigationContent;published:NavigationContent|null;unpublished_changes:boolean};
function Links({items,onChange,dropdown=false,single=false}:{items:MenuItem[];onChange:(items:MenuItem[])=>void;dropdown?:boolean;single?:boolean}){
  const update=(index:number,patch:Partial<MenuItem>)=>onChange(items.map((item,i)=>i===index?{...item,...patch}:item));
  const move=(index:number,delta:number)=>{const next=[...items];[next[index],next[index+delta]]=[next[index+delta],next[index]];onChange(next)};
  return <div className="ad-stack">{items.map((item,index)=><div key={index} className="ad-nested ad-form-grid">
    <label className="ad-field">Label<input value={item.label} maxLength={160} onChange={event=>update(index,{label:event.target.value})}/></label>
    <label className="ad-field">Link<input value={item.href} maxLength={300} onChange={event=>update(index,{href:event.target.value})}/></label>
    <div className="ad-row"><label className="ad-check"><input type="checkbox" checked={item.visible} onChange={event=>update(index,{visible:event.target.checked})}/> Visible</label>
      {dropdown&&<label className="ad-check"><input type="checkbox" checked={item.services} onChange={event=>update(index,{services:event.target.checked})}/> Services dropdown</label>}</div>
    <div className="ad-row"><button className="ad-icon" aria-label={"Move "+item.label+" up"} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={16}/></button>
      <button className="ad-icon" aria-label={"Move "+item.label+" down"} disabled={index===items.length-1} onClick={()=>move(index,1)}><ArrowDown size={16}/></button>
      {!single&&<button className="ad-icon" aria-label={"Remove "+item.label} onClick={()=>onChange(items.filter((_,i)=>i!==index))}><Trash2 size={16}/></button>}</div>
  </div>)}
    {!single&&items.length<12&&<button className="ad-button" onClick={()=>onChange([...items,{label:"New link",href:"/contact",visible:true,services:false}])}><Plus size={16}/> Add link</button>}
  </div>;
}
export default function NavigationPage(){
  const state=useApi<State>("admin/navigation");
  return <Loadable state={state}>{data=><Editor key={JSON.stringify(data)} initial={data} onSaved={state.setData}/>}</Loadable>;
}
function Editor({initial,onSaved}:{initial:State;onSaved:(value:State)=>void}){
  const [doc,setDoc]=useState(initial.draft);
  const action=useAction(),{confirm}=useAdmin();
  const revisions=useApi<{items:{id:string;created:string;document:NavigationContent}[]}>("admin/navigation/revisions");
  const dirty=JSON.stringify(doc)!==JSON.stringify(initial.draft);
  async function save(){
    const value=await action.run(()=>request<State>("admin/navigation","PUT",doc),"Navigation draft saved");
    if(value)onSaved(value);
    return value;
  }
  async function publish(){
    if(!await confirm({title:"Publish navigation and footer?",action:"Publish"}))return;
    if(dirty&&!await save())return;
    const value=await action.run(()=>request<State>("admin/navigation/publish","POST",{}),"Navigation published");
    if(value)onSaved(value);
  }
  return <>
    <PageHeader title="Navigation & Footer" description="Edit the website menu, consultation button, and footer links." actions={<>
      <button className="ad-button" disabled={!dirty||action.pending} onClick={()=>void save()}>Save draft</button>
      <a className="ad-button" href="/preview?path=/" target="_blank" rel="noreferrer">Preview saved draft</a>
      <button className="ad-button ad-primary" disabled={action.pending||!(dirty||initial.unpublished_changes)} onClick={()=>void publish()}>Publish</button>
    </>}/>
    <div className="ad-main-side"><Card title="Main menu"><Links items={doc.links} onChange={links=>setDoc({...doc,links})} dropdown/></Card>
      <div className="ad-stack"><Card title="Consultation button"><Links single items={[doc.cta]} onChange={items=>{if(items[0])setDoc({...doc,cta:items[0]})}}/></Card>
      <Card title="Footer tagline"><label className="ad-field">Text<textarea value={doc.footer_tagline} maxLength={300} onChange={event=>setDoc({...doc,footer_tagline:event.target.value})}/></label></Card></div>
    </div>
    {doc.footer_columns.map((column,index)=><Card key={index} title={column.title} actions={<button className="ad-button" onClick={()=>setDoc({...doc,footer_columns:doc.footer_columns.filter((_,i)=>i!==index)})}>Remove column</button>}>
      <label className="ad-field">Column title<input value={column.title} maxLength={160} onChange={event=>setDoc({...doc,footer_columns:doc.footer_columns.map((value,i)=>i===index?{...value,title:event.target.value}:value)})}/></label>
      <Links items={column.links} onChange={links=>setDoc({...doc,footer_columns:doc.footer_columns.map((value,i)=>i===index?{...value,links}:value)})}/>
    </Card>)}
    <Card title="Saved revisions"><div className="ad-list">{revisions.data?.items.map(revision=><button key={revision.id} className="ad-button" onClick={async()=>{
      if(await confirm({title:"Restore this navigation draft?",action:"Restore"}))setDoc(revision.document);
    }}>Restore {new Date(revision.created).toLocaleString()}</button>)}</div></Card>
    {doc.footer_columns.length<3&&<button className="ad-button" onClick={()=>setDoc({...doc,footer_columns:[...doc.footer_columns,{title:"New column",links:[]}]})}>Add footer column</button>}
  </>;
}
