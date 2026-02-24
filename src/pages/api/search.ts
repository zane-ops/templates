import { z } from "astro:content";
import type { APIRoute } from "astro";
import type { SearchParams } from "typesense";
import { typesenseClient } from "~/lib/typesense.js";

export const prerender = false;

const searchSchema = z.object({
  q: z.string().default("").catch(""),
  tags: z.array(z.string()).default([]).catch([]),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20).catch(20),
  pick_random: z.boolean().optional(),
  exclude_ids: z.array(z.string()).default([]).catch([])
});

export const GET: APIRoute = async ({ url }) => {
  const params = searchSchema.parse({
    q: url.searchParams.get("q"),
    page: url.searchParams.get("page"),
    tags: url.searchParams
      .getAll("tags")
      .map((t) => t.trim())
      .filter(Boolean),
    per_page: url.searchParams.get("per_page"),
    pick_random: url.searchParams.get("pick_random") === "true",
    exclude_ids: url.searchParams
      .getAll("exclude_ids")
      .map((t) => t.trim())
      .filter(Boolean)
  });

  const searchRequest: SearchParams<any> = {
    q: params.q,
    query_by: "name,description,tags",
    per_page: params.per_page,
    page: params.page,
    sort_by: params.pick_random ? "_rand():asc" : "name:asc"
  };

  const filters: string[] = [];

  if (params.tags.length > 0) {
    filters.push(`tags:=[${params.tags.join(",")}]`);
  }
  if (params.exclude_ids.length > 0) {
    filters.push(`id:!=[${params.exclude_ids.join(",")}]`);
  }

  if (filters.length > 0) {
    searchRequest.filter_by = filters.join("&&");
  }

  try {
    const results = await typesenseClient
      .collections("templates")
      .documents()
      .search(searchRequest);

    return Response.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return Response.json(
      { error: message },
      {
        status: 500
      }
    );
  }
};
