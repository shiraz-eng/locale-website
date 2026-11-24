import ProjectEditorPage from "../../../../../components/admin/project-editor";
export const metadata={title:"Edit project"};
export default async function Page({params}:{params:Promise<{id:string}>}){return <ProjectEditorPage id={(await params).id}/>}
