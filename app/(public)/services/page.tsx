import Link from "next/link";
import {ArrowRight,ArrowUpRight,CalendarDays,Check} from "lucide-react";
import ArchitectureImage from "../../../components/home/architecture-image";
import {fontClasses} from "../../../components/home/fonts";
import {ScrollReveal} from "../../../components/home/motion";
import JsonLd from "../../../components/json-ld";
import ServiceSections,{Accent,Buttons} from "../../../components/service-sections";
import {ProjectCard} from "../../../components/site";
import TrackedLink from "../../../components/tracked-link";
import {siteUrl,type Project} from "../../../lib/content";
import {icons} from "../../../lib/services";
import {list,pageMetadata,previewing,services,servicesPage} from "../../../lib/server";
import {fixturePreview} from "../../../lib/demo";
import {demoServicesIntro,demoServicesClosing} from "../../../lib/demo-services";
import "../home.css";
import "./services-reference.css";
import "./locale-services.css";
export async function generateMetadata(){
  const page=await servicesPage();
  return pageMetadata("/services",{title:page?.seo.title||"Architecture & Interior Design Services",description:page?.seo.description||page?.subheading||"Architecture, interior design, renovation, visualization and consultation services."});
}
export default async function Services(){
  const [page,items,projects]=await Promise.all([servicesPage(),services(),list<Project>("projects",new URLSearchParams({featured:"true",size:"3"}))]);
  if(!page)return <section className="section shell"><p className="notice">Services are temporarily unavailable. Please try again shortly.</p></section>;
  const stats=page.show_stats?page.stats??[]:[];
  const advantage=page.benefits.length>0;
  const demo=fixturePreview()&&!await previewing(),context={service:"",projects:projects.items,testimonials:[]};
  const before=page.before_projects??(demo?demoServicesIntro:[]);
  const after=page.after_projects??(demo?demoServicesClosing:[]);
  const hasBanner=after.some(section=>section.type==="cta"&&section.enabled);
  return <div className={"aa-home sv-overview-page locale-services "+fontClasses+(demo||before.length||after.length?" sv-reference":"")}>
    <JsonLd data={{"@context":"https://schema.org","@type":"ItemList",itemListElement:items.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,url:siteUrl+"/services/"+item.slug}))}}/>
    <section className="sv-section sv-bg-white svo-hero" aria-labelledby="services-title"><div className="sv-hero sv-hero-split">
      <ScrollReveal className="sv-hero-copy">{page.eyebrow&&<p className="aa-kicker sv-eyebrow">{page.eyebrow}</p>}<h1 id="services-title"><Accent text={page.heading}/></h1>{page.subheading&&<p className="sv-lead">{page.subheading}</p>}<Buttons buttons={page.buttons}/></ScrollReveal>
      <div className="sv-hero-image"><ArchitectureImage src={page.hero_image} alt={page.hero_alt} fill priority sizes="(max-width: 760px) 100vw, 55vw"/>
        {stats.length>0&&<dl className="svo-stats">{stats.map((item,index)=>{const Icon=icons[item.icon??"award"]??icons.award;return <div key={index}><Icon size={26} strokeWidth={1.3} aria-hidden="true"/><span><dd>{item.value}</dd><dt>{item.label}</dt></span></div>})}</dl>}</div></div></section>
    <section className="sv-section sv-bg-white svo-services" id="services" aria-labelledby="services-heading"><div className="aa-shell">
      <div className="svo-head"><div>{page.services_eyebrow&&<p className="aa-kicker sv-eyebrow">{page.services_eyebrow}</p>}<h2 id="services-heading">{page.services_heading||"Our services"}</h2></div>
        {page.services_intro&&<p>{page.services_intro}</p>}{page.services_button&&<Buttons buttons={[page.services_button]}/>}</div>
      <div className={"svo-layout"+(advantage?" svo-with-aside":"")}>
        {items.length?<div className="svo-grid">{items.map((item,index)=>{const Icon=icons[item.icon]??icons.building;return <ScrollReveal key={item.slug} delay={(index%3)*.06}>
          <Link className={item.card_image?"svo-card":"svo-card svo-icon-card"} href={"/services/"+item.slug}>{item.card_image&&<div className="svo-card-image"><ArchitectureImage src={item.card_image} alt={item.card_alt||item.name} fill sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 22vw"/></div>}
            <div className="svo-card-body"><span className="svo-card-icon"><Icon size={24} strokeWidth={1.3} aria-hidden="true"/></span><h3>{item.name}</h3>{item.card_image&&<p>{item.short_description}</p>}
              {item.card_image&&item.highlights?.length?<ul className="sv-card-highlights">{item.highlights.map(point=><li key={point}><Check size={14} aria-hidden="true"/>{point}</li>)}</ul>:null}
              <span className="svo-explore">Explore <ArrowRight size={14}/></span></div></Link></ScrollReveal>})}<Link className="svo-help-card" href="/contact?type=consultation"><span>Not sure which service fits your needs?</span><p>Let’s help you choose the right approach.</p><span className="svo-help-arrow"><ArrowRight size={19}/></span></Link></div>
          :<p className="aa-empty">Services will appear here once they are published.</p>}
        {advantage&&<aside className="svo-aside" aria-labelledby="advantage-heading">{page.advantage_eyebrow&&<p className="aa-kicker">{page.advantage_eyebrow}</p>}<h2 id="advantage-heading">{page.advantage_heading||"Why clients choose us"}</h2>
          <ul>{page.benefits.map((item,index)=>{const Icon=icons[item.icon]??icons.building;return <li key={index}><span className="svo-aside-icon"><Icon size={22} strokeWidth={1.3} aria-hidden="true"/></span><span><strong>{item.title}</strong>{item.description&&<small>{item.description}</small>}</span></li>})}</ul>
          {page.advantage_image&&<div className="svo-aside-image"><ArchitectureImage src={page.advantage_image} alt={page.advantage_alt??""} fill sizes="(max-width: 1100px) 92vw, 22vw"/></div>}</aside>}
      </div>
    </div></section>
    <ServiceSections sections={before} context={context}/>
    {!hasBanner&&page.cta_heading&&<section className="svo-cta" aria-labelledby="services-cta"><ScrollReveal className="aa-shell svo-cta-inner"><span className="svo-cta-icon" aria-hidden="true"><CalendarDays size={30} strokeWidth={1.2}/></span><div><h2 id="services-cta">{page.cta_heading}</h2>{page.cta_text&&<p>{page.cta_text}</p>}</div>{page.cta_button&&<Buttons buttons={[page.cta_button]}/>}</ScrollReveal></section>}
    {page.show_projects&&projects.items.length>0&&<section className="sv-section sv-bg-soft" aria-labelledby="services-projects"><div className="aa-shell"><div className="sv-head sv-head-row"><h2 id="services-projects">{page.projects_heading||"Selected projects"}</h2><TrackedLink className="aa-text-link" href="/projects" label="services-projects">View all projects <ArrowUpRight size={16}/></TrackedLink></div><div className="sv-projects sv-grid-3">{projects.items.map(project=><ProjectCard key={project.slug} project={project}/>)}</div></div></section>}
    <ServiceSections sections={after} context={context}/>
  </div>
}
