"use client";
import {useRef,useState} from "react";
import {Search,SlidersHorizontal} from "lucide-react";
// Search and sort submit as a normal GET form, so filtering stays server-rendered and works without JavaScript.
export default function ProjectsControls({q,sort,category,view}:{q:string;sort:string;category:string;view:string}){
  const form=useRef<HTMLFormElement>(null);
  const [open,setOpen]=useState(false);
  return <form ref={form} className="pj-controls" action="/projects#portfolio" role="search">
    {category&&<input type="hidden" name="category" value={category}/>}{view==="list"&&<input type="hidden" name="view" value="list"/>}
    <label className="pj-search"><Search size={16} aria-hidden="true"/><span className="aa-sr-only">Search projects</span><input type="search" name="q" defaultValue={q} maxLength={120} placeholder="Search projects..."/></label>
    <button type="button" className="pj-filter" aria-label="Sort options" aria-expanded={open} aria-controls="pj-sort" onClick={()=>setOpen(value=>!value)}><SlidersHorizontal size={18}/></button>
    <label id="pj-sort" className="pj-sort" hidden={!open}><span>Sort by</span><select name="sort" defaultValue={sort} onChange={()=>form.current?.requestSubmit()}>
      <option value="featured">Featured first</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Name A–Z</option></select></label>
    <noscript><button className="aa-button aa-outline">Search</button></noscript>
  </form>
}
