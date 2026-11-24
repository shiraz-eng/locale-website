import {copyFileSync} from "node:fs";
// Each Vercel service is bundled independently. Keep the API's shared template in its bundle.
copyFileSync(new URL("../data/detail-templates.json",import.meta.url),new URL("../backend/detail-templates.json",import.meta.url));
