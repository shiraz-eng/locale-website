"use client";
import {useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Quote,Star} from "lucide-react";
type Review={quote:string;name:string;role:string;rating:number|null};
const samples:Review[]=[
  {quote:"Thoughtful spaces, considered details, and a design shaped around everyday life.",name:"Sample homeowner",role:"Illustrative review",rating:5},
  {quote:"A collaborative approach that brings clarity to the design process, from the first idea to the final detail.",name:"Sample business owner",role:"Illustrative review",rating:5},
  {quote:"A warm, functional space that balances beautiful materials with the way we want to live.",name:"Sample project client",role:"Illustrative review",rating:5},
];
export default function Reviews({quotes,demo=false}:{quotes:string[];demo?:boolean}){
  const [page,setPage]=useState(0);
  const touch=useRef<{x:number;y:number}|null>(null);
  const entries:Review[]=quotes.map(value=>{const [quote,name,role,rating]=value.split(" | ");const score=rating?.trim()?Number(rating):null;return {quote,name:name||"Studio client",role:role||"",rating:score!==null&&Number.isInteger(score)&&score>=1&&score<=5?score:null}}).filter(entry=>entry.quote.trim());
  const illustrative=(!entries.length&&demo)||(entries.length>0&&entries.every(entry=>entry.role==="Illustrative review"));
  const reviews=entries.length?entries:illustrative?samples:[];
  const pages=Math.max(1,reviews.length),active=page%pages;
  const current=Array.from({length:Math.min(3,reviews.length)},(_,index)=>reviews[(active+index)%reviews.length]);
  const move=(delta:number)=>setPage((active+delta+pages)%pages);
  return <section className="client-reviews" aria-label="Client reviews"><div className="client-reviews-shell"><header><p className="client-reviews-kicker">Client Reviews<span/></p><h2>What Our<br/><em>Clients Say</em></h2><p>{illustrative?"Preview the review layout. Replace these examples with approved client feedback in the CMS.":"Experiences shared by the people we design for."}</p>{illustrative&&<span className="client-reviews-sample">Sample testimonials</span>}</header><div className="client-reviews-content">{current.length?<><div key={active} className="client-review-cards" onTouchStart={event=>{touch.current={x:event.touches[0].clientX,y:event.touches[0].clientY}}} onTouchEnd={event=>{const start=touch.current;touch.current=null;if(!start)return;const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))move(dx<0?1:-1)}} aria-live="polite" aria-atomic="true">{current.map((entry,index)=><figure key={active+"-"+index} className="client-review-card">{entry.rating?<div className="client-review-stars" aria-label={entry.rating+" out of 5 stars"}>{Array.from({length:5},(_,i)=><Star key={i} size={15} fill={i<entry.rating!?"currentColor":"none"} aria-hidden="true"/>)}</div>:<Quote size={23} className="client-review-quote" aria-hidden="true"/>}<blockquote>“{entry.quote}”</blockquote><figcaption><span className="client-review-avatar" aria-hidden="true">{entry.name.split(/\s+/).map(word=>word[0]).slice(0,2).join("")}</span><div><strong>{entry.name}</strong>{entry.role&&<small>{entry.role}</small>}</div></figcaption></figure>)}</div>{pages>1&&<nav className="client-review-controls" aria-label="Review pages"><button type="button" aria-label="Previous reviews" onClick={()=>move(-1)}><ArrowLeft size={18}/></button><div className="client-review-dots">{Array.from({length:pages},(_,index)=><button type="button" key={index} aria-label={"Show reviews page "+(index+1)} aria-current={index===active?"page":undefined} onClick={()=>setPage(index)}/>)}</div><button type="button" aria-label="Next reviews" onClick={()=>move(1)}><ArrowRight size={18}/></button></nav>}</>:<div className="client-reviews-empty"><Quote size={28}/><h3>Every project starts with a conversation.</h3><p>Client stories will appear here as they are shared with the studio.</p><Link className="button outline" href="/contact?type=consultation">Talk to Our Team <ArrowRight size={16}/></Link></div>}</div></div></section>;
}
