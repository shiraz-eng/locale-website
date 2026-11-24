import ArchitectureImage from "../../../../components/home/architecture-image";
import EditorialHero from "../../../../components/editorial-hero";
import {ArticleCard,ConsultationCard,EditorialCTA,readingTime} from "../../../../components/journal";
import RichText from "../../../../components/rich-text";
import {Clock,BookOpen} from "lucide-react";
import {list} from "../../../../lib/server";
import {notFound} from "next/navigation";
import Link from "next/link";
import JsonLd from "../../../../components/json-ld";
import {siteUrl,type Article} from "../../../../lib/content";
import {item,previewing,studio} from "../../../../lib/server";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){
  const article=await item<Article>("blog",(await params).slug);
  return article?{title:article.seo_title||article.title,description:article.seo_description||article.description.slice(0,160),alternates:{canonical:article.canonical||"/blog/"+article.slug},robots:article.published===false||await previewing()?{index:false,follow:false}:undefined,openGraph:{type:"article",title:article.seo_title||article.title,description:article.seo_description||article.description.slice(0,200),images:article.og_image||article.image?[article.og_image||article.image as string]:undefined}}:{title:"Journal"};
}
export default async function ArticlePage({params}:Props){
  const article=await item<Article>("blog",(await params).slug);
  if(!article)notFound();
  const settings=await studio();
  const related=(await list<Article>("blog",new URLSearchParams("size=10"))).items.filter(value=>value.slug!==article.slug).slice(0,3);
  const blocks=article.body.split(/(?=^#{2,3} )/m).map(value=>value.trim()).filter(Boolean);
  const contents=blocks.map((text,index)=>({id:"article-section-"+index,title:text.match(/^#{2,3} (.+)/)?.[1]})).filter(value=>value.title);
  return <div className="editorial-page"><JsonLd data={{"@context":"https://schema.org","@type":"Article",headline:article.title,description:article.description,image:article.image||undefined,url:siteUrl+"/blog/"+article.slug,author:{"@type":"Organization",name:article.author_name||settings.title},publisher:{"@type":"Organization",name:settings.title}}}/><EditorialHero label={"Journal / "+(article.category||"Architecture")} title={article.title} description={article.description} image={article.image||"/portfolio/villa-garden.webp"} dark><div className="journal-topics"><span><Clock size={17}/>{readingTime(article.body)} min read</span><span>By {article.author_name||settings.title}</span></div></EditorialHero><div className="shell journal-article-layout"><article className="journal-story">{blocks.map((text,index)=><section id={"article-section-"+index} key={index}><RichText text={text} className="journal-prose"/></section>)}{article.tags?.length&&<div className="journal-tags"><strong>Tags:</strong>{article.tags.map(tag=><span key={tag}>{tag}</span>)}</div>}<div className="journal-story-end"><Link href="/blog">← Back to Journal</Link><Link href="/contact?type=consultation">Discuss Your Project ↗</Link></div><div className="journal-author">{article.author_image?<ArchitectureImage src={article.author_image} alt={article.author_name||settings.title} width={72} height={72}/>:<BookOpen size={32}/>}<div><h3>{article.author_name||settings.title}</h3>{article.author_role&&<small>{article.author_role}</small>}<p>{article.author_bio||"Ideas and insights from our architecture and design studio."}</p></div></div></article><aside className="journal-sidebar"><ConsultationCard/>{contents.length>0&&<nav className="journal-sidebar-panel" aria-label="Table of contents"><h2>Table of Contents</h2><ol className="journal-contents">{contents.map(entry=><li key={entry.id}><a href={"#"+entry.id}>{entry.title}</a></li>)}</ol></nav>}{related.length>0&&<section className="journal-sidebar-panel"><h2>Related Articles</h2>{related.map(value=><ArticleCard key={value.slug} article={value} compact/>)}</section>}</aside></div><EditorialCTA/></div>;
}
