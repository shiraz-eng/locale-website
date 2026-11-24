import {revalidateTag} from "next/cache";

export async function POST(request:Request){
  const origin=process.env.PUBLIC_ORIGIN||"http://localhost:3000";
  const allowed=[origin,...(process.env.PUBLIC_ORIGINS||"").split(",").filter(Boolean)].map(value=>new URL(value.trim()).origin);
  if(!allowed.includes(request.headers.get("origin")||""))return new Response(null,{status:403});
  const session=await fetch((process.env.API_ORIGIN||"http://127.0.0.1:8010")+"/api/admin/session",{
    cache:"no-store",signal:AbortSignal.timeout(8000),headers:{Cookie:request.headers.get("cookie")??""},
  }).catch(()=>null);
  if(!session?.ok)return new Response(null,{status:401});
  const staff=await session.json() as {permissions?:string[]};
  if(!staff.permissions?.some(permission=>["content","pages","settings","seo","media"].includes(permission)))
    return new Response(null,{status:403});
  revalidateTag("published-content",{expire:0});
  return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
}
