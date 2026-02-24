import { isAbsolute, join, resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const TEMPLATES_DIR = resolve(
  import.meta.dirname,
  "../src/content/templates"
);

const serviceSchema = z.looseObject({
  image: z.string({
    error: "must have an 'image' field. Build from source is not supported.",
  }),
});

const composeSchema = z.looseObject({
  "x-zane-env": z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  services: z
    .record(z.string(), serviceSchema)
    .refine((val) => Object.keys(val).length > 0, {
      message: "`services` must be a non-empty object",
    }),
  configs: z.record(z.string(), z.unknown()).optional(),
});

type ComposeFile = z.infer<typeof composeSchema>;

let hasErrors = false;

function error(template: string, message: string) {
  console.error(`[${template}] ${message}`);
  hasErrors = true;
}

function validateCompose(templateName: string, compose: ComposeFile) {
  for (const [serviceName, svc] of Object.entries(compose.services)) {
    // Bind volumes must use absolute source paths
    for (const vol of (svc.volumes as Array<unknown>) ?? []) {
      if (typeof vol === "string") {
        // Short syntax: "source:target[:options]"
        const parts = vol.split(":");
        if (parts.length >= 2) {
          const source = parts[0];
          // Starts with . → relative bind mount
          if (source.startsWith(".")) {
            error(
              templateName,
              `service '${serviceName}' has a bind volume with relative source path '${source}'. Only absolute paths are supported for bind mounts.`
            );
          }
        }
      } else if (typeof vol === "object" && vol !== null) {
        const v = vol as { type?: string; source?: string };
        if (v.type === "bind" && v.source != null && !isAbsolute(v.source)) {
          error(
            templateName,
            `service '${serviceName}' has a bind volume with relative source path '${v.source}'. Only absolute paths are supported for bind mounts.`
          );
        }
      }
    }

    // Config targets must be unique within a service
    const targetSources: Record<string, string[]> = {};
    for (const cfg of (svc.configs as Array<unknown>) ?? []) {
      let source: string;
      let target: string;
      if (typeof cfg === "string") {
        source = cfg;
        target = `/${cfg}`; // Docker default: /<source-name>
      } else if (typeof cfg === "object" && cfg !== null) {
        const c = cfg as { source?: string; target?: string };
        source = c.source ?? "";
        target = c.target ?? `/${source}`;
      } else {
        continue;
      }
      const list = (targetSources[target] ??= []);
      list.push(source);
      if (list.length > 1) {
        const sources = list.map((s) => `'${s}'`).join(" and ");
        error(
          templateName,
          `service '${serviceName}' has two configs ${sources} pointing to the same target '${target}'.`
        );
      }
    }
  }

  // Top-level configs must use content, not file
  for (const [configName, config] of Object.entries(compose.configs ?? {})) {
    if (typeof config === "object" && config !== null && "file" in config) {
      error(
        templateName,
        `configs.${configName}: Additional property 'file' is not allowed, please use 'content' instead.`
      );
    }
  }
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
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      error(name, `${path}${issue.message}`);
    }
    continue;
  }

  validateCompose(name, result.data);
}

if (hasErrors) {
  process.exit(1);
}

console.log(`Validated ${templateDirs.length} templates — all good.`);
