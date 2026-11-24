"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {categories,request,type Brief} from "../lib/content";
import {attribution} from "../lib/track";
export type RequestKind="inquiry"|"consultation"|"quotation"|"brief";
type Message={role:"user"|"assistant";text:string};
function Consent(){
  return <label className="full consent"><input type="checkbox" name="consent" required/> <span>I agree that the studio may store these details to respond to my request, as described in the <Link className="inline-link" href="/privacy">privacy policy</Link>.</span></label>
}
function Contact(){
  return <><label className="field">Name<input name="name" required maxLength={160} autoComplete="name"/></label><label className="field">Email<input name="email" type="email" required maxLength={254} autoComplete="email"/></label><label className="field full">Phone (optional)<input name="phone" type="tel" maxLength={50} autoComplete="tel"/></label></>
}
const sent:Record<RequestKind,string>={inquiry:"Your inquiry has been received.",consultation:"Your consultation request has been received.",quotation:"Your quotation request has been received.",brief:"Your project brief has been sent to the studio."};
function Done({kind}:{kind:RequestKind}){
  return <div className="notice success stack" role="status"><p>{sent[kind]} The studio will reply by email.</p><p><Link className="text-link" href="/projects">Explore more projects while you wait</Link></p></div>
}
export {default} from "./dynamic-contact-form";
const projectTypes:Record<string,(typeof categories)[number]>={residential:"Residential",commercial:"Commercial",interior:"Interior Design",renovation:"Renovation",urban:"Urban Planning"};
export function categoryFor(text:string){
  const lower=text.toLowerCase();
  return Object.entries(projectTypes).find(([word])=>lower.includes(word))?.[1]??null;
}
export function LeadCapture({kind,brief,conversation=[],onCancel}:{kind:RequestKind;brief:Brief;conversation?:Message[];onCancel?:()=>void}){
  const [submissionId,setSubmissionId]=useState<string|null>(null);
  const [pending,setPending]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const id=submissionId??crypto.randomUUID();
    setSubmissionId(id);
    const data=new FormData(event.currentTarget);
    const text=(name:string)=>String(data.get(name)||"").trim();
    const description=(brief.overview||brief.title||"Project brief prepared with the AI planner.").slice(0,4000).padEnd(10,".");
    setPending(true);setError("");
    try{
      await request("inquiries","POST",{submission_id:id,website:text("website"),name:text("name"),email:text("email"),phone:text("phone"),kind,description,brief,
        conversation:conversation.slice(-40).map(message=>({role:message.role,text:message.text.slice(0,4000)})),
        project_type:categoryFor(brief.project_type),budget:brief.budget.slice(0,100),timeline:brief.timeline.slice(0,100),
        location:brief.location.slice(0,160),consultation:kind==="consultation",consent:data.has("consent"),attribution:attribution()});
      setDone(true);
    }catch(error){setError((error as Error).message)}
    finally{setPending(false)}
  }
  if(done)return <Done kind={kind}/>;
  return <form className="lead-capture stack" onSubmit={submit}><div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><p className="subtle">Your brief{conversation.length?" and this conversation":""} will be shared with the studio’s architects. We only need a way to reach you.</p><div className="field-grid"><Contact/><Consent/></div>
    <div className="actions"><button className="button dark" disabled={pending}>{pending?"Sending…":kind==="consultation"?"Request consultation":kind==="quotation"?"Request quotation":"Send to an architect"}</button>{onCancel&&<button type="button" className="button outline" onClick={onCancel} disabled={pending}>Back</button>}</div>
    {error&&<p className="notice error" role="alert">{error}</p>}</form>
}
