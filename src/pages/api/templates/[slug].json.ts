import { getCollection } from "astro:content";
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

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: TemplateCollection[number] };

  const ymlPath = resolve(
    process.cwd(),
    "src/content/templates",
    entry.data.slug,
    "compose.yml"
  );
  const compose = await Bun.file(ymlPath).text();

  return Response.json({
    id: entry.data.slug,
    name: entry.data.name,
    description: entry.data.description,
    tags: entry.data.tags,
    logoUrl: entry.data.logoUrl || null,
    githubUrl: entry.data.githubUrl ?? null,
    docsUrl: entry.data.docsUrl ?? null,
    websiteUrl: entry.data.websiteUrl ?? null,
    url: `/api/templates/${entry.data.slug}.json`,
    compose
  });
};
