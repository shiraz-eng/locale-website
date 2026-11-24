import {departments,type Brief} from "../../lib/content";
export type CollectionKind="blog"|"team"|"settings";
export type Value=string|number|boolean|string[]|null;
export type RecordData={slug:string;title:string;updated?:string;[key:string]:Value|undefined};
export type Field={key:string;label:string;type?:"long"|"number"|"check"|"image"|"gallery"|"lines"|"email";options?:readonly string[];required?:boolean;initial?:Value;help?:string;section?:string};
export const statuses=["New Inquiry","Contacted","Consultation Scheduled","Proposal Sent","Negotiation","Contract Won","Contract Lost"];
export const priorities=["Ready for Consultation","Needs Follow-Up","Early Exploration"];
export const lostReasons=["Budget","Timeline","Chose another firm","Project postponed","No response","Scope mismatch","Other"];
export const consultationStatuses=["Pending","Confirmed","Completed","Cancelled"];
export const requestKinds:Record<string,string>={inquiry:"Inquiry",consultation:"Consultation",quotation:"Quotation",brief:"AI brief"};
const title:Field={key:"title",label:"Title",required:true};
const description:Field={key:"description",label:"Description",type:"long",required:true};
const image:Field={key:"image",label:"Image",type:"image"};
const seo:Field[]=[{key:"seo_title",label:"SEO title",help:"Shown in search results. Leave empty to use the title.",section:"Search engine listing"},
  {key:"seo_description",label:"Meta description",type:"long",help:"About 150 characters. Leave empty to use the description.",section:"Search engine listing"},
  {key:"og_image",label:"Social sharing image",type:"image",section:"Search engine listing"}];
const canonical:Field={key:"canonical",label:"Canonical URL (only if this content is published elsewhere first)",section:"Search engine listing"};
export const fields:Record<CollectionKind,Field[]>={
  blog:[title,description,{key:"category",label:"Journal category",initial:"Architecture",options:["Architecture","Interior Design","Sustainability","Materials","Planning & Budget","Home Improvement","Client Guides"]},{key:"tags",label:"Tags (one per line)",type:"lines"},{key:"body",label:"Article body",type:"long",required:true,section:"Story",help:"Separate paragraphs with a blank line. Use ## or ### for headings, - for bullet lists, > for a quotation, and ![Description](image URL) for an image. Headings create the table of contents."},{...image,label:"Featured image",section:"Media"},{key:"author_name",label:"Author name",section:"Author"},{key:"author_role",label:"Author role",section:"Author"},{key:"author_bio",label:"Author biography",type:"long",section:"Author"},{key:"author_image",label:"Author portrait",type:"image",section:"Author"},{key:"published",label:"Published on the website",type:"check",section:"Visibility"},...seo,canonical],
  team:[{...title,label:"Full name"},{key:"position",label:"Designation",required:true,help:"For example: Principal Architect"},{key:"department",label:"Department",options:departments,required:true},
    {key:"badge",label:"Badge (optional)",help:"Short label on the photo, e.g. Founder. Leave empty for none."},{key:"order",label:"Display order",type:"number",initial:0,help:"Lower numbers appear first"},
    {key:"description",label:"Short biography",type:"long",required:true,help:"One to three sentences shown on the card (600 characters max)."},{key:"full_bio",label:"Detailed biography (optional)",type:"long",help:"Shown when visitors open “Read full biography”."},
    {key:"image",label:"Profile photograph",type:"image",section:"Photograph",help:"JPEG or PNG up to 10 MB. A portrait (4:5) crop works best."},
    {key:"linkedin",label:"LinkedIn URL (optional)",section:"Links"},{key:"instagram",label:"Instagram URL (optional)",section:"Links"},{key:"public_email",label:"Public email (optional)",type:"email",section:"Links",help:"Only add an address this person has agreed to publish."},
    {key:"published",label:"Published on the website",type:"check",initial:false,section:"Visibility"},{key:"featured",label:"Featured on the homepage",type:"check",section:"Visibility"}],
  settings:[{...title,label:"Studio name"},{key:"headline",label:"Fallback homepage headline",required:true},
    {key:"intro",label:"Studio introduction",type:"long",required:true},{key:"hero_description",label:"Fallback homepage supporting text",type:"long"},
    {key:"email",label:"Contact email",type:"email",required:true,section:"Contact details"},{key:"phone",label:"Contact phone",required:true,section:"Contact details"},
    {key:"location",label:"Office location",required:true,section:"Contact details"},{key:"whatsapp",label:"Verified WhatsApp business number (digits with country code, empty hides it)",section:"Contact details"},
    {key:"instagram",label:"Instagram URL",section:"Contact details"},{key:"linkedin",label:"LinkedIn URL",section:"Contact details"},
    {key:"logo",label:"Studio logo",type:"image",section:"Brand"},{key:"testimonials",label:"Approved testimonials (one per line)",type:"lines",section:"Brand",help:"Shown on every public page. Format: Quote | Client name | Role or project | Optional rating from 1 to 5. Only add approved feedback; leave the rating empty when none was provided."},
    {key:"free_consultation",label:"The studio offers a free initial consultation (shows “Free” on calls to action)",type:"check",section:"Sales"},
    {key:"careers_link",label:"“Join Our Team” contact link (e.g. /contact or mailto:careers@…; empty uses /contact)",section:"Careers"},{key:"open_roles_url",label:"Open roles page (only set when real job listings exist there)",section:"Careers"},
    {key:"currency",label:"Currency for contract values (ISO code)",initial:"USD",section:"Sales"}]
};
export type Qualification={summary?:string;project_type:string;location:string;budget:string;timeline:string;requirements:string[];services:string[];missing:string[];label:string;reason:string;next_action?:string};
export type Inquiry={id:number;name:string;email:string;phone:string;kind:string;project_type:string|null;budget:string;timeline?:string;location?:string;description:string;consultation:boolean;service_interest?:string|null;requirements?:string[];status:string;attribution:Record<string,string|null>;brief:Brief|null;qualification:Qualification|null;priority:string|null;priority_override:string|null;assigned_to:string|null;contract_value:number|null;follow_up_at:string|null;next_action:string;lost_reason:string|null;has_conversation:boolean;created:string;updated:string};
export type Consultation={id:number;inquiry_id:number;status:string;preferred_time:string;scheduled_at:string|null;assigned_to:string|null;notes:string;created:string;updated:string;lead?:{name:string;email:string;phone:string;project_type:string|null;location:string;budget:string;timeline:string;description:string;status:string;brief_title:string}};
export type Activity={kind:string;detail:Record<string,string|null>;author:string;created:string;inquiry_id?:number;name?:string};
export type Lead=Inquiry&{conversation:{role:"user"|"assistant";text:string}[];notes:{id:number;author:string;text:string;created:string}[];activity:Activity[];consultations:Consultation[]};
export type Member={email:string;name:string;role:string;active:boolean;created:string};
