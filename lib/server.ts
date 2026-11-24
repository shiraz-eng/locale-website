import {standardDetail} from "./detail-layout";
import type {NavigationContent} from "./navigation";
import type {PublicForm} from "./forms";
import {cache} from "react";
import {cookies,draftMode} from "next/headers";
import type {Metadata} from "next";
import seed from "../data/studio.json";
import {defaultStudio,siteUrl,type Collection,type Studio} from "./content";
import {demoCategories,demoFeaturedRank,demoProject,demoProjects,demoProjectsPage,demoService,demoServices,demoServicesPage,fixturePreview} from "./demo";
import type {ProjectCard,ProjectCategory,ProjectDoc,ProjectsPage,ServiceCard,ServiceDoc,ServicesPage} from "./services";
type Link={label:string;href:string};
export type SiteContent={hero_kicker:string;hero_headline:string;hero_description:string;hero_primary:Link;hero_secondary:Link;hero_tertiary:Link;hero_slides:{image:string;label:string;alt:string}[];
  paths_title:string;paths_text:string;paths:{title:string;text:string;href:string}[];about_title:string;about_text:string;about_image:string;about_principles:{title:string;text:string}[];
  cta_title:string;cta_text:string;cta_primary:Link;cta_secondary:Link;cta_tertiary:Link;footer_tagline:string};
