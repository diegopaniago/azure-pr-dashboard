# Testing

Tests use the native Node.js 24 runner, with no external libraries. The goal is to cover business rules and internal integrations without depending on real Azure DevOps.

## Command

```bash
npm test
```

## Organization

- `test/cache.test.js`: in-memory cache behavior.
- `test/azureDevOpsClient.test.js`: URL construction, configuration validation, and pagination.
- `test/prAggregator.test.js`: repository filters, deduplication, and involvement criteria.

## Guidelines

- Use in-memory fakes to simulate the Azure DevOps client.
- Do not make network calls in unit tests.
- Do not use a real PAT in tests.
- Prefer explicit assertions with `node:assert/strict`.
- When fixing a classification bug, add a test that fails before the fix.

## Important Cases To Cover In Evolutions

- Direct reviewer identified by `id`.
- Direct reviewer identified by `uniqueName`.
- Group identified by `id`.
- Group identified by `displayName` or `descriptor`.
- Deleted comments ignored.
- PR closed within the window but created before it.
- Repositories filtered by name and id.
