"use client";
import {useRef,useState} from "react";
import Link from "next/link";
import {Armchair,ArrowLeft,ArrowUpRight,Box,Building2,Hammer,Map,MessagesSquare} from "lucide-react";
import ArchitectureImage from "./architecture-image";
import type {Service} from "../../lib/content";

const icons={building:Building2,armchair:Armchair,map:Map,hammer:Hammer,box:Box,messages:MessagesSquare};
export default function FlipCard({service,image,index}:{service:Service;image:string;index:number}){
  const [flipped,setFlipped]=useState(false);
  const front=useRef<HTMLButtonElement>(null);
  const back=useRef<HTMLButtonElement>(null);
  function turn(value:boolean){
    setFlipped(value);
    requestAnimationFrame(()=>(value?back:front).current?.focus({preventScroll:true}));
  }
  const Icon=icons[service.icon as keyof typeof icons]??Building2;
  return <article className="aa-flip" data-flipped={flipped}>
    <div className="aa-flip-inner">
      <div className="aa-flip-face aa-flip-front" inert={flipped} aria-hidden={flipped}>
        <div className="aa-service-image"><ArchitectureImage src={image} alt="" fill sizes="(max-width: 560px) 92vw, (max-width: 850px) 45vw, 30vw"/><span>{String(index+1).padStart(2,"0")}</span></div>
        <div className="aa-flip-content"><Icon size={23} strokeWidth={1.4} className="aa-service-icon"/><h3>{service.title}</h3><p>{service.description}</p>
          <button ref={front} className="aa-text-link" type="button" onClick={()=>turn(true)} aria-label={"Explore service: "+service.title}>Explore Service <ArrowUpRight size={16}/></button>
        </div>
      </div>
      <div className="aa-flip-face aa-flip-back" inert={!flipped} aria-hidden={!flipped}>
        <div className="aa-flip-content"><button ref={back} className="aa-text-link aa-flip-return" type="button" onClick={()=>turn(false)} aria-label={"Flip back: "+service.title}><ArrowLeft size={16}/> Back</button>
          <Icon size={25} strokeWidth={1.4} className="aa-service-icon"/><h3>{service.title}</h3><p>{service.description}</p>
          {service.benefits.length>0&&<ul>{service.benefits.slice(0,3).map(benefit=><li key={benefit}>{benefit}</li>)}</ul>}
          <Link href={"/services#"+service.slug} className="aa-text-link">Learn More <ArrowUpRight size={16}/></Link>
        </div>
      </div>
    </div>
  </article>
}