type PageSeo={title?:string;description?:string;og_image?:string|null};
export type Site={content:SiteContent|null;seo:Record<string,PageSeo>;ai:{assistant:boolean;portfolio:boolean;introduction?:string;example_questions?:string[];style_presets?:string[]}};
const origin=()=>process.env.API_ORIGIN||"http://127.0.0.1:8010";
// Generous by default: a timed-out fetch renders the page without that content, which is worse than a slow page.
const timeout=Number(process.env.API_TIMEOUT_MS)||10000;
// In draft mode, requests carry the staff session so drafts can be read from the admin API.
export async function previewing(){
  try{return (await draftMode()).isEnabled}catch{return false}
}
async function staffCookie(){
  const jar=await cookies();
  const token=jar.get("__Host-atelier")??jar.get("atelier");
  return token?token.name+"="+token.value:"";
}
const cachedServerFetch=cache(async (path:string,staff=false,live=false)=>{
  if(fixturePreview()&&!staff&&!live&&path!=="/api/site"&&!path.startsWith("/api/forms/"))return null;
  try{
    const privateRequest=staff||await previewing();
    return await fetch(origin()+path,{
      cache:privateRequest?"no-store":"force-cache",
      ...(privateRequest?{}:{next:{revalidate:30,tags:["published-content"]}}),
      signal:AbortSignal.timeout(timeout),headers:staff?{Cookie:await staffCookie()}:undefined,
    });
  }catch{
    return null;
  }
});
async function serverFetch(path:string,staff=false,live=false){
  const response=await cachedServerFetch(path,staff,live);
  return response?.clone()??null;
}
export const publicContactForm=cache(async ():Promise<PublicForm|null>=>{
  const response=await serverFetch("/api/forms/contact");
  return response?.ok?response.json():null;
});
export async function list<T>(kind:keyof typeof seed,query=new URLSearchParams()):Promise<Collection<T>>{
  if(kind==="team"&&await previewing()){
    // Staff previewing the site also see draft team profiles.
    const staff=await serverFetch("/api/admin/content/team",true);
    if(staff?.ok){const items=(await staff.json() as (T&{order?:number})[]).sort((a,b)=>(a.order??0)-(b.order??0));return {items,total:items.length}}
  }
  const response=await serverFetch("/api/content/"+kind+"?"+query,false,kind==="projects"||kind==="services");
  if(response?.ok)return response.json();
  if(process.env.DEMO_MODE!=="true")return {items:[],total:0};
  const search=(query.get("q")||"").toLowerCase();
  const category=query.get("category");
  const size=Number(query.get("size")||12);
  const offset=(Number(query.get("page")||1)-1)*size;
  const matches=seed[kind].filter(row=>
    (!search||JSON.stringify(row).toLowerCase().includes(search))&&
    (!category||("category" in row&&row.category===category))&&
    (!query.get("featured")||("featured" in row&&row.featured)));
  return {items:matches.slice(offset,offset+size) as T[],total:matches.length};
}
export async function item<T>(kind:keyof typeof seed,slug:string):Promise<T|null>{
  if((kind==="projects"||kind==="blog")&&await previewing()){
    const draft=await serverFetch("/api/admin/content/"+kind+"/"+encodeURIComponent(slug),true);
    if(draft?.ok)return draft.json();
  }
  const response=await serverFetch("/api/content/"+kind+"/"+encodeURIComponent(slug));
  if(response?.ok)return response.json();
  if(response?.status===404||process.env.DEMO_MODE!=="true")return null;
  return (seed[kind].find(row=>row.slug===slug) as T|undefined)??null;
}
export async function studio(){return (await item<Studio>("settings","studio"))??defaultStudio}
export async function site():Promise<Site>{
  const response=await serverFetch("/api/site");
  const published:Site=response?.ok?await response.json():{content:null,seo:{},ai:{assistant:!fixturePreview(),portfolio:!fixturePreview()}};
  if(fixturePreview())return {content:null,seo:{},ai:published.ai};
  if(await previewing()){
    const draft=await serverFetch("/api/admin/site",true);
    if(draft?.ok)return {...published,content:(await draft.json()).draft};
  }
  return published;
}
// Page metadata with any title, description or image the studio set in the SEO screen.
export async function pageMetadata(path:string,fallback:{title:string;description:string}):Promise<Metadata>{
  const configured=path!=="/"&&!path.slice(1).includes("/")?await editablePage(path.slice(1)):null;
  const seo={...(await site()).seo[path],...(configured?Object.fromEntries(Object.entries(configured.seo).filter(([,value])=>value)): {})};
  const title=seo.title||fallback.title,description=seo.description||fallback.description;
  return {title:path==="/"?{absolute:title}:title,description,alternates:{canonical:path},
    openGraph:{title,description,url:siteUrl+path,...(seo.og_image?{images:[seo.og_image]}:{})}};
}
// Published services for navigation and the overview page.
export async function services():Promise<ServiceCard[]>{
  const response=await serverFetch("/api/services",false,true);
  return response?.ok?(await response.json()).items:fixturePreview()?demoServices:[];
}
// A published service, its draft while previewing, or where an old URL now points.
export async function service(slug:string):Promise<{doc:ServiceDoc|null;redirect?:string}>{
  if(await previewing()){
    const draft=await serverFetch("/api/admin/services/by-slug/"+encodeURIComponent(slug),true);
    if(draft?.ok)return {doc:await draft.json()};
  }
  const response=await serverFetch("/api/services/"+encodeURIComponent(slug),false,true);
  if(!response?.ok)return {doc:response?.status===404?null:fixturePreview()?demoService(slug):null};
  const data=await response.json();
  return data.redirect?{doc:null,redirect:data.redirect}:{doc:data};
}
export async function servicesPage():Promise<ServicesPage|null>{
  if(await previewing()){
    const draft=await serverFetch("/api/admin/services-page",true);
    if(draft?.ok)return (await draft.json()).draft;
  }
  const response=await serverFetch("/api/services-page",false,true);
  return response?.ok?response.json():fixturePreview()?demoServicesPage:null;
}
export async function projectCategories():Promise<ProjectCategory[]>{
  if(fixturePreview()){
    const catalog=await fixtureProjectCatalog();
    return [...new Map(catalog.map(row=>[row.category.slug,row.category])).values()];
  }
  const response=await serverFetch("/api/project-categories");
  return response?.ok?(await response.json()).items:[];
}
const fixtureProjectCatalog=cache(async()=>{
  const first=await serverFetch("/api/projects?size=48",false,true);
  if(!first?.ok)return demoProjects;
  const page=await first.json() as {items:ProjectCard[];total:number};
  const rest=await Promise.all(Array.from({length:Math.max(0,Math.ceil(page.total/48)-1)},async(_,index)=>{
    const response=await serverFetch("/api/projects?size=48&page="+(index+2),false,true);
    return response?.ok?(await response.json()).items as ProjectCard[]:[];
  }));
  const live=[...page.items,...rest.flat()];
  return live;
});
// Server-side filtered, sorted and paginated listing of published projects.
export async function projects(params:{category?:string;q?:string;sort?:string;page?:number;size?:number}):Promise<{items:ProjectCard[];total:number;page:number;size:number}>{
  if(fixturePreview()){
    const {category,q,sort,page=1,size=6}=params;
    const search=q?.toLowerCase();
    const catalog=await fixtureProjectCatalog();
    const matches=catalog.filter(row=>(!category||row.category.slug===category)&&
      (!search||[row.title,row.location,row.description,row.category.name].some(value=>value.toLowerCase().includes(search))));
    matches.sort((a,b)=>{
      switch(sort){
        case "title": return a.title.localeCompare(b.title);
        case "oldest": return (a.year??0)-(b.year??0);
        case "newest": return (b.year??0)-(a.year??0);
        default: return demoFeaturedRank(a.slug)-demoFeaturedRank(b.slug)||Number(b.featured)-Number(a.featured)||(b.year??0)-(a.year??0);
      }
    });
    const offset=(page-1)*size;
    return {items:matches.slice(offset,offset+size),total:matches.length,page,size};
  }
  const query=new URLSearchParams(Object.entries(params).filter(([,value])=>value!==undefined&&value!=="").map(([key,value])=>[key,String(value)]));
  const response=await serverFetch("/api/projects?"+query);
  return response?.ok?response.json():{items:[],total:0,page:1,size:params.size??6};
}
export async function project(slug:string):Promise<{doc:ProjectDoc|null;redirect?:string}>{
  if(await previewing()){
    const draft=await serverFetch("/api/admin/projects/by-slug/"+encodeURIComponent(slug),true);
    if(draft?.ok)return {doc:standardDetail(await draft.json())};
  }
  const response=await serverFetch("/api/projects/"+encodeURIComponent(slug),false,true);
  if(!response?.ok)return {doc:response?.status===404?null:fixturePreview()?demoProject(slug):null};
  const data=await response.json();
  return data.redirect?{doc:null,redirect:data.redirect}:{doc:standardDetail(data)};
}
export async function projectsPage():Promise<ProjectsPage|null>{
  if(fixturePreview())return demoProjectsPage;
  if(await previewing()){
    const draft=await serverFetch("/api/admin/projects-page",true);
    if(draft?.ok)return (await draft.json()).draft;
  }
  const response=await serverFetch("/api/projects-page");
  return response?.ok?response.json():null;
}


export async function navigation():Promise<NavigationContent|null>{
  if(await previewing()){
    const response=await serverFetch("/api/admin/navigation",true);
    if(response?.ok)return (await response.json()).draft;
  }
  // Navigation is live CMS data even when the visual portfolio fixtures are enabled.
  const response=await fetch(origin()+"/api/navigation",{cache:"no-store",signal:AbortSignal.timeout(timeout)}).catch(()=>null);
  return response?.ok?response.json():null;
}


export type EditablePageContent={
  schema_version:1;heading:string;description:string;hero_image?:string|null;team_content?:import("./team-content").TeamContent|null;sections:import("./services").Section[];
  after_sections:import("./services").Section[];show_original:boolean;seo:import("./services").Seo;
};
export async function editablePage(slug:string):Promise<EditablePageContent|null>{
  if(await previewing()){
    const response=await serverFetch("/api/admin/page-content/"+slug,true);
    return response?.ok?(await response.json()).draft:null;
  }
  const response=await fetch(origin()+"/api/pages/"+slug,{
    cache:"force-cache",next:{revalidate:30,tags:["published-content"]},signal:AbortSignal.timeout(timeout),
  }).catch(()=>null);
  return response?.ok?response.json():null;
}
