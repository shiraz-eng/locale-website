import type {Section,IconName} from "./services";
const priorities=[
  {label:"Natural & Durable",icon:"leaf"},{label:"Low Maintenance",icon:"layers"},
  {label:"Sustainable",icon:"leaf"},{label:"Timeless Aesthetic",icon:"gem"},
  {label:"Thermally Efficient",icon:"sun"},{label:"Indoor–Outdoor Harmony",icon:"landmark"},
];

const groups=[
  {title:"Exterior Envelope",icon:"layers",description:"A weather-resistant façade that draws on the colors and textures of the lakeside setting.",items:[
    ["Natural Stone Cladding","cladding","Textured stone adds warmth and depth to the façade.","Durable","Low Maintenance","Natural Tone"],
    ["Thermally Modified Timber","modified-timber","Rich timber grain softens the exterior. Thermal modification improves stability outdoors.","Durable","Weather Resistant","Warm Tone"],
    ["Textured Concrete","textured-concrete","A fine matte finish gives exposed surfaces a clean, understated appearance.","High Strength","Low Maintenance","Matte Texture"],
  ]},
  {title:"Interior Finishes",icon:"armchair",description:"Natural finishes bring warmth and texture to the rooms.",items:[
    ["Engineered Wood Flooring","wood-floor","A herringbone pattern adds warmth and gives the floor a subtle sense of movement.","Durable","Easy Care","Warm Tone"],
    ["Natural Stone Surface","stone-surface","Light stone with understated veining carries the exterior palette indoors.","Long Lasting","Natural Finish","Subtle Veining"],
    ["Lime-Plaster Wall Finish","lime-plaster","A breathable plaster with a soft, tactile finish.","Breathable","Low VOC","Matte Texture"],
  ]},
  {title:"Glazing & Openings",icon:"layout-grid",description:"Expansive openings bring in daylight and frame views of the lake.",items:[
    ["Low-Iron Glass","clear-glass","Clear glazing admits daylight and preserves the natural colors of the landscape.","High Clarity","UV Control","Thermal Efficiency"],
    ["Aluminum Framing","aluminum-frame","Slim frames with thermal breaks limit heat transfer through the window profiles.","Thermal Break","Durable","Slim Profile"],
    ["Sliding Glass System","sliding-glass","Large sliding panels open the living spaces directly onto the terrace.","Smooth Operation","Weather Sealed","Wide Openings"],
  ]},
  {title:"Landscape & Outdoor Elements",icon:"trees",description:"Weather-resistant finishes extend the living areas into the garden.",items:[
    ["Natural Stone Paving","stone-paving","Textured paving ties the terrace and garden paths into the surrounding site.","Exterior Grade","Slip Resistant","Textured"],
    ["Timber Decking","decking","Warm-toned decking defines the outdoor seating areas.","Durable","Low Maintenance","Natural Finish"],
    ["Native Planting & Stone Edge","native-planting","Native planting and natural stone give the garden structure throughout the year.","Low Water","Site Responsive","Native Planting"],
  ]},
];

const strategy=[
  {title:"Lasting Durability",description:"Weather-resistant finishes for exposed surfaces and everyday wear.",icon:"shield-check"},
  {title:"Sustainable Choice",description:"Locally sourced and lower-impact materials where practical.",icon:"leaf"},
  {title:"Refined Aesthetics",description:"Natural tones and restrained detailing that age gracefully.",icon:"layers"},
  {title:"Thermal Comfort",description:"Glazing and envelope systems that support year-round comfort.",icon:"sun"},
  {title:"Landscape Integration",description:"Materials that carry the colors and textures of the lakefront into the home.",icon:"landmark"},
];

const stages=[
  {title:"Discovery & Brief",description:"Understand your vision, needs, and project goals.",duration:"1–2 weeks",image:"/portfolio/process/discovery.jpg",icon:"lightbulb"},
  {title:"Concept Design",description:"Explore design ideas, layouts, and visual direction.",duration:"2–4 weeks",image:"/portfolio/process/concept.jpg",icon:"layers"},
  {title:"Design Development",description:"Refine plans, materials, and technical details.",duration:"4–6 weeks",image:"/portfolio/process/development.jpg",icon:"drafting-compass"},
  {title:"Execution",description:"Build with regular progress updates and quality checks.",duration:"12–18 weeks",image:"/portfolio/process/execution.jpg",icon:"hard-hat"},
  {title:"Handover",description:"Complete the final inspection and hand over the finished home.",duration:"1 week",image:"/portfolio/villa.webp",icon:"key"},
];

const deliverables=[
  {label:"Conceptual Layouts",icon:"scan"},{label:"Detailed Drawings",icon:"layers"},{label:"3D Visualizations",icon:"box"},
  {label:"Material Specifications",icon:"drafting-compass"},{label:"Project Schedule",icon:"file-text"},{label:"Quality Reports",icon:"shield-check"},
];

const team=[
  {role:"Architect",image:"architect"},{role:"Interior Designer",image:"designer"},
  {role:"Project Manager",image:"manager"},{role:"Site Supervisor",image:"supervisor"},
];


const appearance={background:"white",text:"default",accent:"gold",align:"left",spacing:"normal"} as const;
export const materialSection:Extract<Section,{type:"materials"}>={
  id:"materials",type:"materials",enabled:true,nav_label:"Materials",appearance,layout:"grid",
  heading:"Materials & Finishes",intro:"A palette of natural, durable materials connects the home to its lakeside setting.",
  priorities:priorities.map(item=>({title:item.label,description:"",icon:item.icon as IconName})),
  items:groups.flatMap(group=>group.items.map(([title,image,description,...tags])=>({
    category:group.title,category_intro:group.description,title,image:"/portfolio/materials/"+image+".png",description,tags:tags.join(", "),
  }))),
  strategy:strategy.map(item=>({...item,icon:item.icon as IconName})),
};
export const projectProcessSection:Extract<Section,{type:"project_process"}>={
  id:"process",type:"project_process",enabled:true,nav_label:"Process",appearance,layout:"steps",
  heading:"Design & Build Process",intro:"From the first conversation to the final walkthrough, each stage turns your ideas into decisions we can build from.",
  image:"/portfolio/sketch.webp",image_alt:"Perspective concept sketch of Lakeside Villa",
  items:stages.map(item=>({...item,icon:item.icon as IconName})),
  deliverables:deliverables.map(item=>({title:item.label,description:"",icon:item.icon as IconName})),
  team:team.map(item=>({title:item.role,image:"/portfolio/process/"+item.image+".jpg"})),
  team_intro:"Illustrative roles across design, coordination, and construction.",
  timeline_intro:"Indicative durations for this concept.",
  cta_heading:"Let’s Build Your Dream Space",cta_text:"Tell us what you have in mind and take the first step toward a space designed around you.",
  buttons:[{label:"Book a Consultation",href:"/contact?type=consultation",style:"primary",visible:true}],
};
