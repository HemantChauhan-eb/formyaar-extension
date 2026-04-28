import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "FormYaar",
    description: "Your friend who fills government forms with you",
    version: "0.1.0",
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"],
  },
});
