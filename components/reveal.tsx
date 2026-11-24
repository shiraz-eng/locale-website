"use client";
import {motion,useReducedMotion} from "motion/react";
import type {ReactNode} from "react";
export default function Reveal({children,className}:{children:ReactNode;className?:string}){
  const reduced=useReducedMotion();
  return <motion.div className={className} initial={false} whileInView={reduced?undefined:{y:[10,0],opacity:[0.84,1]}} viewport={{once:true,amount:0.12}} transition={{duration:0.55,ease:"easeOut"}}>{children}</motion.div>
}
