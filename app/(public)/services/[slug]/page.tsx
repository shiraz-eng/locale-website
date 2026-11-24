import {notFound,permanentRedirect} from "next/navigation";
import {fontClasses} from "../../../../components/home/fonts";
import JsonLd from "../../../../components/json-ld";
import ServiceSections from "../../../../components/service-sections";
import {siteUrl,type Project} from "../../../../lib/content";
import {list,previewing,service,studio} from "../../../../lib/server";
import "../../home.css";
import "../services-reference.css";
import "../locale-services.css";
type Props={params:Promise<{slug:string}>};
const plain=(text:string)=>text.replace(/\*\*|\*|\[([^\]]+)\]\([^)]+\)/g,"$1");
export async function generateMetadata({params}:Props){
  const {doc}=await service((await params).slug);
  if(!doc)return {title:"Service"};
  const title=doc.seo.title||doc.name,description=doc.seo.description||doc.short_description;
  const image=doc.seo.og_image||doc.card_image;
  return {title,description,alternates:{canonical:doc.seo.canonical||"/services/"+doc.slug},robots:await previewing()?{index:false,follow:false}:undefined,
    openGraph:{title,description,type:"website",url:siteUrl+"/services/"+doc.slug,images:image?[image]:undefined}};
}
export default async function ServicePage({params}:Props){
  const slug=(await params).slug;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))notFound();
  const {doc,redirect}=await service(slug);
  if(redirect)permanentRedirect("/services/"+redirect);
  if(!doc)notFound();
  const [settings,projects]=await Promise.all([studio(),list<Project>("projects",new URLSearchParams({size:"100"}))]);
  const url=siteUrl+"/services/"+doc.slug;
  const faqs=doc.sections.flatMap(section=>section.enabled&&section.type==="faq"?section.items:[]);
  const sections=doc.sections.map(section=>{
    if(section.nav_label||section.type==="hero"||!section.enabled)return section;
    const label=section.type==="overview"||section.type==="image_text"?"Overview":section.type==="features"?"What We Do":section.type==="process"?"Process":section.type==="related_projects"?"Projects":section.type==="materials"?"Materials":section.type==="faq"?"FAQs":undefined;
    return label?{...section,nav_label:label}:section;
  });
  const labels=new Set<string>();
  const navigationSections=sections.map(section=>{if(!section.nav_label)return section;if(labels.has(section.nav_label))return {...section,nav_label:""};labels.add(section.nav_label);return section});
  return <div className={"aa-home sv-detail sv-reference locale-services "+fontClasses}>
    <JsonLd data={{"@context":"https://schema.org","@type":"Service",name:doc.name,description:doc.short_description,serviceType:doc.name,url,image:doc.card_image||undefined,areaServed:settings.location,provider:{"@type":"ProfessionalService",name:settings.title,url:siteUrl}}}/>
    <JsonLd data={{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Services",item:siteUrl+"/services"},{"@type":"ListItem",position:2,name:doc.name,item:url}]}}/>
    {faqs.length>0&&<JsonLd data={{"@context":"https://schema.org","@type":"FAQPage",mainEntity:faqs.map(item=>({"@type":"Question",name:item.question,acceptedAnswer:{"@type":"Answer",text:plain(item.answer)}}))}}/>}
    <ServiceSections sections={navigationSections} context={{service:doc.slug,projects:projects.items,testimonials:settings.testimonials??[],crumbs:[{label:"Services",href:"/services"},{label:doc.name}]}}/>
  </div>
}
