import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	templates: defineCollection({
		loader: glob({ pattern: '*/index.md', base: './src/content/templates' }),
		schema: z.object({
			name: z.string(),
			slug: z.string(),
			description: z.string(),
			tags: z.array(z.string()),
			logo: z.string().optional(),
			logoUrl: z.string().optional(),
			githubUrl: z.string().optional(),
			docsUrl: z.string().optional(),
			websiteUrl: z.string().optional(),
		}),
	}),
};
