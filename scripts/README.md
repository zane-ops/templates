# CLI Deployment

Use `deploy_compose.py` to deploy templates directly from the command line (useful for testing).

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Copy .env.example to .env and configure your settings
cp .env.example .env
```

## Usage

```bash
# Deploy a template
python deploy_compose.py -f n8n.yml -p my-project -e production

# With custom stack slug
python deploy_compose.py -f postgres.yml -p my-project -e production -s my-postgres

# Against a different ZaneOps instance
python deploy_compose.py -f grafana.yml -p my-project -e production -u https://zaneops.example.com
```

## Options

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
