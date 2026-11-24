import type {NavigationContent} from "../lib/navigation";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,Armchair,Box,Building2,Hammer,Map,MessagesSquare} from "lucide-react";
import type {Member,Project,Service,Studio} from "../lib/content";
import {Brand} from "./nav";

export function Intro({label,title,description}:{label:string;title:string;description?:string}){
  return <section className="page-intro"><div className="shell"><p className="eyebrow">{label}</p><h1>{title}</h1>{description&&<p className="intro-copy">{description}</p>}</div></section>
}
export const projectAlt=(project:Pick<Project,"title"|"category"|"location">)=>project.title+", "+project.category.toLowerCase()+" project in "+project.location;
export function ProjectCard({project}:{project:Project}){
  return <article className="project-card"><Link href={"/projects/"+project.slug}><div className="project-image"><img src={project.image} alt={projectAlt(project)} loading="lazy"/><span className="tag">{project.category}</span></div><div className="project-caption"><div><h3>{project.title}</h3><p>{project.location} <span>·</span> {project.year}</p></div><ArrowUpRight size={21}/></div></Link></article>
}
const icons={building:Building2,armchair:Armchair,map:Map,hammer:Hammer,box:Box,messages:MessagesSquare};
export function ServiceCard({service,full=false}:{service:Service;full?:boolean}){
  const Icon=icons[service.icon as keyof typeof icons]||Building2;
  return <article className="service-card" id={service.slug}>{service.image&&<img src={service.image} alt="" loading="lazy"/>}<Icon size={27} strokeWidth={1.35}/><h3>{service.title}</h3><p>{service.description}</p>{full&&<><ul>{service.benefits.map(benefit=><li key={benefit}>{benefit}</li>)}</ul><Link className="text-link" href={"/services/"+service.slug}>Explore {service.title.toLowerCase()} <ArrowUpRight size={16}/></Link></>}</article>
}
export function MemberCard({member}:{member:Member}){
  return <article className="service-card">{member.image&&<img src={member.image} alt={member.title} loading="lazy"/>}<h3>{member.title}</h3><p className="eyebrow">{member.position}</p><p>{member.description}</p></article>
}
export function Footer({studio,tagline,menu}:{studio:Studio;tagline?:string;menu?:NavigationContent|null}){
  return <footer className="footer"><div className="shell"><div className="footer-grid"><div><Brand studio={studio}/><p>{menu?.footer_tagline||tagline||"Architecture and design for the way we live."}</p></div>{menu?menu.footer_columns.map((column,index)=><div key={index}><h3>{column.title}</h3>{column.links.filter(link=>link.visible).map((link,i)=><Link key={i} href={link.href}>{link.label}</Link>)}</div>):<><div><h3>Explore</h3><Link href="/projects">Projects</Link><Link href="/services">Services</Link><Link href="/about">Studio</Link><Link href="/team">Team</Link><Link href="/blog">Journal</Link></div><div><h3>Services</h3><Link href="/services/residential-architecture">Residential</Link><Link href="/services/commercial-architecture">Commercial</Link><Link href="/services/interior-design">Interiors</Link><Link href="/plan-your-project">Plan your project</Link><Link href="/services">All services</Link></div></>}<div><h3>Get in touch</h3><a href={"mailto:"+studio.email}>{studio.email}</a><a href={"tel:"+studio.phone}>{studio.phone}</a><p>{studio.location}</p>{studio.instagram&&<a href={studio.instagram}>Instagram</a>}{studio.linkedin&&<a href={studio.linkedin}>LinkedIn</a>}</div></div><div className="footer-base"><span>© {new Date().getFullYear()} {studio.title}</span><Link href="/privacy">Privacy Policy</Link><Link href="/admin">Staff sign-in <ArrowRight size={13}/></Link></div></div></footer>
}
