# AI Handoff

Use this file to quickly restore context in future AI sessions. The project already has a working MVP with a local backend, static frontend, Docker, and unit tests.

## Product Goal

Show Azure DevOps Pull Requests where the user was involved in the last 60 days, making it easier to decide which PRs need review.

## Current Stack

- Node.js 24
- Express
- JavaScript ESM
- Plain HTML/CSS/JS
- Docker Compose
- Tests with `node:test`

## What Already Exists

- Azure DevOps client using native `fetch`.
- Basic Auth with PAT.
- User resolution by email.
- Group resolution through Graph API.
- Paginated PR search.
- Deduplication.
- Direct reviewer, group reviewer, comment, and author checks.
- Thread reads for each candidate PR to keep comment counts and notifications current.
- In-memory cache.
- UI with cards, filters, table, auto-refresh, language switch, notifications, and progressive loading through Server-Sent Events.
- Main unit tests.

## How To Validate

```bash
npm test
docker compose config
docker compose up --build
```

Then open:

```txt
http://localhost:3999
```

## Next Best Evolution

The next performance improvement is adding call diagnostics or controlled parallelism for Azure DevOps queries. Do this carefully to avoid rate limits and without removing recurring comment refresh.
