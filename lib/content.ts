import seed from "../data/studio.json";
export const categories = ["Residential","Commercial","Interior Design","Urban Planning","Renovation"] as const;
export const budgets = ["Under $100k","$100k–$250k","$250k–$500k","$500k+"];
export const timelines = ["As soon as possible","Within 3 months","3–6 months","6–12 months","More than a year","Not sure yet"];
export type Seo = {published?:boolean;project_type?:string;seo_title?:string;seo_description?:string;og_image?:string|null;canonical?:string};
export type Project = typeof seed.projects[number] & Seo & {category_slug?:string};
export type Service = typeof seed.services[number] & Seo & {image?:string};
export const departments = ["Leadership","Architecture","Interior Design","Project Management","Design & Visualization"] as const;
export type Member = {slug:string;title:string;position:string;department:string;description:string;full_bio?:string;image?:string|null;linkedin?:string;instagram?:string;public_email?:string|null;badge?:string;order:number;featured?:boolean;published?:boolean};
export type Article = typeof seed.blog[number] & Seo & {category?:string;author_name?:string;author_role?:string;author_bio?:string;author_image?:string|null;tags?:string[]};
export type Studio = typeof seed.settings[number] & {logo?:string;instagram?:string;linkedin?:string;hero_description?:string;testimonials?:string[];free_consultation?:boolean;whatsapp?:string;currency?:string;careers_link?:string;open_roles_url?:string};
export type Brief = {title:string;overview:string;project_type:string;location:string;size:string;budget:string;timeline:string;styles:string[];design_preferences:string[];space_requirements:string[];considerations:string[];services:string[];questions:string[];concept_summary?:string;next_action?:string;sources?:{title:string;url:string}[];design_recommendations?:string[];functional_zones?:string[];suggested_spaces?:string[];materials?:string[];color_palette?:string[];lighting_ventilation?:string[];sustainability?:string[];budget_considerations?:string[];timeline_considerations?:string[];};
export const siteUrl = (process.env.PUBLIC_ORIGIN || "http://localhost:3000").replace(/\/$/,"");
// "Free" is only claimed when the studio enables it in settings.
export const consultationLabel = (studio:Pick<Studio,"free_consultation">) => studio.free_consultation?"Get a Free Initial Consultation":"Book a Consultation";
export const whatsappLink = (number:string,text="") => "https://wa.me/"+number.replace(/\D/g,"")+(text?"?text="+encodeURIComponent(text):"");
export const serviceInterests:Record<string,string> = {"residential-architecture":"Architectural Design","commercial-architecture":"Architectural Design","architectural-design":"Architectural Design","interior-design":"Interior Design","urban-planning":"Urban Planning","renovation":"Renovation and Remodeling","visualization":"3D Visualization","consultation":"Architecture Consultation"};
export const processSteps = [
  {title:"Discover",description:"Listen closely, study the site, and define a brief around the way you want to live or work."},
  {title:"Design",description:"Test spatial ideas, daylight, and material character through sketches and models."},
  {title:"Develop",description:"Refine the design and coordinate drawings, materials, and consultant input."},
  {title:"Deliver",description:"Work with the project team to carry the intent through construction and handover."}
];
export type Collection<T> = {items:T[];total:number};
export const heroImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85";
export const studioImage = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85";
export const defaultStudio:Studio = seed.settings[0];

export async function refreshPublishedContent(){
  // The server verifies the staff session before invalidating public content.
  await fetch("/internal/revalidate",{method:"POST"}).catch(()=>null);
}

export async function request<T>(path:string, method="GET", payload?:unknown):Promise<T>{
  const form=payload instanceof FormData;
  const response=await fetch("/api/"+path,{method,cache:"no-store",
    headers:payload!==undefined&&!form?{"Content-Type":"application/json"}:undefined,
    body:payload===undefined?undefined:form?payload:JSON.stringify(payload)});
  const result=await response.json().catch(()=>null);
  if(!response.ok){
    const detail=result?.detail;
    const message=Array.isArray(detail)?detail.map(entry=>entry.loc?.at(-1)+": "+entry.msg).join(" · "):detail;
    throw new Error(message || (response.status===413?"The upload is too large. Please choose a smaller image.":response.status===401?"Your session has expired. Sign in again before saving.":response.status===403?"This request was blocked. Check that you are signed in with permission to update this content.":"The service is unavailable. Please try again."));
  }
  if(path.startsWith("admin/")&&method!=="GET"){
    // A failed invalidation must not turn a committed save into an apparent failure.
    await refreshPublishedContent();
  }
  return result;
}
