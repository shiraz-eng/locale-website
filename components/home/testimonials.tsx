"use client";
import {useState} from "react";
import {ArrowLeft,ArrowRight} from "lucide-react";
import {AnimatePresence,motion,useReducedMotion} from "motion/react";

const placeholders=[
  {quote:"We wanted a home that made the most of the garden and the changing light throughout the day.",name:"Sample client",project:"Residential design brief"},
  {quote:"Our brief was a workplace with room to collaborate and quiet places for focused work.",name:"Sample client",project:"Commercial design brief"}
];
export default function Testimonials({quotes}:{quotes:string[]}){
  const reduced=useReducedMotion();
  const [index,setIndex]=useState(0);
  const entries=quotes.length?quotes.map(value=>{
    const [quote,name,project]=value.split(" | ");
    return {quote,name:name||"Studio client",project:project||""};
  }):placeholders;
  const active=index%entries.length;
  const item=entries[active];
  return <section className="aa-section aa-testimonials"><div className="aa-shell">
    <p className="aa-kicker">05 / Client perspectives{!quotes.length&&" · Sample content"}</p>
    <span className="aa-quote-mark" aria-hidden="true">“</span>
    <div className="aa-testimonial-copy" aria-live="polite"><AnimatePresence mode="wait" initial={false}>
      <motion.figure key={active} initial={{opacity:0,y:reduced?0:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:.23}}>
        <blockquote>{item.quote}</blockquote><figcaption><strong>{item.name}</strong>{item.project&&<span>{item.project}</span>}</figcaption>
      </motion.figure>
    </AnimatePresence></div>
    {entries.length>1&&<div className="aa-arrows"><button className="aa-icon-button" type="button" aria-label="Previous testimonial" onClick={()=>setIndex((active-1+entries.length)%entries.length)}><ArrowLeft size={17}/></button><span>{active+1} / {entries.length}</span><button className="aa-icon-button" type="button" aria-label="Next testimonial" onClick={()=>setIndex((active+1)%entries.length)}><ArrowRight size={17}/></button></div>}
  </div></section>
}
