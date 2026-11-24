export type Attribution={page:string;landing:string;referrer:string;utm_source:string;utm_medium:string;utm_campaign:string;project?:string|null;service?:string|null};
const key="aa-first-touch";
const clip=(value:string|null,length=120)=>(value||"").slice(0,length);

// First-touch source data lives in this tab's sessionStorage only: no cookies, no IP, no cross-site identifiers.
export function rememberVisit(){
  try{
    if(sessionStorage.getItem(key))return;
    const params=new URLSearchParams(location.search);
    let referrer="";
    try{const host=new URL(document.referrer).hostname;if(host!==location.hostname)referrer=host}catch{}
    sessionStorage.setItem(key,JSON.stringify({landing:clip(location.pathname,300),referrer:clip(referrer),
      utm_source:clip(params.get("utm_source")),utm_medium:clip(params.get("utm_medium")),utm_campaign:clip(params.get("utm_campaign"))}));
  }catch{}
}
export function attribution(extra:{project?:string|null;service?:string|null}={}):Attribution{
  let first={};
  try{first=JSON.parse(sessionStorage.getItem(key)||"{}")}catch{}
  return {landing:"",referrer:"",utm_source:"",utm_medium:"",utm_campaign:"",...first,page:clip(location.pathname,300),project:extra.project||null,service:extra.service||null};
}
export function track(name:"cta_click"|"whatsapp_click"|"assistant_open",label="",extra:{project?:string;service?:string}={}){
  try{void fetch("/api/events",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,label:label.slice(0,60),path:clip(location.pathname,300),...extra})}).catch(()=>{})}catch{}
}
