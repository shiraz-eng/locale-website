import EditorialHero from "../../../components/editorial-hero";
import {ArticleCard,ConsultationCard,EditorialCTA,JournalTopics,readingTime} from "../../../components/journal";
import ArchitectureImage from "../../../components/home/architecture-image";
import {editablePage} from "../../../lib/server";
import {Clock} from "lucide-react";
import EditablePage from "../../../components/editable-page";
import {pageMetadata} from "../../../lib/server";
import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {type Article} from "../../../lib/content";
import {list} from "../../../lib/server";
export const generateMetadata=()=>pageMetadata("/blog",{title:"Journal",description:"Notes on planning, designing and building architecture and interior projects."});
type BlogProps={searchParams:Promise<{category?:string}>};
async function Blog({searchParams}:BlogProps){
  const {items}=await list<Article>("blog",new URLSearchParams("size=100"));
  const selected=(await searchParams).category||"";
  const categories=[...new Set(items.map(article=>article.category||"Architecture"))];
  const filtered=selected?items.filter(article=>(article.category||"Architecture")===selected):items;
  const page=await editablePage("blog"),featured=filtered[0],latest=filtered.slice(1);
  return <div className="editorial-page"><EditorialHero image={page?.hero_image||undefined} label="The Journal" title={page?.heading||"Architecture Insights for Better Living"} description={page?.description||"Expert ideas, design guides, and project stories to help you plan, design, and build your dream space with confidence."}><JournalTopics/></EditorialHero><nav className="shell journal-filters" aria-label="Filter articles by category"><Link href="/blog" aria-current={!selected?"page":undefined}>All Articles</Link>{categories.map(category=><Link key={category} href={"/blog?category="+encodeURIComponent(category)} aria-current={selected===category?"page":undefined}>{category}</Link>)}</nav><section className="shell journal-layout"><div className="journal-main">{featured&&<article className="journal-featured"><Link className="journal-image" href={"/blog/"+featured.slug}><ArchitectureImage src={featured.image||"/portfolio/villa.webp"} alt={featured.title} fill sizes="(max-width: 760px) 90vw, 45vw"/><span className="journal-featured-badge">Featured Insight</span></Link><div><p className="editorial-kicker">{featured.category||"Architecture"}</p><h2><Link href={"/blog/"+featured.slug}>{featured.title}</Link></h2><p>{featured.description}</p><small className="journal-meta"><Clock size={14}/>{readingTime(featured.body)} min read</small><Link className="button dark" href={"/blog/"+featured.slug}>Read Full Guide <ArrowUpRight size={16}/></Link></div></article>}<div className="journal-section-heading"><h2>Latest Articles</h2><span>{filtered.length} published {filtered.length===1?"article":"articles"}</span></div>{latest.length?<div className="journal-grid">{latest.map(article=><ArticleCard article={article} key={article.slug}/>)}</div>:<p className="journal-empty">{featured?"More studio stories and design guides are on the way. Explore our featured insight above.":"New articles will appear here when published."}</p>}</div><aside className="journal-sidebar"><ConsultationCard/>{items.length>1&&<section className="journal-sidebar-panel"><h2>More to Explore</h2>{items.slice(1,4).map(article=><ArticleCard key={article.slug} article={article} compact/>)}</section>}<section className="journal-sidebar-panel"><h2>A project in mind?</h2><p>Find thoughtful spaces, material ideas, and inspiration in our portfolio.</p><Link className="text-link" href="/projects">Explore Projects <ArrowUpRight size={16}/></Link></section></aside></section><EditorialCTA/></div>;

}

export default async function CmsPage(props:BlogProps){
  return <EditablePage slug="blog">{await Blog(props)}</EditablePage>;
}
