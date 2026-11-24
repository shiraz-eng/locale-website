"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {Copy,Mail,Sparkles} from "lucide-react";
import {request} from "../../lib/content";
import {BriefView} from "../brief";
import {activityText} from "./dashboard";
import {consultationStatuses,lostReasons,priorities,requestKinds,statuses,type Inquiry,type Lead} from "./fields";
import {Badge,Card,Empty,Loadable,PageHeader,formatDate,formatDateTime,memberName,money,toLocalInput,useAction,useAdmin,useApi} from "./ui";
const drafts:[string,string][]=[["first_response","First response"],["missing_info","Missing-information questions"],["consultation_invite","Consultation invitation"],["follow_up","Follow-up message"],["proposal_intro","Proposal introduction"]];
const source=(item:Inquiry)=>item.attribution?.utm_source||item.attribution?.referrer||"Direct";
export function AssigneeSelect({name="assigned_to",value,onChange}:{name?:string;value:string|null;onChange?:(value:string)=>void}){
  const {members}=useAdmin();
  return <select name={name} defaultValue={onChange?undefined:value??""} value={onChange?value??"":undefined} onChange={event=>onChange?.(event.target.value)}><option value="">Unassigned</option>{members.filter(item=>item.active).map(item=><option key={item.email} value={item.email}>{item.name||item.email}</option>)}</select>
}
export function LeadsPage(){
  const {members,currency,can}=useAdmin();
  const [filters,setFilters]=useState({q:"",status:"",priority:"",kind:"",assigned:"",due:"",sort:"created"}),[page,setPage]=useState(1),[ready,setReady]=useState(false);
  const [selected,setSelected]=useState<number[]>([]);
  useEffect(()=>{const params=new URLSearchParams(location.search);setFilters(current=>({...current,due:params.get("due")?"true":"",status:params.get("status")||""}));setReady(true)},[]);
  const query=new URLSearchParams(Object.entries({...filters,page:String(page)}).filter(([,value])=>value));
  const state=useApi<{items:Inquiry[];total:number;more:boolean}>(ready?"admin/inquiries?"+query:null);
  const action=useAction();
  const set=(key:string)=>(event:{target:{value:string}})=>{setPage(1);setSelected([]);setFilters(current=>({...current,[key]:event.target.value}))};
  async function move(status:string){
    if(!status)return;
    const done=await action.run(async()=>{for(const id of selected)await request("admin/inquiries/"+id+"/stage","POST",{status});return true},selected.length+" lead"+(selected.length===1?"":"s")+" moved to "+status);
    if(done){setSelected([]);state.reload()}
  }
  return <>
    <PageHeader title="Leads" description="Every inquiry, consultation request, quotation request and AI brief submitted from the website."/>
    <Card className="ad-flush">
      <div className="ad-filters"><input type="search" placeholder="Search name, email, description" value={filters.q} onChange={set("q")} aria-label="Search leads"/>
        <select value={filters.status} onChange={set("status")} aria-label="Status"><option value="">All statuses</option>{statuses.map(value=><option key={value}>{value}</option>)}</select>
        <select value={filters.priority} onChange={set("priority")} aria-label="Priority"><option value="">All priorities</option>{priorities.map(value=><option key={value}>{value}</option>)}</select>
        <select value={filters.kind} onChange={set("kind")} aria-label="Request type"><option value="">All requests</option>{Object.entries(requestKinds).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        <select value={filters.assigned} onChange={set("assigned")} aria-label="Assigned to"><option value="">Anyone</option><option value="me">Assigned to me</option><option value="none">Unassigned</option>{members.map(item=><option key={item.email} value={item.email}>{item.name||item.email}</option>)}</select>
        <select value={filters.sort} onChange={set("sort")} aria-label="Sort"><option value="created">Newest first</option><option value="follow_up">Follow-up date</option><option value="value">Contract value</option></select>
        <label className="ad-check"><input type="checkbox" checked={!!filters.due} onChange={event=>set("due")({target:{value:event.target.checked?"true":""}})}/> Follow-up due</label></div>
      {selected.length>0&&can("pipeline")&&<div className="ad-bulk"><strong>{selected.length} selected</strong><select aria-label="Move selected leads" defaultValue="" onChange={event=>{void move(event.target.value);event.target.value=""}} disabled={action.pending}><option value="">Move to stage…</option>{statuses.map(value=><option key={value}>{value}</option>)}</select><button className="ad-button ad-plain" onClick={()=>setSelected([])}>Clear</button></div>}
      <Loadable state={state} rows={8}>{data=>data.items.length?<><div className="ad-tablewrap"><table className="ad-table"><thead><tr>
        <th><input type="checkbox" aria-label="Select all" checked={selected.length===data.items.length} onChange={event=>setSelected(event.target.checked?data.items.map(item=>item.id):[])}/></th>
        <th>Customer</th><th>Project</th><th>Location</th><th>Budget</th><th>Timeline</th><th>Source</th><th>Assigned</th><th>Status</th><th>Submitted</th></tr></thead>
        <tbody>{data.items.map(item=><tr key={item.id}><td><input type="checkbox" aria-label={"Select "+item.name} checked={selected.includes(item.id)} onChange={event=>setSelected(list=>event.target.checked?[...list,item.id]:list.filter(id=>id!==item.id))}/></td>
          <td><Link className="ad-cell-main" href={"/admin/leads/"+item.id}>{item.name}</Link><div className="ad-muted ad-small">{item.email}{item.phone?" · "+item.phone:""}</div></td>
          <td>{item.project_type||item.brief?.project_type||"—"}<div className="ad-small">{requestKinds[item.kind]}{item.priority&&<> · <Badge>{item.priority}</Badge></>}</div></td>
          <td>{item.location||item.brief?.location||"—"}</td><td>{item.budget||"—"}{item.contract_value!==null&&<div className="ad-muted ad-small">Value {money(item.contract_value,currency)}</div>}</td><td>{item.timeline||"—"}</td><td>{source(item)}</td>
          <td>{memberName(members,item.assigned_to)}</td><td><Badge>{item.status}</Badge>{item.follow_up_at&&<div className="ad-muted ad-small">Follow up {formatDate(item.follow_up_at)}</div>}</td><td>{formatDate(item.created)}</td></tr>)}</tbody></table></div>
        <div className="ad-pager"><span>{data.total} lead{data.total===1?"":"s"}</span><span className="ad-row">{page>1&&<button className="ad-button" onClick={()=>setPage(page-1)}>Previous</button>}{data.more&&<button className="ad-button" onClick={()=>setPage(page+1)}>Next</button>}</span></div></>
        :<Empty title="No leads match these filters" text={Object.values(filters).some(value=>value&&value!=="created")?"Try clearing a filter.":"When visitors submit an inquiry or an AI brief, it will appear here."}/>}</Loadable>
    </Card>
    {!can("pipeline")&&selected.length>0&&<p className="ad-muted ad-small">Your role cannot move leads between stages.</p>}
  </>
}
function Qualify({lead,onChange}:{lead:Lead;onChange:(lead:Lead)=>void}){
  const action=useAction();
  const result=lead.qualification;
  async function run(){const value=await action.run(()=>request<Lead>("admin/inquiries/"+lead.id+"/qualify","POST",{}),"AI analysis updated");if(value)onChange(value)}
  return <Card title="AI lead analysis" actions={<button className="ad-button" onClick={run} disabled={action.pending}><Sparkles size={15}/>{action.pending?"Analyzing…":result?"Re-analyze":"Analyze"}</button>}>
    {result?<div className="ad-stack"><div className="ad-row"><Badge>{result.label}</Badge>{lead.priority_override&&lead.priority_override!==result.label&&<span className="ad-muted ad-small">Staff override: {lead.priority_override}</span>}</div>
      {result.summary&&<p style={{color:"var(--text)"}}>{result.summary}</p>}<p>{result.reason}</p>
      <dl className="ad-kv">{[["Project type",result.project_type],["Location",result.location],["Budget",result.budget],["Timeline",result.timeline]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||"Not provided"}</dd></div>)}</dl>
      {!!result.services.length&&<p><strong>Requested services:</strong> {result.services.join(", ")}</p>}{!!result.requirements.length&&<p><strong>Requirements:</strong> {result.requirements.join(" · ")}</p>}
      {!!result.missing.length&&<div><strong className="ad-small">Missing details</strong><ul className="ad-small" style={{margin:"4px 0 0",paddingLeft:18}}>{result.missing.map(item=><li key={item}>{item}</li>)}</ul></div>}
      {result.next_action&&<p className="ad-banner ad-info">Suggested next action: {result.next_action}</p>}</div>
      :<p className="ad-muted ad-small">Gemini receives the request without the customer’s name, email or phone number. Classification is advisory and never changes the lead’s stage.</p>}
  </Card>
}
function Drafts({lead}:{lead:Lead}){
  const {toast}=useAdmin();
  const [type,setType]=useState("first_response"),[draft,setDraft]=useState<{subject:string;body:string}|null>(null);
  const action=useAction();
  async function run(){const value=await action.run(()=>request<{subject:string;body:string}>("admin/inquiries/"+lead.id+"/draft","POST",{type}));if(value)setDraft(value)}
  return <Card title="AI response assistant">
    <div className="ad-stack"><p className="ad-muted ad-small">Drafts are never sent automatically. Review and edit them, then send from your own email client. Placeholders in brackets must be completed by you.</p>
      <div className="ad-row"><select value={type} onChange={event=>setType(event.target.value)} aria-label="Draft type" style={{width:"auto"}}>{drafts.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className="ad-button" onClick={run} disabled={action.pending}><Sparkles size={15}/>{action.pending?"Drafting…":"Generate draft"}</button></div>
      {draft&&<><label className="ad-field">Subject<input value={draft.subject} onChange={event=>setDraft({...draft,subject:event.target.value})}/></label><label className="ad-field">Message<textarea rows={9} value={draft.body} onChange={event=>setDraft({...draft,body:event.target.value})}/></label>
        <div className="ad-row"><button className="ad-button" onClick={()=>void navigator.clipboard.writeText(draft.subject+"\n\n"+draft.body).then(()=>toast("Draft copied"))}><Copy size={15}/> Copy</button><a className="ad-button ad-primary" href={"mailto:"+lead.email+"?subject="+encodeURIComponent(draft.subject)+"&body="+encodeURIComponent(draft.body)}><Mail size={15}/> Open in email</a></div></>}</div>
  </Card>
}
function PipelineForm({lead,onSaved}:{lead:Lead;onSaved:(lead:Lead)=>void}){
  const {currency}=useAdmin();
  const [status,setStatus]=useState(lead.status);
  const action=useAction();
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const text=(name:string)=>String(data.get(name)||"");
    const value=text("contract_value");
    const result=await action.run(()=>request<Lead>("admin/inquiries/"+lead.id,"PATCH",{status:text("status"),priority:text("priority")||null,assigned_to:text("assigned_to")||null,
      follow_up_at:text("follow_up_at")||null,next_action:text("next_action"),contract_value:value===""?null:value,lost_reason:text("status")==="Contract Lost"?text("lost_reason")||null:null}),"Lead updated");
    if(result)onSaved(result);
  }
  return <Card title="Pipeline"><form key={lead.updated} className="ad-stack" onSubmit={save}>
    <label className="ad-field">Stage<select name="status" value={status} onChange={event=>setStatus(event.target.value)}>{statuses.map(value=><option key={value}>{value}</option>)}</select></label>
    {status==="Contract Won"&&lead.status!=="Contract Won"&&<p className="ad-banner ad-attention ad-small">Only mark a contract as won once it has been signed.</p>}
    {status==="Contract Lost"&&<label className="ad-field">Reason lost<select name="lost_reason" defaultValue={lead.lost_reason||""}><option value="">Select a reason</option>{lostReasons.map(value=><option key={value}>{value}</option>)}</select></label>}
    <label className="ad-field">Assigned to<AssigneeSelect value={lead.assigned_to}/></label>
    <label className="ad-field">Priority<select name="priority" defaultValue={lead.priority_override||""}><option value="">{lead.qualification?"Use AI suggestion ("+lead.qualification.label+")":"Not set"}</option>{priorities.map(value=><option key={value}>{value}</option>)}</select></label>
    <label className="ad-field">Follow-up date<input type="date" name="follow_up_at" defaultValue={lead.follow_up_at||""}/></label>
    <label className="ad-field">Next action<input name="next_action" maxLength={1000} defaultValue={lead.next_action} placeholder="e.g. Send site-visit availability"/></label>
    <label className="ad-field">Proposed contract value ({currency}) <small>Only when known</small><input name="contract_value" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={lead.contract_value??""}/></label>
    <button className="ad-button ad-primary" disabled={action.pending}>{action.pending?"Saving…":"Save"}</button></form></Card>
}
function Consultations({lead,onChange}:{lead:Lead;onChange:()=>void}){
  const {members,can}=useAdmin();
  const [open,setOpen]=useState(false);
  const action=useAction();
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const text=(name:string)=>String(data.get(name)||"");
    const done=await action.run(()=>request("admin/inquiries/"+lead.id+"/consultations","POST",{status:text("scheduled_at")?"Confirmed":"Pending",preferred_time:text("preferred_time"),
      scheduled_at:text("scheduled_at")?new Date(text("scheduled_at")).toISOString():null,assigned_to:text("assigned_to")||null,notes:text("notes")}),"Consultation recorded");
    if(done){setOpen(false);onChange()}
  }
  return <Card title="Consultations" actions={can("consultations")&&<button className="ad-button" onClick={()=>setOpen(!open)}>{open?"Cancel":"Add"}</button>}>
    {open&&<form className="ad-stack" onSubmit={create}><label className="ad-field">Customer’s preferred time<input name="preferred_time" maxLength={160}/></label><label className="ad-field">Agreed date and time <small>Leave empty until agreed with the customer</small><input type="datetime-local" name="scheduled_at"/></label><label className="ad-field">Assigned to<AssigneeSelect value={lead.assigned_to}/></label><label className="ad-field">Notes<textarea name="notes" rows={3}/></label><button className="ad-button ad-primary" disabled={action.pending}>Save consultation</button></form>}
    {lead.consultations.length?<div className="ad-list">{lead.consultations.map(item=><div key={item.id}><div className="ad-spread"><Badge>{item.status}</Badge><span className="ad-small ad-muted">{memberName(members,item.assigned_to)}</span></div><p className="ad-small">{item.scheduled_at?formatDateTime(item.scheduled_at):"Not scheduled"}{item.preferred_time&&" · prefers "+item.preferred_time}</p></div>)}<Link className="ad-link ad-small" href="/admin/consultations">Manage consultations</Link></div>:!open&&<p className="ad-muted ad-small">No consultation recorded.</p>}
  </Card>
}
export function LeadDetailPage({id}:{id:string}){
  const state=useApi<Lead>("admin/inquiries/"+id);
  const action=useAction();
  return <Loadable state={state} rows={10}>{lead=>{
    const update=(value:Lead)=>state.setData(value);
    const facts=[["Request",requestKinds[lead.kind]],["Project type",lead.project_type||lead.brief?.project_type],["Location",lead.location||lead.brief?.location],["Budget",lead.budget||lead.brief?.budget],["Timeline",lead.timeline||lead.brief?.timeline],["Service",lead.service_interest],["Received",formatDateTime(lead.created)]].filter(([,value])=>value);
    const origin=lead.attribution||{};
    async function note(event:FormEvent<HTMLFormElement>){
      event.preventDefault();
      const form=event.currentTarget;
      const value=await action.run(()=>request<Lead>("admin/inquiries/"+lead.id+"/notes","POST",{text:String(new FormData(form).get("text")||"")}),"Note added");
      if(value){update(value);form.reset()}
    }
    return <>
      <PageHeader back="/admin/leads" title={<span className="ad-row">{lead.name}<Badge>{lead.status}</Badge>{lead.priority&&<Badge>{lead.priority}</Badge>}</span>} description={<><a className="ad-link" href={"mailto:"+lead.email}>{lead.email}</a>{lead.phone&&<> · <a className="ad-link" href={"tel:"+lead.phone}>{lead.phone}</a></>}</>} actions={<Link className="ad-button" href="/admin/pipeline">Open pipeline</Link>}/>
      <div className="ad-main-side"><div className="ad-stack">
        <Card title="Request"><div className="ad-stack"><dl className="ad-kv">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{!!lead.requirements?.length&&<p><strong>Priorities:</strong> {lead.requirements.join(" · ")}</p>}<p style={{whiteSpace:"pre-wrap",color:"var(--text)"}}>{lead.description}</p></div></Card>
        {lead.brief&&<Card title="AI project brief"><BriefView brief={lead.brief} services={lead.brief.services.map(slug=>({slug,title:slug.replace(/-/g," ")}))}/></Card>}
        {lead.conversation.length>0&&<Card title={"Assistant conversation ("+lead.conversation.length+" messages)"}><div className="ad-chat">{lead.conversation.map((item,index)=><p key={index} className={item.role==="user"?"is-user":""}><strong>{item.role==="user"?"Visitor":"Assistant"}:</strong> {item.text}</p>)}</div></Card>}
        <Qualify lead={lead} onChange={update}/>
        <Drafts lead={lead}/>
        <Card title="Internal notes"><form className="ad-stack" onSubmit={note}><textarea name="text" required maxLength={4000} rows={3} aria-label="New note" placeholder="Add a note for the team"/><div><button className="ad-button" disabled={action.pending}>Add note</button></div></form>
          <div className="ad-list" style={{marginTop:8}}>{lead.notes.map(item=><div key={item.id}><p className="ad-small">{item.author} · {formatDateTime(item.created)}</p><p style={{whiteSpace:"pre-wrap",color:"var(--text)"}}>{item.text}</p></div>)}</div></Card>
      </div><div className="ad-stack">
        <PipelineForm lead={lead} onSaved={update}/>
        <Consultations lead={lead} onChange={state.reload}/>
        <Card title="Source"><dl className="ad-kv">{[["Channel",origin.utm_source||origin.referrer||"Direct"],["Medium",origin.utm_medium],["Campaign",origin.utm_campaign],["Landing page",origin.landing],["Submitted from",origin.page],["Portfolio project",origin.project],["Service page",origin.service]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Card>
        <Card title="Activity"><ul className="ad-timeline">{lead.activity.map((item,index)=><li key={index}>{item.author==="website"?"Submitted from the website":<><strong>{item.author.split("@")[0]}</strong> {activityText(item)}</>}<div className="ad-muted ad-small">{formatDateTime(item.created)}</div></li>)}</ul></Card>
      </div></div>
    </>}}</Loadable>
}
export function ConsultationsPage(){
  const {members}=useAdmin();
  const [status,setStatus]=useState(""),[q,setQ]=useState(""),[mine,setMine]=useState(false),[editing,setEditing]=useState<number|null>(null),[ready,setReady]=useState(false);
  useEffect(()=>{setStatus(new URLSearchParams(location.search).get("status")||"");setReady(true)},[]);
  const state=useApi<{items:import("./fields").Consultation[]}>(ready?"admin/consultations?"+new URLSearchParams({status,q,assigned:mine?"me":""}):null);
  const action=useAction();
  async function save(event:FormEvent<HTMLFormElement>,id:number){
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const text=(name:string)=>String(data.get(name)||"");
    const done=await action.run(()=>request("admin/consultations/"+id,"PATCH",{status:text("status"),preferred_time:text("preferred_time"),scheduled_at:text("scheduled_at")?new Date(text("scheduled_at")).toISOString():null,assigned_to:text("assigned_to")||null,notes:text("notes")}),"Consultation updated");
    if(done){setEditing(null);state.reload()}
  }
  return <>
    <PageHeader title="Consultations" description="Requests from the website and consultations your team has arranged. Times are recorded manually; no calendar booking is made automatically."/>
    <Card className="ad-flush"><div className="ad-filters"><input type="search" placeholder="Search customer or notes" value={q} onChange={event=>setQ(event.target.value)} aria-label="Search consultations"/>
      <select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Status"><option value="">All statuses</option>{consultationStatuses.map(value=><option key={value}>{value}</option>)}</select>
      <label className="ad-check"><input type="checkbox" checked={mine} onChange={event=>setMine(event.target.checked)}/> Assigned to me</label></div>
      <Loadable state={state} rows={6}>{data=>data.items.length?<div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>Customer</th><th>Requirements</th><th>Preferred time</th><th>Agreed time</th><th>Assigned</th><th>Status</th><th></th></tr></thead><tbody>
        {data.items.map(item=>editing===item.id?<tr key={item.id}><td colSpan={7}><form className="ad-form-grid" onSubmit={event=>void save(event,item.id)}>
          <label className="ad-field">Status<select name="status" defaultValue={item.status}>{consultationStatuses.map(value=><option key={value}>{value}</option>)}</select></label>
          <label className="ad-field">Assigned to<AssigneeSelect value={item.assigned_to}/></label>
          <label className="ad-field">Customer’s preferred time<input name="preferred_time" defaultValue={item.preferred_time} maxLength={160}/></label>
          <label className="ad-field">Agreed date and time<input type="datetime-local" name="scheduled_at" defaultValue={toLocalInput(item.scheduled_at)}/></label>
          <label className="ad-field ad-full">Notes<textarea name="notes" rows={3} defaultValue={item.notes}/></label>
          <div className="ad-row ad-full"><button className="ad-button ad-primary" disabled={action.pending}>Save</button><button type="button" className="ad-button" onClick={()=>setEditing(null)}>Cancel</button></div></form></td></tr>
        :<tr key={item.id}><td><Link className="ad-cell-main" href={"/admin/leads/"+item.inquiry_id}>{item.lead?.name}</Link><div className="ad-muted ad-small">{item.lead?.email}{item.lead?.phone?" · "+item.lead.phone:""}</div></td>
          <td style={{maxWidth:280}}><div className="ad-small">{[item.lead?.project_type,item.lead?.location,item.lead?.budget].filter(Boolean).join(" · ")||item.lead?.brief_title}</div><div className="ad-muted ad-small" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.lead?.description}</div></td>
          <td>{item.preferred_time||"—"}</td><td>{item.scheduled_at?formatDateTime(item.scheduled_at):<span className="ad-muted">Not scheduled</span>}</td><td>{memberName(members,item.assigned_to)}</td><td><Badge>{item.status}</Badge></td>
          <td><button className="ad-button" onClick={()=>setEditing(item.id)}>Edit</button></td></tr>)}</tbody></table></div>
        :<Empty title="No consultations" text="Consultation requests from the website and those you add from a lead appear here."/>}</Loadable>
    </Card>
  </>
}
