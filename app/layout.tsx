import {headers} from "next/headers";
import type {Metadata} from "next";
import type {ReactNode} from "react";
import Nav from "../components/nav";
import {fontClasses} from "../components/home/fonts";
import {siteUrl} from "../lib/content";
import {navigation,services,studio} from "../lib/server";
import "./globals.css";
import "./design-tokens.css";
import "./design-system.css";
import "./brand-theme.css";
import "./assistant.css";
export async function generateMetadata():Promise<Metadata>{
  const settings=await studio();
  const description=settings.intro||`${settings.title} is an architecture and interior design studio.`;
  return {metadataBase:new URL(siteUrl),title:{default:`${settings.title} | Architecture & Interior Design Studio`,template:`%s | ${settings.title}`},description,
  openGraph:{type:"website",siteName:settings.title,title:`${settings.title} | Architecture & Interior Design Studio`,description,images:[{url:"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=630&q=80",width:1200,height:630,alt:"Contemporary residence with broad glazed openings"}]},
  twitter:{card:"summary_large_image"},robots:{index:true,follow:true}};
}
export default async function Layout({children}:{children:ReactNode}){
  await headers();
  const [settings,offered,menu]=await Promise.all([studio(),services(),navigation()]);
  return <html lang="en" className={fontClasses}><body><a className="skip-link" href="#main">Skip to content</a><Nav content={menu} studio={settings} services={offered.map(({slug,name})=>({slug,name}))}/><main id="main">{children}</main></body></html>
}
