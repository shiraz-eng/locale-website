import {editablePage} from "../lib/server";
import {Intro} from "./site";

export default async function CmsIntro({slug,label,title,description}:{slug:string;label:string;title:string;description?:string}){
  const doc=await editablePage(slug);
  return <Intro label={label} title={doc?.heading||title} description={doc?.description||description}/>;
}
