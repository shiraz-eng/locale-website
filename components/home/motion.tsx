"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {animate,motion,useInView,useReducedMotion,useScroll,useTransform} from "motion/react";

export function ScrollReveal({children,className,delay=0}:{children:ReactNode;className?:string;delay?:number}){
  const reduced=useReducedMotion();
  return <motion.div className={className} initial={false} whileInView={reduced?undefined:{opacity:[0,1],y:[22,0]}} viewport={{once:true,amount:"some"}} transition={{duration:.55,delay,ease:"easeOut"}}>{children}</motion.div>;
}

export function AnimatedCounter({value}:{value:number}){
  const ref=useRef<HTMLSpanElement>(null);
  const seen=useInView(ref,{once:true});
  const reduced=useReducedMotion();
  const [display,setDisplay]=useState(value);
  useEffect(()=>{
    if(!seen||reduced)return;
    const counter=animate(0,value,{duration:.85,ease:"easeOut",onUpdate:number=>setDisplay(Math.round(number))});
    return ()=>counter.stop();
  },[seen,reduced,value]);
  return <span ref={ref}><span className="aa-sr-only">{value}</span><span aria-hidden="true">{reduced?value:display}</span></span>;
}

export function ParallaxImage({children,className}:{children:ReactNode;className:string}){
  const ref=useRef<HTMLDivElement>(null);
  const reduced=useReducedMotion();
  const {scrollYProgress}=useScroll({target:ref,offset:["start end","end start"]});
  const y=useTransform(scrollYProgress,[0,1],[-9,9]);
  return <div ref={ref} className={className}><motion.div className="aa-parallax-layer" style={reduced?undefined:{y}}>{children}</motion.div></div>
}
