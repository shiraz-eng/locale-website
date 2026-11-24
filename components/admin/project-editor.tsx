"use client";
import {standardDetail} from "../../lib/detail-layout";
import Link from "next/link";
import type {ProjectDoc} from "../../lib/services";
import {ImageInput} from "./records";
import {Card} from "./ui";
import {DocumentEditor,Field,sectionTitle,type EditorConfig} from "./section-builder";
const STATUSES=["Concept","In Progress","Completed"] as const;
const config:EditorConfig<ProjectDoc>={api:"admin/projects",base:"/projects",noun:"project",label:doc=>doc.title,summary:doc=>doc.description,
  switcher:item=>String(item.title),mediaLabel:"Cover & media",
  template:{name:"Lakeside Villa · default project layout",sections:["Hero","Project Facts","Overview","Gallery","Drawings","Materials","Video","Process"],description:"Lakeside Villa structure: hero, project facts, Overview, Gallery, Drawings, Materials, Video, and Process tabs.",apply:doc=>standardDetail(doc,true)},
  context:(doc,catalog,testimonials)=>({service:doc.slug,current:doc.slug,projects:catalog.projects,testimonials,crumbs:[{label:"Projects",href:"/projects"},{label:catalog.categories.find(item=>item.id===doc.category_id)?.name??"",href:"/projects"},{label:doc.title}].filter(item=>item.label),
    facts:{category:catalog.categories.find(item=>item.id===doc.category_id)?.name??"",location:doc.location,year:doc.year,area:doc.area,status:doc.status,style:doc.style,client:doc.client_approved?doc.client:""}}),
  panels:(doc,set,detail,jump,catalog)=>({
    general:<div className="ad-stack">
      <Card title="Basic information"><div className="ad-form-grid"><div className="ad-full ad-basic-cover"><ImageInput label="Project cover image" help="Updates project cards and a matching hero image. Use Hero & introduction to customize it separately." value={doc.cover_image??""} onChange={url=>set("cover_image",url||null)}/><Field path="cover_alt" label="Image description" help="Describe the image for visitors using screen readers."><input value={doc.cover_alt} onChange={event=>set("cover_alt",event.target.value)} maxLength={200}/></Field></div>
        <Field path="title" label="Project title" max={160} value={doc.title}><input value={doc.title} maxLength={160} onChange={event=>set("title",event.target.value)}/></Field>
        <Field path="slug" label="URL slug" help={detail.live_slug&&detail.live_slug!==doc.slug?`Live at /projects/${detail.live_slug} until you publish; the old URL will then redirect.`:"/projects/"+doc.slug}><input value={doc.slug} maxLength={120} onChange={event=>set("slug",event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))}/></Field>
        <Field path="category_id" label="Category" help={<>Manage the list in <Link className="ad-link" href="/admin/projects/categories">Categories</Link>.</>}><select value={doc.category_id} onChange={event=>set("category_id",Number(event.target.value))}>{catalog.categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field path="status" label="Project status"><select value={doc.status} onChange={event=>set("status",event.target.value as ProjectDoc["status"])}>{STATUSES.map(value=><option key={value}>{value}</option>)}</select></Field>
        <Field path="location" label="Location" max={120} value={doc.location}><input value={doc.location} maxLength={120} onChange={event=>set("location",event.target.value)}/></Field>
        <Field path="year" label="Year"><input type="number" min={1800} max={2200} value={doc.year??""} onChange={event=>set("year",event.target.value?Number(event.target.value):null)}/></Field>
        <Field path="area" label="Area" max={60} value={doc.area} help="As you want it shown, e.g. 8,500 sq ft"><input value={doc.area} maxLength={60} onChange={event=>set("area",event.target.value)}/></Field>
        <Field path="style" label="Architectural style" max={80} value={doc.style}><input value={doc.style} maxLength={80} onChange={event=>set("style",event.target.value)}/></Field>
        <Field path="client" label="Client name" max={120} value={doc.client} help="Shown only when the client has approved being named."><input value={doc.client} maxLength={120} onChange={event=>set("client",event.target.value)}/></Field>
        <label className="ad-check" style={{alignSelf:"end"}}><input type="checkbox" checked={doc.client_approved} onChange={event=>set("client_approved",event.target.checked)}/> Client approved public display</label>
        <div className="ad-full"><Field path="description" label="Short description" max={600} value={doc.description} help="Shown on project cards, list view and as the default search description."><textarea rows={3} maxLength={600} value={doc.description} onChange={event=>set("description",event.target.value)}/></Field></div>
        <label className="ad-check ad-full"><input type="checkbox" checked={doc.featured} onChange={event=>set("featured",event.target.checked)}/> Featured project (listed first and eligible for the homepage)</label></div></Card>
    </div>,
    media:<Card title="Cover image"><div className="ad-stack"><ImageInput label="Cover image" help="Used on project cards and as the social sharing fallback." value={doc.cover_image??""} onChange={url=>set("cover_image",url||null)}/>
      <Field path="cover_alt" label="Cover image alt text" max={200} value={doc.cover_alt}><input value={doc.cover_alt} maxLength={200} onChange={event=>set("cover_alt",event.target.value)}/></Field>
      <p className="ad-small">The hero image and the project gallery are edited in their sections: {doc.sections.filter(section=>section.type==="hero"||section.type==="gallery"||section.type==="image_text"||section.type==="materials"||section.type==="project_process").map(section=><button key={section.id} type="button" className="ad-link ad-plain" onClick={()=>jump(section.id)}>{sectionTitle(section)}</button>)}</p></div></Card>})};
export default function ProjectEditorPage({id}:{id:string}){return <DocumentEditor id={id} config={config}/>}
