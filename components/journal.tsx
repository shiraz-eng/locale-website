import Link from "next/link";
import {ArrowUpRight,BookOpen,Clock,Layers,Leaf} from "lucide-react";
import type {Article} from "../lib/content";
import ArchitectureImage from "./home/architecture-image";

export function readingTime(body:string){return Math.max(1,Math.ceil(body.trim().split(/\s+/).length/200));}
export function ArticleCard({article,compact=false}:{article:Article;compact?:boolean}){
  return <article className={compact?"journal-compact":"journal-card"}><Link href={"/blog/"+article.slug} className="journal-image"><ArchitectureImage src={article.image||"/portfolio/residential.webp"} alt={article.title} fill sizes={compact?"110px":"(max-width: 640px) 90vw, 30vw"}/></Link><div className="journal-card-copy"><p className="editorial-kicker">{article.category||"Architecture"}</p><h3><Link href={"/blog/"+article.slug}>{article.title}</Link></h3><small className="journal-meta"><Clock size={14}/>{readingTime(article.body)} min read</small></div></article>;
}
export function ConsultationCard(){return <aside className="journal-consultation"><p className="editorial-kicker">A space of your own</p><h2>Planning a Project?</h2><p>Talk to our team about your home, workspace, or next idea.</p><Link className="button" href="/contact?type=consultation">Book a Consultation <ArrowUpRight size={16}/></Link></aside>;}
export function EditorialCTA(){return <section className="editorial-cta"><div className="shell"><div><p className="editorial-kicker">Let’s create something lasting</p><h2>Turn Your Ideas into a Space You’ll Love</h2><p>A considered design approach, shaped around the way you live.</p></div><Link className="button" href="/contact?type=consultation">Start Your Project <ArrowUpRight size={16}/></Link></div></section>;}
export function JournalTopics(){return <div className="journal-topics" aria-label="Journal topics"><span><BookOpen size={18}/>Expert Advice</span><span><Layers size={18}/>Design & Materials</span><span><Leaf size={18}/>Better Living</span></div>;}
