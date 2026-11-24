import {headers} from "next/headers";
// Escape "<" so record text can never close the script element.
export default async function JsonLd({data}:{data:object}){
  return <script nonce={(await headers()).get("x-nonce")??undefined} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}}/>
}
