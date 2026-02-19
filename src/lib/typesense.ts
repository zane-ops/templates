import Typesense from 'typesense';

export const typesenseClient = new Typesense.Client({
	nodes: [
		{
			host: process.env.TYPESENSE_HOST ?? 'localhost',
			port: Number(process.env.TYPESENSE_PORT ?? 8108),
			protocol: (process.env.TYPESENSE_PROTOCOL ?? 'http') as 'http' | 'https',
		},
	],
	apiKey: process.env.TYPESENSE_API_KEY ?? 'xyz',
	connectionTimeoutSeconds: 10,
});

export async function ensureCollection(
	name: string,
	fields: Array<{ name: string; type: string; index?: boolean }>
): Promise<void> {
	try {
		await typesenseClient.collections(name).retrieve();
	} catch (err: unknown) {
		const isNotFound =
			err instanceof Error && err.message.toLowerCase().includes('not found');
		if (isNotFound) {
			// biome-ignore lint/suspicious/noExplicitAny: Typesense types are strict
			await typesenseClient.collections().create({ name, fields } as any);
		} else {
			throw err;
		}
	}
}
