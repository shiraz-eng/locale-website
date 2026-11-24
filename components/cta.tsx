import {ArrowUpRight} from "lucide-react";
import {consultationLabel} from "../lib/content";
import {studio as loadStudio} from "../lib/server";
import TrackedLink,{WhatsApp} from "./tracked-link";
export default async function CTA({title="Let’s make space for something new.",project,service}:{title?:string;project?:string;service?:string}){
  const settings=await loadStudio();
  const scope=(project?"&project="+project:"")+(service?"&service="+service:"");
  return <section className="cta"><div className="shell section-heading"><div><p className="eyebrow">Start a conversation</p><h2>{title}</h2></div><div className="actions"><TrackedLink className="button dark" href={"/contact?type=consultation"+scope} label="consultation" project={project} service={service}>{consultationLabel(settings)} <ArrowUpRight size={17}/></TrackedLink><TrackedLink className="button outline" href="/plan-your-project" label="plan-with-ai" project={project} service={service}>Plan Your Project With AI</TrackedLink><TrackedLink className="button outline" href={"/contact?type=quotation"+scope} label="quotation" project={project} service={service}>Request a Quotation</TrackedLink><WhatsApp number={settings.whatsapp} project={project}/></div></div></section>
}
