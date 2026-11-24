import Link from "next/link";
import {ArrowRight,ArrowUpRight,ChevronLeft,ChevronRight,LayoutGrid,List,MapPin,PlayCircle} from "lucide-react";
import ArchitectureImage from "../../../components/home/architecture-image";
import {fontClasses} from "../../../components/home/fonts";
import {ScrollReveal} from "../../../components/home/motion";
import GalleryLightbox from "../../../components/gallery-lightbox";
import JsonLd from "../../../components/json-ld";
import ProjectsControls from "../../../components/projects-controls";
import {Accent,Buttons} from "../../../components/service-sections";
import VideoDialog from "../../../components/video-dialog";
import {siteUrl,type Project} from "../../../lib/content";
import {icons,type Picture} from "../../../lib/services";
import {list,pageMetadata,projectCategories,projects,projectsPage} from "../../../lib/server";
import "../home.css";
type Params={category?:string;q?:string;sort?:string;page?:string;view?:string};
const SORTS=["featured","newest","oldest","title"];
export async function generateMetadata({searchParams}:{searchParams:Promise<Params>}){
  const [page,params]=await Promise.all([projectsPage(),searchParams]);
  const meta=await pageMetadata("/projects",{title:page?.seo.title||"Architecture & Interior Design Projects",description:page?.seo.description||page?.description||"Explore the studio's architecture and interior projects."});
  // Filtered and paginated views point search engines at the main portfolio page.
  return Object.keys(params).length?{...meta,robots:{index:false,follow:true}}:meta;
}
function pages(current:number,total:number){
  const list:(number|"…")[]=[];
  for(let number=1;number<=total;number++){
    if(number===1||number===total||Math.abs(number-current)<=1)list.push(number);
    else if(list.at(-1)!=="…")list.push("…");
  }
  return list;
}
export default async function Projects({searchParams}:{searchParams:Promise<Params>}){
  const [page,categories,params]=await Promise.all([projectsPage(),projectCategories(),searchParams]);
  if(!page)return <section className="section shell"><p className="notice">Projects are temporarily unavailable. Please try again shortly.</p></section>;
  const category=categories.some(item=>item.slug===params.category)?params.category!:"";
  const q=typeof params.q==="string"?params.q.trim().slice(0,120):"";
  const sort=SORTS.includes(params.sort??"")?params.sort!:page.default_sort;
  const view=params.view==="list"?"list":"grid";
  const requested=Number(params.page);
  const current=Number.isInteger(requested)&&requested>0&&requested<=1000?requested:1;
  const [result,all]=await Promise.all([projects({category,q,sort,page:current,size:page.page_size}),page.show_gallery!==false?list<Project>("projects",new URLSearchParams({size:"100"})):null]);
  // The gallery strip collects images from published projects (each project's gallery is edited in its own page).
  const strip:Picture[]=(all?.items??[]).flatMap(project=>(project.gallery??[]).slice(0,3).map(image=>({image,alt:project.title,caption:project.title+(project.location?" · "+project.location:"")}))).slice(0,15);
  const totalPages=Math.max(1,Math.ceil(result.total/page.page_size));
  const href=(changes:Partial<Record<keyof Params,string|number>>)=>{
    const next={category,q,sort:sort===page.default_sort?"":sort,view:view==="list"?"list":"",page:"",...changes};
    const query=new URLSearchParams(Object.entries(next).filter(([,value])=>value!==""&&value!==undefined&&!(value===1)).map(([key,value])=>[key,String(value)]));
    return "/projects"+(query.size?"?"+query:"")+"#portfolio";
  };
  const stats=page.show_stats?page.stats??[]:[];
  return <div className={"aa-home pj-overview "+fontClasses}>
    <JsonLd data={{"@context":"https://schema.org","@type":"CollectionPage",name:page.heading.replace(/\*/g,""),url:siteUrl+"/projects",hasPart:result.items.map(item=>({"@type":"CreativeWork",name:item.title,url:siteUrl+"/projects/"+item.slug}))}}/>
    <section className="pj-hero" aria-labelledby="projects-title">
      <div className="pj-hero-image"><ArchitectureImage src={page.hero_image} alt={page.hero_alt} fill priority sizes="(max-width: 760px) 100vw, 62vw"/></div>
      <ScrollReveal className="aa-shell pj-hero-copy">{page.eyebrow&&<p className="aa-kicker sv-eyebrow">{page.eyebrow}</p>}<h1 id="projects-title"><Accent text={page.heading}/></h1>{page.description&&<p className="sv-lead">{page.description}</p>}
        <div className="pj-hero-actions"><Buttons buttons={page.buttons}/>{page.showreel&&<VideoDialog url={page.showreel} title="Studio showreel" className="aa-button aa-outline pj-showreel"><PlayCircle size={19} strokeWidth={1.5} aria-hidden="true"/>Watch Showreel</VideoDialog>}</div></ScrollReveal>
    </section>
    {stats.length>0&&<div className="aa-shell"><dl className="pj-stats">{stats.map((item,index)=>{const Icon=icons[item.icon??"award"]??icons.award;return <div key={index}><Icon size={34} strokeWidth={1.2} aria-hidden="true"/><span><dd>{item.value}</dd><dt>{item.label}</dt></span></div>})}</dl></div>}
    <section className="sv-section sv-bg-white pj-portfolio" aria-label="Projects" id="portfolio"><div className="aa-shell">
      <div className="pj-toolbar">
        <nav className="pj-tabs" aria-label="Filter by category"><Link href={href({category:""})} scroll={false} aria-current={!category?"page":undefined}>All Projects</Link>
          {categories.map(item=><Link key={item.slug} href={href({category:item.slug})} scroll={false} aria-current={category===item.slug?"page":undefined}>{item.name}</Link>)}</nav>
        <ProjectsControls q={q} sort={sort} category={category} view={view}/>
      </div>
      <div className="pj-meta"><p className="pj-count" aria-live="polite">{result.total} {result.total===1?"project":"projects"}{q?` matching “${q}”`:""}</p>
        <div className="pj-views" role="group" aria-label="Layout"><Link href={href({view:""})} scroll={false} aria-label="Grid view" aria-current={view==="grid"?"true":undefined}><LayoutGrid size={16}/></Link><Link href={href({view:"list"})} scroll={false} aria-label="List view" aria-current={view==="list"?"true":undefined}><List size={16}/></Link></div></div>
      {result.items.length?<div className={"pj-grid pj-"+view} key={category+q+sort+current+view}>{result.items.map((item,index)=><ScrollReveal key={item.slug} delay={Math.min(index,5)*.05}>
        <Link className="pj-card" href={"/projects/"+item.slug}><div className="pj-card-image">{item.cover_image&&<ArchitectureImage src={item.cover_image} alt={item.cover_alt||item.title} fill sizes={view==="list"?"(max-width: 760px) 100vw, 360px":"(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 30vw"}/>}<span className="pj-badge">{item.category.name}</span></div>
          <div className="pj-card-body"><div><h2>{item.title}</h2>{item.location&&<p className="pj-card-location"><MapPin size={14} aria-hidden="true"/>{item.location}</p>}{view==="list"&&<p className="pj-card-text">{item.description}</p>}</div><span className="pj-card-go" aria-hidden="true"><ArrowRight size={16}/></span><span className="aa-sr-only">View project details</span></div></Link></ScrollReveal>)}</div>
        :<div className="pj-empty"><p>{q||category?"No projects match this selection yet.":"Projects will appear here once they are published."}</p>{(q||category)&&<Link className="aa-text-link" href="/projects">Show all projects <ArrowUpRight size={15}/></Link>}</div>}
      {totalPages>1&&<nav className="pj-pagination" aria-label="Project pages">
        {current>1?<Link href={href({page:current-1})} aria-label="Previous page"><ChevronLeft size={18}/></Link>:<span aria-hidden="true" className="pj-disabled"><ChevronLeft size={18}/></span>}
        {pages(current,totalPages).map((number,index)=>number==="…"?<span key={"gap"+index} className="pj-gap">…</span>:<Link key={number} href={href({page:number})} aria-current={number===current?"page":undefined} aria-label={"Page "+number}>{number}</Link>)}
        {current<totalPages?<Link href={href({page:current+1})} aria-label="Next page"><ChevronRight size={18}/></Link>:<span aria-hidden="true" className="pj-disabled"><ChevronRight size={18}/></span>}</nav>}
      {strip.length>0&&<div className="pj-strip"><GalleryLightbox images={strip} layout="carousel" heading={<h2>{page.gallery_heading||"Project Gallery"}</h2>} more="View Full Gallery"/></div>}
    </div></section>
    {page.cta_heading&&<section className="sv-section sv-bg-cream" aria-labelledby="projects-cta"><ScrollReveal className="aa-shell sv-cta sv-cta-band"><h2 id="projects-cta">{page.cta_heading}</h2>{page.cta_text&&<p>{page.cta_text}</p>}<Buttons buttons={page.cta_buttons}/></ScrollReveal></section>}
  </div>
}
