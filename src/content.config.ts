import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
	templates: defineCollection({
		loader: glob({ pattern: '*/index.md', base: './src/content/templates' }),
		schema: z.object({
			name: z.string(),
			slug: z.string(),
			description: z.string(),
			tags: z.array(z.string()),
			logoUrl: z.string(),
			githubUrl: z.string().optional(),
			docsUrl: z.string().optional(),
			websiteUrl: z.string().optional(),
		}),
	}),
};
