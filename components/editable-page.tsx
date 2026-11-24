import type {ReactNode} from "react";
import {editablePage} from "../lib/server";
import {fontClasses} from "./home/fonts";
import ServiceSections from "./service-sections";
import "../app/(public)/home.css";

export default async function EditablePage({slug,children}:{slug:string;children:ReactNode}){
  const doc=await editablePage(slug);
  if(!doc)return <>{children}</>;
  const context={service:"",projects:[],testimonials:[]};
  return <div className={"aa-home editable-page "+fontClasses}>
    {!doc.show_original&&(doc.heading||doc.description)&&<header className="section shell"><h1>{doc.heading}</h1>{doc.description&&<p>{doc.description}</p>}</header>}
    <ServiceSections sections={doc.sections} context={context}/>
    {doc.show_original&&children}
    <ServiceSections sections={doc.after_sections} context={context}/>
  </div>;
}
