import EditablePage from "../../../components/editable-page";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,Building2,Check,Eye,HardHat,Layers,Pencil,Search,Target,Users,Wrench} from "lucide-react";
import ArchitectureImage from "../../../components/home/architecture-image";
import {fontClasses} from "../../../components/home/fonts";
import type {Member,Project,Service} from "../../../lib/content";
import {fixturePreview} from "../../../lib/demo";
import {list,pageMetadata,studio} from "../../../lib/server";
import "../home.css";
import "./about.css";

export const generateMetadata=()=>pageMetadata("/about",{title:"About Atelier Arc",description:"Meet the architecture and design studio and learn how we design, develop, and deliver projects."});

const sampleTeam=[
  {title:"Sara Khan",position:"Lead Architect",image:"sara"},
  {title:"Usman Saleem",position:"Interior Design Lead",image:"usman"},
  {title:"Ayesha Malik",position:"Project Manager",image:"ayesha"},
  {title:"Hamza Ali",position:"Design Architect",image:"hamza"},
].map(member=>({...member,slug:member.image,image:`/portfolio/about/${member.image}.jpg`}));

const process=[
  {title:"Discover",description:"Understand the brief and what matters to you.",Icon:Search},
  {title:"Design",description:"Explore layouts and a clear creative direction.",Icon:Pencil},
  {title:"Develop",description:"Refine details, materials, and technical plans.",Icon:Layers},
  {title:"Build",description:"Coordinate the work and review progress.",Icon:HardHat},
  {title:"Deliver",description:"Walk through the finished space together.",Icon:Wrench},
];

async function About(){
  const [settings,team,projects,services]=await Promise.all([studio(),list<Member>("team",new URLSearchParams("size=4")),list<Project>("projects",new URLSearchParams("size=1")),list<Service>("services",new URLSearchParams("size=1"))]);
  const demo=fixturePreview();
  const members=demo?sampleTeam:team.items;
  return <div className={"aa-home about-studio "+fontClasses}>
    <section className="about-hero">
      <div className="about-hero-image"><ArchitectureImage src="/portfolio/villa.webp" alt="Contemporary lakeside villa at dusk" fill priority sizes="(max-width: 700px) 100vw, 70vw"/></div>
      <div className="about-shell about-hero-copy"><p className="aa-kicker">About Atelier Arc</p><h1>Designing spaces for people, places, and <em>better living.</em></h1><p>{settings.intro}</p>
        <div className="about-actions"><Link className="aa-button sv-primary" href="#story">Our Story <ArrowRight size={16} aria-hidden="true"/></Link><Link className="aa-button aa-outline" href="/projects">Explore Our Work <ArrowUpRight size={16}/></Link></div>
      </div>
    </section>
    <div className="about-shell">
      <dl className="about-facts">
        {[{label:"Portfolio projects",value:projects.total,Icon:Building2},{label:"Studio services",value:services.total,Icon:Layers},{label:"Team profiles",value:demo?members.length:team.total,Icon:Users}].map(({label,value,Icon})=><div key={label}><Icon size={29} strokeWidth={1.5} aria-hidden="true"/><div><dt>{label}</dt><dd>{value}</dd></div></div>)}
      </dl>
      <section id="story" className="about-story">
        <div><p className="aa-kicker">Our Story</p><h2>The Atelier Arc Story</h2><p>Our work starts with a question. What would make this place better to live in? We work through the answer with each client, using conversation, drawings, and material studies to shape spaces that fit everyday life.</p><Link className="aa-button aa-outline" href="#approach">See How We Work <ArrowRight size={16}/></Link></div>
        <div className="about-story-image"><ArchitectureImage src="/portfolio/sketch.webp" alt="Architectural perspective sketch of a modern villa" fill sizes="(max-width: 700px) 100vw, 55vw"/></div>
      </section>
      <section className="about-values" aria-label="Mission, vision, and values">
        <article><Target aria-hidden="true"/><div><h3>Our Mission</h3><p>Design useful, enduring spaces with a clear purpose and a sense of belonging.</p></div></article>
        <article><Eye aria-hidden="true"/><div><h3>Our Vision</h3><p>Create adaptable places that support changing households, uses, and climates.</p></div></article>
        <article><Layers aria-hidden="true"/><div><h3>Our Values</h3><ul>{["Design excellence","Client collaboration","Sustainability","Integrity and transparency"].map(value=><li key={value}><Check size={14} aria-hidden="true"/>{value}</li>)}</ul></div></article>
      </section>
      <section className="about-founder">
        <div className="about-founder-image"><ArchitectureImage src={demo?"/portfolio/about/founder.jpg":"/portfolio/residential.webp"} alt={demo?"Illustrative portrait in an architecture studio":"A contemporary house in its landscape"} fill sizes="(max-width: 700px) 100vw, 43vw"/></div>
        <div><p className="aa-kicker">Studio Perspective</p><blockquote>We design with purpose, paying attention to how a place feels, how it works, and how it will age.</blockquote><p>We test ideas early, starting with the existing site, daylight, and the details people will use every day.</p></div>
      </section>
      <section className="about-team">
        <header><div><p className="aa-kicker">Our Team</p><h2>Meet the Team</h2><p>{demo?"Illustrative studio profiles for this preview.":"Meet the people behind the studio’s architecture and design work."}</p></div><Link className="aa-button aa-outline" href="/team">View Full Team <ArrowUpRight size={16}/></Link></header>
        {members.length>0&&<div className="about-team-grid">{members.map(member=><article key={member.slug}><div className="about-team-photo">{member.image?<ArchitectureImage src={member.image} alt="" fill sizes="(max-width: 700px) 46vw, 24vw"/>:<span aria-hidden="true">{member.title.split(" ").slice(0,2).map(word=>word[0]).join("")}</span>}</div><div><h3>{member.title}</h3><p>{member.position}</p></div></article>)}</div>}
      </section>
      <section id="approach" className="about-approach">
        <div><p className="aa-kicker">Our Process</p><h2>How We Work</h2><p>Five stages take a project from the first conversation to the finished space.</p></div>
        <ol>{process.map(({title,description,Icon})=><li key={title}><Icon size={26} strokeWidth={1.5} aria-hidden="true"/><h3>{title}</h3><p>{description}</p></li>)}</ol>
      </section>
      <section className="about-close"><div><p className="aa-kicker">Start a Conversation</p><h2>Let’s Create Your Next Space</h2></div><Link className="aa-button sv-primary" href="/contact?type=consultation">Book a Consultation <ArrowUpRight size={17}/></Link></section>
    </div>
  </div>;
}




export default async function CmsPage(){
  return <EditablePage slug="about">{await About()}</EditablePage>;
}
