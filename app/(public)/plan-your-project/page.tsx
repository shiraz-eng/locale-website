import PlannerHero from "../../../components/planner-hero";
import EditablePage from "../../../components/editable-page";
import {pageMetadata,editablePage,site} from "../../../lib/server";
import Link from "next/link";
import "./planner.css";
import Planner from "../../../components/planner";
export const generateMetadata=()=>pageMetadata("/plan-your-project",{title:"Plan Your Project With AI",description:"Answer a few questions about your architecture or interior project and receive a conceptual design brief you can share with the studio. No sign-up required."});
async function PlanYourProject(){
  const [page,{ai}]=await Promise.all([editablePage("plan-your-project"),site()]);
  return <div className="ap-page"><PlannerHero heading={page?.heading} description={page?.description} image={page?.hero_image}/><section className="ap-workspace" id="project-planner"><Planner stylePresets={ai.style_presets}/><p className="subtle spaced">Have a floor plan already? Try the <Link className="inline-link" href="/ai-design">design lab</Link> for conceptual feedback.</p></section></div>
}

export default async function CmsPage(){
  return <EditablePage slug="plan-your-project">{await PlanYourProject()}</EditablePage>;
}
