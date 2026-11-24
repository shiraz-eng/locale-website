import CmsIntro from "../../../components/cms-intro";
import EditablePage from "../../../components/editable-page";
import {Intro} from "../../../components/site";
import {pageMetadata,studio} from "../../../lib/server";
export const generateMetadata=()=>pageMetadata("/privacy",{title:"Privacy policy",description:"How the studio handles contact requests and project information."});
async function Privacy(){
  const settings=await studio();
  return <><CmsIntro slug="privacy" label="Studio policies" title="Privacy policy."/><section className="section-tight shell"><div className="prose-copy"><h2>Contact inquiries</h2><p>When you submit an inquiry, we store your contact details and project information to respond, prepare for consultations, and manage correspondence. Authorized studio staff can access these records.</p><h2>AI design tools</h2><p>When you use an AI tool, we send the submitted conversation, preferences, or floor-plan file to Google Gemini to generate a response. Avoid submitting names, addresses, or confidential materials. Conversation history is held in the current page session. Studio insights use aggregate inquiry counts.</p><h2>Cookies and external services</h2><p>Staff sign-in uses an essential session cookie. The office map and remote photography load from third-party providers, which may receive standard request information such as your IP address.</p><h2>Questions and requests</h2><p>Contact the studio about access, corrections, or deletion of inquiry information at <a className="text-link" href={"mailto:"+settings.email}>{settings.email}</a>.</p></div></section></>
}

export default async function CmsPage(){
  return <EditablePage slug="privacy">{await Privacy()}</EditablePage>;
}
