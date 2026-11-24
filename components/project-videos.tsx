"use client";
import {useState} from "react";
import {Play,Video} from "lucide-react";
import type {Picture} from "../lib/services";
import {embed} from "../lib/video";
import ArchitectureImage from "./home/architecture-image";
export default function ProjectVideos({videos,inspiration=false}:{videos:Picture[];inspiration?:boolean}){
  const entries=videos.filter(video=>embed(video.video));
  const [index,setIndex]=useState(0),[playing,setPlaying]=useState(false);
  if(!entries.length)return null;
  const active=index%entries.length,current=entries[active],title=current.caption||current.alt;
  return <div className="pp-videos"><div className="pp-video-player">{playing?<iframe key={current.video} src={embed(current.video)!} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<button type="button" className="pp-video-poster" aria-label={"Play "+title} onClick={()=>setPlaying(true)}><ArchitectureImage src={current.image} alt="" fill sizes="(max-width: 760px) 90vw, 42vw"/><span className="pp-video-title">{title}</span><span className="pp-video-play"><Play size={24} fill="currentColor"/></span></button>}</div><aside className="pp-video-list"><h3><Video size={16}/>{inspiration?"Design Inspiration":"Project Videos"} ({entries.length})</h3><ul>{entries.map((entry,i)=><li key={entry.video!+i}><button type="button" aria-pressed={i===active} onClick={()=>{setIndex(i);setPlaying(true)}}><ArchitectureImage src={entry.image} alt="" width={92} height={58}/><span>{entry.caption||entry.alt}</span></button></li>)}</ul>{inspiration&&<p className="pp-video-credit">Independent films by The Local Project. Design inspiration featuring work by other architects.</p>}<a className="pp-video-source" href={current.video!} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></aside></div>;
}

