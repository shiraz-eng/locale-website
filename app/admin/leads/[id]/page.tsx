import {LeadDetailPage} from "../../../../components/admin/leads";
export const metadata={title:"Lead"};
export default async function Page({params}:{params:Promise<{id:string}>}){return <LeadDetailPage id={(await params).id}/>}
