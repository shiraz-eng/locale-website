import {NextRequest,NextResponse} from "next/server";

export function proxy(request:NextRequest){
  const nonce=Buffer.from(crypto.randomUUID()).toString("base64");
  const production=process.env.NODE_ENV==="production";
  const policy=[
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'"+(production?"":" ws:"),
    "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://maps.google.com https://www.google.com",
    "script-src 'self' 'nonce-"+nonce+"' 'strict-dynamic'"+(production?"":" 'unsafe-eval'"),
  ].join("; ");
  const headers=new Headers(request.headers);
  headers.set("Content-Security-Policy",policy);
  headers.set("x-nonce",nonce);
  const response=NextResponse.next({request:{headers}});
  response.headers.set("Content-Security-Policy",policy);
  if(request.nextUrl.pathname.startsWith("/admin")||request.nextUrl.pathname.startsWith("/preview")||request.nextUrl.pathname.startsWith("/internal/")){
    response.headers.set("Cache-Control","private, no-store");
    response.headers.set("X-Robots-Tag","noindex, nofollow");
  }
  return response;
}

export const config={matcher:["/((?!api|media|_next/static|_next/image|portfolio|favicon.ico|robots.txt|sitemap.xml).*)"]};
