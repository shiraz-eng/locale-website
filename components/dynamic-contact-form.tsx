"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {request} from "../lib/content";
import {attribution,rememberVisit} from "../lib/track";
import type {PublicForm} from "../lib/forms";
import type {RequestKind} from "./contact-form";

export default function DynamicContactForm({kind:initial,project,service,initialSchema}:{kind:RequestKind;project?:{slug:string;title:string};service?:{slug:string;name:string};initialSchema?:PublicForm|null}){
  const [schema,setSchema]=useState<PublicForm|null>(initialSchema??null),[error,setError]=useState(""),[pending,setPending]=useState(false),[sent,setSent]=useState(false),[kind,setKind]=useState(initialSchema&&!initialSchema.definition.request_options.some(option=>option.value===initial)?initialSchema.definition.request_options[0].value:initial);
  const [submissionId,setSubmissionId]=useState("");
  useEffect(()=>{
    rememberVisit();
    setSubmissionId(crypto.randomUUID());
    let active=true;
    request<PublicForm>("forms/contact").then(value=>{if(active){setSchema(value);setKind(value.definition.request_options.some(option=>option.value===initial)?initial:value.definition.request_options[0].value)}}).catch(reason=>{if(active)setError(reason.message)});
    return()=>{active=false};
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!schema)return;
    const data=new FormData(event.currentTarget);
    const answers=Object.fromEntries(schema.definition.fields.filter(field=>field.visible).map(field=>[
      field.key,field.type==="checkboxes"?data.getAll(field.key).map(String):String(data.get(field.key)??"").trim(),
    ]));
    setPending(true);setError("");
    try{
      await request("inquiries","POST",{
        form_id:"contact",form_version:schema.version,answers,submission_id:submissionId,
        name:answers.name,email:answers.email,description:answers.description,
        kind,consent:data.has("consent"),website:String(data.get("website")??""),
        attribution:attribution({project:project?.slug,service:service?.slug}),
      });
      setSent(true);
    }catch(reason){setError((reason as Error).message)}
    finally{setPending(false)}
  }
  if(!schema)return <div className="form-panel" role="status">{error||"Loading contact form…"}</div>;
  if(sent)return <div className="form-panel"><p className="notice success" role="status">{schema.definition.success_message}</p>
    <button type="button" className="button outline" onClick={()=>{setSubmissionId(crypto.randomUUID());setSent(false)}}>Send another message</button></div>;
  return <form className="form-panel" onSubmit={submit}>
    <h2 className="contact-form-title">{schema.definition.title}</h2>
    <div hidden aria-hidden="true"><label>Website<input name="website" autoComplete="off" tabIndex={-1}/></label></div>
    <fieldset className="choice-row"><legend>Request type</legend>{schema.definition.request_options.map(({value,label})=>
      <label key={value}><input type="radio" name="kind" checked={kind===value} onChange={()=>setKind(value)}/> {label}</label>)}</fieldset>
    <div className="field-grid">
      {schema.definition.fields.filter(field=>field.visible).map(field=>{
        const id="contact-"+field.key;
        const common={id,name:field.key,required:field.required,placeholder:field.placeholder,maxLength:field.max_length,minLength:field.min_length||undefined};
        const value=field.key==="description"?(project?"I’d like to discuss a project similar to "+project.title+".":service?"I’m interested in "+service.name+".":""):"";
        if(field.type==="checkboxes")return <fieldset className={"field "+(field.width==="full"?"full":"")} key={field.key}><legend>{field.label}{field.required?" *":""}</legend>
          <div className="actions">{field.options.map(option=><label key={option}><input type="checkbox" name={field.key} value={option}/> {option}</label>)}</div>
          {field.required&&<small>Select at least one option.</small>}</fieldset>;
        return <label key={field.key} htmlFor={id} className={"field "+(field.width==="full"?"full":"")}>{field.label}{field.required?" *":""}
          {field.type==="select"?<select id={id} name={field.key} required={field.required} defaultValue={field.key==="service_interest"&&field.options.includes(service?.name??"")?service!.name:""}>
            <option value="">{field.placeholder||"Select an option"}</option>{field.options.map(option=><option key={option} value={option}>{option}</option>)}</select>
            :field.type==="textarea"?<textarea {...common} rows={5} defaultValue={value}/>
            :<input {...common} type={field.type} autoComplete={field.key==="name"?"name":field.key==="email"?"email":field.key==="phone"?"tel":undefined}/>}
        </label>;
      })}
      <label className="full consent"><input name="consent" type="checkbox" required/> <span>{schema.definition.consent_label} <Link href="/privacy" className="inline-link">Privacy policy</Link>.</span></label>
    </div>
    <div className="actions"><button className="button dark" disabled={pending||!submissionId}>{pending?"Sending…":schema.definition.submit_label}</button></div>
    {error&&<p className="notice error" role="alert">{error}</p>}
  </form>;
}
