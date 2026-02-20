import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { ensureCollection, typesenseClient } from "../src/lib/typesense.js";

const COLLECTION_NAME = "templates";

const fields = [
  { name: "id", type: "string" },
  { name: "name", type: "string" },
  { name: "description", type: "string" },
  { name: "tags", type: "string[]" },
  { name: "url", type: "string", index: false },
  { name: "logoUrl", type: "string", index: false, optional: true }
];

export default function seedTypesense(): AstroIntegration {
  return {
    name: "seed-typesense",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const distPath = fileURLToPath(dir);
        const indexPath = resolve(distPath, "api/search-index.json");

        let docs: unknown[];
        try {
          docs = JSON.parse(readFileSync(indexPath, "utf-8"));
        } catch (err) {
          console.error(
            "[seed-typesense] Could not read dist/api/search-index.json:",
            err
          );
          return;
        }

        await ensureCollection(COLLECTION_NAME, fields);

        // Strip null logoUrl before sending to Typesense — optional fields must be omitted, not null
        const cleanedDocs = (docs as Array<Record<string, unknown>>).map(
          (doc) => {
            if (!doc.logoUrl) {
              const { logoUrl: _, ...rest } = doc;
              return rest;
            }
            return doc;
          }
        );

        await typesenseClient
          .collections(COLLECTION_NAME)
          .documents()
          .import(cleanedDocs, { action: "upsert" });

        console.log(
          `[seed-typesense] Upserted ${docs.length} documents into "${COLLECTION_NAME}".`
        );
      }
    }
  };
}
