"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {motion,useReducedMotion} from "motion/react";
import {ArrowLeft,ArrowRight,Box,Building2,Hammer,Home,Sofa,Sparkles,Leaf,Plus,Check,Send,Layers,ShieldCheck,Users,Zap,CalendarDays,Trash2} from "lucide-react";
import {budgets,request,timelines,type Brief,type Project} from "../lib/content";
import {rememberVisit} from "../lib/track";
import {BriefActions,BriefView,type ServiceSummary} from "./brief";
import ArchitectureImage from "./home/architecture-image";
import {ProjectCard} from "./site";
const types=[
  {value:"Residential Architecture",label:"Residential",icon:Home,text:"Homes, villas, apartments",image:"/portfolio/residential.webp"},
  {value:"Commercial Architecture",label:"Commercial",icon:Building2,text:"Offices, retail, workspaces",image:"/portfolio/office.webp"},
  {value:"Interior Design",label:"Interior Design",icon:Sofa,text:"Thoughtfully designed interiors",image:"/portfolio/interior.webp"},
  {value:"Renovation",label:"Renovation",icon:Hammer,text:"Remodel or upgrade",image:"/portfolio/services/renovation.jpg"},
  {value:"Landscape",label:"Landscape",icon:Leaf,text:"Outdoor & garden spaces",image:"/portfolio/villa-garden.webp"},
  {value:"Mosque / Masjid Architecture",label:"Mosque / Masjid",icon:Building2,text:"Prayer spaces & community facilities",image:"/portfolio/sketch.webp"},
  {value:"Urban Planning",label:"Urban Planning",icon:Building2,text:"Neighbourhoods & public spaces",image:"/portfolio/office.webp"},
  {value:"Custom",label:"Custom",icon:Plus,text:"Other / unique project",image:""},
];
const stepDescriptions=["Choose your space","Size, rooms, location","Look & feel","Cost & duration","Review & generate"];
const defaultStyles=[
  {value:"Modern",colors:["#f2f2f0","#2b2b2b","#9aa3a8"],text:"Clean lines, large glazing, open plans"},
  {value:"Minimalist",colors:["#ffffff","#e8e4dc","#c9c2b5"],text:"Calm, uncluttered, essential materials"},
  {value:"Contemporary",colors:["#ede7dd","#80633e","#3d3a35"],text:"Current forms with warmth and texture"},
  {value:"Luxury",colors:["#1f1d1a","#b69a70","#efe6d6"],text:"Rich materials and refined detailing"},
  {value:"Traditional",colors:["#e9dfcf","#8b5e3c","#5b4636"],text:"Familiar proportions and crafted details"},
  {value:"Sustainable",colors:["#e4ead9","#6f8a5b","#a98b62"],text:"Passive design, natural and low-carbon materials"}
];
const steps=["Project Type","Property Details","Design Style","Budget & Timeline","Your Brief"];
type Plan={project_type:string;location:string;size:string;floors:string;rooms:string;requirements:string;styles:string[];budget:string;start:string;timeline:string};
type Result={brief:Brief;services:ServiceSummary[];projects:Project[]};
const empty:Plan={project_type:"",location:"",size:"",floors:"",rooms:"",requirements:"",styles:[],budget:"",start:"",timeline:""};
const key="aa-plan";
export default function Planner({stylePresets}:{stylePresets?:string[]}={}){
  const styles=stylePresets?.length?stylePresets.map(value=>defaultStyles.find(style=>style.value===value)||{value,colors:["#ede7dd","#80633e","#3d3a35"],text:"Explore this style with your architect"}):defaultStyles;
  const [step,setStep]=useState(0),[plan,setPlan]=useState<Plan>(empty),[result,setResult]=useState<Result|null>(null);
  const [pending,setPending]=useState(false),[error,setError]=useState("");
  const [idea,setIdea]=useState(""),[ideaNotice,setIdeaNotice]=useState("");
  const [recent,setRecent]=useState<{id:string;title:string;date:string;plan:Plan}[]>([]),[restored,setRestored]=useState(false);
  const reduced=useReducedMotion();
  // Answers stay in this tab only, so a reload does not lose progress.
  useEffect(()=>{rememberVisit();try{const saved=sessionStorage.getItem(key);if(saved)setPlan({...empty,...JSON.parse(saved)});const history=sessionStorage.getItem(key+"-recent");if(history)setRecent(JSON.parse(history).slice(0,5))}catch{}finally{setRestored(true)}},[]);
  useEffect(()=>{if(restored)try{sessionStorage.setItem(key,JSON.stringify(plan))}catch{}},[plan,restored]);
  const set=(field:keyof Plan)=>(event:{target:{value:string}})=>setPlan(current=>({...current,[field]:event.target.value}));
  const toggle=(style:string)=>setPlan(current=>({...current,styles:current.styles.includes(style)?current.styles.filter(value=>value!==style):[...current.styles,style].slice(0,6)}));
  async function generate(event?:FormEvent){
    event?.preventDefault();
    setPending(true);setError("");setStep(4);
    try{setResult(await request<Result>("ai/brief","POST",plan));
      const entry={id:crypto.randomUUID(),title:(plan.project_type||"Project")+" brief",date:new Date().toISOString(),plan:{...plan}};
      setRecent(current=>{const next=[entry,...current].slice(0,5);try{sessionStorage.setItem(key+"-recent",JSON.stringify(next))}catch{}return next});
    }
    catch(error){setError((error as Error).message)}
    finally{setPending(false)}
  }
  function next(event:FormEvent){
    event.preventDefault();
    if(step===0&&!plan.project_type){setError("Choose a project type to continue.");return}
    setError("");
    if(step===3)void generate();else setStep(step+1);
  }
  // Enter-only transition: step content never waits on an exit animation before it changes.
  const motionProps=reduced?{}:{initial:{opacity:.8},animate:{opacity:1},transition:{duration:.28,ease:"easeOut" as const}};
  return <div className="ap-planner-layout"><div className="planner">
    <ol id="planner-progress" className="planner-steps" aria-label="Planner progress">{steps.map((label,index)=><li key={label} aria-current={index===step?"step":undefined} className={index<step?"done":""}><span className="ap-step-number">{index<step?<Check size={17}/>:index+1}</span><div><strong>{label}</strong><small>{stepDescriptions[index]}</small></div></li>)}</ol>
    <motion.div key={step} {...motionProps}>
    {step<4?<form className="form-panel stack" onSubmit={next}>
      {step===0&&<fieldset className="stack"><legend><h2>1. Select Project Type</h2></legend><p className="ap-step-intro">Choose the type of space you want to design. We’ll personalize your brief around your selection.</p><div className="select-grid">{types.map(({value,label,icon:Icon,text,image})=><label key={value} className={"select-card ap-project-card"+(!image?" ap-custom-card":"")}><input type="radio" name="project_type" value={value} checked={plan.project_type===value||(value==="Custom"&&plan.project_type==="3D Visualization")} onChange={set("project_type")}/>{image?<div className="ap-project-image"><ArchitectureImage src={image} alt="" fill sizes="(max-width: 540px) 42vw, (max-width: 1100px) 28vw, 15vw"/></div>:<span className="ap-custom-icon"><Plus size={30}/></span>}<span className="ap-selected"><Check size={17}/></span><div className="ap-project-copy"><Icon size={27} strokeWidth={1.5}/><div><strong>{label}</strong><span>{text}</span></div></div></label>)}</div>{["Custom","3D Visualization"].includes(plan.project_type)&&<label className="field ap-custom-focus">Project focus<select value={plan.project_type} onChange={set("project_type")}><option>Custom</option><option>3D Visualization</option></select></label>}</fieldset>}
      {step===1&&<><h2>2. Property Details</h2><p className="subtle">Everything here is optional. Share as much as you know.</p><div className="field-grid"><label className="field">Location<input value={plan.location} onChange={set("location")} maxLength={160} placeholder="e.g. DHA Phase 6, Karachi"/></label><label className="field">Plot or property size<input value={plan.size} onChange={set("size")} maxLength={120} placeholder="e.g. 240 sq yd or 2,500 ft²"/></label><label className="field">Number of floors<select value={plan.floors} onChange={set("floors")}><option value="">Not sure yet</option>{["1","2","3","4+"].map(value=><option key={value}>{value}</option>)}</select></label><label className="field">Rooms<input value={plan.rooms} onChange={set("rooms")} maxLength={600} placeholder="e.g. 4 bedrooms, home office, family lounge"/></label><label className="field full">Specific requirements<textarea value={plan.requirements} onChange={set("requirements")} maxLength={2000} placeholder="Natural light, parking for two cars, space for elderly parents, rental unit…"/></label></div><p className="subtle">Please leave out names, exact addresses and other personal details.</p></>}
      {step===2&&<fieldset className="stack"><legend><h2>3. Your Design Style</h2></legend><p className="subtle">Choose any that feel right. You can pick more than one.</p><div className="select-grid styles">{styles.map(({value,colors,text})=><label key={value} className="select-card style-card"><input type="checkbox" checked={plan.styles.includes(value)} onChange={()=>toggle(value)}/><span className="swatches" aria-hidden="true">{colors.map(color=><i key={color} style={{background:color}}/>)}</span><strong>{value}</strong><span>{text}</span></label>)}</div></fieldset>}
      {step===3&&<><h2>4. Budget & Timeline</h2><p className="subtle">Optional, but it helps the studio suggest a realistic approach.</p><div className="field-grid"><label className="field">Budget range<select value={plan.budget} onChange={set("budget")}><option value="">Prefer not to say</option>{budgets.map(value=><option key={value}>{value}</option>)}</select></label><label className="field">Expected start<input type="month" value={plan.start} onChange={set("start")}/></label><label className="field full">Project timeline<select value={plan.timeline} onChange={set("timeline")}><option value="">Not sure yet</option>{timelines.map(value=><option key={value}>{value}</option>)}</select></label></div></>}
      {error&&<p className="notice error" role="alert">{error}</p>}
      <div className="actions">{step>0&&<button type="button" className="button outline" onClick={()=>{setError("");setStep(step-1)}}><ArrowLeft size={15}/> Back</button>}<button className="button dark">{step===3?<><Sparkles size={15}/> Generate my brief</>:<>Next: {steps[step+1]} <ArrowRight size={15}/></>}</button>{step===1||step===2?<button type="button" className="text-button" onClick={()=>setStep(step+1)}>Skip</button>:null}</div>
    </form>:<div className="stack">
      {pending&&<div className="form-panel" role="status"><p className="eyebrow">Preparing your brief</p><h2>Shaping your ideas into a brief…</h2><div className="loading-bar"/></div>}
      {error&&<div className="form-panel stack"><p className="notice error" role="alert">{error}</p><div className="actions"><button className="button dark" onClick={()=>void generate()}>Try again</button><button className="button outline" onClick={()=>{setError("");setStep(3)}}>Edit answers</button><Link className="button outline" href="/contact?type=consultation">Contact the studio instead</Link></div></div>}
      {result&&<><div className="form-panel"><p className="eyebrow">Step 5 / AI design brief</p><h2>Your project brief.</h2><BriefView brief={result.brief} services={result.services}/><div className="actions spaced"><button className="button outline" onClick={()=>{setResult(null);setStep(0)}}>Edit answers</button></div></div>
        <section className="form-panel conversion" aria-labelledby="ready-title"><p className="eyebrow">Share with the studio</p><h2 id="ready-title">Ready to Bring Your Vision to Life?</h2><p>Send this brief to the studio. An architect will review it and reply about next steps.</p><BriefActions brief={result.brief} options={[["brief","Submit my brief"],["consultation","Request a consultation"]]} extra={<Link className="button outline" href="/contact">Contact the studio</Link>}/></section>
        {result.projects.length>0&&<section><p className="eyebrow">From our portfolio</p><h2>Related projects</h2><div className="grid three spaced">{result.projects.map(project=><ProjectCard key={project.slug} project={project}/>)}</div></section>}</>}
    </div>}
    </motion.div>
    <div className="ap-assurances">{[{Icon:Zap,title:"AI-Powered Planning",text:"Ideas shaped into a brief"},{Icon:Layers,title:"Considered Guidance",text:"Budget & timeline context"},{Icon:Users,title:"Collaborative",text:"Share, edit, and refine"},{Icon:Leaf,title:"Sustainable Choices",text:"Explore lower-impact ideas"},{Icon:ShieldCheck,title:"Professional Output",text:"A structured project brief"}].map(({Icon,title,text})=><div key={title}><Icon size={25}/><span><strong>{title}</strong><small>{text}</small></span></div>)}</div>
  </div><aside className="ap-sidebar"><section className="ap-idea"><div className="ap-sidebar-heading"><Sparkles size={22}/><h2>Your Design Starting Point</h2><Layers size={36}/></div><p>Describe your idea in a few words. Add it to your plan, then generate your AI brief in step 5.</p><form onSubmit={event=>{event.preventDefault();if(!idea.trim())return;setPlan(current=>({...current,requirements:[current.requirements,idea.trim()].filter(Boolean).join("\n").slice(0,2000)}));setIdea("");setIdeaNotice("Added to Property Details. Choose a project type to continue.")}}><label className="sr-only" htmlFor="planner-idea">Your project idea</label><textarea id="planner-idea" maxLength={1000} value={idea} onChange={event=>setIdea(event.target.value)} placeholder="e.g. A modern 4-bedroom home with open living space and a garden."/><button type="submit" aria-label="Add idea to my plan" disabled={!idea.trim()}><Send size={19}/></button></form>{ideaNotice&&<p className="ap-idea-notice" role="status">{ideaNotice}</p>}</section><section className="ap-recent"><h2>Your Recent Plans</h2><p className="ap-local-note">Saved in this browser tab for this session.</p>{recent.length?recent.map(entry=><div className="ap-recent-item" key={entry.id}><button className="ap-recent-open" type="button" onClick={()=>{setPlan({...empty,...entry.plan});setResult(null);setError("");setStep(0)}}><ArchitectureImage src={types.find(type=>type.value===entry.plan.project_type)?.image||"/portfolio/villa.webp"} alt="" width={84} height={62}/><span><strong>{entry.title}</strong><small><CalendarDays size={13}/>{new Date(entry.date).toLocaleDateString()}<em>Reopen</em></small></span></button><button className="ap-recent-remove" type="button" aria-label={"Remove "+entry.title+" from recent plans"} onClick={()=>setRecent(current=>{const next=current.filter(item=>item.id!==entry.id);try{sessionStorage.setItem(key+"-recent",JSON.stringify(next))}catch{}return next})}><Trash2 size={15}/></button></div>):<div className="ap-recent-empty"><Layers size={29}/><p>Your generated plans will appear here. Start by choosing your project type.</p></div>}</section><p className="ap-concept-note">AI suggestions are conceptual. Your architect will confirm feasibility, costs, and scheduling.</p></aside></div>
}
