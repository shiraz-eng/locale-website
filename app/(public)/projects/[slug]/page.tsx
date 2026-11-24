import {notFound,permanentRedirect} from "next/navigation";
import {fontClasses} from "../../../../components/home/fonts";
import JsonLd from "../../../../components/json-ld";
import ServiceSections from "../../../../components/service-sections";
import {siteUrl,type Project} from "../../../../lib/content";
import {list,previewing,project,studio} from "../../../../lib/server";
import {fixturePreview} from "../../../../lib/demo";
import "../../home.css";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){
  const {doc}=await project((await params).slug);
  if(!doc)return {title:"Project"};
  const title=doc.seo.title||`${doc.title}${doc.category?" · "+doc.category.name+" project":""}${doc.location?" in "+doc.location:""}`;
  const description=doc.seo.description||doc.description;
  const image=doc.seo.og_image||doc.cover_image;
  return {title,description,alternates:{canonical:doc.seo.canonical||"/projects/"+doc.slug},robots:await previewing()?{index:false,follow:false}:undefined,
    openGraph:{title,description,type:"article",url:siteUrl+"/projects/"+doc.slug,images:image?[{url:image,alt:doc.cover_alt||doc.title}]:undefined}};
}
export default async function ProjectPage({params}:Props){
  const slug=(await params).slug;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))notFound();
  const {doc,redirect}=await project(slug);
  if(redirect)permanentRedirect("/projects/"+redirect);
  if(!doc)notFound();
  const [settings,related]=await Promise.all([studio(),list<Project>("projects",new URLSearchParams({size:"100"}))]);
  const url=siteUrl+"/projects/"+doc.slug;
  const images=doc.sections.flatMap(section=>section.enabled&&section.type==="gallery"?section.images:[]);
  const facts={category:doc.category?.name??"",location:doc.location,year:doc.year,area:doc.area,status:doc.status,style:doc.style,client:doc.client_approved?doc.client:""};
  const referenceProject=doc.sections.some(section=>section.type==="materials"||section.type==="project_process");
  return <div className={"aa-home pj-page sv-detail "+fontClasses+(referenceProject?" pj-reference-detail":"")}>
    <JsonLd data={{"@context":"https://schema.org","@type":"CreativeWork",name:doc.title,description:doc.description,url,image:images.length?images.map(item=>item.image):doc.cover_image||undefined,
      dateCreated:doc.year?String(doc.year):undefined,genre:doc.category?.name,locationCreated:doc.location?{"@type":"Place",name:doc.location}:undefined,creator:{"@type":"Organization",name:settings.title,url:siteUrl}}}/>
    <JsonLd data={{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Projects",item:siteUrl+"/projects"},
      ...(doc.category?[{"@type":"ListItem",position:2,name:doc.category.name,item:siteUrl+"/projects?category="+doc.category.slug}]:[]),{"@type":"ListItem",position:doc.category?3:2,name:doc.title,item:url}]}}/>
    <ServiceSections sections={doc.sections} context={{service:doc.slug,current:doc.slug,facts,projects:related.items,testimonials:settings.testimonials??[],
      crumbs:[{label:"Projects",href:"/projects"},...(doc.category?[{label:doc.category.name,href:"/projects?category="+doc.category.slug}]:[]),{label:doc.title}]}}/>
  </div>
}
