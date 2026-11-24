"use client";
import {useEffect,useState,type ReactNode,type KeyboardEvent} from "react";
export default function ProjectTabs({panels}:{panels:{id:string;label:string;content:ReactNode}[]}){
  const [active,setActive]=useState(panels[0]?.id);
  useEffect(()=>{const sync=()=>{const id=location.hash.slice(1);if(panels.some(panel=>panel.id===id))setActive(id)};sync();window.addEventListener("hashchange",sync);return()=>window.removeEventListener("hashchange",sync)},[panels]);
  const selected=panels.some(panel=>panel.id===active)?active:panels[0]?.id;
  function choose(id:string){setActive(id);history.replaceState(null,"","#"+id)}
  function keys(event:KeyboardEvent<HTMLButtonElement>,index:number){
    const next=event.key==="ArrowRight"?(index+1)%panels.length:event.key==="ArrowLeft"?(index+panels.length-1)%panels.length:event.key==="Home"?0:event.key==="End"?panels.length-1:null;
    if(next===null)return;event.preventDefault();choose(panels[next].id);document.getElementById("project-tab-"+panels[next].id)?.focus();
  }
  return <><nav className="sv-tabs pj-detail-tabs" aria-label="Project sections"><div className="aa-shell" role="tablist" aria-label="Project details">{panels.map((panel,index)=><button key={panel.id} id={"project-tab-"+panel.id} type="button" role="tab" aria-selected={selected===panel.id} aria-controls={"project-panel-"+panel.id} tabIndex={selected===panel.id?0:-1} onClick={()=>choose(panel.id)} onKeyDown={event=>keys(event,index)}>{panel.label}</button>)}</div></nav>{panels.map(panel=><div key={panel.id} id={"project-panel-"+panel.id} role="tabpanel" aria-labelledby={"project-tab-"+panel.id} hidden={selected!==panel.id}>{panel.content}</div>)}</>;
}
