import base from "./playwright.config";
export default {
  ...base,
  reporter: [["list"]],
  use: { ...base.use, baseURL: "http://localhost:3002" },
  webServer: { ...base.webServer, command: "npx next start -p 3002", url: "http://localhost:3002", reuseExistingServer: false },
};
