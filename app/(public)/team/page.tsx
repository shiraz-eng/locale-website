import {defaultTeamContent} from "../../../lib/team-content";
import {icons} from "../../../lib/services";
import EditablePage from "../../../components/editable-page";
import Link from "next/link";
import {ArrowUpRight,Mail,ArrowRight} from "lucide-react";
import ArchitectureImage from "../../../components/home/architecture-image";
import TeamDirectory from "../../../components/team";
import {type Member} from "../../../lib/content";
import {editablePage,list,pageMetadata,studio} from "../../../lib/server";
import "../home.css";
import "./team.css";
export const generateMetadata=()=>pageMetadata("/team",{title:"Our Team",description:"Meet the architects, interior designers and project professionals behind the studio."});
type Props={searchParams:Promise<{department?:string}>};
async function Team({department}:{department?:string}){
  const [{items},settings,doc]=await Promise.all([list<Member>("team",new URLSearchParams("size=100")),studio(),editablePage("team")]);
  const copy={...defaultTeamContent,...doc?.team_content};
  const leader=items.find(member=>member.department==="Leadership"),testimonial=settings.testimonials?.[0]?.split(" | ");
  return <div className="aa-home tm-page">
    <section className="tm-hero" aria-labelledby="team-title"><div className="tm-hero-image"><ArchitectureImage src={doc?.hero_image||"/portfolio/villa.webp"} alt="Contemporary architecture opening to a landscaped garden" fill priority sizes="(max-width: 760px) 100vw, 65vw"/></div><div className="aa-shell tm-hero-inner"><div className="tm-hero-copy"><p className="aa-kicker aa-rule">Our People</p><h1 id="team-title">{doc?.heading||<>Our <em>Team</em></>}</h1><p>{doc?.description||"A multidisciplinary team of architects, designers, and project professionals who shape every "+settings.title+" project, from the first sketch to the final detail."}</p><div className="aa-actions"><Link className="button dark" href="#team-directory">Meet Our Team <ArrowUpRight size={16}/></Link><Link className="button outline" href="#our-culture">Our Culture <ArrowRight size={16}/></Link></div></div></div></section>
    <section className="aa-shell tm-directory" id="team-directory" aria-label="Team members"><TeamDirectory key={department||"all"} members={items} initialDepartment={department} heading={copy.directory_heading} intro={copy.directory_intro}/></section>
    {leader&&<section className="aa-shell tm-leadership" id="leadership"><header><p className="aa-kicker aa-rule">Leadership</p><h2>{copy.leadership_heading}</h2><p>{copy.leadership_intro}</p><Link className="button outline" href="/team?department=Leadership#team-directory">Meet Leadership <ArrowUpRight size={16}/></Link></header><article className="tm-leader-card"><div className="tm-leader-image">{leader.image?<ArchitectureImage src={leader.image} alt={leader.title} fill sizes="(max-width: 600px) 90vw, 30vw"/>:<span aria-hidden="true">{leader.title.split(" ").map(word=>word[0]).slice(0,2).join("")}</span>}</div><div className="tm-leader-copy"><h3>{leader.title}</h3><p className="tm-role">{leader.position}</p><p>{leader.description}</p>{leader.full_bio&&<details><summary>Read full biography</summary><p>{leader.full_bio}</p></details>}</div></article></section>}
    {copy.team_image&&<figure className="aa-shell tm-studio-photo"><div><ArchitectureImage src={copy.team_image} alt={copy.team_image_alt} fill sizes="(max-width: 760px) 92vw, 85vw"/></div>{copy.team_image_caption&&<figcaption>{copy.team_image_caption}</figcaption>}</figure>}
    <section className="aa-shell tm-culture" id="our-culture"><header><p className="aa-kicker aa-rule">Our Culture</p><h2>{copy.culture_heading}</h2></header><div className="tm-culture-values">{copy.culture.map(({icon,title,description})=>{const Icon=icons[icon];return <div key={title}><span><Icon size={26} strokeWidth={1.5}/></span><div><h3>{title}</h3><p>{description}</p></div></div>})}</div></section>
    {testimonial&&<section className="aa-shell tm-testimonial"><div className="tm-quote-image"><ArchitectureImage src="/portfolio/office-detail.webp" alt="" fill sizes="(max-width: 600px) 90vw, 25vw"/></div><figure><span aria-hidden="true">“</span><div><blockquote>{testimonial[0]}</blockquote><figcaption>{testimonial[1]||"Studio client"}{testimonial[2]&&" · "+testimonial[2]}</figcaption></div></figure></section>}
    <section className="tm-contact"><div><h2>{copy.cta_heading}</h2><p>{copy.cta_text}</p><div className="aa-actions"><Link className="button dark" href="/contact?type=consultation">Book Consultation <ArrowUpRight size={16}/></Link><Link className="button outline" href="/contact"><Mail size={16}/>Get in Touch</Link></div></div></section>
    <section className="aa-shell tm-careers"><div><h2>{copy.careers_heading}</h2><p>{copy.careers_text}</p></div><div className="aa-actions">{settings.open_roles_url&&<Link className="button outline" href={settings.open_roles_url}>View Open Roles <ArrowUpRight size={16}/></Link>}<Link className="button outline" href={settings.careers_link||"/contact"}>Get in Touch <ArrowUpRight size={16}/></Link></div></section>
  </div>;
}
export default async function CmsPage({searchParams}:Props){return <EditablePage slug="team">{await Team(await searchParams)}</EditablePage>}
