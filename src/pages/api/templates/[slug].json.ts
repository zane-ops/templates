import { getCollection } from "astro:content";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { APIRoute } from "astro";

export async function getStaticPaths() {
  const templates = await getCollection("templates");
  return templates.map((entry) => ({
    params: { slug: entry.data.slug },
    props: { entry }
  }));
}

type TemplateCollection = Awaited<
  ReturnType<typeof getCollection<"templates">>
>;

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: TemplateCollection[number] };

  const ymlPath = resolve(
    process.cwd(),
    "src/content/templates",
    entry.data.slug,
    "compose.yml"
  );
  const compose = readFileSync(ymlPath, "utf-8");

  return new Response(
    JSON.stringify({
      id: entry.data.slug,
      name: entry.data.name,
      description: entry.data.description,
      tags: entry.data.tags,
      logoUrl: entry.data.logoUrl || null,
      githubUrl: entry.data.githubUrl ?? null,
      docsUrl: entry.data.docsUrl ?? null,
      websiteUrl: entry.data.websiteUrl ?? null,
      content: entry.body ?? null,
      url: `/templates/${entry.data.slug}`,
      compose
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
