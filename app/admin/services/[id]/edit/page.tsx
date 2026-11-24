import ServiceEditorPage from "../../../../../components/admin/service-editor";
export const metadata={title:"Edit service"};
export default async function Page({params}:{params:Promise<{id:string}>}){return <ServiceEditorPage id={(await params).id}/>}
