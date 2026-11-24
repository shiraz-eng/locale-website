export type FormField={
  key:string;label:string;type:"text"|"email"|"tel"|"textarea"|"select"|"checkboxes";
  placeholder:string;required:boolean;visible:boolean;options:string[];
  min_length:number;max_length:number;width:"half"|"full";
};
export type ContactDefinition={schema_version:1;request_options:{value:"inquiry"|"consultation"|"quotation";label:string}[];consent_label:string;title:string;submit_label:string;success_message:string;fields:FormField[]};
export type PublicForm={definition:ContactDefinition;version:string};
