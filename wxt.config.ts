import { defineConfig } from "wxt";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "development"}` });

const backendUrl =
  process.env.VITE_BACKEND_URL ??
  "https://formyaar-backend-production-a43e.up.railway.app";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "FormYaar",
    description: "Your friend who fills government forms with you",
    version: "0.6.1",
    permissions: ["storage", "activeTab", "alarms", "tabs"],
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
