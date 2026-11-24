"use client";
import type {ServiceDoc} from "../../lib/services";
import {standardDetail} from "../../lib/detail-layout";
import {ImageInput} from "./records";
import {Card} from "./ui";
import {DocumentEditor,Field,IconPicker,RichEditor,sectionTitle,type EditorConfig} from "./section-builder";
const config:EditorConfig<ServiceDoc>={api:"admin/services",base:"/services",noun:"service",label:doc=>doc.name,summary:doc=>doc.short_description,
  switcher:item=>String(item.name),mediaLabel:"Card image",
  template:{name:"Residential Architecture · default service layout",sections:["Hero","What’s Included","Design Process","Selected Projects","Why Choose Us","Consultation"],description:"Residential Architecture structure: hero, included services, collaborative process, selected projects, strengths, and consultation.",apply:doc=>standardDetail(doc,true)},
  context:(doc,catalog,testimonials)=>({service:doc.slug,projects:catalog.projects,testimonials,crumbs:[{label:"Services",href:"/services"},{label:doc.name}]}),
  panels:(doc,set,detail,jump)=>({
    general:<div className="ad-stack">
      <Card title="Basic information"><div className="ad-form-grid"><div className="ad-full ad-basic-cover"><ImageInput label="Service card image" help="Updates service cards and a matching hero image. Use Hero & introduction to customize it separately." value={doc.card_image??""} onChange={url=>set("card_image",url||null)}/><Field path="card_alt" label="Image description" help="Describe the image for visitors using screen readers."><input value={doc.card_alt} onChange={event=>set("card_alt",event.target.value)} maxLength={200}/></Field></div>
        <Field path="name" label="Service name" max={120} value={doc.name}><input value={doc.name} maxLength={120} onChange={event=>set("name",event.target.value)}/></Field>
        <Field path="slug" label="URL slug" help={detail.live_slug&&detail.live_slug!==doc.slug?`Live at /services/${detail.live_slug} until you publish; the old URL will then redirect.`:"/services/"+doc.slug}><input value={doc.slug} maxLength={120} onChange={event=>set("slug",event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))}/></Field>
        <Field path="category" label="Category" max={60} value={doc.category} help="Used to group and filter services, e.g. Architecture"><input value={doc.category} maxLength={60} onChange={event=>set("category",event.target.value)}/></Field>
        <Field path="icon" label="Icon"><IconPicker value={doc.icon} onChange={value=>set("icon",value as ServiceDoc["icon"])}/></Field>
        <div className="ad-full"><Field path="short_description" label="Short description" max={300} value={doc.short_description} help="Shown on service cards and used as the default search description."><textarea rows={2} maxLength={300} value={doc.short_description} onChange={event=>set("short_description",event.target.value)}/></Field></div>
        <div className="ad-full"><Field path="highlights" label="Card highlights (optional)" help="Up to 4 short points shown on the service card, one per line."><textarea rows={4} value={(doc.highlights??[]).join("\n")} onChange={event=>set("highlights",event.target.value.split("\n").slice(0,4).map(line=>line.slice(0,80)))}/></Field></div>
        <div className="ad-full"><RichEditor label="Detailed description" path="description" max={4000} value={doc.description} onChange={value=>set("description",value)} help="Used by the AI assistant and for internal reference. Add a Rich text section to show text on the page."/></div>
        <label className="ad-check ad-full"><input type="checkbox" checked={doc.featured} onChange={event=>set("featured",event.target.checked)}/> Featured service</label></div></Card>

    </div>,
    media:<Card title="Card image"><div className="ad-stack"><ImageInput label="Card image" help="Shown on the services overview and homepage cards." value={doc.card_image??""} onChange={url=>set("card_image",url||null)}/>
      <Field path="card_alt" label="Card image alt text" max={200} value={doc.card_alt}><input value={doc.card_alt} maxLength={200} onChange={event=>set("card_alt",event.target.value)}/></Field>
      <p className="ad-small">Hero, gallery and other page images are edited in their sections: {doc.sections.filter(section=>section.type==="hero"||section.type==="gallery"||section.type==="image_text").map(section=><button key={section.id} type="button" className="ad-link ad-plain" onClick={()=>jump(section.id)}>{sectionTitle(section)}</button>)}</p></div></Card>})};
export default function ServiceEditorPage({id}:{id:string}){return <DocumentEditor id={id} config={config}/>}
