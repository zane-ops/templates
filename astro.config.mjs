// @ts-check

import node from "@astrojs/node";
import { defineConfig, envField } from "astro/config";

const { default: seedTypesense } = await import(
  "./integrations/seed-typesense.ts"
);

const defaultDomain =
  process.env.ZANE_DOMAINS?.split(",")[0] || "templates.zaneops.dev";
const scheme = process.env.NODE_ENV === "production" ? "https" : "http";
const shouldSeedTypeSense = (process.env.SEED_TYPESENSE ?? "true") === "true";

// https://astro.build/config
export default defineConfig({
  site: `${scheme}://${defaultDomain}`,
  output: "static",
  adapter: node({
    mode: "standalone"
  }),
  devToolbar: {
    enabled: false
  },
  env: {
    schema: {
      TYPESENSE_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: false
      }),
      TYPESENSE_HOST: envField.string({
        context: "server",
        access: "secret",
        optional: false
      })
    }
  },
  integrations: shouldSeedTypeSense ? [seedTypesense()] : [],
  vite: {
    ssr: {
      noExternal: ["zod"]
    }
  }
});
