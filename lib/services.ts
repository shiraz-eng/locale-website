import {Armchair,Award,Bed,Blocks,Box,Building,Building2,Calendar,Camera,ChartColumn,Check,Download,Gem,Heart,Clock,Compass,DraftingCompass,Fence,FileCheck,FileText,Hammer,Handshake,HardHat,Hotel,House,Image,Key,Lamp,Landmark,Layers,LayoutGrid,Leaf,Lightbulb,Map,MapPin,MessagesSquare,Palette,PencilRuler,Play,Route,Ruler,Scan,ShieldCheck,Sofa,Sparkles,Store,Sun,Target,Trees,Users,Video,Warehouse,Wrench,type LucideIcon} from "lucide-react";
// Must match the Icon list in backend/service_schema.py.
export const icons={house:House,building:Building,"building-2":Building2,armchair:Armchair,sofa:Sofa,hammer:Hammer,box:Box,compass:Compass,ruler:Ruler,map:Map,"map-pin":MapPin,
  layers:Layers,lightbulb:Lightbulb,"pencil-ruler":PencilRuler,"drafting-compass":DraftingCompass,trees:Trees,sun:Sun,leaf:Leaf,"shield-check":ShieldCheck,clock:Clock,
  users:Users,messages:MessagesSquare,sparkles:Sparkles,image:Image,video:Video,play:Play,camera:Camera,landmark:Landmark,store:Store,hotel:Hotel,warehouse:Warehouse,
  "layout-grid":LayoutGrid,scan:Scan,"file-text":FileText,"file-check":FileCheck,handshake:Handshake,award:Award,target:Target,route:Route,palette:Palette,lamp:Lamp,
  bed:Bed,key:Key,wrench:Wrench,chart:ChartColumn,"hard-hat":HardHat,blocks:Blocks,fence:Fence,calendar:Calendar,download:Download,heart:Heart,gem:Gem,check:Check} satisfies Record<string,LucideIcon>;
export type IconName=keyof typeof icons;
export const iconNames=Object.keys(icons) as IconName[];
export type Button={label:string;href:string;style:"primary"|"secondary"|"link";visible:boolean;icon?:IconName|null};
export type Appearance={background:"white"|"soft"|"cream"|"dark";text:"default"|"muted"|"light";accent:"gold"|"ink"|"sage";align:"left"|"center";spacing:"compact"|"normal"|"spacious";width?:"full"|"half"};
export type Feature={title:string;description:string;icon:IconName};
export type Step={title:string;description:string};
export type Picture={image:string;alt:string;caption:string;category?:string;video?:string|null};
export type Quote={quote:string;author:string;role:string};
export type Question={question:string;answer:string};
export type Stat={value:string;label:string;icon?:IconName};
export type Spec={label:string;value:string;icon:IconName};
type Base={id:string;enabled:boolean;nav_label?:string;appearance:Appearance};
export type Section=Base&(
  {type:"hero";eyebrow:string;heading:string;subheading:string;image:string|null;image_alt:string;buttons:Button[];layout:"split"|"full"|"centered"}|
  {type:"rich_text";heading:string;body:string;layout:"narrow"|"wide"}|
  {type:"image_text";heading:string;body:string;image:string|null;image_alt:string;buttons:Button[];layout:"image-left"|"image-right"}|
  {type:"features";heading:string;intro:string;items:Feature[];layout:"grid-2"|"grid-3"|"grid-4"|"compact"|"strip"}|
  {type:"benefits";heading:string;intro:string;items:Feature[];layout:"list"|"grid-2"|"grid-3"|"grid-4"}|
  {type:"process";heading:string;intro:string;items:Step[];layout:"horizontal"|"vertical"|"timeline"}|
  {type:"gallery";heading:string;intro:string;images:Picture[];filters?:boolean;layout:"grid-2"|"grid-3"|"grid-4"|"featured"}|
  {type:"related_projects";heading:string;intro:string;source:"category"|"manual";categories:string[];projects:string[];limit:number;link?:Button|null;layout:"grid-2"|"grid-3"}|
  {type:"testimonials";heading:string;source:"studio"|"manual";items:Quote[];layout:"cards"|"quote"}|
  {type:"faq";heading:string;intro:string;items:Question[];layout:"accordion"|"two-column"}|
  {type:"cta";heading:string;text:string;buttons:Button[];image?:string|null;image_alt?:string;layout:"band"|"centered"|"banner"}|
  {type:"overview";heading:string;body:string;facts:boolean;image:string|null;image_alt:string;video:string|null;caption:string;layout:"media-right"|"media-left"}|
  {type:"stats";heading:string;items:Stat[];layout:"row"|"grid"}|
  {type:"specs";heading:string;source:"project"|"manual";items:Spec[];layout:"bar"|"grid"}|
  {type:"materials";heading:string;intro:string;items:{category:string;category_intro:string;title:string;image:string;description:string;tags:string}[];priorities:Feature[];strategy:Feature[];layout:"grid"}|
  {type:"project_videos";heading:string;intro:string;inspiration:boolean;videos:Picture[];layout:"playlist"}|
  {type:"project_process";cta_image?:string|null;videos?:Picture[];heading:string;intro:string;image:string|null;image_alt:string;items:(Feature&{image:string;duration:string})[];deliverables:Feature[];team:{title:string;image:string}[];team_intro:string;timeline_intro:string;cta_heading:string;cta_text:string;buttons:Button[];layout:"steps"});
export type SectionType=Section["type"];
export type Seo={title:string;description:string;og_image:string|null;canonical:string};
export type ServiceDoc={layout_version?:0|1;schema_version:1;name:string;slug:string;category:string;short_description:string;highlights:string[];description:string;icon:IconName;featured:boolean;card_image:string|null;card_alt:string;seo:Seo;sections:Section[]};
export type ServiceCard={slug:string;name:string;category:string;short_description:string;highlights?:string[];icon:IconName;featured:boolean;card_image:string|null;card_alt:string};
export type ServicesPage={schema_version:1;eyebrow:string;heading:string;subheading:string;hero_image:string;hero_alt:string;buttons:Button[];services_heading:string;services_intro:string;
  cta_heading:string;cta_text:string;cta_button:Button|null;services_eyebrow?:string;services_button?:Button|null;stats?:Stat[];show_stats?:boolean;
  advantage_eyebrow?:string;advantage_heading?:string;advantage_image?:string|null;advantage_alt?:string;benefits:Feature[];show_projects:boolean;projects_heading:string;before_projects?:Section[];after_projects?:Section[];seo:Seo};
export type ProjectCategory={id?:number;slug:string;name:string;description?:string;count?:number};
export type ProjectDoc={layout_version?:0|1|2;schema_version:1;title:string;slug:string;category_id:number;location:string;year:number|null;area:string;status:"Concept"|"In Progress"|"Completed";
  style:string;client:string;client_approved:boolean;description:string;featured:boolean;cover_image:string|null;cover_alt:string;seo:Seo;sections:Section[];category?:ProjectCategory|null};
export type ProjectCard={slug:string;title:string;category:ProjectCategory;location:string;year:number|null;status:string;featured:boolean;cover_image:string|null;cover_alt:string;description:string};
export type ProjectsPage={schema_version:1;eyebrow:string;heading:string;description:string;hero_image:string;hero_alt:string;buttons:Button[];page_size:6|9|12;
  default_sort:"featured"|"newest"|"oldest"|"title";cta_heading:string;cta_text:string;cta_buttons:Button[];showreel?:string|null;stats?:Stat[];show_stats?:boolean;
  show_gallery?:boolean;gallery_heading?:string;seo:Seo};
