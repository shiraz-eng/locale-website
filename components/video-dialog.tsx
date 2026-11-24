"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {X} from "lucide-react";
import {embed} from "../lib/video";
// A button that plays a YouTube/Vimeo video in a full-screen dialog; renders nothing for other links.
export default function VideoDialog({url,title,className,children}:{url:string;title:string;className?:string;children:ReactNode}){
  const [open,setOpen]=useState(false);
  const close=useRef<HTMLButtonElement>(null),opener=useRef<HTMLButtonElement>(null);
  const src=embed(url);
  useEffect(()=>{
    if(!open)return;
    close.current?.focus();
    const keys=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    addEventListener("keydown",keys);document.body.style.overflow="hidden";
    const button=opener.current;
    return()=>{removeEventListener("keydown",keys);document.body.style.overflow="";button?.focus()};
  },[open]);
  if(!src)return null;
  return <>
    <button ref={opener} type="button" className={className} onClick={()=>setOpen(true)}>{children}</button>
    {open&&<div className="sv-lightbox sv-video-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <button ref={close} type="button" className="sv-lightbox-close" aria-label="Close video" onClick={()=>setOpen(false)}><X size={24}/></button>
      <div className="sv-video-frame"><iframe src={src} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>
    </div>}
  </>
}
