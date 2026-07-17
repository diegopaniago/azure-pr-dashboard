# Local API Contract

The local API is consumed by the frontend in `public/app.js`. Contract changes must be paired with UI updates and unit tests when they affect business rules.

## GET /api/health

Returns basic service state and whether the main variables are configured.

Example:

```json
{
  "ok": true,
  "service": "azure-pr-dashboard",
  "configured": {
    "organization": true,
    "project": true,
    "pat": true,
    "userEmail": true
  }
}
```

## GET /api/config

Returns public configuration used by the frontend.

Example:

```json
{
  "autoRefreshSeconds": 300
}
```

## GET /api/prs

Returns involved PRs. Uses the in-memory cache when available.

## GET /api/prs?refresh=true

Forces a new collection and refreshes the cache.

## GET /api/prs/stream

Returns involved PRs through Server-Sent Events. Uses the in-memory cache when available and sends each PR as a separate event.

## GET /api/prs/stream?refresh=true

Forces a new collection through Server-Sent Events and refreshes the cache at the end.

## Success Response

```json
{
  "generatedAt": "2026-07-17T12:00:00.000Z",
  "daysBack": 60,
  "organization": "my-org",
  "project": "my-project",
  "user": {
    "displayName": "User Name",
    "uniqueName": "user@company.com"
  },
  "prs": [
    {
      "id": "my-org:my-project:repo-id:123",
      "pullRequestId": 123,
      "title": "Adjust validation",
      "status": "active",
      "repository": "api",
      "repositoryId": "repo-id",
      "project": "my-project",
      "createdBy": "Author Person",
      "creationDate": "2026-07-10T10:00:00.000Z",
      "closedDate": null,
      "sourceBranch": "feature/validation",
      "targetBranch": "main",
      "url": "https://dev.azure.com/my-org/my-project/_git/api/pullrequest/123",
      "involvement": {
        "directReviewer": true,
        "groupReviewer": false,
        "commented": true,
        "authored": false
      },
      "reviewers": [],
      "commentCount": 4,
      "commentCountByUser": 1,
      "commentsLoaded": true,
      "reviewerVote": 0,
      "lastActivityDate": "2026-07-12T09:00:00.000Z"
    }
  ],
  "cached": false
}
```

For PRs with an identified repository, the backend queries threads on every collection to keep `commentCount`, `commentCountByUser`, and comment notifications current.

## Error Response

```json
{
  "error": "Could not load Pull Requests.",
  "details": "Short technical message"
}
```

Do not include secrets in `details`.

## Stream Events

Events sent by `/api/prs/stream`:

- `start`: collection metadata.
- `pr`: one relevant PR.
- `done`: collection completion with `generatedAt`, `count`, and `cached`.
- `failure`: summarized error with `error` and `details`.
