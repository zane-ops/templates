export const prerender = true;

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

interface SearchDoc {
  id: string;
  name: string;
  description: string;
  tags: string[];
  url: string;
  logoUrl: string | null;
}

export const GET: APIRoute = async () => {
  const templates = await getCollection("templates");

  const docs: SearchDoc[] = templates.map((entry) => ({
    id: entry.data.slug,
    name: entry.data.name,
    description: entry.data.description,
    tags: entry.data.tags,
    url: `/templates/${entry.data.slug}`,
    logoUrl: entry.data.logoUrl || null
  }));

  return Response.json(docs);
};
