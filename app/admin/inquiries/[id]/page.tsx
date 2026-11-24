import {InquiryDetail} from "../../../../components/admin/inquiries";
export const metadata={title:"Inquiry"};
export default async function Page({params}:{params:Promise<{id:string}>}){return <InquiryDetail id={(await params).id}/>}
