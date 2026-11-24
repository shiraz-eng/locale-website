import localFont from "next/font/local";
export const displayFont=localFont({src:[
  {path:"./fonts/display.woff2",weight:"500",style:"normal"},
  {path:"./fonts/display-italic.woff2",weight:"500",style:"italic"}
],variable:"--aa-display-font",display:"swap"});
export const bodyFont=localFont({src:"./fonts/body.woff2",weight:"200 800",variable:"--aa-body-font",display:"swap"});
export const fontClasses=displayFont.variable+" "+bodyFont.variable;
