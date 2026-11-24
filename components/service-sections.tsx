import ProjectVideos from "./project-videos";
import ProjectMaterials from "./project-materials";
import ProjectProcess from "./project-process";
import ProjectTabs from "./project-tabs";
import {Fragment,type ReactNode} from "react";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,MapPin,Play} from "lucide-react";
import type {Project} from "../lib/content";
import {icons,type Button,type Section} from "../lib/services";
import {embed} from "../lib/video";
import GalleryLightbox from "./gallery-lightbox";
import ArchitectureImage from "./home/architecture-image";
import {ScrollReveal} from "./home/motion";
import RichText from "./rich-text";
import TrackedLink from "./tracked-link";
import VideoDialog from "./video-dialog";
// Shared by the public pages and the admin live preview, so both show exactly the same output.
export type ProjectFacts={category:string;location:string;year:number|null;area:string;status:string;style:string;client:string};
export type Crumb={label:string;href?:string};
// slug fills {slug} in button links; current is excluded from related projects; facts feed project details;
// crumbs are shown inside the first hero.
export type SectionContext={service:string;projects:Project[];testimonials:string[];current?:string;facts?:ProjectFacts;crumbs?:Crumb[]};
const buttonClass={primary:"aa-button sv-primary",secondary:"aa-button aa-outline",link:"aa-text-link"};
// Text wrapped in *asterisks* in a heading is shown in the gold accent colour; nothing else is interpreted.
export function Accent({text}:{text:string}){
  return <>{text.split(/(\*[^*]+\*)/).map((part,index)=>part.startsWith("*")&&part.endsWith("*")&&part.length>2?<em key={index} className="sv-accent-word">{part.slice(1,-1)}</em>:<Fragment key={index}>{part}</Fragment>)}</>
}
export function Buttons({buttons,service,slug,className=""}:{buttons:Button[];service?:string;slug?:string;className?:string}){
  const shown=buttons.filter(button=>button.visible&&button.label);
  if(!shown.length)return null;
  return <div className={"aa-actions sv-buttons "+className}>{shown.map((button,index)=>{const Lead=button.icon?icons[button.icon]:null;return <TrackedLink key={index} className={buttonClass[button.style]} href={slug?button.href.replace("{slug}",slug):button.href} label={"cta-"+button.label} service={service}>
    {Lead&&<Lead size={17} strokeWidth={1.6} aria-hidden="true"/>}{button.label}{button.style!=="secondary"&&!Lead&&<ArrowRight size={16}/>}</TrackedLink>})}</div>
}
function Icon({name,size=26}:{name:string;size?:number}){
  const Component=icons[name as keyof typeof icons]??icons.building;
  return <Component size={size} strokeWidth={1.4} aria-hidden="true"/>
}
function Head({heading,intro,link,service,slug}:{heading?:string;intro?:string;link?:Button|null;service?:string;slug?:string}){
  if(!heading&&!intro)return null;
  const more=link&&link.visible&&link.label&&<TrackedLink className="aa-text-link sv-more" href={slug?link.href.replace("{slug}",slug):link.href} label={"cta-"+link.label} service={service}>{link.label} <ArrowRight size={15}/></TrackedLink>;
  return <div className={"sv-head"+(more?" sv-head-row":"")}><div>{heading&&<h2>{heading}</h2>}{intro&&<p>{intro}</p>}</div>{more}</div>
}
function Crumbs({items}:{items:Crumb[]}){
  return <nav className="sv-crumbs" aria-label="Breadcrumb">{items.map((item,index)=><Fragment key={index}>{index>0&&<span aria-hidden="true">›</span>}{item.href?<Link href={item.href}>{item.label}</Link>:<span aria-current="page">{item.label}</span>}</Fragment>)}</nav>
}
// Poster image that plays the video when one is set; otherwise just the image.
export function Media({image,alt,video,caption,sizes}:{image:string;alt:string;video?:string|null;caption?:string;sizes:string}){
  const picture=<ArchitectureImage src={image} alt={alt} fill sizes={sizes}/>;
  if(!embed(video))return <div className="sv-media">{picture}</div>;
  return <VideoDialog url={video!} title={caption||alt} className="sv-media sv-media-video">{picture}<span className="sv-media-play" aria-hidden="true"><Play size={22}/></span>{caption&&<span className="sv-media-caption">{caption}</span>}<span className="aa-sr-only">Play video: {caption||alt}</span></VideoDialog>
}
function studioQuotes(lines:string[]){
  return lines.map(line=>{const [quote,...rest]=line.split(/\s[—–-]\s/);return {quote:quote.replace(/^["“]|["”]$/g,""),author:rest.join(" — "),role:""}});
}
function facts(context:SectionContext){
  const f=context.facts;
  return f?[{label:"Project Type",value:f.category,icon:"house"},{label:"Location",value:f.location,icon:"map-pin"},{label:"Area",value:f.area,icon:"scan"},{label:"Year",value:f.year?String(f.year):"",icon:"calendar"},
    {label:"Status",value:f.status,icon:"users"},{label:"Style",value:f.style,icon:"palette"},{label:"Client",value:f.client,icon:"handshake"}].filter(item=>item.value):[];
}
function Body({section,context,crumbs}:{section:Section;context:SectionContext;crumbs?:Crumb[]}){
  const service=context.facts?undefined:context.service,slug=context.current??context.service;
  switch(section.type){
    case "project_videos":return <div className="pj-video-section"><Head heading={section.heading} intro={section.intro}/>{section.videos.length?<ProjectVideos videos={section.videos} inspiration={section.inspiration}/>:<p className="sv-empty-media">Videos will be added by the studio.</p>}</div>;
    case "materials":return <ProjectMaterials section={section}/>;
    case "project_process":return <ProjectProcess section={section} slug={context.current} facts={context.facts}/>;
    case "hero":{
      const copy=<ScrollReveal className="sv-hero-copy">{crumbs&&<Crumbs items={crumbs}/>}{section.eyebrow&&<p className="aa-kicker sv-eyebrow">{section.eyebrow}</p>}<h1><Accent text={section.heading}/></h1>{section.subheading&&<p className="sv-lead">{section.subheading}</p>}<Buttons buttons={section.buttons} service={service} slug={slug}/></ScrollReveal>;
      const image=section.image&&<div className="sv-hero-image"><ArchitectureImage src={section.image} alt={section.image_alt} fill priority sizes={section.layout==="full"?"100vw":"(max-width: 760px) 100vw, 55vw"}/></div>;
      return <div className={"sv-hero sv-hero-"+section.layout}>{copy}{image}</div>;
    }
    case "rich_text":return <ScrollReveal className={"sv-prose sv-"+section.layout}>{section.heading&&<h2>{section.heading}</h2>}<RichText text={section.body}/></ScrollReveal>;
    // In a half-width column the heading sits above the image and text, as in the case-study layout.
    case "image_text":{const half=section.appearance.width==="half";return <>{half&&section.heading&&<h2 className="sv-image-text-heading">{section.heading}</h2>}<div className={"sv-image-text sv-"+section.layout}><ScrollReveal className="sv-image-text-copy">{!half&&section.heading&&<h2>{section.heading}</h2>}{section.body&&<RichText text={section.body}/>}<Buttons buttons={section.buttons} service={service} slug={slug}/></ScrollReveal>{section.image&&<div className="sv-image-text-image"><ArchitectureImage src={section.image} alt={section.image_alt} fill sizes="(max-width: 760px) 100vw, 45vw"/></div>}</div></>}
    case "features":case "benefits":return <><Head heading={section.heading} intro={section.intro}/><div className={"sv-cards sv-"+section.layout+(section.type==="benefits"?" sv-benefits":"")}>{section.items.map((item,index)=><ScrollReveal key={index} className="sv-card" delay={Math.min(index,6)*.06}><span className="sv-icon"><Icon name={item.icon}/></span><h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}</ScrollReveal>)}</div></>;
    case "process":return <><Head heading={section.heading} intro={section.intro}/><ol className={"sv-steps sv-"+section.layout}>{section.items.map((item,index)=><li key={index}><ScrollReveal delay={Math.min(index,6)*.07}><span className="sv-step-number">{String(index+1).padStart(2,"0")}</span><h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}</ScrollReveal></li>)}</ol></>;
    case "gallery":return section.images.length?<GalleryLightbox images={section.images} layout={section.layout} filters={section.filters} heading={section.heading?<h2>{section.heading}</h2>:undefined} intro={section.intro}/>:<><Head heading={section.heading}/><p className="sv-empty-media">{section.intro||"Images will be added by the studio when available."}</p></>;
    case "related_projects":{
      const projects=(section.source==="manual"?section.projects.map(slug=>context.projects.find(project=>project.slug===slug)).filter((project):project is Project=>!!project)
        :context.projects.filter(project=>project.slug!==context.current&&(!section.categories.length||section.categories.includes(project.category_slug??"")))).slice(0,section.limit);
      if(!projects.length)return null;
      return <><Head heading={section.heading} intro={section.intro} link={section.link} service={service} slug={slug}/><div className={"sv-projects sv-"+section.layout}>{projects.map((project,index)=><ScrollReveal key={project.slug} delay={Math.min(index,5)*.05}>
        <Link className="pj-card pj-card-compact" href={"/projects/"+project.slug}><div className="pj-card-image">{project.image&&<ArchitectureImage src={project.image} alt={project.title} fill sizes="(max-width: 760px) 92vw, 30vw"/>}</div>
          <div className="pj-card-body"><div><h3>{project.title}</h3><p className="pj-card-location">{context.facts?project.category:<><MapPin size={13} aria-hidden="true"/>{project.location}</>}</p></div><span className="pj-card-go" aria-hidden="true"><ArrowRight size={16}/></span></div></Link></ScrollReveal>)}</div></>;
    }
    case "testimonials":{
      const quotes=section.source==="studio"?studioQuotes(context.testimonials):section.items;
      if(!quotes.length)return null;
      return <><Head heading={section.heading}/><div className={"sv-quotes sv-"+section.layout}>{quotes.map((item,index)=><figure key={index} className="sv-quote"><blockquote>“{item.quote}”</blockquote>{(item.author||item.role)&&<figcaption>{item.author}{item.role&&<span>{item.role}</span>}</figcaption>}</figure>)}</div></>;
    }
    case "faq":return <><Head heading={section.heading} intro={section.intro}/><div className={"sv-faq sv-"+section.layout}>{section.items.map((item,index)=>section.layout==="accordion"?<details key={index}><summary>{item.question}</summary><RichText text={item.answer}/></details>:<div key={index}><h3>{item.question}</h3><RichText text={item.answer}/></div>)}</div></>;
    case "cta":return <ScrollReveal className={"sv-cta sv-cta-"+section.layout}>{section.layout==="banner"&&section.image&&<div className="sv-cta-image"><ArchitectureImage src={section.image} alt={section.image_alt??""} fill sizes="60vw"/></div>}
      <div className="sv-cta-copy"><h2>{section.heading}</h2>{section.text&&<p>{section.text}</p>}</div><Buttons buttons={section.buttons} service={service} slug={slug}/></ScrollReveal>;
    case "specs":{
      const items=section.source==="project"&&context.facts?facts(context):section.items;
      if(!items.length)return null;
      return <><Head heading={section.heading}/><dl className={"sv-specs sv-"+section.layout}>{items.map((item,index)=><div key={index}><span className="sv-spec-icon"><Icon name={item.icon}/></span><span><dt>{item.label}</dt><dd>{item.value}</dd></span></div>)}</dl></>;
    }
    case "stats":return <><Head heading={section.heading}/><dl className={"sv-stats sv-"+section.layout}>{section.items.map((item,index)=><div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></>;
    case "overview":{
      const list=section.facts?facts(context).slice(0,5):[];
      return <div className={"sv-overview sv-"+section.layout+(list.length?" sv-with-facts":"")+(section.image?" sv-with-media":"")}>
        <ScrollReveal className="sv-overview-copy">{section.heading&&<h2>{section.heading}</h2>}<RichText text={section.body}/></ScrollReveal>
        {list.length>0&&<dl className="sv-facts">{list.map(item=><div key={item.label}><dt><Icon name={item.icon} size={17}/>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>}
        {section.image&&<Media image={section.image} alt={section.image_alt} video={section.video} caption={section.caption} sizes="(max-width: 760px) 100vw, 34vw"/>}</div>;
    }
  }
}
export function ServiceSection({section,context,crumbs,bare}:{section:Section;context:SectionContext;crumbs?:Crumb[];bare?:boolean}){
  if(!section.enabled)return null;
  const body=<Body section={section} context={context} crumbs={crumbs}/>;
  const a=section.appearance;
  const classes=["sv-section","sv-type-"+section.type,"sv-bg-"+a.background,"sv-text-"+a.text,"sv-accent-"+a.accent,"sv-align-"+a.align,"sv-space-"+a.spacing,section.type==="features"||section.type==="benefits"?"sv-layout-"+section.layout:""].join(" ");
  if(bare||section.type==="materials"||section.type==="project_process"||(section.type==="hero"&&section.layout!=="centered"))return <section className={classes} id={section.id}>{body}</section>;
  return <section className={classes} id={section.id}><div className="aa-shell">{body}</div></section>
}
// Renders sections in order: breadcrumbs go in the first hero, labelled sections get a tab bar after it,
// and two adjacent "half" width sections share a row.
export default function ServiceSections({sections,context,sectionContent}:{sections:Section[];context:SectionContext;sectionContent?:Record<string,ReactNode>}){
  const shown=sections.filter(section=>section.enabled);
  const hero=shown[0]?.type==="hero"?shown[0].id:null;
  const tabsAfter=hero&&shown[1]?.type==="specs"&&shown[1].source==="project"?shown[1].id:hero;
  const tabs=shown.filter(section=>section.nav_label);
  if(context.facts&&tabs.length>1){
    const first=shown.findIndex(section=>section.nav_label);
    const panels=tabs.map((tab,index)=>({id:tab.id,label:tab.nav_label!,content:<ServiceSections sections={shown.slice(shown.indexOf(tab),index+1<tabs.length?shown.indexOf(tabs[index+1]):shown.length).map(section=>({...section,nav_label:""}))} context={{...context,crumbs:undefined}}/>}));
    return <><ServiceSections sections={shown.slice(0,first)} context={context}/><ProjectTabs panels={panels}/></>;
  }
  const out:ReactNode[]=[];
  if(context.crumbs&&!hero)out.push(<nav key="crumbs" className="aa-shell sv-crumbs-bar"><Crumbs items={context.crumbs}/></nav>);
  for(let index=0;index<shown.length;index++){
    const section=shown[index],next=shown[index+1];
    const custom=sectionContent?.[section.id];
    if(custom)out.push(<section key={section.id} id={section.id} className="sv-section sv-bg-white">{custom}</section>);
    else if(section.appearance.width==="half"&&next?.appearance.width==="half"&&section.type!=="hero"&&next.type!=="hero"){
      out.push(<div key={section.id} className="sv-pair aa-shell"><ServiceSection section={section} context={context} bare/><ServiceSection section={next} context={context} bare/></div>);
      index++;
    }else out.push(<ServiceSection key={section.id} section={section} context={context} crumbs={section.id===hero?context.crumbs:undefined}/>);
    if(section.id===tabsAfter&&tabs.length>1)out.push(<nav key="tabs" className="sv-tabs" aria-label="Page sections"><div className="aa-shell">{tabs.map(item=><a key={item.id} href={"#"+item.id}>{item.nav_label}</a>)}</div></nav>);
  }
  if(!hero&&tabs.length>1)out.unshift(<nav key="tabs" className="sv-tabs" aria-label="Page sections"><div className="aa-shell">{tabs.map(item=><a key={item.id} href={"#"+item.id}>{item.nav_label}</a>)}</div></nav>);
  return <>{out}</>
}
