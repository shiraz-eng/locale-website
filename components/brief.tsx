"use client";
import {useState,type ReactNode} from "react";
import Link from "next/link";
import {FileCheck2} from "lucide-react";
import type {Brief} from "../lib/content";
import {LeadCapture,type RequestKind} from "./contact-form";
type Message={role:"user"|"assistant";text:string};
export type ServiceSummary={slug:string;title:string};
function List({title,items}:{title:string;items:string[]}){
  return items.length?<div><h4>{title}</h4><ul>{items.map((entry,index)=><li key={index}>{entry}</li>)}</ul></div>:null
}
export function BriefView({brief,services}:{brief:Brief;services:ServiceSummary[]}){
  const facts=[["Project type",brief.project_type],["Location",brief.location],["Size",brief.size],["Budget",brief.budget],["Timeline",brief.timeline],["Style",brief.styles.join(", ")]].filter(([,value])=>value);
  return <article className="brief stack"><p className="brief-label"><FileCheck2 size={15}/> Conceptual planning guidance. Not professional or certified advice: costs, programme and approvals must be confirmed with the studio and the relevant authorities.</p>
    {brief.title&&<h3>{brief.title}</h3>}{(brief.concept_summary||brief.overview)&&<p>{brief.concept_summary||brief.overview}</p>}
    {facts.length>0&&<dl className="brief-facts">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    <div className="brief-grid"><List title="Design recommendations" items={brief.design_recommendations||[]}/><List title="Layout & functional zones" items={brief.functional_zones||[]}/><List title="Suggested spaces" items={brief.suggested_spaces||[]}/><List title="Materials & finishes" items={brief.materials||[]}/><List title="Color palette" items={brief.color_palette||[]}/><List title="Lighting & ventilation" items={brief.lighting_ventilation||[]}/><List title="Sustainability" items={brief.sustainability||[]}/><List title="Budget considerations" items={brief.budget_considerations||[]}/><List title="Indicative phases & dependencies" items={brief.timeline_considerations||[]}/><List title="Design preferences" items={brief.design_preferences}/><List title="Space requirements" items={brief.space_requirements}/><List title="Initial architectural considerations" items={brief.considerations}/><List title="Questions for your consultation" items={brief.questions}/></div>
    {brief.next_action&&<div><h4>Recommended next step</h4><p>{brief.next_action}</p></div>}{!!brief.sources?.length&&<div><h4>Published references</h4><ul>{brief.sources.map(source=><li key={source.url}><Link href={source.url}>{source.title}</Link></li>)}</ul></div>}
    {services.length>0&&<div><h4>Relevant studio services</h4><div className="actions">{services.map(service=><Link key={service.slug} className="chip" href={"/services/"+service.slug}>{service.title}</Link>)}</div></div>}
  </article>
}
export function BriefActions({brief,conversation,options,extra}:{brief:Brief;conversation?:Message[];options:[RequestKind,string][];extra?:ReactNode}){
  const [kind,setKind]=useState<RequestKind|null>(null);
  function download(){
    const sections=Object.entries(brief).filter(([,value])=>Array.isArray(value)?value.length:!!value).map(([key,value])=>{
      const label=key.replaceAll("_"," ");
      const text=Array.isArray(value)?value.map(item=>typeof item==="string"?"- "+item:"- "+item.title+": "+item.url).join("\n"):String(value);
      return label.toUpperCase()+"\n"+text;
    });
    const url=URL.createObjectURL(new Blob(["CONCEPTUAL PROJECT BRIEF\nNot certified architectural or engineering advice. Confirm scope, costs, schedule and approvals with qualified professionals.\n\n"+sections.join("\n\n")],{type:"text/plain;charset=utf-8"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download="conceptual-project-brief.txt";anchor.click();URL.revokeObjectURL(url);
  }
  if(kind)return <LeadCapture kind={kind} brief={brief} conversation={conversation} onCancel={()=>setKind(null)}/>;
  return <div className="actions">{options.map(([value,label],index)=><button key={value} type="button" className={"button "+(index===0?"dark":"outline")} onClick={()=>setKind(value)}>{label}</button>)}<button type="button" className="button outline" onClick={download}>Download brief</button>{extra}</div>
}
