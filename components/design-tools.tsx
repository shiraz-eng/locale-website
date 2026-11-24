"use client";
import {useState,type FormEvent} from "react";
import {budgets,categories,request,type Project} from "../lib/content";
import {ProjectCard} from "./site";
type Section={heading:string;text:string};
type Guidance={sections:Section[]};
type Match={project:Project;reason:string};
type Message={role:"user"|"assistant";text:string;sections?:Section[]};
const modes=[["chat","Architecture consultant"],["floor-plan","Floor plan assistant"],["recommend","Project recommendations"]] as const;
type Mode=typeof modes[number][0];
export function GuidanceView({sections}:{sections:Section[]}){
  return <div className="stack">{sections.map((section,index)=><div key={index}><h3>{section.heading}</h3><p>{section.text}</p></div>)}</div>
}
export default function DesignTools(){
  const [mode,setMode]=useState<Mode>("chat"),[messages,setMessages]=useState<Message[]>([]);
  const [floor,setFloor]=useState<Section[]>([]),[matches,setMatches]=useState<Match[]|null>(null);
  const [pending,setPending]=useState(false),[error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const fields=new FormData(form);
    setPending(true);setError("");
    try{
      if(mode==="chat"){
        const text=String(fields.get("prompt")||"").trim();
        if(!text)throw new Error("Enter a question about your project.");
        const next:Message[]=[...messages,{role:"user",text}];
        const history=next.slice(-15).map(message=>({role:message.role,text:message.text.slice(0,4000)}));
        const result=await request<Guidance>("ai/chat","POST",{messages:history});
        setMessages([...next,{role:"assistant",text:result.sections.map(section=>section.heading+"\n"+section.text).join("\n\n"),sections:result.sections}]);
        form.reset();
      }else if(mode==="floor-plan"){
        const file=fields.get("file");
        if(!(file instanceof File)||file.size===0)throw new Error("Choose a floor-plan file.");
        if(file.size>8*1024*1024)throw new Error("Floor plans must be under 8 MB.");
        setFloor([]);
        setFloor((await request<Guidance>("ai/floor-plan","POST",fields)).sections);
      }else{
        setMatches(null);
        setMatches(await request<Match[]>("ai/recommend","POST",Object.fromEntries(fields)));
      }
    }catch(error){setError((error as Error).message)}
    finally{setPending(false)}
  }
  return <><div className="tabs" aria-label="Design tools">{modes.map(([id,label])=><button key={id} disabled={pending} aria-pressed={mode===id} onClick={()=>{setMode(id);setError("")}}>{label}</button>)}</div><p className="notice">AI outputs are conceptual. A qualified professional must review structural safety, code compliance, and construction decisions. Gemini receives what you submit, so remove personal and confidential information first.</p><form key={mode} className="form-panel" onSubmit={submit}>
  {mode==="chat"?<><h2>Architecture consultant</h2><div aria-live="polite">{messages.map((message,index)=><div key={index} className={"chat-message "+message.role}><p className="eyebrow">{message.role==="user"?"You":"Design assistant"}</p>{message.sections?<GuidanceView sections={message.sections}/>:<p>{message.text}</p>}</div>)}</div><label className="field">Your design question<textarea name="prompt" placeholder="I want to design a three-bedroom home with natural light and an open kitchen…" maxLength={4000} required/></label></>:mode==="floor-plan"?<><h2>Floor plan assistant</h2><label className="field">Upload a floor plan (PNG, JPEG, or PDF, up to 8 MB)<input name="file" type="file" accept=".png,.jpg,.jpeg,.pdf" required/></label></>:<><h2>Project recommendations</h2><div className="field-grid"><label className="field">Building type<select name="building_type">{categories.map(value=><option key={value}>{value}</option>)}</select></label><label className="field">Architectural style<input name="style" required maxLength={160}/></label><label className="field">Space requirements<input name="space" required maxLength={160}/></label><label className="field">Budget range<select name="budget"><option value="">Select a budget</option>{budgets.map(value=><option key={value}>{value}</option>)}</select></label><label className="field full">Design preferences<textarea name="preferences" maxLength={2000}/></label></div></>}
  <div className="actions"><button className="button dark" disabled={pending}>{pending?"Working…":mode==="chat"?"Send question":mode==="floor-plan"?"Analyze floor plan":"Find projects"}</button>{mode==="chat"&&messages.length>0&&<button type="button" className="button outline" disabled={pending} onClick={()=>{setMessages([]);setError("")}}>Clear conversation</button>}</div>
  {error&&<p className="notice error" role="alert">{error}</p>}</form>
  {mode==="floor-plan"&&floor.length>0&&<div className="panel" aria-live="polite"><GuidanceView sections={floor}/></div>}
  {mode==="recommend"&&matches!==null&&<section className="section-tight" aria-live="polite"><div className="grid three">{matches.map(match=><div key={match.project.slug}><ProjectCard project={match.project}/><p>{match.reason}</p></div>)}</div>{!matches.length&&<p className="notice">No matching portfolio projects were found.</p>}</section>}</>
}
