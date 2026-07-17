# Azure PR Dashboard

Local plain JavaScript, HTML, and CSS dashboard for tracking Azure DevOps Pull Requests where you were involved in the last 60 days. The app runs with Docker, keeps the PAT only in the backend, and helps a developer quickly spot PRs that need attention because of direct review assignment, group/team review assignment, authorship, or comments in threads.

## Features

- Lists `active`, `completed`, and `abandoned` PRs.
- Considers PRs created or closed within the configured window.
- Detects involvement by direct reviewer, group/team reviewer, comments, and authorship.
- Filters by status, repository, involvement type, and free text.
- Renders PRs progressively as the backend receives results.
- Switches the frontend between English and Brazilian Portuguese.
- Persists light/dark theme selection, with dark as the default.
- Refreshes automatically according to `AUTO_REFRESH_SECONDS`.
- Uses an internal bell to keep detected changes that have not been cleared.
- Keeps a local snapshot in `localStorage` with the key `azure-pr-dashboard:lastSnapshot`.
- Uses Node.js 24 in Docker.

## Quick Start

Clone the repository and enter the project folder:

```bash
git clone <repository-url>
cd azure-pr-dashboard
```

Copy the example file:

```bash
cp .env.example .env
```

Fill in:

```env
AZURE_DEVOPS_ORG=organization-name
AZURE_DEVOPS_PROJECT=project-name
AZURE_DEVOPS_PAT=your_pat
AZURE_DEVOPS_USER_EMAIL=your.email@company.com
DAYS_BACK=60
PORT=3999
AUTO_REFRESH_SECONDS=300
```

Create an Azure DevOps Personal Access Token before starting the app. The token needs these grants:

- Code: Read, to query repositories, Pull Requests, reviewers, and threads.
- Graph or equivalent identity permissions, to resolve the monitored user and their groups/teams.

Optionally limit the queried repositories:

```env
AZURE_DEVOPS_REPOSITORIES=repo1,repo2,repo3
```

Start the dashboard in the background:

```bash
docker compose up -d
```

Open the service at:

```txt
http://localhost:3999
```

## Azure DevOps PAT

Create a Personal Access Token in Azure DevOps through `User settings > Personal access tokens > New Token`. Treat this token like a password: do not publish it, do not put it in the frontend, and do not commit `.env`.

Expected minimum permissions:

- Code: Read, to query repositories, Pull Requests, reviewers, and threads.
- Graph or equivalent identity permissions, to resolve the user and the groups/teams they belong to.

Depending on organization policies, you may need to adjust scopes for identity or project reads.

## Running

With Docker Compose:

```bash
docker compose up -d
```

For local Node.js development:

```bash
npm run dev
```

At startup, the server loads `.env` when it exists and gives local file values priority.

Open:

```txt
http://localhost:3999
```

## Tests

Unit tests use only the native Node.js runner, with no extra libraries:

```bash
npm test
```

## Technical Documentation

- `AGENTS.md`: AI agent and assisted maintenance instructions.
- `docs/architecture.md`: architecture and collection flow.
- `docs/azure-devops-domain.md`: Azure DevOps domain rules.
- `docs/api-contract.md`: local endpoint contract.
- `docs/configuration.md`: environment variables and configuration.
- `docs/testing.md`: test strategy.
- `docs/frontend.md`: frontend behavior.
- `docs/backlog.md`: suggested technical backlog.
- `docs/ai-handoff.md`: summary for future AI handoff.

## Endpoints

```txt
GET /api/health
GET /api/prs
GET /api/prs?refresh=true
GET /api/prs/stream
GET /api/prs/stream?refresh=true
```

`refresh=true` bypasses the in-memory cache. `AUTO_REFRESH_SECONDS` defines both the browser auto-refresh frequency and the in-memory cache lifetime; the default is `300` seconds.

## Known Limitations

Comment detection reads threads for candidate PRs on every collection to keep counts and notifications current. In projects with many repositories and many recent PRs, this can slow the first load and increase Azure DevOps API usage. Use `AZURE_DEVOPS_REPOSITORIES` when possible to reduce cost.

Group reviewer detection depends on identifiers returned by the Azure DevOps Graph and Git APIs. In some organizations, teams and groups can appear in different formats; those cases may require adjusting identity comparison.

Browser notifications are intentionally not native popups. The dashboard keeps notification history only in the internal bell and does not alert on first load to avoid a batch of old changes.
