"use client";
import type {ComponentProps} from "react";
import Link from "next/link";
import {MessageCircle} from "lucide-react";
import {whatsappLink} from "../lib/content";
import {track} from "../lib/track";
type Props=ComponentProps<typeof Link>&{label:string;project?:string;service?:string};
export default function TrackedLink({label,project,service,onClick,...props}:Props){
  return <Link {...props} onClick={event=>{track("cta_click",label,{project,service});onClick?.(event)}}/>
}
export function WhatsApp({number,text,className="button outline",project}:{number?:string;text?:string;className?:string;project?:string}){
  if(!number)return null;
  return <a className={className} href={whatsappLink(number,text)} target="_blank" rel="noopener noreferrer" onClick={()=>track("whatsapp_click","whatsapp",{project})}><MessageCircle size={16}/> Chat on WhatsApp</a>
}
