# AI Agent Instructions

This project is a local dashboard for tracking Azure DevOps Pull Requests where the user is involved. Preserve the product's simplicity: Node.js backend with Express, plain JavaScript/HTML/CSS frontend, Docker execution, and no frontend framework.

## General Rules

- Write repository code and documentation in English.
- Use semantic commits following the Conventional Commits standard.
- Avoid long descriptions when a direct explanation is enough.
- Keep the Azure DevOps PAT only in backend code and environment variables.
- Do not expose secrets in frontend code, logs, documentation, or filled examples.
- Do not add React, Vue, Angular, Vite, Next.js, or frontend libraries.
- Do not add test libraries; use `node:test` and `node:assert/strict`.
- Prefer small, testable changes aligned with the existing modules.
- Before changing PR collection behavior, read `docs/architecture.md` and `docs/azure-devops-domain.md`.

## Useful Commands

```bash
npm test
docker compose config
docker compose up --build
```

## Main Structure

- `src/server.js`: Express server, endpoints, and cache.
- `src/azureDevOpsClient.js`: Azure DevOps HTTP client.
- `src/identityResolver.js`: user and group resolution.
- `src/prAggregator.js`: PR collection, deduplication, and classification rules.
- `src/cache.js`: simple in-memory cache.
- `public/app.js`: state, filters, rendering, auto-refresh, language switch, and notifications.
- `public/styles.css`: dashboard visual design.
- `test/`: unit tests using the native Node.js runner.
- `docs/`: maintenance and evolution documentation.

## Quality Criteria

- Every involvement rule change must have coverage in `test/prAggregator.test.js`.
- Every URL, pagination, or authentication change must have coverage in `test/azureDevOpsClient.test.js`.
- Every cache change must have coverage in `test/cache.test.js`.
- If you change the UI, validate loading, error, empty-list, language switch, and filter states.
- If you change environment variables, update `.env.example`, `README.md`, and `docs/configuration.md`.

## Security

- Never commit `.env`.
- Never put a real `AZURE_DEVOPS_PAT` value in documentation.
- Avoid logging credential-bearing URLs or full error responses that may contain sensitive data.
- The frontend must consume only local endpoints and never call Azure DevOps directly.

## Code Style

- The project uses ESM with `import` and `export`.
- Use native Node.js 24 APIs whenever possible.
- Keep functions pure when practical, especially classification rules.
- Use explicit names for involvement flags: `directReviewer`, `groupReviewer`, `commented`, `authored`.
- Avoid premature abstractions. Extract functions only when they reduce real duplication or isolate an important rule.

## Recommended Change Flow

1. Understand the requirement and identify whether it affects backend, frontend, documentation, or tests.
2. Read the directly related files.
3. Change the smallest necessary set of files.
4. Run `npm test`.
5. Update documentation when behavior, configuration, or contracts change.
