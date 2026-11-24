import type {NextConfig} from "next";
const backend = process.env.API_ORIGIN || "http://127.0.0.1:8010";
const config:NextConfig = {poweredByHeader:false,
  // Service routing serves the original assets; avoid optimizer subrequests crossing service boundaries.
  images:{unoptimized:true},
  turbopack:{root:__dirname},
  // AI requests can try a fallback Gemini model, which outlasts the 30 s default proxy timeout.
  experimental:{proxyTimeout:120000},
  async headers(){return [{source:"/:path*",headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"X-Frame-Options",value:"SAMEORIGIN"},
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
  ]}]},
  async rewrites(){if(process.env.VERCEL)return [];return [{source:"/api/:path*",destination:backend+"/api/:path*"},{source:"/media/:path*",destination:backend+"/media/:path*"}]}};
export default config;
