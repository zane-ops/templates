export const prerender = true;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

export async function getStaticPaths() {
	const templates = await getCollection('templates');
	return templates.map((entry) => ({
		params: { slug: entry.data.slug },
		props: { entry },
	}));
}

export const GET: APIRoute = ({ props }) => {
	const { entry } = props;

	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const ymlPath = resolve(__dirname, '../../../content/templates', entry.data.slug, 'compose.yml');
	const compose = readFileSync(ymlPath, 'utf-8');

	return new Response(
		JSON.stringify({
			id: entry.data.slug,
			name: entry.data.name,
			description: entry.data.description,
			tags: entry.data.tags,
			logo: entry.data.logo ?? null,
			logoUrl: entry.data.logoUrl ?? null,
			url: `/templates/${entry.data.slug}`,
			compose,
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
