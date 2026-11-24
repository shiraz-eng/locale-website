import EditorialHero from "../../../components/editorial-hero";
import {CalendarDays,Phone,Mail,MapPin,Headphones,Layers,Leaf,Gem,ArrowUpRight} from "lucide-react";
import Link from "next/link";
import ArchitectureImage from "../../../components/home/architecture-image";
import {editablePage,publicContactForm} from "../../../lib/server";
import EditablePage from "../../../components/editable-page";
import {pageMetadata} from "../../../lib/server";
import ContactForm,{type RequestKind} from "../../../components/contact-form";
import {WhatsApp} from "../../../components/tracked-link";
import {serviceInterests,type Project} from "../../../lib/content";
import {item,services,studio} from "../../../lib/server";
export const generateMetadata=()=>pageMetadata("/contact",{title:"Contact the studio",description:"Book a consultation, request a quotation, or ask the studio a question about your architecture or interior design project."});
type Params={type?:string;consultation?:string;project?:string;service?:string};
const slug=(value?:string)=>value&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=120?value:undefined;
async function Contact({searchParams}:{searchParams:Promise<Params>}){
  const [settings,params,initialSchema]=await Promise.all([studio(),searchParams,publicContactForm()]);
  const kind:RequestKind=params.type==="quotation"?"quotation":params.type==="consultation"||params.consultation==="1"?"consultation":"inquiry";
  const projectSlug=slug(params.project),service=slug(params.service);
  const [project,published]=await Promise.all([projectSlug?item<Project>("projects",projectSlug):null,service?services():[]]);
  const chosen=published.find(entry=>entry.slug===service);
  const page=await editablePage("contact");
  return <div className="editorial-page"><EditorialHero image={page?.hero_image||undefined} label="Contact us" title={page?.heading||"Let’s Build Something Together"} description={page?.description||"Have a project in mind or planning a space transformation? We’d love to hear your ideas and discuss how we can bring them to life."}><div className="journal-topics"><Link href="#message"><CalendarDays size={19}/>Book a Consultation</Link><a href={"tel:"+settings.phone}><Phone size={19}/>Speak with Our Team</a><Link href="#message"><Mail size={19}/>Send a Message</Link></div></EditorialHero>
    <section className="shell contact-layout" id="message"><div className="contact-message"><ContactForm initialSchema={initialSchema} kind={kind} project={project?{slug:project.slug,title:project.title}:undefined} service={chosen?{slug:chosen.slug,name:chosen.name}:undefined}/></div><aside className="contact-details"><h2>Get in Touch</h2><p>Prefer to reach out directly? Here are our contact details.</p><dl>{[{Icon:MapPin,label:"Our Office",value:settings.location,href:""},{Icon:Phone,label:"Call Us",value:settings.phone,href:"tel:"+settings.phone},{Icon:Mail,label:"Email Us",value:settings.email,href:"mailto:"+settings.email}].map(({Icon,label,value,href})=><div key={label}><span className="contact-detail-icon"><Icon size={25}/></span><div><dt>{label}</dt><dd>{href?<a href={href}>{value}</a>:value}</dd></div></div>)}</dl>{settings.whatsapp&&<WhatsApp number={settings.whatsapp} text="Hello, I’d like to discuss a project."/>}<ArchitectureImage className="contact-sketch" src="/portfolio/sketch.webp" alt="Architectural concept sketch" width={836} height={470}/></aside></section>
    <section className="shell contact-benefits">{[{Icon:Headphones,title:"Expert Consultation",text:"Personalized guidance for your space."},{Icon:Layers,title:"Tailored Solutions",text:"Designs that fit your needs and lifestyle."},{Icon:Leaf,title:"Sustainable Approach",text:"People, spaces, and the environment in balance."},{Icon:Gem,title:"End-to-End Support",text:"From idea to execution, we’re with you."}].map(({Icon,title,text})=><div key={title}><Icon size={30}/><div><h3>{title}</h3><p>{text}</p></div></div>)}</section>
    <section className="shell contact-office"><iframe className="map" title="Studio office location" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" src={"https://maps.google.com/maps?output=embed&q="+encodeURIComponent(settings.location)}/><div><p className="editorial-kicker">Come say hello</p><h2>Visit Our Office</h2><p>We’d be happy to welcome you at our studio. Schedule a visit and let’s discuss your project in person.</p><Link className="button outline" href="/contact?type=consultation#message"><CalendarDays size={18}/>Book an Office Visit <ArrowUpRight size={16}/></Link></div></section></div>;

}

export default async function CmsPage(props:Parameters<typeof Contact>[0]){
  return <EditablePage slug="contact">{await Contact(props)}</EditablePage>;
}
