"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowUpRight,Sparkles} from "lucide-react";
import {request,type Project} from "../lib/content";
import {projectAlt} from "./site";
import TrackedLink from "./tracked-link";
type Match={project:Project;reason:string};
const examples=["Modern residential projects with large windows and a minimalist feel","Warm interiors with natural materials","Adaptive reuse of an existing building"];
export function MatchCard({match}:{match:Match}){
  const {project}=match;
  return <article className="match-card"><Link href={"/projects/"+project.slug} className="match-image"><img src={project.image} alt={projectAlt(project)} loading="lazy"/><span className="tag">{project.category}</span></Link><div className="stack"><div><h3>{project.title}</h3><p className="subtle">{project.location} · {project.year}</p></div><p>{project.description}</p><p className="match-reason"><strong>Why it matches:</strong> {match.reason}</p><div className="actions"><Link className="button outline" href={"/projects/"+project.slug}>View Project</Link><TrackedLink className="button dark" href={"/contact?type=quotation&project="+project.slug} label="request-similar-ai" project={project.slug}>Request Similar Project <ArrowUpRight size={15}/></TrackedLink></div></div></article>
}
export default function PortfolioSearch(){
  const [query,setQuery]=useState(""),[result,setResult]=useState<{ai:boolean;items:Match[]}|null>(null);
  const [pending,setPending]=useState(false),[error,setError]=useState("");
  async function submit(event?:FormEvent,text=query){
    event?.preventDefault();
    if(text.trim().length<3){setError("Describe what you’re looking for in a few words.");return}
    setPending(true);setError("");setResult(null);
    try{setResult(await request("ai/portfolio","POST",{query:text.trim()}))}
    catch(error){setError((error as Error).message)}
    finally{setPending(false)}
  }
  return <section className="portfolio-search panel" aria-labelledby="portfolio-search-title"><p className="eyebrow line-label"><Sparkles size={14}/> AI portfolio match</p><h2 id="portfolio-search-title">Describe the project you have in mind.</h2><p>We will find the closest matches in our real portfolio and explain why.</p>
    <form className="search-row" onSubmit={submit}><label className="field grow">What are you looking for?<input value={query} onChange={event=>setQuery(event.target.value)} maxLength={600} placeholder={examples[0]}/></label><button className="button dark" disabled={pending}>{pending?"Searching…":"Find matching projects"}</button></form>
    <div className="actions chips">{examples.map(example=><button type="button" key={example} className="chip" disabled={pending} onClick={()=>{setQuery(example);void submit(undefined,example)}}>{example}</button>)}</div>
    {error&&<p className="notice error" role="alert">{error}</p>}
    <div aria-live="polite">{pending&&<p role="status" className="subtle">Comparing your description with our projects…</p>}{result&&<div className="stack spaced">{!result.ai&&<p className="notice">AI matching is unavailable right now, so these results use keyword search.</p>}{result.items.map(match=><MatchCard key={match.project.slug} match={match}/>)}{!result.items.length&&<p className="notice">No close matches in our portfolio yet. <Link className="inline-link" href="/contact?type=consultation">Tell us about your project</Link> and we will share relevant experience.</p>}</div>}</div>
  </section>
}
