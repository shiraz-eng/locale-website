import {icons,type Section} from "../lib/services";
import Image from "./home/architecture-image";
import {Armchair,Gem,Layers,Leaf,Mountain,PanelsTopLeft,Recycle,ShieldCheck,Sprout,Sun} from "lucide-react";

const defaultPriorities=[
  {label:"Natural & Durable",Icon:Leaf},{label:"Low Maintenance",Icon:Layers},
  {label:"Sustainable",Icon:Recycle},{label:"Timeless Aesthetic",Icon:Gem},
  {label:"Thermally Efficient",Icon:Sun},{label:"Indoor–Outdoor Harmony",Icon:Mountain},
];

const defaultGroups=[
  {title:"Exterior Envelope",Icon:Layers,description:"A weather-resistant façade that draws on the colors and textures of the lakeside setting.",items:[
    ["Natural Stone Cladding","cladding","Textured stone adds warmth and depth to the façade.","Durable","Low Maintenance","Natural Tone"],
    ["Thermally Modified Timber","modified-timber","Rich timber grain softens the exterior. Thermal modification improves stability outdoors.","Durable","Weather Resistant","Warm Tone"],
    ["Textured Concrete","textured-concrete","A fine matte finish gives exposed surfaces a clean, understated appearance.","High Strength","Low Maintenance","Matte Texture"],
  ]},
  {title:"Interior Finishes",Icon:Armchair,description:"Natural finishes bring warmth and texture to the rooms.",items:[
    ["Engineered Wood Flooring","wood-floor","A herringbone pattern adds warmth and gives the floor a subtle sense of movement.","Durable","Easy Care","Warm Tone"],
    ["Natural Stone Surface","stone-surface","Light stone with understated veining carries the exterior palette indoors.","Long Lasting","Natural Finish","Subtle Veining"],
    ["Lime-Plaster Wall Finish","lime-plaster","A breathable plaster with a soft, tactile finish.","Breathable","Low VOC","Matte Texture"],
  ]},
  {title:"Glazing & Openings",Icon:PanelsTopLeft,description:"Expansive openings bring in daylight and frame views of the lake.",items:[
    ["Low-Iron Glass","clear-glass","Clear glazing admits daylight and preserves the natural colors of the landscape.","High Clarity","UV Control","Thermal Efficiency"],
    ["Aluminum Framing","aluminum-frame","Slim frames with thermal breaks limit heat transfer through the window profiles.","Thermal Break","Durable","Slim Profile"],
    ["Sliding Glass System","sliding-glass","Large sliding panels open the living spaces directly onto the terrace.","Smooth Operation","Weather Sealed","Wide Openings"],
  ]},
  {title:"Landscape & Outdoor Elements",Icon:Sprout,description:"Weather-resistant finishes extend the living areas into the garden.",items:[
    ["Natural Stone Paving","stone-paving","Textured paving ties the terrace and garden paths into the surrounding site.","Exterior Grade","Slip Resistant","Textured"],
    ["Timber Decking","decking","Warm-toned decking defines the outdoor seating areas.","Durable","Low Maintenance","Natural Finish"],
    ["Native Planting & Stone Edge","native-planting","Native planting and natural stone give the garden structure throughout the year.","Low Water","Site Responsive","Native Planting"],
  ]},
];

const defaultStrategy=[
  {title:"Lasting Durability",description:"Weather-resistant finishes for exposed surfaces and everyday wear.",Icon:ShieldCheck},
  {title:"Sustainable Choice",description:"Locally sourced and lower-impact materials where practical.",Icon:Leaf},
  {title:"Refined Aesthetics",description:"Natural tones and restrained detailing that age gracefully.",Icon:Layers},
  {title:"Thermal Comfort",description:"Glazing and envelope systems that support year-round comfort.",Icon:Sun},
  {title:"Landscape Integration",description:"Materials that carry the colors and textures of the lakefront into the home.",Icon:Mountain},
];

export default function ProjectMaterials({section}:{section?:Extract<Section,{type:"materials"}>}={}){
  const priorities=section?section.priorities.map(item=>({label:item.title,Icon:icons[item.icon]})):defaultPriorities;
  const strategy=section?section.strategy.map(item=>({...item,Icon:icons[item.icon]})):defaultStrategy;
  const groups=section?[...new Set(section.items.map(item=>item.category))].map(category=>({title:category,description:section.items.find(item=>item.category===category)?.category_intro||"",Icon:icons.layers,items:section.items.filter(item=>item.category===category).map(item=>[item.title,item.image,item.description,...item.tags.split(",").map(tag=>tag.trim()).filter(Boolean)])})):defaultGroups;
  return <div className="pm">
    <header className="pm-intro">
      <h2>{section?.heading||"Materials & Finishes"}</h2>
      <p>{section?.intro??"A palette of natural, durable materials balances everyday comfort with a strong connection to the lakeside setting."}</p>
    </header>
    {!groups.length&&<p className="sv-empty-media">Material details will be added by the studio when available.</p>}
    {priorities.length>0&&<div className="pm-palette">
      <div><h3>Material Palette</h3><p>Key Characteristics</p></div>
      <ul className="pm-priorities" aria-label="Material priorities">
        {priorities.map(({label,Icon})=><li key={label}><Icon size={19} aria-hidden="true"/>{label}</li>)}
      </ul>
    </div>}
    <div className="pm-groups">
      {groups.map(({title,description,Icon,items})=><div key={title} className="pm-group">
        <header><Icon size={26} strokeWidth={1.5} aria-hidden="true"/><div><h3>{title}</h3><p>{description}</p></div></header>
        {items.map(([name,image,detail,...tags])=><article key={name} className="pm-finish">
          <div className="pm-swatch"><Image src={image.startsWith("/")||image.startsWith("https://")?image:`/portfolio/materials/${image}.png`} alt="" fill sizes="(max-width: 600px) 100px, 120px"/></div>
          <div><h4>{name}</h4><p>{detail}</p><ul className="pm-tags" aria-label="Finish characteristics">{tags.map(tag=><li key={tag}>{tag}</li>)}</ul></div>
        </article>)}
      </div>)}
    </div>
    {strategy.length>0&&<div className="pm-strategy">
      <div className="pm-strategy-heading"><h3>Material Strategy</h3><p>Why these materials</p></div>
      {strategy.map(({title,description,Icon})=><div key={title} className="pm-principle">
        <Icon size={24} strokeWidth={1.5} aria-hidden="true"/><div><h4>{title}</h4><p>{description}</p></div>
      </div>)}
    </div>}
  </div>;
}
