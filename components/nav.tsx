"use client";
import {useEffect,useRef,useState} from "react";
import {useModalFocus} from "../lib/use-modal-focus";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ArrowUpRight,ChevronDown,Menu,X} from "lucide-react";
import type {NavigationContent} from "../lib/navigation";
import type {Studio} from "../lib/content";
type ServiceLink={slug:string;name:string};
const links=[["Home","/"],["About","/about"],["Projects","/projects"],["Services","/services"],["Team","/team"],["Plan with AI","/plan-your-project"],["Journal","/blog"],["Contact","/contact"]];
export function Brand({studio}:{studio:Studio}){
  return <Link href="/" className="brand" aria-label={studio.title+" home"}>{studio.logo?<img src={studio.logo} alt=""/>:<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M2 28 14 4l12 24M8 17h12M18 4l12 24" stroke="currentColor" strokeWidth="1.4"/></svg>}<span>{studio.title}</span></Link>
}
function ServicesMenu({services,path,onNavigate,label="Services",href="/services"}:{services:ServiceLink[];path:string;onNavigate:()=>void;label?:string;href?:string}){
  const [open,setOpen]=useState(false);
  const box=useRef<HTMLDivElement>(null);
  useEffect(()=>{setOpen(false)},[path]);
  useEffect(()=>{
    if(!open)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();setOpen(false);box.current?.querySelector("button")?.focus()}};
    addEventListener("keydown",close);return()=>removeEventListener("keydown",close);
  },[open]);
  const current=path==="/services"||path.startsWith("/services/");
  return <div className={"nav-services"+(open?" is-open":"")} ref={box} onPointerEnter={event=>{if(event.pointerType==="mouse"&&matchMedia("(min-width: 1024px)").matches)setOpen(true)}} onPointerLeave={event=>{if(event.pointerType==="mouse"&&matchMedia("(min-width: 1024px)").matches&&!event.currentTarget.contains(document.activeElement))setOpen(false)}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
    <Link href={href} aria-current={current?"page":undefined} onClick={onNavigate}>{label}</Link>
    {services.length>0&&<><button type="button" className="nav-services-toggle" aria-expanded={open} aria-controls="nav-services-menu" aria-label="Show services" onClick={()=>setOpen(!open)}><ChevronDown size={14}/></button>
      <div className="nav-services-menu" id="nav-services-menu">{services.map(item=><Link key={item.slug} href={"/services/"+item.slug} aria-current={path==="/services/"+item.slug?"page":undefined} onClick={()=>{setOpen(false);onNavigate()}}>{item.name}</Link>)}<Link className="nav-services-all" href="/services" onClick={()=>{setOpen(false);onNavigate()}}>All services <ArrowUpRight size={13}/></Link></div></>}
  </div>
}
export default function Nav({studio,services=[],content}:{studio:Studio;services?:ServiceLink[];content?:NavigationContent|null}){
  const path=usePathname(),[open,setOpen]=useState(false),[scrolled,setScrolled]=useState(false);
  useEffect(()=>{const scroll=()=>setScrolled(window.scrollY>12);scroll();window.addEventListener("scroll",scroll,{passive:true});return ()=>window.removeEventListener("scroll",scroll)},[]);
  const panel=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useModalFocus(open,panel,()=>setOpen(false),trigger);
  useEffect(()=>{setOpen(false)},[path]);
  useEffect(()=>{
    const desktop=matchMedia("(min-width: 1024px)");
    const reset=()=>{if(desktop.matches)setOpen(false)};
    desktop.addEventListener("change",reset);
    return()=>desktop.removeEventListener("change",reset);
  },[]);
  const items=content?content.links.filter(item=>item.visible):links.map(([label,href])=>({label,href,services:href==="/services"}));
  const cta=content?.cta??{label:"Book Consultation",href:"/contact?type=consultation",visible:true};
  if(path.startsWith("/admin"))return null;
  return <header className={"nav "+(path==="/"?"aa-nav ":"")+(scrolled?"scrolled":"")}><div className="shell nav-inner"><Brand studio={studio}/><button ref={trigger} className="menu icon-button" type="button" onClick={()=>setOpen(!open)} aria-label={open?"Close menu":"Open menu"} aria-expanded={open} aria-controls="site-links">{open?<X/>:<Menu/>}</button>
    {open&&<div className="site-nav-scrim" onClick={()=>setOpen(false)} aria-hidden="true"/>}
    <div ref={panel} className={"site-nav-panel"+(open?" open":"")} role={open?"dialog":undefined} aria-modal={open||undefined} aria-label={open?"Site menu":undefined}>
    <button type="button" className="site-nav-close icon-button" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={20}/></button>
    <nav id="site-links" aria-label="Main navigation">{items.map(({label,href,services:dropdown})=>dropdown?<ServicesMenu key={href} label={label} href={href} services={services} path={path} onNavigate={()=>setOpen(false)}/>
      :<Link key={href} href={href} aria-current={path===href||href!=="/"&&path.startsWith(href+"/")?"page":undefined} onClick={()=>setOpen(false)}>{label}</Link>)}
      {cta.visible&&<Link className="nav-mobile-contact" href={cta.href} onClick={()=>setOpen(false)}>{cta.label}</Link>}</nav></div>
    {cta.visible&&<Link href={cta.href} className="button outline nav-cta">{cta.label} <ArrowUpRight size={16}/></Link>}</div></header>
}
