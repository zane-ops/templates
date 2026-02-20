import { z } from "astro:content";
import type { APIRoute } from "astro";
import type { SearchParams } from "typesense";
import { typesenseClient } from "~/lib/typesense.js";

export const prerender = false;

const searchSchema = z.object({
  q: z.string().default("").catch(""),
  tags: z.array(z.string()).default([]).catch([]),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20).catch(20)
});

export const GET: APIRoute = async ({ url }) => {
  const params = searchSchema.parse({
    q: url.searchParams.get("q"),
    page: url.searchParams.get("page"),
    tags: url.searchParams
      .getAll("tags")
      .map((t) => t.trim())
      .filter(Boolean),
    per_page: url.searchParams.get("per_page")
  });

  const searchRequest: SearchParams<any> = {
    q: params.q,
    query_by: "name,description,tags",
    per_page: params.per_page,
    page: params.page,
    sort_by: "name:asc"
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};

export const OPTIONS: APIRoute = () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
};
