"use client";
import {useState} from "react";
import Link from "next/link";
import {request} from "../../lib/content";
import {statuses,type Inquiry} from "./fields";
import {Badge,Card,Loadable,PageHeader,formatDate,memberName,money,useAdmin,useApi} from "./ui";
type Column={status:string;count:number;value:number;items:Inquiry[]};
export default function PipelinePage(){
  const {members,currency,toast,confirm}=useAdmin();
  const [q,setQ]=useState(""),[assigned,setAssigned]=useState(""),[dragging,setDragging]=useState<number|null>(null),[over,setOver]=useState<string|null>(null);
  const state=useApi<{columns:Column[]}>("admin/pipeline?"+new URLSearchParams({q,assigned}));
  async function move(lead:Inquiry,status:string){
    if(!state.data||lead.status===status)return;
    if(status==="Contract Won"&&!await confirm({title:"Mark "+lead.name+" as won?",body:"Only do this once the contract has been signed. This is recorded in the lead’s history.",action:"Mark as won"}))return;
    const previous=state.data;
    // Optimistic move, rolled back if the server rejects it.
    state.setData({columns:previous.columns.map(column=>{
      const items=column.items.filter(item=>item.id!==lead.id);
      if(column.status===status)items.unshift({...lead,status});
      const delta=column.status===status?1:column.status===lead.status?-1:0;
      const value=(lead.contract_value??0)*delta;
      return {...column,items,count:column.count+delta,value:column.value+value};
    })});
    try{await request("admin/inquiries/"+lead.id+"/stage","POST",{status});toast(lead.name+" moved to "+status)}
    catch(error){state.setData(previous);toast((error as Error).message,"error")}
  }
  const find=(id:number)=>state.data?.columns.flatMap(column=>column.items).find(item=>item.id===id);
  return <>
    <PageHeader title="Sales pipeline" description="Drag a card to another stage, or use its “Move to” menu. Every change is saved to the lead’s history."
      actions={<><input type="search" placeholder="Filter by name or details" value={q} onChange={event=>setQ(event.target.value)} aria-label="Filter pipeline" style={{width:220}}/>
        <select value={assigned} onChange={event=>setAssigned(event.target.value)} aria-label="Assigned to" style={{width:"auto"}}><option value="">Everyone</option><option value="me">My leads</option><option value="none">Unassigned</option>{members.map(item=><option key={item.email} value={item.email}>{item.name||item.email}</option>)}</select></>}/>
    <Loadable state={state} rows={6}>{data=><div className="ad-board">{data.columns.map(column=>
      <section key={column.status} className={"ad-column"+(over===column.status?" is-over":"")} aria-label={column.status}
        onDragOver={event=>{event.preventDefault();setOver(column.status)}} onDragLeave={()=>setOver(null)}
        onDrop={event=>{event.preventDefault();setOver(null);const lead=find(Number(event.dataTransfer.getData("text/plain")));if(lead)void move(lead,column.status)}}>
        <div className="ad-column-head"><Badge>{column.status}</Badge><span>{column.count}{column.value>0?" · "+money(column.value,currency):""}</span></div>
        {column.items.map(item=><article key={item.id} className={"ad-deal"+(dragging===item.id?" is-dragging":"")} draggable onDragStart={event=>{event.dataTransfer.setData("text/plain",String(item.id));setDragging(item.id)}} onDragEnd={()=>setDragging(null)}>
          <Link className="ad-cell-main" href={"/admin/leads/"+item.id}>{item.name}</Link>
          <span className="ad-small ad-muted">{[item.project_type||item.brief?.project_type,item.location||item.brief?.location].filter(Boolean).join(" · ")||"Details not given"}</span>
          {item.contract_value!==null&&<strong className="ad-small">{money(item.contract_value,currency)}</strong>}
          <span className="ad-small ad-muted">{memberName(members,item.assigned_to)}{item.follow_up_at?" · follow up "+formatDate(item.follow_up_at):""}</span>
          <select aria-label={"Move "+item.name+" to"} value={item.status} onChange={event=>void move(item,event.target.value)}>{statuses.map(value=><option key={value} value={value}>{value===item.status?"Move to…":value}</option>)}</select>
        </article>)}
        {column.count>column.items.length&&<p className="ad-small ad-muted">+{column.count-column.items.length} more in <Link className="ad-link" href={"/admin/leads?status="+encodeURIComponent(column.status)}>Leads</Link></p>}
        {!column.items.length&&<p className="ad-small ad-muted" style={{padding:"0 6px"}}>No leads</p>}
      </section>)}</div>}</Loadable>
    <Card><p className="ad-small ad-muted">Contract values are recorded by your team when known; totals only include leads with a value.</p></Card>
  </>
}
