import CmsIntro from "../../../components/cms-intro";
import EditablePage from "../../../components/editable-page";
import {pageMetadata} from "../../../lib/server";
import {Intro} from "../../../components/site";
import DesignTools from "../../../components/design-tools";
export const generateMetadata=()=>pageMetadata("/ai-design",{title:"AI Design Lab",description:"Ask design questions, get conceptual feedback on a floor plan, or find related portfolio studies."});
function AiDesign(){
  return <><CmsIntro slug="ai-design" label="Atelier Arc design lab" title="Explore a design idea." description="Ask a question, examine a floor plan, or find portfolio studies that relate to your brief."/><section className="section-tight shell"><DesignTools/></section></>
}

export default async function CmsPage(){
  return <EditablePage slug="ai-design">{await AiDesign()}</EditablePage>;
}
