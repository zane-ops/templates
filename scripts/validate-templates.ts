import { join, resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const TEMPLATES_DIR = resolve(
  import.meta.dirname,
  "../src/content/templates"
);

const composeSchema = z.object({
  services: z.record(z.string(), z.unknown()).refine(
    (val) => Object.keys(val).length > 0,
    { message: "`services` must be a non-empty object" }
  ),
});

let hasErrors = false;

function error(template: string, message: string) {
  console.error(`[${template}] ${message}`);
  hasErrors = true;
}

const templateDirs: string[] = [];
for await (const entry of new Bun.Glob("*").scan({
  cwd: TEMPLATES_DIR,
  onlyFiles: false,
})) {
  templateDirs.push(entry);
}

for (const name of templateDirs) {
  const composePath = join(TEMPLATES_DIR, name, "compose.yml");
  const composeFile = Bun.file(composePath);

  if (!(await composeFile.exists())) {
    error(name, "missing compose.yml");
    continue;
  }

  let parsed: unknown;
  try {
    parsed = parse(await composeFile.text());
  } catch (e) {
    error(name, `invalid YAML: ${(e as Error).message}`);
    continue;
  }

  const result = composeSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      error(name, issue.message);
    }
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log(`Validated ${templateDirs.length} templates — all good.`);
