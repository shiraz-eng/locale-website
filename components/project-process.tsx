import {icons,type Section} from "../lib/services";
import type {ProjectFacts} from "./service-sections";
import Image from "./home/architecture-image";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,Box,CalendarDays,ClipboardList,DraftingCompass,HardHat,Key,Layers,Lightbulb,Scan,ShieldCheck,Users} from "lucide-react";

const defaultStages=[
  {title:"Discovery & Brief",description:"Understand your vision, needs, and project goals.",duration:"1–2 weeks",image:"/portfolio/process/discovery.jpg",Icon:Lightbulb},
  {title:"Concept Design",description:"Explore design ideas, layouts, and visual direction.",duration:"2–4 weeks",image:"/portfolio/process/concept.jpg",Icon:Layers},
  {title:"Design Development",description:"Refine plans, materials, and technical details.",duration:"4–6 weeks",image:"/portfolio/process/development.jpg",Icon:DraftingCompass},
  {title:"Execution",description:"Build with regular progress updates and quality checks.",duration:"12–18 weeks",image:"/portfolio/process/execution.jpg",Icon:HardHat},
  {title:"Handover",description:"Complete the final inspection and hand over the finished home.",duration:"1 week",image:"/portfolio/villa.webp",Icon:Key},
];

const defaultDeliverables=[
  {label:"Conceptual Layouts",Icon:Scan},{label:"Detailed Drawings",Icon:Layers},{label:"3D Visualizations",Icon:Box},
  {label:"Material Specifications",Icon:DraftingCompass},{label:"Project Schedule",Icon:ClipboardList},{label:"Quality Reports",Icon:ShieldCheck},
];

const defaultTeam=[
  {role:"Architect",image:"architect"},{role:"Interior Designer",image:"designer"},
  {role:"Project Manager",image:"manager"},{role:"Site Supervisor",image:"supervisor"},
];

export default function ProjectProcess({section,slug,facts}:{section?:Extract<Section,{type:"project_process"}>;slug?:string;facts?:ProjectFacts}={}){
  const stages=section?section.items.map(item=>({...item,Icon:icons[item.icon]})):defaultStages;
  const deliverables=section?section.deliverables.map(item=>({label:item.title,Icon:icons[item.icon]})):defaultDeliverables;
  const team=section?section.team.map(item=>({role:item.title,image:item.image})):defaultTeam;
  const highlights=facts?[
    {label:"Project Type",value:facts.category},{label:"Architectural Style",value:facts.style},
    {label:"Location",value:facts.location},{label:"Area",value:facts.area},{label:"Status",value:facts.status},
  ].filter(item=>item.value):[];
  return <div className="pp">
    <header className={"pp-intro"+(!section?.image?" pp-intro-no-media":"")}>
      <div><p className="aa-kicker">Our Approach</p><h2>{section?.heading||"Design & Build Process"}</h2><p>{section?.intro??"From the first conversation to the final walkthrough, each stage turns your ideas into decisions we can build from."}</p></div>
      {section?.image&&<Image src={section.image} alt={section.image_alt||"Architectural concept sketch"} width={836} height={470} sizes="(max-width: 700px) 90vw, 45vw"/>}
    </header>
    <ol className="pp-stages">
      {stages.map(({title,description,image,Icon},index)=><li key={title}>
        <span className="pp-number">{String(index+1).padStart(2,"0")}</span>
        <div className="pp-stage-image"><Image src={image} alt="" fill sizes="(max-width: 600px) 90vw, (max-width: 1050px) 45vw, 20vw"/></div>
        <div className="pp-stage-copy"><Icon size={25} strokeWidth={1.5} aria-hidden="true"/><div><h3>{title}</h3><p>{description}</p></div></div>
        {index<stages.length-1&&<ArrowRight className="pp-connector" size={20} aria-hidden="true"/>}
      </li>)}
    </ol>
    <div className="pp-details">
      <section className="pp-panel"><h3><CalendarDays size={21} aria-hidden="true"/>{highlights.length?"Project Highlights":"Process Timeline"}</h3>
        {highlights.length>0&&<dl className="pp-highlights">{highlights.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>}
        {(section?.timeline_intro||!facts)&&<p>{section?.timeline_intro??"Indicative durations for this concept."}</p>}
        <dl className="pp-timeline">{stages.filter(stage=>stage.duration).map(({title,duration})=><div key={title}><dt>{title}</dt><dd>{duration}</dd></div>)}</dl>
      </section>
      <section className="pp-panel"><h3><Layers size={21} aria-hidden="true"/>Key Deliverables</h3>
        <ul className="pp-deliverables">{deliverables.map(({label,Icon})=><li key={label}><Icon size={19} aria-hidden="true"/>{label}</li>)}</ul>
      </section>
      <section className="pp-panel"><h3><Users size={21} aria-hidden="true"/>Our Project Team</h3><p>{section?.team_intro??"Illustrative roles across design, coordination, and construction."}</p>
        <ul className="pp-team">{team.map(({role,image})=><li key={role}><Image src={image.startsWith("/")||image.startsWith("https://")?image:`/portfolio/process/${image}.jpg`} alt="" width={60} height={60}/>{role}</li>)}</ul>
        {!team.length&&<Link className="pp-team-contact" href="/contact">Meet your project team <ArrowUpRight size={15}/></Link>}
      </section>
    </div>
    <div className="pp-cta" style={section?.cta_image?{backgroundImage:`linear-gradient(90deg,#191919e8,#19191966),url(${JSON.stringify(section.cta_image)})`}:undefined}><div><h3>{section?.cta_heading??"Let’s Build Your Dream Space"}</h3><p>{section?.cta_text??"Tell us what you have in mind and take the first step toward a space designed around you."}</p></div>
      {section?section.buttons.filter(button=>button.visible).map((button,index)=><Link key={index} className="aa-button sv-primary" href={slug?button.href.replace("{slug}",slug):button.href}>{button.label}<ArrowUpRight size={17}/></Link>):<Link className="aa-button sv-primary" href="/contact?type=consultation">Book a Consultation <ArrowUpRight size={17}/></Link>}

    </div>
  </div>;
}
