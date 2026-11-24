import type {ReactNode} from "react";
import ArchitectureImage from "./home/architecture-image";
// CMS text is a small Markdown subset rendered to React elements: no HTML from the database is ever
// injected, and links only allow site paths, https, mailto and tel.
const safeHref=(href:string)=>/^(https:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(href)?href:null;
function inline(text:string,key:string):ReactNode[]{
  const parts:ReactNode[]=[];
  const pattern=/(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last=0,match:RegExpExecArray|null,index=0;
  while((match=pattern.exec(text))){
    if(match.index>last)parts.push(text.slice(last,match.index));
    const id=key+"-"+index++;
    if(match[2])parts.push(<strong key={id}>{match[2]}</strong>);
    else if(match[3])parts.push(<em key={id}>{match[3]}</em>);
    else{const href=safeHref(match[5]);parts.push(href?<a key={id} href={href} className="sv-link" {...(href.startsWith("https://")?{target:"_blank",rel:"noopener noreferrer"}:{})}>{match[4]}</a>:match[4])}
    last=pattern.lastIndex;
  }
  if(last<text.length)parts.push(text.slice(last));
  return parts;
}
export default function RichText({text,className="sv-rich"}:{text:string;className?:string}){
  const blocks=text.replace(/\r\n/g,"\n").split(/\n{2,}/).map(block=>block.trim()).filter(Boolean);
  return <div className={className}>{blocks.map((block,index)=>{
    const lines=block.split("\n");
    const picture=block.match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+|\/(?!\/)[^\s)]+)\)$/);
    if(picture)return <figure key={index}><ArchitectureImage src={picture[2]} alt={picture[1]} width={1000} height={600} sizes="(max-width: 760px) 90vw, 65vw"/>{picture[1]&&<figcaption>{picture[1]}</figcaption>}</figure>;
    if(lines.every(line=>/^[-*] /.test(line)))return <ul key={index}>{lines.map((line,item)=><li key={item}>{inline(line.slice(2),index+"-"+item)}</li>)}</ul>;
    if(block.startsWith("## "))return <h2 key={index}>{inline(block.slice(3),String(index))}</h2>;
    if(block.startsWith("> "))return <blockquote key={index}>{inline(block.slice(2),String(index))}</blockquote>;
    if(block.startsWith("### "))return <h3 key={index}>{inline(block.slice(4),String(index))}</h3>;
    return <p key={index}>{lines.flatMap((line,item)=>item?[<br key={"br"+item}/>,...inline(line,index+"-"+item)]:inline(line,index+"-"+item))}</p>;
  })}</div>
}
