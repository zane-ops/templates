import Typesense from "typesense";

export const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST ?? "localhost",
      port: 8108,
      protocol: "http"
    }
  ],
  apiKey: process.env.TYPESENSE_API_KEY ?? "typesense",
  connectionTimeoutSeconds: 10
});

export async function ensureCollection(
  name: string,
  fields: Array<{ name: string; type: string; index?: boolean }>
): Promise<void> {
  try {
    await typesenseClient.collections(name).delete();
  } catch {
    // collection didn't exist, that's fine
  }
  // biome-ignore lint/suspicious/noExplicitAny: Typesense types are strict
  await typesenseClient.collections().create({ name, fields } as any);
}
