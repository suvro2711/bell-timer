import { defineConfig } from "cypress";
import viteConfig from "./vite.config";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    video: false,
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig,
    },
    supportFile: "cypress/support/component.ts",
    indexHtmlFile: "cypress/support/component-index.html",
    specPattern: "cypress/component/**/*.cy.{ts,tsx}",
    video: false,
  },
});
