import type {Section} from "./services";
function sameImage(left:unknown,right:unknown){
  if(left===right)return true;
  if(typeof left!=="string"||typeof right!=="string")return false;
  try{const a=new URL(left),b=new URL(right);return a.hostname==="images.unsplash.com"&&a.origin===b.origin&&a.pathname===b.pathname}catch{return false}
}
// Linked starter content follows basic fields; independently authored hero copy remains editable.
export function updateDocumentField<D extends {sections:Section[]},K extends keyof D>(doc:D,key:K,value:D[K]):D{
  const fields=doc as D&Record<string,unknown>,name=String(key);
  const mapping:Record<string,string>={title:"heading",name:"heading",description:"subheading",short_description:"subheading",cover_image:"image",card_image:"image",cover_alt:"image_alt",card_alt:"image_alt"};
  const target=mapping[name];
  if(!target)return {...doc,[key]:value};
  const image=fields["title" in fields?"cover_image":"card_image"];
  const sections=doc.sections.map(section=>{
    if(section.type==="hero"){
      const previous=section[target as keyof typeof section];
      const linked=target==="image"?sameImage(previous,doc[key]):target==="image_alt"?sameImage(section.image,image):previous===doc[key]||!previous;
      if(linked)return {...section,[target]:value} as Section;
    }
    if(section.type==="overview"&&name==="description"&&section.body===doc[key])return {...section,body:String(value)};
    return section;
  });
  return {...doc,[key]:value,sections};
}
