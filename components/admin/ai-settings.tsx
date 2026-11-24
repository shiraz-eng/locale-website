"use client";
import type {FormEvent} from "react";
import {request} from "../../lib/content";
import {Badge,Card,Loadable,PageHeader,useAction,useApi} from "./ui";
type Settings={assistant_enabled:boolean;portfolio_enabled:boolean;guidance:string;introduction:string;domain_knowledge:string;faqs:{question:string;answer:string}[];approved_services:string[];style_presets:string[];material_guidance:string;tone:string;consultation_cta:string;example_questions:string[];knowledge_sources:string[]};
type State={settings:Settings;model:string;fallbacks:string[];key_configured:boolean;daily_limit:number;used_today:number;rate_limit:number;services:{slug:string;name:string}[]};
const sources=["projects","services","materials","styles","faqs","studio"];
export default function AiSettings(){
  const state=useApi<State>("admin/ai-config"),action=useAction();
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);
    const text=(name:string)=>String(form.get(name)||"");
    const lines=(name:string)=>text(name).split("\n").map(line=>line.trim()).filter(Boolean);
    const settings={assistant_enabled:form.has("assistant_enabled"),portfolio_enabled:form.has("portfolio_enabled"),
      ...Object.fromEntries(["guidance","introduction","domain_knowledge","material_guidance","tone","consultation_cta"].map(key=>[key,text(key)])),
      approved_services:form.getAll("approved_services").map(String),knowledge_sources:form.getAll("knowledge_sources").map(String),
      style_presets:lines("style_presets"),example_questions:lines("example_questions"),
      faqs:lines("faqs").map(line=>{const [question,...answer]=line.split(" | ");return {question,answer:answer.join(" | ")}})};
    const value=await action.run(()=>request<State>("admin/ai-config","PUT",settings),"AI settings saved");if(value)state.setData(value);
  }
  return <><PageHeader title="AI Settings" description="Shape your architecture consultant using approved website content. Security rules, API keys, and private-record access cannot be changed here."/>
    <Loadable state={state}>{data=><div className="ad-main-side"><form className="ad-stack" key={JSON.stringify(data.settings)} onSubmit={save}>
      <Card title="Assistant experience"><div className="ad-stack">
        <label className="ad-check"><input type="checkbox" name="assistant_enabled" defaultChecked={data.settings.assistant_enabled}/> Enable public project assistant</label>
        <label className="ad-check"><input type="checkbox" name="portfolio_enabled" defaultChecked={data.settings.portfolio_enabled}/> Enable AI portfolio matching</label>
        <label className="ad-field">Introduction<textarea name="introduction" rows={3} maxLength={600} defaultValue={data.settings.introduction}/></label>
        <label className="ad-field">Response tone<select name="tone" defaultValue={data.settings.tone}><option value="professional">Professional</option><option value="warm">Warm and approachable</option><option value="concise">Concise</option></select></label>
        <label className="ad-field">Consultation invitation<input name="consultation_cta" maxLength={300} defaultValue={data.settings.consultation_cta}/><small>A suggested next step, without sales promises.</small></label>
        <label className="ad-field">Example questions<textarea name="example_questions" rows={4} maxLength={1800} defaultValue={data.settings.example_questions.join("\n")}/><small>One per line, up to six. Shown in the chat.</small></label>
      </div></Card>
      <Card title="Published knowledge sources"><div className="ad-stack"><p className="ad-small">Only published, enabled content is retrieved. Drafts, CRM data, client contact records, and internal team records are excluded.</p>
        <div className="ad-checklist">{sources.map(source=><label className="ad-check" key={source}><input type="checkbox" name="knowledge_sources" value={source} defaultChecked={data.settings.knowledge_sources.includes(source)}/>{source[0].toUpperCase()+source.slice(1)}</label>)}</div>
        <p className="ad-small">Approved service recommendations: leave all unchecked to allow all published services.</p>
        <div className="ad-checklist">{data.services.map(service=><label className="ad-check" key={service.slug}><input type="checkbox" name="approved_services" value={service.slug} defaultChecked={data.settings.approved_services.includes(service.slug)}/>{service.name}</label>)}</div>
      </div></Card>
      <Card title="Studio and architecture knowledge"><div className="ad-stack">
        <label className="ad-field">Approved business guidance<textarea name="guidance" rows={4} maxLength={2000} defaultValue={data.settings.guidance}/><small>Verified service areas, scope limitations, and studio facts. A portfolio location is not automatically a service area.</small></label>
        <label className="ad-field">Domain knowledge<textarea name="domain_knowledge" rows={6} maxLength={6000} defaultValue={data.settings.domain_knowledge}/><small>Project-specific principles and helpful architectural context. Do not enter credentials or private client information.</small></label>
        <label className="ad-field">FAQs<textarea name="faqs" rows={6} maxLength={19000} defaultValue={data.settings.faqs.map(faq=>faq.question+" | "+faq.answer).join("\n")}/><small>One “Question | Answer” per line, up to 15. Factual context cannot override the assistant’s protected instructions.</small></label>
        <label className="ad-field">Design style presets<textarea name="style_presets" rows={4} maxLength={1900} defaultValue={data.settings.style_presets.join("\n")}/><small>One style per line, up to 12. These choices appear in planner step 3.</small></label>
        <label className="ad-field">Material guidance<textarea name="material_guidance" rows={4} maxLength={2000} defaultValue={data.settings.material_guidance}/><small>Approved palette guidance, maintenance considerations, and local availability. Illustrative palettes remain identified as examples.</small></label>
      </div></Card>
      <button type="submit" className="ad-button ad-primary" disabled={action.pending}>{action.pending?"Saving…":"Save AI Settings"}</button>
    </form><aside className="ad-stack"><Card title="Model and usage"><dl className="ad-kv"><div><dt>API key</dt><dd><Badge tone={data.key_configured?"success":"critical"}>{data.key_configured?"Configured on server":"Missing"}</Badge></dd></div><div><dt>Primary model</dt><dd>{data.model}</dd></div><div><dt>Fallback models</dt><dd>{data.fallbacks.join(", ")||"None"}</dd></div><div><dt>Daily usage</dt><dd>{data.used_today} / {data.daily_limit}</dd></div><div><dt>Burst limit</dt><dd>{data.rate_limit} per 10 minutes</dd></div></dl></Card><Card title="Knowledge refresh"><p className="ad-small">Each request retrieves current published records and current AI settings. Publishing or updating CMS content is reflected in the next AI request. Saved settings also refresh the public introduction and planner choices.</p></Card><Card title="Protected boundaries"><p className="ad-small">The assistant provides conceptual guidance. It cannot approve engineering, certify code compliance, invent costs, guarantee dates, or write to your CMS or CRM.</p></Card></aside></div>}</Loadable>
  </>;
}
