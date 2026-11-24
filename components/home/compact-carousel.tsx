"use client";
import {useState} from "react";
import {ArrowLeft,ArrowRight} from "lucide-react";
import ArchitectureImage from "./architecture-image";

export default function CompactCarousel({slides}:{slides:{image:string;alt:string;label:string}[]}){
  const [index,setIndex]=useState(0);
  const active=index%slides.length,slide=slides[active];
  if(!slide)return null;
  return <div className="rh-hero-image" aria-roledescription="carousel" aria-label="Studio projects"><ArchitectureImage src={slide.image} alt={slide.alt} fill priority sizes="(max-width: 760px) 90vw, 48vw"/>{slides.length>1&&<div className="rh-carousel-controls"><span className="rh-slide-label" aria-live="polite">{slide.label}</span><button type="button" aria-label="Previous project image" onClick={()=>setIndex((active+slides.length-1)%slides.length)}><ArrowLeft size={18}/></button><button type="button" aria-label="Next project image" onClick={()=>setIndex((active+1)%slides.length)}><ArrowRight size={18}/></button></div>}</div>;
}
