import type {MetadataRoute} from "next";
import {siteUrl,type Article,type Project} from "../lib/content";
import {list,services} from "../lib/server";
// Rendered per request so a build without the API never caches an empty sitemap.
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  async function collection<T>(kind:"projects"|"blog"){
    const items:T[]=[];
    let total=0;
    do{
      const result=await list<T>(kind,new URLSearchParams({size:"100",page:String(Math.floor(items.length/100)+1)}));
      if(!result.items.length)break;
      items.push(...result.items);
      total=result.total;
    }while(items.length<total);
    return items;
  }
  const [projects,offered,articles]=await Promise.all([collection<Project>("projects"),services(),collection<Article>("blog")]);
  const page=(path:string,priority:number,changeFrequency:"weekly"|"monthly"|"yearly"="monthly")=>({url:siteUrl+path,priority,changeFrequency});
  return [page("",1,"weekly"),page("/projects",.9,"weekly"),page("/services",.9),page("/plan-your-project",.8),page("/contact",.8),
    page("/about",.6),page("/team",.4),page("/blog",.6,"weekly"),page("/ai-design",.4),page("/privacy",.1,"yearly"),
    ...offered.map(service=>page("/services/"+service.slug,.8)),
    ...projects.map(project=>page("/projects/"+project.slug,.7)),
    ...articles.map(article=>page("/blog/"+article.slug,.5))];
}
