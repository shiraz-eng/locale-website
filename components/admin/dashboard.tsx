"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowUpRight,FileText,Image,Layers,Plus,Sparkles,Users} from "lucide-react";
import {request} from "../../lib/content";
import type {Activity,Consultation,Inquiry} from "./fields";
import {requestKinds} from "./fields";
import {Badge,Card,DateRange,Empty,Loadable,PageHeader,formatDate,formatDateTime,presets,useAdmin,useApi,type Range} from "./ui";
type ServiceSummary={id:number;name:string;slug:string;status:string;updated:string;card_image:string|null;unpublished_changes:boolean};
type Section={heading:string;text:string};
type Dashboard={range:Range;content:{projects:number;drafts:number;services:number;articles:number};
  metrics?:{total:number;new:number;consultations:number;proposals:number;won:number;conversion:number};trend?:{key:string;count:number}[];
  sources?:Record<string,number>;recent?:Inquiry[];activity?:Activity[];upcoming?:Consultation[]};
export function Trend({data,label}:{data:{key:string;count:number}[];label:string}){
  const max=Math.max(1,...data.map(item=>item.count));
  const total=data.reduce((sum,item)=>sum+item.count,0);
  if(!total)return <Empty title={"No "+label+" in this period"} text="Data will appear here as soon as it is recorded."/>;
  return <><div className="ad-chart" role="img" aria-label={label+" over time, "+total+" in total"}>{data.map(item=><div key={item.key} title={item.key+": "+item.count}><span style={{height:(item.count/max*100)+"%"}}/></div>)}</div><div className="ad-axis"><span>{data[0]?.key}</span><span>{data.at(-1)?.key}</span></div></>
}
export function Bars({data,empty="No data in this period."}:{data:Record<string,number>;empty?:string}){
  const entries=Object.entries(data).sort(([,a],[,b])=>b-a);
  const max=Math.max(1,...entries.map(([,value])=>value));
  return entries.length?<div className="ad-bars">{entries.map(([label,value])=><div className="ad-bar" key={label}><span title={label}>{label}</span><i style={{width:(value/max*100)+"%"}} aria-hidden="true"/><span>{value}</span></div>)}</div>:<p className="ad-muted ad-small">{empty}</p>
}
export const activityText=(item:Activity)=>{
  const value=item.detail.value??"";
  return {status:"moved to "+item.detail.status,note:"added a note",assigned_to:value?"assigned to "+value:"unassigned",priority:value?"set priority to "+value:"cleared the priority override",
    follow_up_at:value?"set follow-up for "+value:"cleared the follow-up",next_action:"updated the next action",contract_value:value?"recorded a contract value of "+value:"cleared the contract value",
    ai_analysis:"ran AI analysis ("+item.detail.label+")",consultation:"updated a consultation"+(item.detail.status?" to "+item.detail.status:"")}[item.kind]??item.kind;
};
export function InsightsPanel(){
  const {toast}=useAdmin();
  const [sections,setSections]=useState<Section[]>([]),[pending,setPending]=useState(false);
  async function generate(){setPending(true);try{setSections((await request<{sections:Section[]}>("admin/insights","POST",{})).sections)}catch(error){toast((error as Error).message,"error")}finally{setPending(false)}}
  return <Card title="AI business insights" actions={<button className="ad-button" onClick={generate} disabled={pending}><Sparkles size={15}/>{pending?"Analyzing…":sections.length?"Refresh":"Generate"}</button>}>
    {sections.length?<div className="ad-stack" aria-live="polite">{sections.map((section,index)=><div key={index}><h3>{section.heading}</h3><p>{section.text}</p></div>)}</div>:<p className="ad-muted ad-small">Gemini summarizes aggregate counts only (services, styles, locations, volume, stages, sources). No names, contact details or messages are sent.</p>}
  </Card>
}
export default function DashboardPage(){
  const {staff,can}=useAdmin();
  const [range,setRange]=useState<Range&{preset:string}>({...presets[2][2](),preset:"30"});
  const state=useApi<Dashboard>("admin/cms-overview");
  const services=useApi<{items:ServiceSummary[]}>(can("content")?"admin/services":null);
  return <>
    <div className="ad-welcome"><PageHeader title={"Welcome back"+(staff.name?", "+staff.name.split(" ")[0]:"")} description="Manage your website content and see how the studio is doing."/></div>
    <Loadable state={state} rows={8}>{data=><>
      <div className="ad-cms-summary" aria-label="Website content">
        {[{label:"Published projects",value:data.content.projects,href:"/admin/projects",Icon:Layers},
          {label:"Project drafts",value:data.content.drafts,href:"/admin/projects",Icon:FileText},
          {label:"Services",value:data.content.services,href:"/admin/services",Icon:Layers},
          {label:"Published articles",value:data.content.articles,href:"/admin/blog",Icon:FileText}].map(({label,value,href,Icon})=>{
          const body=<><span className="ad-summary-icon"><Icon size={23} aria-hidden="true"/></span><div><p>{label}</p><strong>{value}</strong></div></>;
          return can("content")?<Link key={label} className="ad-summary-card ad-summary-link" href={href}>{body}</Link>:<div key={label} className="ad-summary-card">{body}</div>;
        })}
      </div>
    {(can("content")||can("pages"))&&<div className="ad-cms-overview">
      <div className="ad-stack"><Card title="Quick actions"><div className="ad-quick-actions">
        {can("pages")&&<Link href="/admin/pages"><FileText size={24}/>Edit pages</Link>}
        {can("content")&&<><Link href="/admin/services/new"><Plus size={24}/>Add service</Link>
          <Link href="/admin/projects/new"><Layers size={24}/>Add project</Link>
          <Link href="/admin/blog"><FileText size={24}/>Blog posts</Link>
          <Link href="/admin/media"><Image size={24}/>Media library</Link>
          <Link href="/admin/team"><Users size={24}/>Team members</Link></>}
      </div></Card>
      {can("content")&&<Card title="Recent service pages" className="ad-flush" actions={<Link className="ad-link" href="/admin/services">View all</Link>}>
        <Loadable state={services} rows={4}>{({items})=>items.length?<div className="ad-tablewrap">
          <table className="ad-table"><thead><tr><th>Service</th><th>Status</th><th>Updated</th></tr></thead><tbody>
            {[...items].sort((a,b)=>b.updated.localeCompare(a.updated)).slice(0,5).map(service=><tr key={service.id}>
              <td><div className="ad-row">{service.card_image&&<img className="ad-thumb" src={service.card_image} alt="" loading="lazy"/>}
                <div><Link className="ad-cell-main" href={`/admin/services/${service.id}/edit`}>{service.name}</Link><div className="ad-small ad-muted">/services/{service.slug}</div></div></div></td>
              <td><Badge tone={service.unpublished_changes?"attention":service.status==="published"?"success":"neutral"}>{service.unpublished_changes?"Unpublished changes":service.status==="published"?"Published":"Draft"}</Badge></td>
              <td>{formatDate(service.updated)}</td>
            </tr>)}
          </tbody></table>
        </div>:<Empty title="No service pages yet"/>}</Loadable>
      </Card>}</div>
      <div className="ad-stack"><Card title="Website preview"><Link href="/" className="ad-site-preview" target="_blank" rel="noreferrer"><span>Architecture for everyday life.</span><span>View website <ArrowUpRight size={16}/></span></Link></Card></div>
    </div>}
    </>}</Loadable>
  </>
}
