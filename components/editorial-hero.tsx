import ArchitectureImage from "./home/architecture-image";
import type {ReactNode} from "react";

export default function EditorialHero({label,title,description,image="/portfolio/villa-garden.webp",dark=false,children}:{label:string;title:string;description:string;image?:string;dark?:boolean;children?:ReactNode}){
  return <header className={"editorial-hero"+(dark?" editorial-hero-dark":"")}>
    <ArchitectureImage src={image} alt="" fill priority sizes="100vw"/>
    <div className="editorial-hero-shade"/>
    <div className="shell editorial-hero-copy"><p className="editorial-kicker">{label}<span/></p><h1>{title}</h1><p>{description}</p>{children}</div>
  </header>;
}
