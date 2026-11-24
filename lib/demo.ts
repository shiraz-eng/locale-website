import {standardDetail} from "./detail-layout";
import {materialSection,projectProcessSection} from "./project-detail-defaults";
import seed from "../data/studio.json";
import {demoResidentialSections} from "./demo-services";
import {icons,type Appearance,type ProjectCard,type ProjectDoc,type ProjectsPage,type Section,type Seo,type ServiceCard,type ServiceDoc,type ServicesPage} from "./services";

export const fixturePreview=()=>process.env.DEMO_MODE==="true"&&!process.env.API_ORIGIN;

const seo:Seo={title:"",description:"",og_image:null,canonical:""};
const appearance:Appearance={background:"white",text:"default",accent:"gold",align:"left",spacing:"normal"};
const primary=(label:string,href="/plan-your-project")=>({label,href,style:"primary" as const,visible:true});
const drawings=[
  {image:"/portfolio/sketch.webp",alt:"Concept Sketch",caption:"Concept Sketch"},
  {image:"/portfolio/plan.webp",alt:"Ground Floor Plan",caption:"Ground Floor Plan"},
  {image:"/portfolio/section.webp",alt:"Section A–A",caption:"Section A–A"},
];
const hero=(heading:string,subheading:string,image:string|null):Section=>({
  id:"hero",enabled:true,appearance,type:"hero",eyebrow:"Atelier Arc",heading,subheading,
  image,image_alt:heading,buttons:[primary("Start Your Project")],layout:image?"full":"centered",
});
const category=(name:string)=>({name,slug:name.toLowerCase().replaceAll(" ","-")});
const samples:Record<string,{title:string;location:string;image:string;detail:string;caption:string;extra:string;extraCaption:string}> = {
  "courtyard-house":{title:"Lakeside Villa",location:"Islamabad, Pakistan",image:"/portfolio/villa.webp",detail:"/portfolio/villa-detail.webp",caption:"Pool terrace at dusk",extra:"/portfolio/villa-garden.webp",extraCaption:"Landscaped approach at blue hour"},
  "assembly-workplace":{title:"The Axis Office Tower",location:"Karachi, Pakistan",image:"/portfolio/office.webp",detail:"/portfolio/office-detail.webp",caption:"Entrance canopy and arrival plaza",extra:"/portfolio/office-lobby.webp",extraCaption:"Double-height reception lobby"},
  "linen-loft":{title:"Serene Residence",location:"Lahore, Pakistan",image:"/portfolio/interior.webp",detail:"/portfolio/interior-detail.webp",caption:"Fireplace and garden-facing lounge",extra:"/portfolio/interior-detail-materials.webp",extraCaption:"Walnut reading nook and garden view"},
};

export const demoProjects:ProjectCard[]=seed.projects.map(row=>({
  slug:row.slug,title:samples[row.slug]?.title??row.title,category:category(row.category),location:samples[row.slug]?.location??row.location,year:row.year,
  status:row.status,featured:row.featured,cover_image:samples[row.slug]?.image??row.image,cover_alt:samples[row.slug]?.title??row.title,description:row.description,
}));
const sampleOrder=["courtyard-house","assembly-workplace","linen-loft"];
export const demoFeaturedRank=(slug:string)=>sampleOrder.includes(slug)?sampleOrder.indexOf(slug):sampleOrder.length;
export const demoCategories=[...new Set(seed.projects.map(row=>row.category))].map(category);

export function demoProject(slug:string):ProjectDoc|null{
  const index=demoProjects.findIndex(row=>row.slug===slug);
  if(index<0)return null;
  const card=demoProjects[index],row=seed.projects[index];
  const sample=samples[slug];
  const gallery=sample?[
    {image:sample.image,alt:card.title,caption:card.title},
    {image:sample.detail,alt:sample.caption,caption:sample.caption},
    {image:sample.extra,alt:sample.extraCaption,caption:sample.extraCaption},
  ]:row.gallery.map(image=>({image,alt:card.title,caption:""}));
  const lakeside=slug==="courtyard-house";
  const description=lakeside?"A contemporary lakeside residence that blends modern architecture with natural surroundings, creating a serene and luxurious living experience.":card.description;
  return standardDetail({...card,schema_version:1,category_id:demoCategories.findIndex(item=>item.slug===card.category.slug)+1,
    status:row.status==="Completed"?"Completed":"Concept",area:lakeside?"6,500 sq. ft.":row.area,year:lakeside?2024:row.year,
    description,style:"",client:"",client_approved:false,seo,
    sections:[
      {...hero(card.title,description,lakeside?"/portfolio/villa.webp":card.cover_image),
        eyebrow:"",buttons:[primary("Start a Similar Project","/contact?project="+slug)]} as Section,
      {id:"facts",enabled:true,appearance:{...appearance,spacing:"compact"},type:"specs",heading:"",source:"project",items:[],layout:"bar"},
      {id:"overview",enabled:true,appearance,type:"overview",heading:"Project overview",body:row.concept,
        nav_label:"Overview",facts:false,image:null,image_alt:"",video:null,caption:"",layout:"media-right"},
      {id:"gallery",enabled:true,appearance,type:"gallery",heading:"Gallery",intro:"",layout:"grid-3",
        nav_label:"Gallery",images:gallery},
      ...(lakeside?[
        {id:"drawings",enabled:true,appearance,type:"gallery" as const,heading:"Concept Drawings",intro:"Illustrative studies of the villa, from perspective sketch to floor plan and building section.",nav_label:"Drawings",layout:"grid-3" as const,images:drawings},
        materialSection,
        projectProcessSection,
      ]:[]),
    ]});
}

