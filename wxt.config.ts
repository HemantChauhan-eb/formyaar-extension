import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "FormYaar",
    description: "Your friend who fills government forms with you",
    version: "0.1.0",
    permissions: ["storage", "activeTab", "scripting", "alarms", "tabs"],
    host_permissions: [
      "https://onlineservices.proteantech.in/*",
      "https://onlineservices.nsdl.com/*",
      "https://www.utiitsl.com/*",
      "https://passporthub.gov.in/*",
      "https://sarathi.parivahan.gov.in/*",
      "https://formyaar.pages.dev/*",
      "https://formyaar-backend-production.up.railway.app/*",
    ],
  },
});
