"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {request} from "../../lib/content";
import type {ContactDefinition} from "../../lib/forms";
import {Badge,Card,Empty,Loadable,PageHeader,formatDateTime,useAction,useAdmin,useApi} from "./ui";

const statuses=["New","Contacted","In Progress","Completed","Closed"];
type Message={id:number;kind:string;status:string;created:string;source:Record<string,string|null>;brief:unknown;
  data:{name:string;email:string;phone?:string;project_type?:string;location?:string;description:string;requirements?:string[];
    answers?:Record<string,string|string[]>;form_definition?:ContactDefinition;[key:string]:unknown}};
type Detail=Message&{notes:{id:number;text:string;author:string;created:string}[]};

export default function InquiriesPage(){
  const [q,setQ]=useState(""),[status,setStatus]=useState(""),[page,setPage]=useState(1);
  const params=new URLSearchParams({q,...(status?{status}:{}),page:String(page)});
  const state=useApi<{items:Message[];total:number;more:boolean}>("admin/messages?"+params);
  return <>
    <PageHeader title="Inquiries" description="Customer requests and project requirements sent through your website." actions={<a className="ad-button" href={"/api/admin/messages/export?"+new URLSearchParams({q,...(status?{status}:{})})}>Export CSV</a>}/>
    <Card className="ad-flush"><div className="ad-filters"><input aria-label="Search inquiries" type="search" placeholder="Search name, email, or project details" value={q} onChange={event=>{setQ(event.target.value);setPage(1)}}/>
      <select aria-label="Inquiry status" value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}}><option value="">All statuses</option>{statuses.map(item=><option key={item}>{item}</option>)}</select></div>
      <Loadable state={state}>{data=>data.items.length?<><div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>Customer</th><th>Project / service</th><th>Status</th><th>Submitted</th><th/></tr></thead>
        <tbody>{data.items.map(item=><tr key={item.id}><td><Link className="ad-cell-main" href={"/admin/inquiries/"+item.id}>{item.data.name}</Link><div className="ad-small ad-muted">{item.data.email}</div></td>
          <td>{item.data.project_type||String(item.data.service_interest||"General inquiry")}<div className="ad-small ad-muted">{item.data.location}</div></td>
          <td><Badge>{item.status}</Badge></td><td>{formatDateTime(item.created)}</td><td><Link className="ad-button" href={"/admin/inquiries/"+item.id}>View</Link></td></tr>)}</tbody></table></div>
        <div className="ad-pager"><span>{data.total} inquiries</span><div className="ad-row"><button className="ad-button" disabled={page===1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page}</span><button className="ad-button" disabled={!data.more} onClick={()=>setPage(page+1)}>Next</button></div></div>
      </>:<Empty title="No inquiries match"/>}</Loadable>
    </Card>
  </>;
}

export function InquiryDetail({id}:{id:string}){
  const state=useApi<Detail>("admin/messages/"+id);
  const action=useAction(),{can,confirm}=useAdmin();
  const [note,setNote]=useState("");
  async function addNote(event:FormEvent){
    event.preventDefault();
    const value=await action.run(()=>request<Detail>("admin/messages/"+id+"/notes","POST",{text:note.trim()}),"Note added");
    if(value){state.setData(value);setNote("")}
  }
  return <Loadable state={state}>{item=><>
    <PageHeader title={item.data.name} back="/admin/inquiries" description={"Submitted "+formatDateTime(item.created)} actions={<>
      <select aria-label="Status" value={item.status} disabled={action.pending} onChange={async event=>{
        const value=await action.run(()=>request<Detail>("admin/messages/"+id,"PATCH",{status:event.target.value}),"Status updated");
        if(value)state.setData(value);
      }}>{statuses.map(status=><option key={status}>{status}</option>)}</select>
      {can("inquiry_delete")&&<button className="ad-button ad-danger" disabled={action.pending} onClick={async()=>{
        if(await confirm({title:"Delete this inquiry?",body:"The inquiry and its notes will be permanently removed.",action:"Delete",danger:true})){
          const result=await action.run(()=>request("admin/messages/"+id,"DELETE"),"Inquiry deleted");
          if(result)location.assign("/admin/inquiries");
        }
      }}>Delete inquiry</button>}
    </>}/>
    <div className="ad-main-side"><div className="ad-stack">
      <Card title="Customer and project"><dl className="ad-kv">
        {[["Name",item.data.name],["Email",item.data.email],["Phone",item.data.phone],["Project type",item.data.project_type],["Service",item.data.service_interest],["Location",item.data.location],["Budget",item.data.budget],["Timeline",item.data.timeline],["Source",item.source?.page]].map(([label,value])=><div key={String(label)}><dt>{String(label)}</dt><dd>{String(value||"—")}</dd></div>)}
      </dl></Card>
      <Card title="Message"><p style={{whiteSpace:"pre-wrap"}}>{item.data.description}</p></Card>
      <Card title="Project requirements"><p>{item.data.requirements?.join(", ")||"No additional requirements supplied."}</p>
        {item.data.answers&&<dl className="ad-kv">{Object.entries(item.data.answers).map(([key,value])=><div key={key}>
          <dt>{item.data.form_definition?.fields.find(field=>field.key===key)?.label??key}</dt><dd>{Array.isArray(value)?value.join(", "):value||"—"}</dd>
        </div>)}</dl>}
        {!!item.brief&&<pre className="ad-inquiry-brief">{JSON.stringify(item.brief,null,2)}</pre>}
      </Card>
    </div><Card title="Internal notes">
      <form onSubmit={addNote} className="ad-stack"><label className="ad-field">Add note<textarea required maxLength={8000} value={note} onChange={event=>setNote(event.target.value)}/></label>
        <button className="ad-button" disabled={action.pending||!note.trim()}>Save note</button></form>
      <div className="ad-list">{item.notes.map(entry=><article key={entry.id}><p style={{whiteSpace:"pre-wrap"}}>{entry.text}</p><small>{entry.author} · {formatDateTime(entry.created)}</small></article>)}</div>
    </Card></div>
  </>}</Loadable>;
}
