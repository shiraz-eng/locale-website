// Run with the frontend and API servers running; no content is modified.
const api=(process.env.API_ORIGIN||"http://127.0.0.1:8010").replace(/\/$/,"");
const web=(process.env.WEBSITE_ORIGIN||"http://localhost:3000").replace(/\/$/,"");
async function json(path){
  const response=await fetch(api+path,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
const services=(await json("/api/services")).items;
const first=await json("/api/projects?size=48");
const projects=[...first.items];
for(let page=2;projects.length<first.total;page++){
  const next=await json(`/api/projects?size=48&page=${page}`);
  if(!next.items.length)throw new Error("Project pagination stopped before all published records were returned.");
  projects.push(...next.items);
}
const paths=[...services.map(row=>"/services/"+encodeURIComponent(row.slug)),...projects.map(row=>"/projects/"+encodeURIComponent(row.slug))];
const failures=[];
for(let start=0;start<paths.length;start+=4){
  await Promise.all(paths.slice(start,start+4).map(async path=>{
    try{
      const response=await fetch(web+path,{signal:AbortSignal.timeout(45000)});
      const html=await response.text();
      const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g,"").trim();
      if(!response.ok||!heading||/^(404|page not found|this page could not be found)/i.test(heading)){
        failures.push(`${path}: HTTP ${response.status}; ${heading||"missing page heading"}`);
      }
    }catch(error){failures.push(`${path}: ${error.message}`)}
  }));
}
if(failures.length){console.error(failures.join("\n"));process.exitCode=1}
else console.log(`Verified ${services.length} published services and ${projects.length} published projects render successfully in the frontend.`);
