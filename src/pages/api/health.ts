import type { APIRoute } from "astro";
import { typesenseClient } from "~/lib/typesense.js";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    await typesenseClient.health.retrieve();
    return Response.json({ status: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Typesense unavailable";
    return Response.json({ status: "error", error: message }, { status: 503 });
  }
};
