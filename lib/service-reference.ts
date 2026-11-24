import type {Section} from "./services";
const appearance={background:"white",text:"default",accent:"sage",align:"left",spacing:"normal"} as const;
export const serviceReferenceSections:Section[]=[
  {id:"locale-material-story",type:"image_text",enabled:true,appearance,heading:"A Palette With Purpose",body:"Materials do more than define a look. We consider how surfaces feel, how they respond to light, and how they will perform with everyday use.\n\nThe palette develops alongside the spatial concept, balancing visual warmth, maintenance, availability, and the project’s agreed budget. Samples and specifications are reviewed with the studio before final selection.",image:"/portfolio/interior-detail-materials.webp",image_alt:"Illustrative interior material palette with warm natural finishes",layout:"image-right",buttons:[{label:"Discuss Your Material Palette",href:"/contact?type=consultation",style:"link",visible:true}]},
  {id:"locale-approach",type:"features",enabled:true,appearance,heading:"Our Approach",intro:"The principles that guide every project we design and build.",layout:"grid-3",items:[
    {title:"People-Centred Design",description:"Spaces that support everyday needs, routines, and well-being.",icon:"leaf"},
    {title:"Context & Purpose",description:"Design shaped by location, culture, and the way a space is used.",icon:"layers"},
    {title:"Quality & Detail",description:"Careful coordination and considered, durable detailing.",icon:"gem"},
    {title:"Sustainability",description:"Thoughtful choices for a more responsible built environment.",icon:"box"},
    {title:"Collaboration",description:"A transparent process built around open communication.",icon:"users"},
    {title:"Timeless Design",description:"Refined spaces that remain useful and meaningful over time.",icon:"clock"}]},
  {id:"locale-materials",type:"gallery",enabled:true,appearance,heading:"Materials & Finishes",intro:"An illustrative selection of textures and finishes. The final palette is tailored to your project.",layout:"grid-3",filters:false,images:[
    {image:"/media/de71a63342b7b65f292b9e4aa7c810865a47b1d1.jpg",alt:"Warm timber finish",caption:"Wood"},
    {image:"/media/9ef2bf16e75f8858e1676564d0b65c4c75d02de8.jpg",alt:"Natural stone texture",caption:"Stone"},
    {image:"/media/2ae2409d03636ffdc4a93dec7294dbe31e290529.jpg",alt:"Soft mineral plaster finish",caption:"Plaster"},
    {image:"/media/0aacb462163384087fccbe9d6e227e34d5c3e7f9.jpg",alt:"Metal framing finish",caption:"Metal"},
    {image:"/media/ff474efdabbd5190fd22f1962a321f58d4da3dd5.jpg",alt:"Textured concrete finish",caption:"Concrete"}]},
  {id:"locale-faq",type:"faq",enabled:true,appearance,heading:"Frequently Asked Questions",intro:"A few useful starting points before we discuss your project.",layout:"accordion",items:[
    {question:"Which service is right for my project?",answer:"Tell us about your space and what you want to achieve. The studio can recommend a suitable scope after reviewing your requirements."},
    {question:"Can you work with an existing design?",answer:"Share your existing drawings and the changes you have in mind. We will review the information and confirm how we can help."},
    {question:"How long does a typical project take?",answer:"Timing depends on the project size, scope, approvals, and delivery requirements. A project-specific schedule is agreed with the studio."},
    {question:"Can you help with material selection?",answer:"Material and finish guidance can be included in the agreed service scope, considering the design, maintenance needs, availability, and budget."},
    {question:"How do I get started?",answer:"[Request a consultation](/contact?type=consultation) and share your location, project type, and requirements. The studio will discuss the next steps with you."}]}
];
