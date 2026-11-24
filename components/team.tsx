"use client";
import {useState,type KeyboardEvent} from "react";
import {motion,useReducedMotion} from "motion/react";
import Link from "next/link";
import {Instagram,Linkedin,Mail,Sparkles,ArrowUpRight} from "lucide-react";
import {departments,type Member} from "../lib/content";
import ArchitectureImage from "./home/architecture-image";
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).map(word=>word[0]).slice(0,2).join("").toUpperCase();
export function TeamCard({member,index=0}:{member:Member;index?:number}){
  const reduced=useReducedMotion();
  const links=[member.linkedin&&{href:member.linkedin,label:"LinkedIn",icon:Linkedin},member.instagram&&{href:member.instagram,label:"Instagram",icon:Instagram},member.public_email&&{href:"mailto:"+member.public_email,label:"Email",icon:Mail}].filter(Boolean) as {href:string;label:string;icon:typeof Mail}[];
  return <motion.article className="aa-member" initial={false} whileInView={reduced?undefined:{opacity:[0,1],y:[18,0]}} viewport={{once:true,amount:.15}} transition={{duration:.45,delay:Math.min(index,7)*.07,ease:"easeOut"}}>
    <div className="aa-member-photo">{member.image?<ArchitectureImage src={member.image} alt={"Portrait of "+member.title} fill sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 23vw"/>:<span className="aa-member-initials" aria-hidden="true">{initials(member.title)}</span>}
      {member.badge&&<span className="aa-member-badge">{member.badge}</span>}</div>
    <div className="aa-member-body">
      <p className="aa-member-department">{member.department}</p>
      <h3>{member.title}</h3>
      <p className="aa-member-role">{member.position}</p>
      <p className="aa-member-bio">{member.description}</p>
      {member.full_bio&&<details className="aa-member-more"><summary>Read full biography</summary><p>{member.full_bio}</p></details>}
      {links.length>0&&<div className="aa-member-links">{links.map(({href,label,icon:Icon})=><a key={label} href={href} aria-label={label+" — "+member.title} {...(href.startsWith("mailto:")?{}:{target:"_blank",rel:"noopener noreferrer"})}><Icon size={16} strokeWidth={1.6}/></a>)}</div>}
    </div>
  </motion.article>
}
export default function TeamDirectory({members,initialDepartment,heading,intro}:{members:Member[];initialDepartment?:string;heading?:string;intro?:string}){
  const [filter,setFilter]=useState(initialDepartment&&departments.some(value=>value===initialDepartment)?initialDepartment:"All Team");
  const tabs=["All Team",...departments];
  const shown=filter==="All Team"?members:members.filter(member=>member.department===filter);
  // Arrow keys move between tabs, following the ARIA tabs pattern.
  function keys(event:KeyboardEvent<HTMLButtonElement>,index:number){
    const next=event.key==="ArrowRight"?index+1:event.key==="ArrowLeft"?index-1:null;
    if(next===null)return;
    event.preventDefault();
    const target=tabs[(next+tabs.length)%tabs.length];
    setFilter(target);
    document.getElementById("team-tab-"+((next+tabs.length)%tabs.length))?.focus();
  }
  return <div>
    <div className="tm-directory-toolbar"><div className="aa-team-tabs" role="tablist" aria-label="Filter team by department">{tabs.map((tab,index)=>{
      const count=tab==="All Team"?members.length:members.filter(member=>member.department===tab).length;
      return <button key={tab} id={"team-tab-"+index} type="button" role="tab" aria-selected={filter===tab} aria-controls="team-grid" tabIndex={filter===tab?0:-1} onClick={()=>setFilter(tab)} onKeyDown={event=>keys(event,index)} aria-label={tab+" ("+count+")"}>{tab}</button>})}</div>{heading&&<Link className="button outline tm-plan-link" href="/plan-your-project"><Sparkles size={16}/>Plan with AI <ArrowUpRight size={15}/></Link>}</div>
    {heading&&<header className="tm-directory-heading"><div><p className="aa-kicker aa-rule">Meet Our Team</p><h2>{heading}</h2></div>{intro&&<p>{intro}</p>}</header>}
    <div id="team-grid" role="tabpanel" aria-labelledby={"team-tab-"+tabs.indexOf(filter)} aria-live="polite">
      {shown.length?<div className="aa-team-grid" key={filter}>{shown.map((member,index)=><TeamCard key={member.slug} member={member} index={index}/>)}</div>
        :<p className="aa-team-empty">{members.length?"No team members in "+filter+" yet.":"Team profiles will appear here once they are published."}</p>}
    </div>
  </div>
}
