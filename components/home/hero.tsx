"use client";
import {useState} from "react";
import TrackedLink from "../tracked-link";
import {ArrowLeft,ArrowRight,ArrowUpRight,Sparkles} from "lucide-react";
import {AnimatePresence,motion,useReducedMotion,useScroll,useTransform} from "motion/react";
import ArchitectureImage from "./architecture-image";

type Slide={image:string;label:string;alt:string};
type Action={label:string;href:string};
export default function Hero({slides,kicker,headline,description,links}:{slides:Slide[];kicker:string;headline:string;description:string;links:Action[]}){
  const [index,setIndex]=useState(0);
  const reduced=useReducedMotion();
  const {scrollY}=useScroll();
  const offset=useTransform(scrollY,[0,650],[0,28],{clamp:true});
  const slide=slides[index];
  const move=(delta:number)=>setIndex(current=>(current+delta+slides.length)%slides.length);
  const transition={duration:reduced?0:.55,ease:"easeOut" as const};
   return <section className="aa-hero aa-shell" aria-label="Studio introduction">
    <div className="aa-hero-copy">
      <p className="aa-kicker aa-rule">{kicker}</p>
      <h1>{headline==="We Design Spaces That Inspire Living"?<>We Design<br/>Spaces That<br/><em>Inspire Living</em></>:headline}</h1>
      <p className="aa-hero-description">{description}</p>
      <div className="aa-actions"><TrackedLink className="aa-button aa-dark" href={links[0].href} label="hero-1">{links[0].label} <ArrowUpRight size={17}/></TrackedLink><TrackedLink className="aa-button aa-outline" href={links[1].href} label="hero-2">{links[1].label}</TrackedLink></div>
      <TrackedLink className="aa-scroll aa-hero-ai" href={links[2].href} label="hero-3"><Sparkles size={15}/> {links[2].label}</TrackedLink>
    </div>
    <div className="aa-hero-slider" aria-label="Architectural photography carousel" aria-roledescription="carousel">
      <div className="aa-hero-image">
        <motion.div className="aa-hero-parallax" style={reduced?undefined:{y:offset}}>
          <AnimatePresence initial={false}>
            <motion.div className="aa-slide" key={slide.image} initial={{opacity:0,scale:reduced?1:1.035}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={transition}>
              <ArchitectureImage src={slide.image} alt={slide.alt} fill sizes="(max-width: 760px) 94vw, 59vw" loading={index===0?"eager":undefined} fetchPriority={index===0?"high":undefined}/>
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <span className="aa-image-number">Atelier Arc / Design studies</span>
      </div>
      <div className="aa-slide-bar">
        <span className="aa-slide-caption" aria-live="polite"><strong>{String(index+1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}</strong>{slide.label}</span>
        <div className="aa-dots" aria-label="Choose hero image">{slides.map((entry,position)=><button type="button" key={entry.image} aria-label={"Show "+entry.label} aria-pressed={index===position} onClick={()=>setIndex(position)}/>)}</div>
        <div className="aa-arrows"><button className="aa-icon-button" type="button" onClick={()=>move(-1)} aria-label="Previous hero image"><ArrowLeft size={17}/></button><button className="aa-icon-button" type="button" onClick={()=>move(1)} aria-label="Next hero image"><ArrowRight size={17}/></button></div>
      </div>
    </div>
  </section>
}
