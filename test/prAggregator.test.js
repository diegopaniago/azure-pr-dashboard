import test from 'node:test';
import assert from 'node:assert/strict';
import { PullRequestAggregator } from '../src/prAggregator.js';

const user = {
  id: 'user-id',
  uniqueName: 'dev@example.com',
  principalName: 'dev@example.com',
  displayName: 'Dev User'
};

const groups = [{
  id: 'group-id',
  descriptor: 'group-descriptor',
  displayName: 'Platform Team',
  principalName: 'platform-team'
}];

function createPr(overrides = {}) {
  return {
    pullRequestId: 10,
    title: 'Add validation',
    status: 'active',
    repository: {
      id: 'repo-1',
      name: 'api',
      webUrl: 'https://dev.azure.com/org/project/_git/api'
    },
    createdBy: {
      id: 'other-user',
      displayName: 'Other Person',
      uniqueName: 'other@example.com'
    },
    creationDate: '2026-07-10T10:00:00.000Z',
    sourceRefName: 'refs/heads/feature/validation',
    targetRefName: 'refs/heads/main',
    reviewers: [],
    ...overrides
  };
}

test('PullRequestAggregator filters repositories by name or id', async () => {
  const client = {
    listRepositories: async () => [
      { id: 'repo-1', name: 'api' },
      { id: 'repo-2', name: 'web' }
    ]
  };
  const aggregator = new PullRequestAggregator({
    client,
    organization: 'org',
    project: 'project',
    repositories: ['WEB']
  });

  const repositories = await aggregator.getTargetRepositories();

  assert.deepEqual(repositories, [{ id: 'repo-2', name: 'web' }]);
});

test('PullRequestAggregator deduplicates PRs returned by status and time window', async () => {
  const calls = [];
  const client = {
    listAllPullRequests: async ({ status, queryTimeRangeType }) => {
      calls.push(`${status}:${queryTimeRangeType}`);
      return [createPr({ pullRequestId: 99 })];
    }
  };
  const aggregator = new PullRequestAggregator({
    client,
    organization: 'org',
    project: 'project',
    daysBack: 60
  });

  const prs = await aggregator.collectRawPullRequests([{ id: 'repo-1', name: 'api' }]);

  assert.equal(prs.length, 1);
  assert.equal(prs[0].pullRequestId, 99);
  assert.equal(calls.includes('active:closed'), false);
});

test('PullRequestAggregator ignores inaccessible Azure DevOps repositories', async () => {
  const client = {
    listAllPullRequests: async ({ repositoryId, status, queryTimeRangeType }) => {
      if (repositoryId === 'blocked-repo') {
        throw new Error('Azure DevOps responded with 404 for https://dev.azure.com/org/project/_apis/git/repositories/blocked-repo/pullrequests: {"message":"TF401019","typeKey":"GitRepositoryNotFoundException"}');
      }

      if (status === 'active' && queryTimeRangeType === 'created') {
        return [createPr({ pullRequestId: 99 })];
      }

      return [];
    }
  };
  const aggregator = new PullRequestAggregator({
    client,
    organization: 'org',
    project: 'project',
    daysBack: 60
  });

  const prs = await aggregator.collectRawPullRequests([
    { id: 'blocked-repo', name: 'no-permission' },
    { id: 'repo-1', name: 'api' }
  ]);

  assert.equal(prs.length, 1);
  assert.equal(prs[0].pullRequestId, 99);
});

test('PullRequestAggregator includes PRs by direct reviewer, group, comment, and authorship', async () => {
  const directPr = createPr({
    pullRequestId: 1,
    reviewers: [{ id: 'user-id', displayName: 'Dev User', uniqueName: 'dev@example.com', vote: 0 }]
  });
  const groupPr = createPr({
    pullRequestId: 2,
    reviewers: [{ id: 'group-id', displayName: 'Platform Team', isContainer: true }]
  });
  const commentedPr = createPr({
    pullRequestId: 3
  });
  const authoredPr = createPr({
    pullRequestId: 4,
    createdBy: { id: 'user-id', displayName: 'Dev User', uniqueName: 'dev@example.com' }
  });
  const unrelatedPr = createPr({
    pullRequestId: 5,
    title: 'No involvement'
  });
  const threadCalls = [];

  const client = {
    listRepositories: async () => [{ id: 'repo-1', name: 'api' }],
    listAllPullRequests: async ({ status, queryTimeRangeType }) => {
      if (status === 'active' && queryTimeRangeType === 'created') {
        return [directPr, groupPr, commentedPr, authoredPr, unrelatedPr];
      }
      return [];
    },
    listPullRequestThreads: async (_repositoryId, pullRequestId) => {
      threadCalls.push(pullRequestId);
      if (pullRequestId !== 3) return [];
      return [{
        comments: [{
          author: { id: 'user-id', uniqueName: 'dev@example.com' },
          publishedDate: '2026-07-12T09:00:00.000Z'
        }]
      }];
    }
  };
  const aggregator = new PullRequestAggregator({
    client,
    organization: 'org',
    project: 'project',
    daysBack: 60
  });

  const prs = await aggregator.aggregate({ user, groups });
  const byId = new Map(prs.map((pr) => [pr.pullRequestId, pr]));

  assert.deepEqual([...byId.keys()].sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.equal(byId.get(1).involvement.directReviewer, true);
  assert.equal(byId.get(2).involvement.groupReviewer, true);
  assert.equal(byId.get(3).involvement.commented, true);
  assert.equal(byId.get(4).involvement.authored, true);
  assert.equal(byId.get(3).commentCountByUser, 1);
  assert.equal(byId.get(1).commentsLoaded, true);
  assert.equal(byId.get(3).commentsLoaded, true);
  assert.equal(byId.has(5), false);
  assert.deepEqual(threadCalls, [1, 2, 3, 4, 5]);
});

test('PullRequestAggregator emits relevant PRs progressively', async () => {
  const calls = [];
  const firstPr = createPr({
    pullRequestId: 1,
    reviewers: [{ id: 'user-id', displayName: 'Dev User' }]
  });
  const secondPr = createPr({
    pullRequestId: 2,
    reviewers: [{ id: 'group-id', displayName: 'Platform Team', isContainer: true }]
  });

  const client = {
    listRepositories: async () => [{ id: 'repo-1', name: 'api' }],
    listAllPullRequests: async ({ status, queryTimeRangeType }) => {
      calls.push(`${status}:${queryTimeRangeType}`);
      if (status === 'active' && queryTimeRangeType === 'created') {
        return [firstPr, secondPr];
      }
      return [];
    },
    listPullRequestThreads: async () => []
  };
  const aggregator = new PullRequestAggregator({
    client,
    organization: 'org',
    project: 'project',
    daysBack: 60
  });
  const emitted = [];

  for await (const pr of aggregator.aggregateStream({ user, groups })) {
    emitted.push(pr.pullRequestId);
    if (emitted.length === 1) break;
  }

  assert.deepEqual(emitted, [1]);
  assert.deepEqual(calls, ['active:created']);
});