const servicePhotos:Record<string,string>={
  "architectural-design":"/portfolio/residential.webp",
  "commercial-architecture":"/portfolio/office.webp",
  "interior-design":"/portfolio/interior.webp",
  renovation:"/portfolio/services/renovation.jpg",
  visualization:"/portfolio/services/visualization.jpg",
  consultation:"/portfolio/services/consultation.jpg",
};
const serviceNames:Record<string,string>={
  "architectural-design":"Residential Architecture",renovation:"Renovation & Remodeling",
  visualization:"3D Visualization",consultation:"Architectural Consultation",
};
const fixtureServices=seed.services.filter(row=>row.slug!=="urban-planning");
fixtureServices.splice(1,0,{slug:"commercial-architecture",title:"Commercial Architecture",icon:"building-2",
  description:"Design for workplaces, hospitality, and mixed-use spaces.",benefits:["Functional layouts","Design aligned with your brand"]});
const serviceCards=(rows:typeof seed.services):ServiceCard[]=>rows.map(row=>({
  slug:row.slug,name:serviceNames[row.slug]??row.title,category:"",short_description:row.description,highlights:row.benefits,
  icon:Object.hasOwn(icons,row.icon)?row.icon as ServiceCard["icon"]:"building",
  featured:false,card_image:servicePhotos[row.slug]??null,card_alt:"",
}));
export const demoServices=serviceCards(fixtureServices);

export function demoService(slug:string):ServiceDoc|null{
  const card=demoServices.find(row=>row.slug===slug)??serviceCards(seed.services).find(row=>row.slug===slug);
  if(!card)return null;
  const details:Section[]=slug==="architectural-design"?demoResidentialSections:[
    {id:"benefits",enabled:true,appearance,type:"benefits",heading:"What’s Included",intro:"",layout:"list",
      items:(card.highlights??[]).map(title=>({title,description:"",icon:"check"}))},
  ];
  return standardDetail({...card,schema_version:1,description:card.short_description,highlights:card.highlights??[],seo,
    sections:[hero(card.name,card.short_description,card.card_image),...details]});
}

export const demoProjectsPage:ProjectsPage={
  schema_version:1,eyebrow:"Our Portfolio",heading:"Featured *Projects*",description:"A showcase of our architectural, interior, and renovation projects that bring design vision to life.",
  hero_image:"/portfolio/villa.webp",hero_alt:"Lakeside Villa",buttons:[primary("Start a Project")],page_size:6,default_sort:"featured",show_gallery:false,
  show_stats:true,stats:[{value:"150+",label:"Projects Completed",icon:"building"},{value:"12+",label:"Design Awards",icon:"award"},
    {value:"50+",label:"Happy Clients",icon:"users"},{value:"98%",label:"Client Satisfaction",icon:"leaf"}],
  cta_heading:"Start a project",cta_text:"Tell us what you have in mind.",
  cta_buttons:[{label:"Contact us",href:"/contact",style:"primary",visible:true}],seo,
};
export const demoServicesPage:ServicesPage={
  schema_version:1,eyebrow:"Our Services",heading:"Architecture & Design Services",subheading:"End-to-end architectural solutions from concept to completion, crafted for modern living and lasting value.",
  hero_image:"/portfolio/residential.webp",hero_alt:"Contemporary architecture",buttons:[primary("Plan Your Project"),{label:"Book a Consultation",href:"/contact?type=consultation",style:"secondary",visible:true,icon:"calendar"}],
  services_eyebrow:"Our Core Services",services_heading:"Our Core Services",services_intro:"A complete range of architectural and design services tailored to your needs, from residential homes to large-scale commercial spaces.",
  cta_heading:"Discuss your project",cta_text:"Tell us what you have in mind.",
  cta_button:{label:"Contact us",href:"/contact",style:"primary",visible:true},
  benefits:[],show_projects:true,projects_heading:"Selected projects",seo,
};
