import {draftMode} from "next/headers";
import {redirect} from "next/navigation";
// Only same-site paths, so the redirect can't be used to send staff to another domain.
const safePath=(value:string|null)=>value&&value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")?value:"/";
export async function GET(request:Request){
  const url=new URL(request.url);
  const path=safePath(url.searchParams.get("path"));
  const draft=await draftMode();
  if(url.searchParams.has("exit")){
    draft.disable();
    redirect(path);
  }
  const session=await fetch((process.env.API_ORIGIN||"http://127.0.0.1:8010")+"/api/admin/session",{cache:"no-store",headers:{Cookie:request.headers.get("cookie")??""}}).catch(()=>null);
  const staff=session?.ok?await session.json() as {permissions:string[]}:null;
  if(!staff?.permissions.some(permission=>permission==="content"||permission==="pages"))
    return new Response("Sign in to the studio admin with website permissions to preview drafts.",{status:401,headers:{"Content-Type":"text/plain; charset=utf-8"}});
  draft.enable();
  redirect(path);
}
