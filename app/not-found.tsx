import Link from "next/link";
export default function NotFound(){
  return <section className="section shell"><p className="eyebrow">404 / Page unavailable</p><h1>Outside the plan.</h1><p className="intro-copy">The page you were looking for may have moved.</p><Link className="text-link" href="/">Return home</Link></section>
}
