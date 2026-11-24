import PageContentEditor from "../../../../components/admin/page-content";
import {notFound} from "next/navigation";
export const metadata={title:"Edit page"};
export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!["about","team","blog","contact","plan-your-project","ai-design","privacy"].includes(slug))notFound();
  return <PageContentEditor slug={slug}/>;
}
