"use client";
import Image, {type ImageProps,type ImageLoaderProps} from "next/image";

function unsplashLoader({src,width,quality}:ImageLoaderProps){
  const url=new URL(src);
  url.searchParams.set("w",String(width));
  url.searchParams.set("q",String(quality??80));
  return url.toString();
}

export default function ArchitectureImage(props:ImageProps){
  const remote=typeof props.src==="string"&&props.src.startsWith("https://");
  const unsplash=remote&&new URL(props.src as string).hostname==="images.unsplash.com";
  return <Image {...props} loader={unsplash?unsplashLoader:undefined} unoptimized={remote&&!unsplash||undefined}/>;
}
