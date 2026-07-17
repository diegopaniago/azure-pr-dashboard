# Architecture

Azure PR Dashboard is a local app composed of an Express backend and a static plain JavaScript frontend. The backend owns all Azure DevOps communication to protect the PAT, while the frontend consumes only local endpoints, renders the user experience, and keeps the snapshot used to detect changes.

## Overview

```txt
Browser
  |
  | GET /api/prs
  v
Local Express
  |
  | Azure DevOps REST API
  v
Azure DevOps
```

## Backend

The backend lives in `src/` and exposes:

- `GET /api/health`: indicates whether the main variables are configured.
- `GET /api/config`: returns public frontend configuration.
- `GET /api/prs`: returns involved PRs, using cache when available.
- `GET /api/prs?refresh=true`: bypasses cache and forces a new collection.
- `GET /api/prs/stream`: sends PRs progressively through Server-Sent Events.
- `GET /api/prs/stream?refresh=true`: forces a new progressive collection.

Responsibilities:

- Authenticate with Azure DevOps using Basic Auth and PAT.
- Resolve the user by email.
- Resolve the user's groups.
- Fetch project repositories.
- Fetch PRs from the last `DAYS_BACK` days by status and time window.
- Query candidate PR threads to refresh comments.
- Deduplicate PRs.
- Classify involvement.

## Frontend

The frontend lives in `public/` and does not use a framework. It consumes `/api/prs/stream` to render results as they arrive, keeps `/api/prs` as a fallback, applies local filters, switches language between English and Brazilian Portuguese, and manages notifications.

Responsibilities:

- Show loading, error, and empty states.
- Render summary cards.
- Filter by status, repository, involvement, and free text.
- Refresh automatically according to `AUTO_REFRESH_SECONDS`.
- Keep a snapshot in `localStorage`.
- Keep relevant changes in the internal notification bell.

## Collection Flow

1. `server.js` receives `GET /api/prs/stream` or `GET /api/prs`.
2. If a valid cache exists and `refresh=true` was not provided, return cache.
3. `identityResolver.js` fetches user and groups.
4. `prAggregator.js` lists repositories.
5. For each repository, fetch `active`, `completed`, and `abandoned` PRs.
6. For closed PRs, also consider the `closed` window.
7. Deduplicate by `repositoryId:pullRequestId`.
8. Query candidate PR threads to count comments and find user comments.
9. Keep only PRs with direct, group, comment, or author involvement.
10. In the stream, send each PR as soon as it is classified.
11. At the end, refresh cache and keep the final list sorted by `lastActivityDate`.

## Attention Points

- Thread queries are the most expensive part of collection, but they keep comment counts and notifications current.
- The cache is in memory and resets with the process.
- Group comparison depends on formats returned by the Graph and Git APIs.
- The change snapshot lives in the browser, so it is scoped per user/browser.
