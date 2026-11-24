import {RecordFormPage} from "../../../../components/admin/records";
export const metadata={title:"Edit blog"};
export default async function Page({params}:{params:Promise<{slug:string}>}){return <RecordFormPage kind="blog" slug={(await params).slug}/>}
