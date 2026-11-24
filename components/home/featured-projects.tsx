"use client";
import {useRef,useState} from "react";
import Link from "next/link";
import {ArrowUpRight,Plus,X} from "lucide-react";
import {AnimatePresence,motion,useReducedMotion} from "motion/react";
import ArchitectureImage from "./architecture-image";
import type {Project} from "../../lib/content";

const filters=["All","Residential","Commercial","Interior","Public"] as const;
type Filter=typeof filters[number];
function matches(project:Project,filter:Filter){
  return filter==="All"||project.category===({Interior:"Interior Design",Public:"Urban Planning"} as Record<string,string>)[filter]||project.category===filter;
}
export default function FeaturedProjects({projects}:{projects:Project[]}){
  const [filter,setFilter]=useState<Filter>("All");
  const [selected,setSelected]=useState<string|null>(null);
  const expansionButtons=useRef(new Map<string,HTMLButtonElement>());
  const reduced=useReducedMotion();
  const visible=projects.filter(project=>matches(project,filter));
  const expanded=visible.find(project=>project.slug===selected);
  const display=visible.slice(0,filter==="All"?4:8);
  return <section className="aa-section aa-cream" id="selected-projects"><div className="aa-shell">
    <div className="aa-section-head aa-project-head"><div><p className="aa-kicker aa-rule">02 / Selected work</p><h2>Spaces with <em>purpose.</em></h2></div><Link className="aa-button aa-outline" href="/projects">View All Projects <ArrowUpRight size={17}/></Link></div>
    <div className="aa-filters" aria-label="Filter featured projects">{filters.map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>{setFilter(value);setSelected(null)}}>{value}</button>)}</div>
    <p className="aa-sr-only" aria-live="polite">{display.length} {display.length===1?"project":"projects"} shown</p>
    <motion.div layout={!reduced} className="aa-project-grid">
      <AnimatePresence mode="popLayout" initial={false}>
        {display.map((project,index)=><motion.article key={project.slug} className="aa-project" layout={!reduced} initial={{opacity:0,y:reduced?0:14}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:.34,delay:reduced?0:index*.035}}>
          <Link className="aa-project-image" href={"/projects/"+project.slug} aria-label={"View project: "+project.title}><ArchitectureImage src={project.image} alt={project.title} fill sizes="(max-width: 560px) 94vw, (max-width: 850px) 45vw, 25vw"/><span className="aa-project-overlay">View Project <ArrowUpRight size={17}/></span></Link>
          <div className="aa-project-caption"><div><p className="aa-kicker">{project.category} / {project.year}</p><h3><Link href={"/projects/"+project.slug}>{project.title}</Link></h3><p>{project.location}</p></div>
            <button ref={node=>{if(node)expansionButtons.current.set(project.slug,node);else expansionButtons.current.delete(project.slug)}} className="aa-icon-button" type="button" aria-label={(selected===project.slug?"Collapse ":"Expand ")+project.title} aria-expanded={selected===project.slug} onClick={()=>setSelected(current=>current===project.slug?null:project.slug)}>{selected===project.slug?<X size={17}/>:<Plus size={17}/>}</button>
          </div>
        </motion.article>)}
      </AnimatePresence>
    </motion.div>
    {!display.length&&<p className="aa-empty">No selected projects in this category yet.</p>}
    <AnimatePresence initial={false}>
      {expanded&&<motion.article className="aa-project-expanded" key={expanded.slug} initial={{opacity:0,y:reduced?0:14}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:.35}}>
        <div className="aa-expanded-image"><ArchitectureImage src={expanded.image} alt={expanded.title} fill sizes="(max-width: 760px) 94vw, 50vw"/></div>
        <div className="aa-expanded-copy"><button className="aa-icon-button" type="button" aria-label="Close expanded project" onClick={()=>{expansionButtons.current.get(expanded.slug)?.focus();setSelected(null)}}><X size={18}/></button><p className="aa-kicker">{expanded.category} / {expanded.location}</p><h3>{expanded.title}</h3><p>{expanded.description}</p><Link href={"/projects/"+expanded.slug} className="aa-text-link">View project details <ArrowUpRight size={17}/></Link></div>
      </motion.article>}
    </AnimatePresence>
  </div></section>
}
