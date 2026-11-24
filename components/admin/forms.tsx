"use client";
import {useState} from "react";
import {ArrowDown,ArrowUp,Plus,Trash2} from "lucide-react";
import {request} from "../../lib/content";
import type {ContactDefinition,FormField} from "../../lib/forms";
import {Badge,Card,Loadable,PageHeader,useAction,useAdmin,useApi} from "./ui";

type State={draft:ContactDefinition;published:ContactDefinition|null;unpublished_changes:boolean;revisions:{id:string;created:string}[]};
const core=["name","email","description"];
export default function FormsPage(){
  const state=useApi<State>("admin/forms/contact");
  return <Loadable state={state}>{data=><Editor key={JSON.stringify(data)} initial={data} onSaved={state.setData}/>}</Loadable>;
}
function Editor({initial,onSaved}:{initial:State;onSaved:(value:State)=>void}){
  const [form,setForm]=useState(initial.draft),[preview,setPreview]=useState(false);
  const action=useAction(),{confirm}=useAdmin();
  const dirty=JSON.stringify(form)!==JSON.stringify(initial.draft);
  const update=(index:number,patch:Partial<FormField>)=>setForm({...form,fields:form.fields.map((field,i)=>i===index?{...field,...patch}:field)});
  const move=(index:number,offset:number)=>{
    const fields=[...form.fields];
    const next=index+offset;
    [fields[index],fields[next]]=[fields[next],fields[index]];
    setForm({...form,fields});
  };
  async function save(){
    return action.run(async()=>{const value=await request<State>("admin/forms/contact","PUT",form);onSaved(value);return value},"Form draft saved");
  }
  async function publish(){
    if(!await confirm({title:"Publish the contact form?",body:"The new fields and options will appear on the website.",action:"Publish"}))return;
    if(dirty&&!await save())return;
    const value=await action.run(()=>request<State>("admin/forms/contact/publish","POST",{}),"Contact form published");
    if(value)onSaved(value);
  }
  return <>
    <PageHeader title="Contact Form" description="Configure fields and choices, preview the layout, then publish." actions={<>
      <Badge tone={dirty||initial.unpublished_changes?"attention":"success"}>{dirty||initial.unpublished_changes?"Unpublished changes":"Published"}</Badge>
      <button className="ad-button" onClick={()=>setPreview(!preview)}>Preview</button>
      <button className="ad-button" disabled={!dirty||action.pending} onClick={()=>void save()}>Save draft</button>
      <button className="ad-button ad-primary" disabled={action.pending||!(dirty||initial.unpublished_changes)} onClick={()=>void publish()}>Publish</button>
    </>}/>
    <Card title="Form text"><div className="ad-form-grid">
      {(["title","submit_label","success_message","consent_label"] as const).map(key=><label key={key} className="ad-field">{key.replaceAll("_"," ")}<input value={form[key]} maxLength={160} onChange={event=>setForm({...form,[key]:event.target.value})}/></label>)}
    </div>
      <h3>Request types</h3>
      {form.request_options.map((option,index)=><div className="ad-row" key={option.value}>
        <label className="ad-field">{option.value}<input value={option.label} maxLength={160} onChange={event=>setForm({...form,request_options:form.request_options.map((value,i)=>i===index?{...value,label:event.target.value}:value)})}/></label>
        <button type="button" className="ad-button" disabled={form.request_options.length===1} onClick={()=>setForm({...form,request_options:form.request_options.filter((_,i)=>i!==index)})}>Remove</button>
      </div>)}
      {(["inquiry","consultation","quotation"] as const).filter(value=>!form.request_options.some(option=>option.value===value)).map(value=><button key={value} type="button" className="ad-button" onClick={()=>setForm({...form,request_options:[...form.request_options,{value,label:value}]})}>Add {value}</button>)}
    </Card>
    {preview?<Card title="Form preview"><div className="ad-form-grid">{form.fields.filter(field=>field.visible).map(field=><label key={field.key} className={"ad-field"+(field.width==="full"?" ad-full":"")}>{field.label}{field.required?" *":""}
      {field.type==="select"?<select defaultValue=""><option value="">{field.placeholder||"Select an option"}</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>
      :field.type==="checkboxes"?<span>{field.options.map(option=><span className="ad-check" key={option}><input type="checkbox"/>{option}</span>)}</span>
      :field.type==="textarea"?<textarea placeholder={field.placeholder}/>:<input type={field.type} placeholder={field.placeholder}/>}</label>)}</div>
      <p className="ad-small">Consent is always required. Preview entries are not submitted.</p>
    </Card>:<div className="ad-stack">
      {form.fields.map((field,index)=><Card key={index} title={field.label} actions={<div className="ad-row">
        <button className="ad-icon" disabled={index===0} aria-label={"Move "+field.label+" up"} onClick={()=>move(index,-1)}><ArrowUp size={17}/></button>
        <button className="ad-icon" disabled={index===form.fields.length-1} aria-label={"Move "+field.label+" down"} onClick={()=>move(index,1)}><ArrowDown size={17}/></button>
        {!core.includes(field.key)&&<button className="ad-icon" aria-label={"Remove "+field.label} onClick={()=>setForm({...form,fields:form.fields.filter((_,i)=>i!==index)})}><Trash2 size={17}/></button>}
      </div>}><div className="ad-form-grid">
        <label className="ad-field">Field key<input value={field.key} disabled={core.includes(field.key)} maxLength={40} onChange={event=>update(index,{key:event.target.value})}/><small>Use lowercase letters, numbers, and underscores. Keep this stable after publishing.</small></label>
        <label className="ad-field">Label<input value={field.label} maxLength={160} onChange={event=>update(index,{label:event.target.value})}/></label>
        <label className="ad-field">Type<select value={field.type} disabled={core.includes(field.key)||field.key==="requirements"} onChange={event=>update(index,{type:event.target.value as FormField["type"]})}>{["text","email","tel","textarea","select","checkboxes"].map(type=><option key={type}>{type}</option>)}</select></label>
        <label className="ad-field">Placeholder<input value={field.placeholder} maxLength={200} onChange={event=>update(index,{placeholder:event.target.value})}/></label>
        <label className="ad-field">Minimum length<input type="number" min={0} max={4000} value={field.min_length} onChange={event=>update(index,{min_length:Number(event.target.value)})}/></label>
        <label className="ad-field">Maximum length<input type="number" min={1} max={4000} value={field.max_length} onChange={event=>update(index,{max_length:Number(event.target.value)})}/></label>
        <label className="ad-field">Width<select value={field.width} onChange={event=>update(index,{width:event.target.value as FormField["width"]})}><option value="half">Half</option><option value="full">Full</option></select></label>
        <div className="ad-row"><label className="ad-check"><input type="checkbox" checked={field.required} disabled={core.includes(field.key)} onChange={event=>update(index,{required:event.target.checked})}/> Required</label>
          <label className="ad-check"><input type="checkbox" checked={field.visible} disabled={core.includes(field.key)} onChange={event=>update(index,{visible:event.target.checked})}/> Visible</label></div>
        {["select","checkboxes"].includes(field.type)&&<label className="ad-field ad-full">Options in display order, one per line<textarea rows={6} value={field.options.join("\n")} onChange={event=>update(index,{options:event.target.value.split("\n")})}/><small>Move a line to reorder its option.</small></label>}
      </div></Card>)}
      <button type="button" className="ad-button" disabled={form.fields.length>=24} onClick={()=>setForm({...form,fields:[...form.fields,{key:"field_"+crypto.randomUUID().replaceAll("-","").slice(0,10),label:"New field",type:"text",placeholder:"",required:false,visible:true,options:[],min_length:0,max_length:160,width:"half"}]})}><Plus size={16}/> Add field</button>
    </div>}
    <Card title="Revision history"><div className="ad-list">{initial.revisions.length?initial.revisions.map(revision=><button key={revision.id} className="ad-button" onClick={async()=>{if(await confirm({title:"Restore this form revision?",action:"Restore draft"})){const value=await action.run(()=>request<ContactDefinition>("admin/forms/contact/revisions/"+revision.id));if(value)setForm(value)}}}>Restore draft from {new Date(revision.created).toLocaleString()}</button>):<p>Saved versions will appear here.</p>}</div></Card>
  </>;
}
