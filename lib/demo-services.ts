import type {Appearance,Feature,Section,Step} from "./services";

const white:Appearance={background:"white",text:"default",accent:"gold",align:"left",spacing:"normal"};
const soft:Appearance={...white,background:"soft"};
const serviceCTA=(label:string,href:string)=>({label,href,style:"primary" as const,visible:true});

const deliverables:Feature[]=[
  {title:"Concept & Design Development",description:"Develop the initial brief into a clear architectural direction.",icon:"layers"},
  {title:"Site & Feasibility Studies",description:"Identify what the site can support and which constraints will shape the design.",icon:"map"},
  {title:"Planning & Approvals",description:"Prepare drawings and coordinate information for the approvals process.",icon:"file-check"},
  {title:"Detailed Design & Documentation",description:"Translate the design into coordinated drawings and specifications.",icon:"drafting-compass"},
  {title:"Project Coordination",description:"Align the work of consultants, engineers, and the build team.",icon:"box"},
  {title:"Material & Finishes Guidance",description:"Choose materials that suit the site, the design, and everyday use.",icon:"leaf"},
];
const process:Step[]=[
  {title:"Discover & Align",description:"Discuss your goals, site, lifestyle, and project priorities."},
  {title:"Design & Explore",description:"Compare layouts and concepts to find the right direction."},
  {title:"Develop & Refine",description:"Work through details, materials, and consultant input."},
  {title:"Approve & Prepare",description:"Coordinate drawings for approvals and construction."},
  {title:"Build & Realise",description:"Support the build team as the design takes shape."},
];
const strengths:Feature[]=[
  {title:"People-Centred Design",description:"Spaces shaped around how you live, work, and gather.",icon:"users"},
  {title:"Site-Responsive Solutions",description:"Designs informed by the landscape, climate, and local character.",icon:"leaf"},
  {title:"Design to Delivery",description:"A coordinated path from early ideas to build-ready drawings.",icon:"layers"},
  {title:"Lasting Value",description:"Thoughtful choices that serve the building well over time.",icon:"gem"},
];
const timeline=(heading:string,appearance:Appearance):Section=>({
  id:"process",enabled:true,appearance,type:"process",heading,intro:"A collaborative process from first ideas to a build-ready design.",
  layout:"timeline",items:process,
});
const reasons=(heading:string):Section=>({
  id:"why-us",enabled:true,appearance:white,type:"features",heading,intro:"A design-led approach grounded in people, place, and lasting value.",
  layout:"strip",items:strengths,
});
const consultation=(heading:string,href:string):Section=>({
  id:"consultation",enabled:true,appearance:white,type:"cta",heading,text:"Share your ideas with the studio and explore how we can bring your project to life.",
  layout:"banner",image:"/portfolio/services/banner.jpg",image_alt:"Sunlit seating area overlooking a garden",buttons:[serviceCTA("Book Consultation",href)],
});

export const demoServicesIntro:Section[]=[
  {id:"deliverables",enabled:true,appearance:white,type:"features",heading:"What We Deliver",
    intro:"A complete design service from early ideas to coordinated documentation.",layout:"grid-3",items:deliverables},
  timeline("Our Design Process",soft),
];
export const demoServicesClosing=[reasons("Why Clients Choose Us"),consultation("Book a Consultation","/contact?type=consultation")];

export const demoResidentialSections:Section[]=[
  {id:"included",enabled:true,appearance:white,type:"features",heading:"What’s Included",
    intro:"A residential design service tailored to your site, lifestyle, and long-term goals.",layout:"grid-3",
    items:[
      {title:"Site and Feasibility Studies",description:"Assess the site, planning context, and design opportunities.",icon:"map-pin"},
      {title:"Concept Design",description:"Explore form, layout, and character with you.",icon:"layers"},
      {title:"Space Planning",description:"Create layouts that make good use of space, daylight, and circulation.",icon:"layout-grid"},
      {title:"Design Development",description:"Refine the details and material choices for coordination.",icon:"drafting-compass"},
      {title:"Coordination Drawings",description:"Prepare drawings for consultant input, approvals, and delivery.",icon:"file-text"},
      {title:"Material Guidance",description:"Select finishes and details that work together throughout the home.",icon:"palette"},
    ]},
  timeline("A Clear, Collaborative Process",soft),
  {id:"residential-projects",enabled:true,appearance:white,type:"related_projects",heading:"Residential Projects",intro:"",
    source:"manual",categories:[],projects:["courtyard-house","stillwater-residence","ridge-house"],limit:3,layout:"grid-3",
    link:{label:"View All Residential Projects",href:"/projects?category=residential",style:"link",visible:true}},
  reasons("A Trusted Partner for Your Home"),
  consultation("Book a Residential Consultation","/contact?type=consultation&service=architectural-design"),
];
