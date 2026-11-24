"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {AnimatePresence,motion,useReducedMotion} from "motion/react";
import {Send,Sparkles,X,Minus,Bot,House,Armchair,Landmark,Calculator,ArrowRight,Paperclip} from "lucide-react";
import {request,type Brief,type Project} from "../lib/content";
import {rememberVisit,track} from "../lib/track";
import {BriefActions,BriefView,type ServiceSummary} from "./brief";
type Message={role:"user"|"assistant";text:string;services?:ServiceSummary[];projects?:Project[]};
type Reply={reply:string;services:ServiceSummary[];projects:Project[];brief:Brief|null;brief_services?:ServiceSummary[]};
const starters=["I have a 240-square-yard plot in Karachi and want a modern double-story house.","I’d like to renovate and redesign my apartment interior.","We need a new office for a growing team."];
const key="aa-assistant";
export default function Assistant({introduction,examples,brand="Locale"}:{introduction?:string;examples?:string[];brand?:string}={}){
  const path=usePathname(),reduced=useReducedMotion();
  const [open,setOpen]=useState(false),[messages,setMessages]=useState<Message[]>([]),[brief,setBrief]=useState<{brief:Brief;services:ServiceSummary[]}|null>(null);
  const [text,setText]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
  const log=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{rememberVisit();try{const saved=JSON.parse(sessionStorage.getItem(key)||"null");if(saved){setMessages(saved.messages||[]);setBrief(saved.brief||null)}}catch{}},[]);
  useEffect(()=>{try{sessionStorage.setItem(key,JSON.stringify({messages,brief}))}catch{}},[messages,brief]);
  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:reduced?"auto":"smooth"})},[messages,brief,pending,reduced]);
  useEffect(()=>{if(!open)return;input.current?.focus();const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};addEventListener("keydown",close);return()=>removeEventListener("keydown",close)},[open]);
  if(path==="/plan-your-project")return null;
  async function send(event?:FormEvent,value=text){
    event?.preventDefault();
    const content=value.trim();
    if(!content||pending)return;
    const next:Message[]=[...messages,{role:"user",text:content.slice(0,4000)}];
    setMessages(next);setText("");setPending(true);setError("");
    let history=next.slice(-20);
    while(history[0]?.role==="assistant")history=history.slice(1);
    try{
      const result=await request<Reply>("ai/assistant","POST",{messages:history.map(({role,text})=>({role,text}))});
      setMessages([...next,{role:"assistant",text:result.reply,services:result.services,projects:result.projects}]);
      if(result.brief)setBrief({brief:result.brief,services:result.brief_services??[]});
    }catch(error){setError((error as Error).message);setMessages(messages);setText(content)}
    finally{setPending(false)}
  }
  function reset(){setMessages([]);setBrief(null);setError("")}
  const panel=reduced?{}:{initial:{opacity:0,y:16,scale:.98},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:12,scale:.98},transition:{duration:.22,ease:"easeOut" as const}};
  const shortcuts=[{label:"Plan my home",Icon:House,prompt:examples?.[0]||starters[0]},{label:"Interior ideas",Icon:Armchair,prompt:examples?.[1]||starters[1]},{label:"Mosque design",Icon:Landmark,prompt:"Help me plan a mosque with thoughtful prayer spaces, accessibility, and natural ventilation."},{label:"Project budget",Icon:Calculator,prompt:"Help me understand the factors that shape a project budget and what information I should prepare."}];
  return <>
    {!open&&<button type="button" className="assistant-launcher" onClick={()=>{setOpen(true);track("assistant_open")}} aria-haspopup="dialog" aria-label="Open AI design assistant"><Bot size={30}/><Sparkles className="assistant-launcher-spark" size={15}/></button>}
    <AnimatePresence>{open&&<motion.section className="assistant-panel" role="dialog" aria-label="AI project assistant" {...panel}>
      <header><span className="assistant-brand-mark" aria-hidden="true">A</span><div className="assistant-brand-copy"><h2>{brand} AI</h2><p>Architecture &amp; Interior Assistant</p></div><div className="assistant-window-actions"><button type="button" onClick={()=>setOpen(false)} aria-label="Minimize assistant"><Minus size={21}/></button><button type="button" onClick={()=>setOpen(false)} aria-label="Close assistant"><X size={23}/></button></div></header>
      <div className="assistant-log" ref={log} aria-live="polite">
        {!messages.length?<><div className="assistant-welcome"><span className="assistant-robot" aria-hidden="true"><Bot size={48}/><span/></span><div><h3>Hi! How can I help you today?</h3><p>Get design ideas, plan your space, or start a project with our team.</p></div></div><div className="assistant-shortcuts">{shortcuts.map(({label,Icon,prompt})=><button type="button" key={label} onClick={()=>void send(undefined,prompt)} disabled={pending}><span className="assistant-shortcut-icon"><Icon size={30}/></span><strong>{label}</strong><ArrowRight size={20}/></button>)}</div></>:<div className="assistant-introduction">{introduction||"Explore concepts with our design assistant. Costs, schedules and approvals are confirmed with the studio."}</div>}
        {messages.map((message,index)=><div key={index} className={"chat-message "+message.role}><p>{message.text}</p>
          {!!message.projects?.length&&<div className="assistant-projects">{message.projects.map(project=><Link key={project.slug} href={"/projects/"+project.slug} className="assistant-project"><img src={project.image} alt="" loading="lazy"/><span><strong>{project.title}</strong><small>{project.category} · {project.location}</small></span></Link>)}</div>}
          {!!message.services?.length&&<div className="actions">{message.services.map(service=><Link key={service.slug} className="chip" href={"/services/"+service.slug}>{service.title}</Link>)}</div>}
        </div>)}
        {pending&&<div className="chat-message assistant" role="status"><p className="typing">Thinking<span>.</span><span>.</span><span>.</span></p></div>}
        {brief&&<div className="assistant-brief stack"><p className="eyebrow">Your Project Brief Is Ready</p><BriefView brief={brief.brief} services={brief.services}/><BriefActions brief={brief.brief} conversation={messages.map(({role,text})=>({role,text}))} options={[["consultation","Book Consultation"],["quotation","Request Quotation"],["brief","Send Requirements to Architect"]]}/></div>}
      </div>
      {error&&<p className="notice error" role="alert">{error}</p>}
      <form className="assistant-input" onSubmit={send}><Link className="assistant-attachment" href="/ai-design" aria-label="Open floor plan and image tools" title="Open floor plan and image tools"><Paperclip size={23}/></Link><label className="sr-only" htmlFor="assistant-text">Message</label><textarea id="assistant-text" ref={input} rows={1} value={text} maxLength={4000} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void send()}}} placeholder="Ask anything…"/><button className="button dark" disabled={pending||!text.trim()} aria-label="Send message"><Send size={23}/></button></form>
      <footer><span>Powered by Google Gemini. Messages are sent to Google to generate replies.</span>{messages.length>0&&<button type="button" className="text-button" onClick={reset}>Start over</button>}</footer>
    </motion.section>}</AnimatePresence>
  </>
}
