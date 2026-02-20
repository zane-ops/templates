import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const templates = await getCollection("templates");

  const tags = [...new Set(templates.flatMap((t) => t.data.tags ?? []))].sort();

  return new Response(JSON.stringify(tags), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
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
