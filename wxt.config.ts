import { defineConfig } from "wxt";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: `.env.${process.env.NODE_ENV || "development"}` });

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));
const backendUrl =
  process.env.VITE_BACKEND_URL ??
  "https://formyaar-backend-production-a43e.up.railway.app";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(version),
    },
  }),
  manifest: {
    name: "FormYaar",
    description: "Your friend who fills government forms with you",
    version,
    permissions: ["storage", "activeTab", "alarms"],
    host_permissions: [
      "https://onlineservices.proteantech.in/*",
      "https://onlineservices.nsdl.com/*",
      "https://www.utiitsl.com/*",
      "https://passporthub.gov.in/*",
      "https://sarathi.parivahan.gov.in/*",
      "https://formyaar.in/*",
      `${backendUrl}/*`,
    ],
  },
});
