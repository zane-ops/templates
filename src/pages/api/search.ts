export const prerender = false;

import type { APIRoute } from 'astro';
import { typesenseClient } from '../../lib/typesense.js';

export const GET: APIRoute = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const tagsParam = url.searchParams.get('tags');

	const filterBy = tagsParam
		? `tags:=[${tagsParam.split(',').map((t) => t.trim()).join(',')}]`
		: undefined;

	const searchParams: Record<string, unknown> = {
		q,
		query_by: 'name,description,tags',
		per_page: 20,
	};

	if (filterBy) {
		searchParams.filter_by = filterBy;
	}

	try {
		const results = await typesenseClient
			.collections('templates')
			.documents()
			.search(searchParams);

		return new Response(JSON.stringify(results), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Search failed';
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
