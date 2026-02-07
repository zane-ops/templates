# ZaneOps Templates

A curated collection of production-ready Docker Compose templates for deploying popular open-source applications on [ZaneOps](https://zaneops.dev).

## What is ZaneOps?

ZaneOps is a platform for deploying and managing containerized applications. These templates are optimized for ZaneOps and include:

- Automatic domain generation
- Secure password generation
- Built-in health checks
- Proper service dependencies
- Data persistence with volumes

## Available Templates

| Template                                       | Description                            | Stack                         |
| ---------------------------------------------- | -------------------------------------- | ----------------------------- |
| [authentik.yml](./templates/authentik.yml)     | Identity provider and SSO solution     | PostgreSQL, Redis             |
| [caddy.yml](./templates/caddy.yml)             | Modern reverse proxy and web server    | Standalone                    |
| [chronoframe.yml](./templates/chronoframe.yml) | Time tracking application              | Redis                         |
| [gitea.yml](./templates/gitea.yml)             | Self-hosted Git service                | PostgreSQL                    |
| [grafana.yml](./templates/grafana.yml)         | Monitoring and visualization platform  | Standalone                    |
| [immich.yml](./templates/immich.yml)           | Self-hosted photo and video management | PostgreSQL, Redis, ML         |
| [n8n.yml](./templates/n8n.yml)                 | Workflow automation platform           | PostgreSQL                    |
| [openpanel.yml](./templates/openpanel.yml)     | Open-source analytics platform         | PostgreSQL, Redis, ClickHouse |
| [penpot.yml](./templates/penpot.yml)           | Open-source design and prototyping     | Multiple services             |
| [pocketbase.yml](./templates/pocketbase.yml)   | Backend-as-a-Service in one file       | SQLite (embedded)             |
| [postgres.yml](./templates/postgres.yml)       | PostgreSQL database server             | Standalone                    |
| [rustfs.yml](./templates/rustfs.yml)           | Rust-based file system service         | Standalone                    |
| [rybbit.yml](./templates/rybbit.yml)           | Analytics and tracking platform        | PostgreSQL, ClickHouse        |
| [typesense.yml](./templates/typesense.yml)     | Fast, typo-tolerant search engine      | Standalone                    |
| [valkey.yml](./templates/valkey.yml)           | Redis-compatible key-value store       | Standalone                    |
| [And more](./templates/)                       | More templates                         |                               |

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
3. **Use `network_alias`** - For service-to-service communication
4. **Password length must be even** - `generate_password | 32` (not 31)

### What ZaneOps Ignores

- `ports` - Use `deploy.labels` for routing
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

### CLI Deployment (for testing)

Use the included `deploy_compose.py` script to deploy templates directly from the command line:

```bash
# Install dependencies
pip install -r requirements.txt

# Copy .env.example to .env and configure your settings
cp .env.example .env

# Deploy a template
python deploy_compose.py -f n8n.yml -p my-project -e production

# With custom stack slug
python deploy_compose.py -f postgres.yml -p my-project -e production -s my-postgres

# Against a different ZaneOps instance
python deploy_compose.py -f grafana.yml -p my-project -e production -u https://zaneops.example.com
```

**Options:**

| Flag             | Description               | Default                    |
| ---------------- | ------------------------- | -------------------------- |
| `-f, --file`     | Path to compose YAML file | Required                   |
| `-p, --project`  | Project slug              | `compose`                  |
| `-e, --env`      | Environment slug          | `production`               |
| `-s, --slug`     | Stack slug                | Filename without extension |
| `-u, --base-url` | ZaneOps API URL           | `http://localhost:8000`    |
| `--username`     | Login username            | `admin`                    |
| `--password`     | Login password            | `password`                 |
| `-m, --message`  | Deployment commit message | `Deploy from CLI`          |

**Environment Variables:** Copy `.env.example` to `.env` to preload default values for `BASE_URL`, `PROJECT_SLUG`, `ENV_SLUG`, `USERNAME`, and `PASSWORD`. Command-line flags override `.env` values.

The script will create or update the stack and trigger a deployment, then display the generated URLs, configs, and volumes.

## Documentation

For comprehensive documentation on creating and customizing templates, see the **[Compose Template Guide](compose-template-guide.md)**. This guide covers:

- Template expressions and variable generation
- Service configuration and routing
- Volumes and Docker configs
- Network architecture and service communication
- Advanced patterns and troubleshooting
- Migrating from Dokploy templates

## Template Features

### Health Checks

All services include health checks to ensure reliability:
- Automatic restarts on failure
- Proper startup sequencing
- Dependency management

### Security

- No hardcoded credentials
- Auto-generated strong passwords (16-64 characters)
- Encryption keys where needed
- Isolated database credentials per service

### Networking

- Internal service communication via Docker networks
- HTTP routing configured via ZaneOps labels
- No exposed ports (ZaneOps handles ingress)

## Contributing

To add a new template:

1. Create a `.yml` file following the existing structure
2. Include all necessary services and dependencies
3. Add health checks for all services
4. Use ZaneOps templating for sensitive values
5. Document any special configuration in comments
6. Test the deployment on ZaneOps

See the [Compose Template Guide](compose-template-guide.md) for detailed instructions and best practices.

## Support

- ZaneOps Documentation: https://zaneops.dev/docs
- Report template issues: [GitHub Issues](https://github.com/zaneops/templates/issues)

## License

These templates are provided as-is for use with ZaneOps. Individual applications maintain their own licenses.
