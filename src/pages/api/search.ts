import { z } from "astro:content";
import type { APIRoute } from "astro";
import { typesenseClient } from "../../lib/typesense.js";

export const prerender = false;

const searchSchema = z.object({
  q: z.string().default("").catch(""),
  tags: z.array(z.string()).default([]).catch([]),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20).catch(20)
});

export const GET: APIRoute = async ({ url }) => {
  const rawTags = url.searchParams
    .getAll("tags")
    .map((t) => t.trim())
    .filter(Boolean);

  const params = searchSchema.parse({
    q: url.searchParams.get("q"),
    tags: rawTags,
    page: url.searchParams.get("page"),
    per_page: url.searchParams.get("per_page")
  });

  const searchRequest: Record<string, unknown> = {
    q: params.q,
    query_by: "name,description,tags",
    per_page: params.per_page,
    page: params.page
  };

  if (params.tags.length > 0) {
    searchRequest.filter_by = `tags:=[${params.tags.join(",")}]`;
  }

  try {
    const results = await typesenseClient
      .collections("templates")
      .documents()
      .search(searchRequest);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
