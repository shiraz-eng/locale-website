import type {ReactNode} from "react";
import "./editorial.css";
import "./reviews.css";
import Reviews from "../../components/reviews";
import Assistant from "../../components/assistant";
import JsonLd from "../../components/json-ld";
import {Footer} from "../../components/site";
import {siteUrl} from "../../lib/content";
import {navigation,previewing,site,studio} from "../../lib/server";
export default async function PublicLayout({children}:{children:ReactNode}){
  const [settings,{content,ai},preview,menu]=await Promise.all([studio(),site(),previewing(),navigation()]);
  const sameAs=[settings.instagram,settings.linkedin].filter(Boolean);
  return <><JsonLd data={{"@context":"https://schema.org","@type":"ProfessionalService",name:settings.title,description:settings.intro,url:siteUrl,email:settings.email,telephone:settings.phone,address:settings.location,areaServed:settings.location,...(settings.logo?{logo:settings.logo.startsWith("/")?siteUrl+settings.logo:settings.logo}:{}),...(sameAs.length?{sameAs}:{})}}/>{preview&&<div className="preview-bar" role="status">Preview mode: you are seeing unpublished drafts. <a href="/preview?exit=1">Exit preview</a></div>}{children}<Reviews quotes={settings.testimonials||[]} demo={process.env.DEMO_MODE==="true"}/><Footer menu={menu} studio={settings} tagline={content?.footer_tagline}/>{ai.assistant&&<Assistant brand={settings.title} introduction={ai.introduction} examples={ai.example_questions}/>}</>
}
