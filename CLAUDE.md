# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This repository is a collection of Docker Compose templates designed for deployment on the ZaneOps platform. Each YAML file represents a self-contained service stack with its dependencies (databases, caches, etc.).

## Architecture Overview

### Template Structure

Each `.yml` file in the root directory is a standalone Docker Compose template for a specific application. Templates follow a consistent pattern:

1. **x-zane-env section**: Defines environment variables with templating syntax
   - `{{ generate_domain }}`: Placeholder for auto-generated domains
   - `{{ generate_password | N }}`: Placeholder for auto-generated passwords (N = character length)
   - `{{ generate_email }}`: Placeholder for auto-generated email addresses

2. **services section**: Defines all containers needed for the application
   - Main application service(s)
   - Supporting services (PostgreSQL, Redis, ClickHouse, etc.)
   - Each service includes healthchecks for reliability

3. **deploy.labels**: ZaneOps-specific routing configuration
   - `zane.http.routes.N.domain`: Domain mapping for the service
   - `zane.http.routes.N.base_path`: URL path routing
   - `zane.http.routes.N.port`: Internal container port
   - `zane.http.routes.N.strip_prefix`: Whether to strip the base path before forwarding

4. **volumes**: Named volumes for data persistence

5. **configs** (optional): Inline configuration files mounted into containers

### ZaneOps Platform Conventions

- Templates use Docker Compose 3.8 format
- Environment variables are referenced using `${VAR_NAME}` syntax
- Multi-container applications are fully self-contained within a single file
- All services should include appropriate healthchecks
- Volume names should be descriptive and scoped to the service

### Common Service Patterns

**Multi-service applications** (e.g., authentik, openpanel, rybbit):
- Separate containers for frontend, backend, worker processes
- Shared database and cache services
- Each service depends on its prerequisites via `depends_on`

**Database configurations**:
- PostgreSQL: Standard for most applications requiring relational data
- Redis: Used for caching and session management
- ClickHouse: Analytics and time-series data (openpanel, rybbit)

**Security practices**:
- Passwords generated with appropriate length (16-64 characters)
- Encryption keys use 32+ character passwords
- Database credentials isolated per service
- No hardcoded sensitive values

## Application Templates

The repository includes templates for:

- **authentik**: Identity provider with PostgreSQL and Redis
- **caddy**: Reverse proxy server
- **chronoframe**: Application with Redis backend
- **gitea**: Git hosting platform with PostgreSQL
- **grafana**: Monitoring and visualization
- **immich**: Photo management with PostgreSQL, Redis, and ML service
- **n8n**: Workflow automation with PostgreSQL
- **openpanel**: Analytics platform with PostgreSQL, Redis, and ClickHouse
- **penpot**: Design platform
- **pocketbase**: Backend-as-a-Service
- **postgres**: Standalone PostgreSQL
- **rustfs**: Rust-based file system service
- **rybbit**: Analytics platform with PostgreSQL and ClickHouse
- **typesense**: Search engine
- **valkey**: Redis-compatible key-value store

## Working with Templates

### Adding a new template

1. Create a new `.yml` file in the root directory
2. Start with the `x-zane-env` section defining all required variables
3. Use templating syntax for secrets and domains
4. Define all services with appropriate healthchecks
5. Add ZaneOps routing labels to services that need HTTP access
6. Define volumes for data persistence
7. Test the template structure matches existing patterns

### Modifying existing templates

1. Preserve the `x-zane-env` structure and variable names
2. Maintain healthcheck configurations when updating service versions
3. Keep ZaneOps routing labels intact unless intentionally changing URLs
4. Update version tags in both `x-zane-env` and service definitions
5. Ensure `depends_on` relationships remain correct after changes

### Variable naming conventions

- Database variables: `DB_*`, `POSTGRES_*`, `CLICKHOUSE_*`, etc.
- Service URLs: `*_URL`, `*_HOST`
- Authentication: `*_SECRET`, `*_PASSWORD`, `*_KEY`
- Domain configuration: `*_domain`, `*_DOMAIN`
- Feature flags: `ALLOW_*`, `ENABLE_*`, `DISABLE_*`

## Key Technical Details

### ClickHouse Configuration Pattern

Services using ClickHouse (openpanel, rybbit) include inline configs to:
- Disable unnecessary logging to reduce disk usage
- Enable network access from other containers
- Configure JSON type support (where needed)
- Set appropriate log levels (warning/error only)

### Health Check Patterns

- **PostgreSQL**: `pg_isready -U ${USER} -d ${DB}`
- **Redis**: `redis-cli ping` or `redis-cli -a ${PASSWORD} ping`
- **HTTP services**: `curl -f http://localhost:PORT/health` or similar endpoint
- **ClickHouse**: `clickhouse-client --query "SELECT 1"` or `wget` to `/ping`

### Port Configuration

- Internal container ports are defined in service environment variables
- External routing is handled through ZaneOps labels
- No ports are exposed to the host (ZaneOps manages ingress)
