"use client";
import {useCallback,useEffect,useRef,useState,type FormEvent,type ReactNode} from "react";
import {useModalFocus} from "../../lib/use-modal-focus";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {Bell,Building2,IdCard,CalendarDays,ChartColumn,ChevronDown,ExternalLink,FileText,Images,Layers,LayoutDashboard,Lightbulb,LogOut,Menu,MessagesSquare,Newspaper,PanelLeftClose,PanelLeftOpen,PanelsTopLeft,Search,Settings,Sparkles,SquareKanban,UserCog,Users} from "lucide-react";
import {request,type Studio} from "../../lib/content";
import type {Member} from "./fields";
import {AdminContext,Empty,Skeleton,type Staff} from "./ui";
type Item={label:string;href:string;permission:string;icon:typeof Users};
export const navigation:{group:string;items:Item[]}[]=[
  {group:"Overview",items:[{label:"CMS Overview",href:"/admin",permission:"dashboard",icon:LayoutDashboard}]},
  {group:"Website",items:[
    {label:"Pages",href:"/admin/pages",permission:"pages",icon:PanelsTopLeft},
    {label:"Projects",href:"/admin/projects",permission:"content",icon:Building2},
    {label:"Services",href:"/admin/services",permission:"content",icon:Layers},
    {label:"Team",href:"/admin/team",permission:"content",icon:IdCard},
    {label:"Blog",href:"/admin/blog",permission:"content",icon:Newspaper},
    {label:"Media Library",href:"/admin/media",permission:"media",icon:Images},
    {label:"Forms",href:"/admin/forms",permission:"pages",icon:FileText},
    {label:"Navigation & Footer",href:"/admin/navigation",permission:"pages",icon:Menu},
    {label:"SEO",href:"/admin/seo",permission:"seo",icon:Search},
  ]},
  {group:"Customer requests",items:[{label:"Inquiries",href:"/admin/inquiries",permission:"leads",icon:MessagesSquare}]},
  {group:"Settings",items:[
    {label:"Site Settings",href:"/admin/settings",permission:"settings",icon:Settings},
    {label:"AI Settings",href:"/admin/ai",permission:"ai_config",icon:Sparkles},
    {label:"Users & Roles",href:"/admin/users",permission:"team",icon:UserCog},
  ]},
];
const flat=navigation.flatMap(group=>group.items);
const routeItem=(path:string)=>flat.filter(item=>path===item.href||item.href!=="/admin"&&path.startsWith(item.href+"/")).at(-1)??(path==="/admin"?flat[0]:undefined);
function Login({onLogin}:{onLogin:(staff:Staff)=>void}){
  const [error,setError]=useState(""),[pending,setPending]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setPending(true);setError("");
    try{await request("admin/login","POST",Object.fromEntries(new FormData(event.currentTarget)));onLogin(await request<Staff>("admin/session"))}
    catch(error){setError((error as Error).message)}
    finally{setPending(false)}
  }
  return <div className="ad-login"><form className="ad-card ad-stack" onSubmit={submit}><div><p className="ad-eyebrow">Atelier Arc</p><h1>Sign in to the studio admin</h1></div><label className="ad-field">Email<input name="email" type="email" autoComplete="username" required/></label><label className="ad-field">Password<input name="password" type="password" autoComplete="current-password" required/></label><button className="ad-button ad-primary" disabled={pending}>{pending?"Signing in…":"Sign in"}</button>{error&&<p className="ad-banner ad-critical" role="alert">{error}</p>}<Link className="ad-link" href="/">Back to website</Link></form></div>
}
function GlobalSearch(){
  const router=useRouter();
  const [q,setQ]=useState(""),[results,setResults]=useState<{type:string;title:string;subtitle:string;href:string}[]>([]),[open,setOpen]=useState(false);
  useEffect(()=>{
    if(q.trim().length<2){setResults([]);return}
    const timer=setTimeout(()=>{request<{items:typeof results}>("admin/search?q="+encodeURIComponent(q.trim())).then(value=>setResults(value.items)).catch(()=>setResults([]))},220);
    return()=>clearTimeout(timer);
  },[q]);
  return <div className="ad-search" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}><Search size={16}/><input type="search" placeholder="Search leads, projects, articles" aria-label="Search" value={q} onFocus={()=>setOpen(true)} onChange={event=>{setQ(event.target.value);setOpen(true)}} onKeyDown={event=>{if(event.key==="Enter"&&results[0]){router.push(results[0].href);setOpen(false)}}}/>
    {open&&q.trim().length>=2&&<div className="ad-popover ad-results">{results.length?results.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)}><span className="ad-muted">{item.type}</span><strong>{item.title}</strong><span className="ad-muted">{item.subtitle}</span></Link>):<p className="ad-muted">No matches.</p>}</div>}</div>
}
function Notifications(){
  const [items,setItems]=useState<{kind:string;text:string;href:string}[]>([]),[open,setOpen]=useState(false);
  const path=usePathname();
  useEffect(()=>{request<{items:typeof items}>("admin/notifications").then(value=>setItems(value.items)).catch(()=>{})},[path]);
  return <div className="ad-menu" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}><button className="ad-icon" aria-label={"Notifications ("+items.length+")"} aria-expanded={open} onClick={()=>setOpen(!open)}><Bell size={18}/>{items.length>0&&<span className="ad-dot">{items.length}</span>}</button>
    {open&&<div className="ad-popover ad-right"><p className="ad-popover-title">Notifications</p>{items.length?items.map((item,index)=><Link key={index} href={item.href} onClick={()=>setOpen(false)}>{item.text}</Link>):<p className="ad-muted">You’re all caught up.</p>}</div>}</div>
}
function UserMenu({staff,onLogout}:{staff:Staff;onLogout:()=>void}){
  const [open,setOpen]=useState(false);
  return <div className="ad-menu" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}><button className="ad-user" aria-expanded={open} onClick={()=>setOpen(!open)}><span className="ad-avatar">{(staff.name||staff.email)[0].toUpperCase()}</span><span className="ad-user-name">{staff.name||staff.email}</span><ChevronDown size={14}/></button>
    {open&&<div className="ad-popover ad-right"><p className="ad-popover-title">{staff.email}<br/><span className="ad-muted">Role: {staff.role}</span></p><Link href="/" target="_blank"><ExternalLink size={14}/> View website</Link><button onClick={onLogout}><LogOut size={14}/> Sign out</button></div>}</div>
}
export default function AdminShell({children}:{children:ReactNode}){
  const path=usePathname(),router=useRouter();
  const [staff,setStaff]=useState<Staff|null|undefined>(undefined),[members,setMembers]=useState<Member[]>([]),[currency,setCurrency]=useState("USD");
  const [collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false),[closedGroups,setClosedGroups]=useState<string[]>([]);
  const [toasts,setToasts]=useState<{id:number;text:string;tone:string}[]>([]);
  const [dialog,setDialog]=useState<{title:string;body?:string;action?:string;danger?:boolean;resolve:(value:boolean)=>void}|null>(null);
  const sidebar=useRef<HTMLElement>(null),navigationTrigger=useRef<HTMLButtonElement>(null);
  useModalFocus(mobile,sidebar,()=>setMobile(false),navigationTrigger);
  useEffect(()=>{
    const desktop=matchMedia("(min-width: 861px)");
    const reset=()=>{if(desktop.matches)setMobile(false)};
    desktop.addEventListener("change",reset);
    return()=>desktop.removeEventListener("change",reset);
  },[]);
  const confirmButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{request<Staff>("admin/session").then(setStaff).catch(()=>setStaff(null))},[]);
  useEffect(()=>{if(!staff)return;request<{items:Member[]}>("admin/team").then(value=>setMembers(value.items)).catch(()=>{});request<Studio>("content/settings/studio").then(value=>setCurrency(value.currency||"USD")).catch(()=>{})},[staff]);
  useEffect(()=>{try{setCollapsed(localStorage.getItem("ad-collapsed")==="1")}catch{}},[]);
  useEffect(()=>{setMobile(false)},[path]);
  useEffect(()=>{if(dialog)confirmButton.current?.focus()},[dialog]);
  const toast=useCallback((text:string,tone="success")=>{const id=Date.now()+Math.random();setToasts(list=>[...list,{id,text,tone}]);setTimeout(()=>setToasts(list=>list.filter(item=>item.id!==id)),tone==="error"?6000:3500)},[]);
  const confirm=useCallback((options:{title:string;body?:string;action?:string;danger?:boolean})=>new Promise<boolean>(resolve=>setDialog({...options,resolve})),[]);
  if(staff===undefined)return <div className="ad-boot"><Skeleton rows={6}/></div>;
  if(!staff)return <Login onLogin={setStaff}/>;
  const user=staff;
  const can=(permission:string)=>user.permissions.includes(permission);
  async function logout(){await request("admin/logout","POST",{}).catch(()=>{});setStaff(null);router.push("/admin")}
  const current=routeItem(path);
  const crumbs=path.split("/").filter(Boolean).slice(1);
  const close=(value:boolean)=>{dialog?.resolve(value);setDialog(null)};
  return <AdminContext.Provider value={{staff:user,can,toast,confirm,members,currency}}>
    <div className={"ad"+(collapsed?" ad-collapsed":"")+(mobile?" ad-mobile-open":"")}>
      <aside ref={sidebar} id="admin-navigation" className="ad-sidebar" role={mobile?"dialog":undefined} aria-modal={mobile||undefined} aria-label="Admin navigation">
        <button type="button" className="ad-button ad-mobile-only ad-nav-close" onClick={()=>setMobile(false)}>Close navigation</button>
        <Link href="/admin" className="ad-brand"><svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M2 28 14 4l12 24M8 17h12M18 4l12 24" stroke="currentColor" strokeWidth="1.6"/></svg><span>Atelier Arc<small>CMS</small></span></Link>
        <nav>{navigation.map(group=>{
          const items=group.items.filter(item=>can(item.permission));
          if(!items.length)return null;
          const shut=closedGroups.includes(group.group);
          return <div key={group.group} className="ad-group"><button className="ad-group-label" aria-expanded={!shut} onClick={()=>setClosedGroups(list=>shut?list.filter(value=>value!==group.group):[...list,group.group])}><span>{group.group}</span><ChevronDown size={13}/></button>
            {!shut&&items.map(({label,href,icon:Icon})=><Link key={href} href={href} title={label} aria-current={current?.href===href?"page":undefined}><Icon size={17}/><span>{label}</span></Link>)}</div>})}</nav>
        <Link className="ad-storefront" href="/" target="_blank"><ExternalLink size={15}/><span>View website</span></Link>
      </aside>
      <div className="ad-main">
        <header className="ad-topbar">
          <button ref={navigationTrigger} className="ad-icon ad-mobile-only" aria-expanded={mobile} aria-controls="admin-navigation" aria-label="Open navigation" onClick={()=>setMobile(!mobile)}><Menu size={18}/></button>
          <button className="ad-icon ad-desktop-only" aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} onClick={()=>{setCollapsed(!collapsed);try{localStorage.setItem("ad-collapsed",collapsed?"0":"1")}catch{}}}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
          <nav className="ad-crumbs" aria-label="Breadcrumb"><Link href="/admin">Admin</Link>{crumbs.map((crumb,index)=>{const href="/admin/"+crumbs.slice(0,index+1).join("/");const label=flat.find(item=>item.href===href)?.label??decodeURIComponent(crumb).replace(/-/g," ");return <span key={href}> / {index===crumbs.length-1?<span aria-current="page">{label}</span>:<Link href={href}>{label}</Link>}</span>})}</nav>
          <GlobalSearch/><Notifications/><UserMenu staff={user} onLogout={logout}/>
        </header>
        <main className="ad-content" id="admin-main">{current&&!can(current.permission)?<Empty title="You don’t have access to this area" text={"Your role ("+user.role+") does not include "+current.label+". Ask an owner if you need access."}/>:children}</main>
      </div>
      {mobile&&<button className="ad-scrim" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
      <div className="ad-toasts" aria-live="polite">{toasts.map(item=><div key={item.id} className={"ad-toast ad-"+item.tone} role={item.tone==="error"?"alert":"status"}>{item.text}</div>)}</div>
      {dialog&&<div className="ad-overlay"><div className="ad-modal" role="alertdialog" aria-modal="true" aria-label={dialog.title}><h2>{dialog.title}</h2>{dialog.body&&<p>{dialog.body}</p>}<div className="ad-actions"><button className="ad-button" onClick={()=>close(false)}>Cancel</button><button ref={confirmButton} className={"ad-button "+(dialog.danger?"ad-danger":"ad-primary")} onClick={()=>close(true)}>{dialog.action||"Confirm"}</button></div></div></div>}
    </div>
  </AdminContext.Provider>
}
