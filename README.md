# ZaneOps Templates

A curated collection of production-ready Docker Compose templates for deploying popular open-source applications on [ZaneOps](https://zaneops.dev).

This repository is an API backend — it exposes template data as JSON endpoints, backed by [Typesense](https://typesense.org) for full-text search.

## API Endpoints

| Endpoint                        | Description                                     |
| :------------------------------ | :---------------------------------------------- |
| `GET /api/search`               | Full-text search with filtering and pagination  |
| `GET /api/templates/:slug.json` | Fetch a single template by slug                 |
| `GET /api/search-index.json`    | Full list of templates (used to seed Typesense) |

### `GET /api/search`

Query parameters:

| Param      | Type     | Default | Description                 |
| :--------- | :------- | :------ | :-------------------------- |
| `q`        | string   | `""`    | Search query                |
| `tags`     | string[] | `[]`    | Filter by tags (repeatable) |
| `page`     | number   | `1`     | Page number                 |
| `per_page` | number   | `20`    | Results per page (max 100)  |

## Project Structure

```
.
├── public/
│   └── logos/              # Template logo assets
├── src/
│   ├── content/
│   │   └── templates/      # Template markdown files (one per template)
│   ├── lib/
│   │   └── typesense.ts    # Typesense client & collection helpers
│   ├── pages/
│   │   └── api/
│   │       ├── search.ts               # Search endpoint
│   │       ├── search-index.json.ts    # Full index (used for seeding)
│   │       └── templates/[slug].json.ts
├── integrations/
│   └── seed-typesense.ts   # Seeds Typesense on dev start & build
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Built with [Astro](https://astro.build).

## Commands

| Command       | Action                               |
| :------------ | :----------------------------------- |
| `bun install` | Install dependencies                 |
| `bun dev`     | Start dev server at `localhost:4321` |
| `bun build`   | Build to `./dist/`                   |
| `bun preview` | Preview the production build locally |

## Environment Variables

| Variable         | Description                              |
| :--------------- | :--------------------------------------- |
| `TYPESENSE_HOST` | Typesense host (default: `localhost`)    |
| `TYPESENSE_KEY`  | Typesense API key (default: `typesense`) |
| `ZANE_DOMAINS`   | Comma-separated list of domains          |

## How Seeding Works

On `bun dev`, the Astro integration in [integrations/seed-typesense.ts](integrations/seed-typesense.ts) fetches `/api/search-index.json` from the running dev server and upserts all documents into Typesense.

On `bun build`, it reads the prerendered `search-index.json` from `dist/` and does the same.

The collection is **dropped and recreated** on every seed to ensure schema changes are always applied.

## Adding a Template

1. Create a new directory under `src/content/templates/<slug>/`
2. Add an `index.md` with the template frontmatter (name, slug, description, tags, logo, URLs)
3. Add a `compose.yml` with the Docker Compose content
4. Add a logo to `public/logos/`
5. Restart the dev server — the template will be seeded into Typesense automatically

## What is ZaneOps?

ZaneOps is a platform for deploying and managing containerized applications. These templates are optimized for ZaneOps and include:

- Automatic domain generation
- Secure password generation
- Built-in health checks
- Proper service dependencies
- Data persistence with volumes

## Quick Start: Creating a Template

### Minimal Template

```yaml
services:
  app:
    image: nginx:latest
    deploy:
      labels:
        zane.http.routes.0.domain: "example.com"
        zane.http.routes.0.port: "80"
```

### Template with Variables

```yaml
x-zane-env:
  APP_DOMAIN: "{{ generate_domain }}"
  DB_PASSWORD: "{{ generate_password | 32 }}"
  DB_HOST: "{{ network_alias | 'postgres' }}"

services:
  app:
    image: myapp:latest
    environment:
      DATABASE_URL: "postgresql://user:${DB_PASSWORD}@${DB_HOST}:5432/db"
    depends_on:
      - postgres
    deploy:
      labels:
        zane.http.routes.0.domain: "${APP_DOMAIN}"
        zane.http.routes.0.port: "3000"

  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Template Expressions

Define in `x-zane-env`, reference with `${VAR}`:

| Expression                         | Output                                    |
| ---------------------------------- | ----------------------------------------- |
| `{{ generate_domain }}`            | Auto-generated subdomain                  |
| `{{ generate_password \| 32 }}`    | 32-char hex password                      |
| `{{ generate_base64 \| 32 }}`      | 32-bytes random base64 string             |
| `{{ generate_username }}`          | Random username (e.g., `reddog65`)        |
| `{{ generate_slug }}`              | URL-friendly slug (e.g., `happy-tree-91`) |
| `{{ generate_uuid }}`              | UUID v4                                   |
| `{{ generate_email }}`             | Generated email address                   |
| `{{ network_alias \| 'service' }}` | Stable service hostname                   |

### Routing Labels

```yaml
deploy:
  labels:
    zane.http.routes.0.domain: "example.com"  # Required
    zane.http.routes.0.port: "8080"           # Required
    zane.http.routes.0.base_path: "/"         # Optional (default: /)
    zane.http.routes.0.strip_prefix: "false"  # Optional (default: false)
```

For multiple routes, increment the index: `routes.0`, `routes.1`, `routes.2`.

### Key Rules

1. **No `ports`** - Use routing labels instead
2. **Use named volumes** - For persistent data
3. **Use `network_alias`** - For service-to-service communication outside of the stack in the same environment
4. **Password length must be even** - `generate_password | 32` (not 31)

### What ZaneOps Ignores

- `ports` - Works, but use `deploy.labels` for HTTP routing instead
- `expose` - Not needed
- `restart` - Use `deploy.restart_policy`
- `build` - Only pre-built images supported

## Usage

### Deploying on ZaneOps

1. Choose a template from this repository
2. Copy/Paste the `.yml` file contents to your ZaneOps instance
3. ZaneOps will automatically:
   - Generate secure passwords and secrets
   - Assign domains to your services
   - Set up SSL certificates
   - Create necessary volumes
   - Start all services in the correct order


## Support

- ZaneOps Documentation: https://zaneops.dev/docs
- Report template issues: [GitHub Issues](https://github.com/zaneops/templates/issues)

## License

These templates are provided as-is for use with ZaneOps. Individual applications maintain their own licenses.
