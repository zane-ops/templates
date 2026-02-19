export const prerender = true;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

interface SearchDoc {
	id: string;
	name: string;
	description: string;
	tags: string[];
	url: string;
	logoUrl: string;
}

export const GET: APIRoute = async () => {
	const templates = await getCollection('templates');

	const docs: SearchDoc[] = templates.map((entry) => ({
		id: entry.data.slug,
		name: entry.data.name,
		description: entry.data.description,
		tags: entry.data.tags,
		url: `/templates/${entry.data.slug}`,
		logoUrl: entry.data.logoUrl ?? '',
	}));

	return new Response(JSON.stringify(docs), {
		headers: { 'Content-Type': 'application/json' },
	});
};
