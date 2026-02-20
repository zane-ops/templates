import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { ensureCollection, typesenseClient } from "../src/lib/typesense.js";

const COLLECTION_NAME = "templates";

const fields = [
  { name: "id", type: "string" },
  { name: "name", type: "string", sort: true },
  { name: "description", type: "string" },
  { name: "tags", type: "string[]" },
  { name: "url", type: "string", index: false },
  { name: "logoUrl", type: "string", index: false, optional: true },
];

async function seedFromDocs(docs: unknown[]) {
  await ensureCollection(COLLECTION_NAME, fields);

  const cleanedDocs = (docs as Array<Record<string, unknown>>).map((doc) => {
    if (!doc.logoUrl) {
      const { logoUrl: _, ...rest } = doc;
      return rest;
    }
    return doc;
  });

  await typesenseClient
    .collections(COLLECTION_NAME)
    .documents()
    .import(cleanedDocs, { action: "upsert" });

  console.log(
    `[seed-typesense] Upserted ${docs.length} documents into "${COLLECTION_NAME}".`,
  );
}

export default function seedTypesense(): AstroIntegration {
  return {
    name: "seed-typesense",
    hooks: {
      // Runs after `astro build` — reads the prerendered static JSON from dist/
      "astro:build:done": async ({ dir }) => {
        const distPath = fileURLToPath(dir);

        // With @astrojs/node adapter, static files land in dist/client/;
        // without an adapter they land directly in dist/.
        let indexPath = resolve(distPath, "api/search-index.json");
        if (!existsSync(indexPath)) {
          indexPath = resolve(distPath, "client", "api/search-index.json");
        }

        let docs: unknown[];
        try {
          docs = JSON.parse(readFileSync(indexPath, "utf-8"));
        } catch (err) {
          console.error(
            "[seed-typesense] Could not read search-index.json:",
            err,
          );
          return;
        }

        await seedFromDocs(docs);
      },

      // Runs after `astro dev` starts — fetches the live endpoint
      "astro:server:start": async ({ address }) => {
        const port = address.port;
        const url = `http://localhost:${port}/api/search-index.json`;

        let docs: unknown[];
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          docs = await res.json();
        } catch (err) {
          console.error(
            "[seed-typesense] Could not fetch search index from dev server:",
            err,
          );
          return;
        }

        await seedFromDocs(docs);
      },
    },
  };
}
