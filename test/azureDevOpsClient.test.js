import test from 'node:test';
import assert from 'node:assert/strict';
import { AzureDevOpsClient } from '../src/azureDevOpsClient.js';

test('AzureDevOpsClient builds URLs while omitting empty params', () => {
  const client = new AzureDevOpsClient({
    organization: 'my org',
    project: 'My Project',
    pat: 'pat'
  });

  const url = client.buildUrl('https://example.test', '/_apis/test', {
    filled: 'ok',
    empty: '',
    missing: null,
    zero: 0
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('filled'), 'ok');
  assert.equal(parsed.searchParams.get('zero'), '0');
  assert.equal(parsed.searchParams.has('empty'), false);
  assert.equal(parsed.searchParams.has('missing'), false);
});

test('AzureDevOpsClient validates required variables', () => {
  const client = new AzureDevOpsClient({
    organization: '',
    project: '',
    pat: ''
  });

  assert.throws(
    () => client.ensureConfigured(),
    /AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_PAT/
  );
});

test('AzureDevOpsClient paginates Pull Requests until the last page', async () => {
  const client = new AzureDevOpsClient({
    organization: 'org',
    project: 'project',
    pat: 'pat'
  });
  const calls = [];

  client.listPullRequests = async ({ skip }) => {
    calls.push(skip);
    if (skip === 0) return Array.from({ length: 100 }, (_, index) => ({ pullRequestId: index + 1 }));
    return [{ pullRequestId: 101 }];
  };

  const prs = await client.listAllPullRequests({
    repositoryId: 'repo',
    status: 'active',
    minTime: '2026-01-01T00:00:00.000Z',
    queryTimeRangeType: 'created'
  });

  assert.equal(prs.length, 101);
  assert.deepEqual(calls, [0, 100]);
});
