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

| Template                           | Description                            | Stack                         |
| ---------------------------------- | -------------------------------------- | ----------------------------- |
| [authentik.yml](authentik.yml)     | Identity provider and SSO solution     | PostgreSQL, Redis             |
| [caddy.yml](caddy.yml)             | Modern reverse proxy and web server    | Standalone                    |
| [chronoframe.yml](chronoframe.yml) | Time tracking application              | Redis                         |
| [gitea.yml](gitea.yml)             | Self-hosted Git service                | PostgreSQL                    |
| [grafana.yml](grafana.yml)         | Monitoring and visualization platform  | Standalone                    |
| [immich.yml](immich.yml)           | Self-hosted photo and video management | PostgreSQL, Redis, ML         |
| [n8n.yml](n8n.yml)                 | Workflow automation platform           | PostgreSQL                    |
| [openpanel.yml](openpanel.yml)     | Open-source analytics platform         | PostgreSQL, Redis, ClickHouse |
| [penpot.yml](penpot.yml)           | Open-source design and prototyping     | Multiple services             |
| [pocketbase.yml](pocketbase.yml)   | Backend-as-a-Service in one file       | SQLite (embedded)             |
| [postgres.yml](postgres.yml)       | PostgreSQL database server             | Standalone                    |
| [rustfs.yml](rustfs.yml)           | Rust-based file system service         | Standalone                    |
| [rybbit.yml](rybbit.yml)           | Analytics and tracking platform        | PostgreSQL, ClickHouse        |
| [typesense.yml](typesense.yml)     | Fast, typo-tolerant search engine      | Standalone                    |
| [valkey.yml](valkey.yml)           | Redis-compatible key-value store       | Standalone                    |

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

### Template Structure

Each template follows a consistent structure:

```yaml
x-zane-env:
  # ZaneOps will replace these placeholders with actual values
  main_domain: "{{ generate_domain }}"
  db_password: "{{ generate_password | 32 }}"

services:
  # Your application and dependencies

volumes:
  # Persistent data storage
```

### Template Variables

ZaneOps supports these placeholder variables:

- `{{ generate_domain }}` - Auto-generated subdomain
- `{{ generate_password | N }}` - Random password (N = length)
- `{{ generate_email }}` - Auto-generated email address

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

## Template Conventions

### Naming

- Services: Use descriptive names with app prefix (e.g., `immich-server`, `immich-database`)
- Volumes: Match service names for clarity
- Variables: Use SCREAMING_SNAKE_CASE for environment variables

### Dependencies

- Use `depends_on` to define service startup order
- Include `healthcheck` for all database services
- Wait for dependencies in application startup scripts when needed

### Routing

Configure HTTP routes using ZaneOps labels:

```yaml
deploy:
  labels:
    zane.http.routes.0.domain: ${main_domain}
    zane.http.routes.0.base_path: /
    zane.http.routes.0.port: 3000
```

## Support

- ZaneOps Documentation: https://zaneops.dev/docs
- Report template issues: [GitHub Issues](https://github.com/zaneops/templates/issues)

## License

These templates are provided as-is for use with ZaneOps. Individual applications maintain their own licenses.
