# Azure DevOps Domain

This document summarizes the domain rules used by the project to decide whether a Pull Request should appear in the dashboard. Use it as a reference before changing collection, filters, or involvement classification.

## Involvement Criteria

A PR is relevant when at least one criterion is true:

- `directReviewer`: the user appears directly in `reviewers`.
- `groupReviewer`: one of the user's groups/teams appears in `reviewers`.
- `commented`: the user commented in a PR thread.
- `authored`: the user created the PR.

`authored` was not part of the initial main requirement, but it remains because it is useful for the dashboard and already appears as a UI badge.

## Time Window

The dashboard considers the last `DAYS_BACK` days, with a default of 60 days.

To reduce the risk of missing relevant PRs:

- it searches PRs created within the window;
- it searches PRs closed within the window for `completed` and `abandoned` statuses;
- it does not search the `closed` window for `active`, because active PRs should not have a close date.

## Considered Statuses

- `active`
- `completed`
- `abandoned`

New statuses must be added carefully and with unit tests.

## Deduplication

The same PR can be returned by more than one query. Deduplication uses:

```txt
repositoryId:pullRequestId
```

In the final frontend response, `id` also includes organization and project:

```txt
organization:project:repositoryId:pullRequestId
```

## Comments

Comments are discovered by reading PR threads. Deleted comments are ignored.

Threads are queried on every collection to keep comment counts and comment notifications current.

Observed fields:

- `thread.comments`
- `comment.author.id`
- `comment.author.uniqueName`
- `comment.publishedDate`
- `comment.lastUpdatedDate`
- `comment.isDeleted`

## Group Reviewer

Group resolution uses user memberships with direction `up`. It then compares reviewers with:

- `group.id`
- `group.descriptor`
- `group.displayName`
- `group.principalName`

On the reviewer side, it compares:

- `reviewer.id`
- `reviewer.uniqueName`
- `reviewer.displayName`
- `reviewer.descriptor`
- `reviewer.name`

This can vary according to the Azure DevOps organization configuration. If there is a false negative, prioritize adding test fixtures before changing the rule.
