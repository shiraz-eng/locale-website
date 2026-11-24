"use client";
import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {useModalFocus} from "../lib/use-modal-focus";
import {ArrowRight,ChevronLeft,ChevronRight,Play,X} from "lucide-react";
import type {Picture} from "../lib/services";
import {embed} from "../lib/video";
import ArchitectureImage from "./home/architecture-image";
// Thumbnails open a full-screen viewer with previous/next buttons, arrow keys, Escape and swipe.
// "filters" adds category buttons (with counts) built from each image's category; "carousel" is a scrolling strip.
export default function GalleryLightbox({images,layout,heading,intro,filters=false,all="All",more}:{images:Picture[];layout:string;heading?:ReactNode;intro?:string;filters?:boolean;all?:string;more?:string}){
  const [open,setOpen]=useState<number|null>(null),[filter,setFilter]=useState("");
  const dialog=useRef<HTMLDivElement>(null),opener=useRef<HTMLElement|null>(null),strip=useRef<HTMLDivElement>(null),touch=useRef<number|null>(null);
  const categories=useMemo(()=>{const counts=new Map<string,number>();for(const item of images)if(item.category)counts.set(item.category,(counts.get(item.category)??0)+1);return [...counts]},[images]);
  const list=useMemo(()=>filter?images.filter(item=>item.category===filter):images,[images,filter]);
  const step=useCallback((delta:number)=>setOpen(current=>current===null?null:(current+delta+list.length)%list.length),[list.length]);
  const isOpen=open!==null;
  useModalFocus(isOpen,dialog,()=>setOpen(null),opener);
  useEffect(()=>{
    if(!isOpen)return;
    const keys=(event:KeyboardEvent)=>{
      if(event.key==="ArrowRight")step(1);
      if(event.key==="ArrowLeft")step(-1);
    };
    addEventListener("keydown",keys);
    return()=>removeEventListener("keydown",keys);
  },[isOpen,step]);
  const shown=layout==="featured"?list.slice(0,5):list;
  const current=open===null?null:list[open];
  const video=current?embed(current.video):null;
  const scroll=(direction:number)=>strip.current?.scrollBy({left:direction*strip.current.clientWidth*.8,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  const tabs=filters&&categories.length>1&&<div className="sv-gallery-filters" role="group" aria-label="Filter images">
    <button type="button" aria-pressed={!filter} onClick={()=>setFilter("")}>{all} ({images.length})</button>
    {categories.map(([name,count])=><button key={name} type="button" aria-pressed={filter===name} onClick={()=>setFilter(name)}>{name} ({count})</button>)}</div>;
  return <>
    {(heading||intro||tabs||more)&&<div className="sv-head sv-head-row sv-gallery-head"><div>{heading}{intro&&<p>{intro}</p>}</div>{tabs}
      {more&&<button type="button" className="aa-text-link sv-more" onClick={event=>{opener.current=event.currentTarget;setOpen(0)}}>{more} <ArrowRight size={15}/></button>}</div>}
    <div className={"sv-gallery-wrap sv-wrap-"+layout}>
      {layout==="carousel"&&list.length>3&&<button type="button" className="sv-strip-nav sv-strip-prev" aria-label="Scroll gallery left" onClick={()=>scroll(-1)}><ChevronLeft size={18}/></button>}
      <div ref={strip} className={"sv-gallery sv-"+layout} key={filter}>{shown.map((item,index)=><figure key={index}><button type="button" className="sv-gallery-image" aria-label={(embed(item.video)?"Play video ":"Open image ")+(index+1)+" of "+list.length+": "+item.alt} onClick={event=>{opener.current=event.currentTarget;setOpen(index)}}>
        <ArchitectureImage src={item.image} alt={item.alt} fill sizes={layout==="featured"&&index===0?"(max-width: 760px) 100vw, 50vw":layout==="carousel"?"(max-width: 760px) 60vw, 20vw":"(max-width: 760px) 50vw, 25vw"}/>
        {embed(item.video)&&<span className="sv-gallery-play" aria-hidden="true"><Play size={22}/></span>}
        {layout==="featured"&&index===4&&list.length>5&&<span className="sv-gallery-more">+{list.length-5}</span>}</button>{item.caption&&layout!=="featured"&&layout!=="carousel"&&<figcaption>{item.caption}</figcaption>}</figure>)}</div>
      {layout==="carousel"&&list.length>3&&<button type="button" className="sv-strip-nav sv-strip-next" aria-label="Scroll gallery right" onClick={()=>scroll(1)}><ChevronRight size={18}/></button>}
    </div>
    {current&&open!==null&&<div ref={dialog} className="sv-lightbox" role="dialog" aria-modal="true" aria-label={"Image "+(open+1)+" of "+list.length} onClick={event=>{if(event.target===event.currentTarget)setOpen(null)}}
      onTouchStart={event=>{touch.current=event.touches[0].clientX}} onTouchEnd={event=>{if(touch.current===null)return;const dx=event.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>50)step(dx<0?1:-1)}}>
      <button type="button" className="sv-lightbox-close" aria-label="Close" onClick={()=>setOpen(null)}><X size={24}/></button>
      {list.length>1&&<button type="button" className="sv-lightbox-nav sv-prev" aria-label="Previous image" onClick={()=>step(-1)}><ChevronLeft size={28}/></button>}
      <figure><div className="sv-lightbox-image">{video?<iframe key={video} className="sv-lightbox-video" src={video} title={current.alt} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<ArchitectureImage key={current.image} src={current.image} alt={current.alt} fill sizes="92vw"/>}</div>
        <figcaption><span>{open+1} / {list.length}</span>{current.caption||current.alt}</figcaption></figure>
      {list.length>1&&<button type="button" className="sv-lightbox-nav sv-next" aria-label="Next image" onClick={()=>step(1)}><ChevronRight size={28}/></button>}
    </div>}
  </>
}
