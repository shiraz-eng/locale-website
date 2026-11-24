import {RecordFormPage} from "../../../../components/admin/records";
export const metadata={title:"Edit team member"};
export default async function Page({params}:{params:Promise<{slug:string}>}){return <RecordFormPage kind="team" slug={(await params).slug}/>}
