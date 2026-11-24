import type {Feature} from "./services";
export type TeamContent={team_image:string|null;team_image_alt:string;team_image_caption:string;directory_heading:string;directory_intro:string;leadership_heading:string;leadership_intro:string;culture_heading:string;culture:Feature[];cta_heading:string;cta_text:string;careers_heading:string;careers_text:string};
export const defaultTeamContent:TeamContent={
  team_image:"/portfolio/team/studio-team.png",team_image_alt:"Illustrative architecture studio team collaborating around a design table",team_image_caption:"Studio culture · illustrative image",
  directory_heading:"The People Behind Atelier Arc",directory_intro:"Creative thinkers, design experts, and project leaders working together to create exceptional spaces.",
  leadership_heading:"Our Leadership",leadership_intro:"A shared vision that combines design excellence with thoughtful project execution.",
  culture_heading:"A Collaborative Design Culture",culture:[
    {icon:"users",title:"People-First",description:"A collaborative, respectful, and growth-driven environment."},
    {icon:"leaf",title:"Sustainable Mindset",description:"Designing with responsibility towards people and the planet."},
    {icon:"layers",title:"Continuous Growth",description:"Always learning, innovating, and pushing design boundaries."},
  ],cta_heading:"Let’s Create Your Next Space",cta_text:"Have a project in mind? Get in touch to discuss your vision.",
  careers_heading:"Join Our Team",careers_text:"We’re always glad to hear from curious people who care about thoughtful, well-made places.",
};
