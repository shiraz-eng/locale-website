"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import Link from "next/link";
import {ArrowLeft,Inbox} from "lucide-react";
import {request} from "../../lib/content";
import type {Member} from "./fields";
export type Staff={email:string;name:string;role:string;permissions:string[]};
type Confirm={title:string;body?:string;action?:string;danger?:boolean};
export type Admin={staff:Staff;can:(permission:string)=>boolean;toast:(text:string,tone?:"success"|"error")=>void;confirm:(options:Confirm)=>Promise<boolean>;members:Member[];currency:string};
export const AdminContext=createContext<Admin|null>(null);
export function useAdmin(){
  const value=useContext(AdminContext);
  if(!value)throw new Error("useAdmin must be used inside the admin shell.");
  return value;
}
export function useApi<T>(path:string|null){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(!!path),[tick,setTick]=useState(0);
  useEffect(()=>{
    if(!path)return;
    let active=true;setLoading(true);
    request<T>(path).then(value=>{if(active){setData(value);setError("")}}).catch(reason=>{if(active)setError(reason.message)}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[path,tick]);
  return {data,error,loading,setData,reload:()=>setTick(value=>value+1)};
}
// Runs a mutation and reports the outcome as a toast; returns the result or null on failure.
export function useAction(){
  const {toast}=useAdmin();
  const [pending,setPending]=useState(false);
  async function run<T>(task:()=>Promise<T>,success?:string):Promise<T|null>{
    setPending(true);
    try{const result=await task();if(success)toast(success);return result}
    catch(error){toast((error as Error).message,"error");return null}
    finally{setPending(false)}
  }
  return {pending,run};
}
export function PageHeader({title,description,actions,back}:{title:ReactNode;description?:ReactNode;actions?:ReactNode;back?:string}){
  return <header className="ad-page-head"><div>{back&&<Link className="ad-back" href={back}><ArrowLeft size={15}/> Back</Link>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="ad-actions">{actions}</div>}</header>
}
export function Card({title,actions,children,className=""}:{title?:ReactNode;actions?:ReactNode;children:ReactNode;className?:string}){
  return <section className={"ad-card "+className}>{(title||actions)&&<div className="ad-card-head">{title&&<h2>{title}</h2>}{actions}</div>}{children}</section>
}
const tones:Record<string,string>={"New Inquiry":"info","Contacted":"neutral","Consultation Scheduled":"attention","Proposal Sent":"attention","Negotiation":"attention","Contract Won":"success","Contract Lost":"critical",
  "Ready for Consultation":"success","Needs Follow-Up":"attention","Early Exploration":"neutral",Pending:"attention",Confirmed:"info",Completed:"success",Cancelled:"critical",
  Published:"success",Draft:"neutral",Featured:"info",owner:"info",admin:"info",editor:"neutral",sales:"attention",Active:"success",Inactive:"critical"};
export function Badge({children,tone}:{children:string;tone?:string}){
  return <span className={"ad-badge ad-"+(tone||tones[children]||"neutral")}>{children}</span>
}
export function Empty({title,text,action}:{title:string;text?:string;action?:ReactNode}){
  return <div className="ad-empty"><Inbox size={30} strokeWidth={1.4}/><h3>{title}</h3>{text&&<p>{text}</p>}{action}</div>
}
export function Skeleton({rows=5}:{rows?:number}){
  return <div className="ad-skeleton" role="status" aria-label="Loading">{Array.from({length:rows},(_,index)=><span key={index}/>)}</div>
}
export function Problem({error,retry}:{error:string;retry?:()=>void}){
  return <div className="ad-banner ad-critical" role="alert"><span>{error}</span>{retry&&<button className="ad-button" onClick={retry}>Retry</button>}</div>
}
export function Loadable<T>({state,rows,children}:{state:{data:T|null;error:string;loading:boolean;reload:()=>void};rows?:number;children:(data:T)=>ReactNode}){
  if(state.error)return <Problem error={state.error} retry={state.reload}/>;
  if(!state.data)return <Skeleton rows={rows}/>;
  return <>{children(state.data)}</>;
}
export const formatDate=(value?:string|null)=>value?new Date(value.length===10?value+"T00:00:00":value).toLocaleDateString(undefined,{dateStyle:"medium"}):"—";
export const formatDateTime=(value?:string|null)=>value?new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}):"—";
export const money=(value:number|null|undefined,currency:string)=>value===null||value===undefined?"—":new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:0}).format(value);
export const toLocalInput=(value:string|null)=>{if(!value)return "";const time=new Date(value);return new Date(time.getTime()-time.getTimezoneOffset()*60000).toISOString().slice(0,16)};
export function memberName(members:Member[],email:string|null){
  if(!email)return "Unassigned";
  const person=members.find(item=>item.email===email);
  return person?.name||email;
}
export type Range={start:string;end:string};
const day=(offset:number)=>{const date=new Date();date.setDate(date.getDate()-offset);return date.toISOString().slice(0,10)};
export const presets:[string,string,()=>Range][]=[["today","Today",()=>({start:day(0),end:day(0)})],["7","Last 7 days",()=>({start:day(6),end:day(0)})],["30","Last 30 days",()=>({start:day(29),end:day(0)})]];
export function DateRange({value,onChange}:{value:Range&{preset:string};onChange:(value:Range&{preset:string})=>void}){
  return <div className="ad-range" role="group" aria-label="Date range">{presets.map(([id,label,make])=><button key={id} type="button" className={value.preset===id?"is-active":""} onClick={()=>onChange({...make(),preset:id})}>{label}</button>)}
    <button type="button" className={value.preset==="custom"?"is-active":""} onClick={()=>onChange({...value,preset:"custom"})}>Custom</button>
    {value.preset==="custom"&&<span className="ad-range-custom"><input type="date" aria-label="Start date" value={value.start} max={value.end} onChange={event=>event.target.value&&onChange({...value,start:event.target.value})}/><span>to</span><input type="date" aria-label="End date" value={value.end} min={value.start} onChange={event=>event.target.value&&onChange({...value,end:event.target.value})}/></span>}</div>
}
export function Modal({title,onClose,children,wide}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};addEventListener("keydown",close);return()=>removeEventListener("keydown",close)},[onClose]);
  return <div className="ad-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><div className={"ad-modal"+(wide?" ad-wide":"")} role="dialog" aria-modal="true" aria-label={title}><div className="ad-card-head"><h2>{title}</h2><button className="ad-icon" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>
}
