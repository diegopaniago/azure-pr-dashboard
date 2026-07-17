# Configuration

The project is configured through environment variables. In local development, use `.env`, created from `.env.example`. The `.env` file must not be versioned.

## Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `AZURE_DEVOPS_ORG` | Yes | - | Azure DevOps organization name. |
| `AZURE_DEVOPS_PROJECT` | Yes | - | Azure DevOps project name. |
| `AZURE_DEVOPS_PAT` | Yes | - | Personal Access Token used only by the backend. |
| `AZURE_DEVOPS_USER_EMAIL` | Yes | - | Email of the monitored user. |
| `DAYS_BACK` | No | `60` | Day window for PR search. |
| `PORT` | No | `3999` | Local dashboard port. |
| `AUTO_REFRESH_SECONDS` | No | `300` | Browser auto-refresh frequency and in-memory cache lifetime. |
| `AZURE_DEVOPS_REPOSITORIES` | No | empty | Optional comma-separated repository list. |

## PAT

The PAT must have enough permission to:

- read repositories and Pull Requests;
- read reviewers;
- read threads and comments;
- query the user's identity and groups.

If the organization blocks Graph API reads, group identification may fail even when direct reviewer and comment detection work.

## Docker Compose

`docker-compose.yml` reads `.env` when it exists:

```bash
docker compose up --build
```

Without `.env`, the service starts, but `/api/prs` fails because configuration is missing.

## Local Node.js Execution

At startup, the server automatically loads `.env` when the file exists and gives local file values priority:

```bash
npm run dev
```

Without `.env`, the server starts, but `/api/prs` fails because configuration is missing.
