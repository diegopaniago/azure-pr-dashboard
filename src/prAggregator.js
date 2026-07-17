function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function compactBranchName(branch) {
  return String(branch || '').replace(/^refs\/heads\//, '');
}

function toDateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getReviewerVote(reviewers, user) {
  const reviewer = reviewers.find((candidate) => identityMatches(candidate, user));
  return reviewer?.vote ?? null;
}

function identityMatches(identity, user) {
  const userIds = new Set([
    normalize(user.id),
    normalize(user.uniqueName),
    normalize(user.principalName)
  ].filter(Boolean));

  return [
    identity.id,
    identity.uniqueName,
    identity.displayName,
    identity.mailAddress,
    identity.name
  ].some((value) => userIds.has(normalize(value)));
}

function groupMatches(reviewer, groups) {
  const values = [
    normalize(reviewer.id),
    normalize(reviewer.uniqueName),
    normalize(reviewer.displayName),
    normalize(reviewer.descriptor),
    normalize(reviewer.name)
  ].filter(Boolean);

  return groups.some((group) => {
    const groupValues = [
      normalize(group.id),
      normalize(group.descriptor),
      normalize(group.displayName),
      normalize(group.principalName)
    ].filter(Boolean);

    return groupValues.some((groupValue) => values.includes(groupValue));
  });
}

function collectCommentStats(threads, user) {
  let commentCount = 0;
  let commentCountByUser = 0;
  let lastCommentDate = null;

  for (const thread of threads) {
    for (const comment of thread.comments || []) {
      if (comment.isDeleted) continue;
      commentCount += 1;

      const publishedDate = comment.publishedDate || comment.lastUpdatedDate;
      if (publishedDate && toDateValue(publishedDate) > toDateValue(lastCommentDate)) {
        lastCommentDate = publishedDate;
      }

      if (identityMatches(comment.author || {}, user)) {
        commentCountByUser += 1;
      }
    }
  }

  return {
    commentCount,
    commentCountByUser,
    commented: commentCountByUser > 0,
    lastCommentDate,
    loaded: true
  };
}

function emptyCommentStats() {
  return {
    commentCount: null,
    commentCountByUser: null,
    commented: false,
    lastCommentDate: null,
    loaded: false
  };
}

function buildWebUrl(pr, organization, project) {
  if (pr.url && pr.repository?.webUrl) {
    return `${pr.repository.webUrl}/pullrequest/${pr.pullRequestId}`;
  }

  const repoName = encodeURIComponent(pr.repository?.name || '');
  return `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_git/${repoName}/pullrequest/${pr.pullRequestId}`;
}

function isRepositoryAccessError(error) {
  const message = String(error?.message || '');
  return message.includes('respondeu 404')
    && (
      message.includes('GitRepositoryNotFoundException')
      || message.includes('TF401019')
    );
}

function mapPr({ pr, commentStats, user, groups, organization, project }) {
  const reviewers = pr.reviewers || [];
  const directReviewer = reviewers.some((reviewer) => identityMatches(reviewer, user));
  const groupReviewer = reviewers.some((reviewer) => groupMatches(reviewer, groups));
  const authored = identityMatches(pr.createdBy || {}, user);
  const lastActivityDate = [
    pr.closedDate,
    pr.creationDate,
    commentStats.lastCommentDate
  ].sort((a, b) => toDateValue(b) - toDateValue(a))[0] || pr.creationDate;

  return {
    id: `${organization}:${project}:${pr.repository.id}:${pr.pullRequestId}`,
    pullRequestId: pr.pullRequestId,
    title: pr.title,
    status: pr.status,
    repository: pr.repository?.name || pr.repository?.id || 'Repositório desconhecido',
    repositoryId: pr.repository?.id,
    project,
    createdBy: pr.createdBy?.displayName || pr.createdBy?.uniqueName || 'Autor desconhecido',
    creationDate: pr.creationDate,
    closedDate: pr.closedDate || null,
    sourceBranch: compactBranchName(pr.sourceRefName),
    targetBranch: compactBranchName(pr.targetRefName),
    url: buildWebUrl(pr, organization, project),
    involvement: {
      directReviewer,
      groupReviewer,
      commented: commentStats.commented,
      authored
    },
    reviewers: reviewers.map((reviewer) => ({
      id: reviewer.id,
      displayName: reviewer.displayName || reviewer.uniqueName || reviewer.id,
      uniqueName: reviewer.uniqueName || null,
      vote: reviewer.vote ?? null,
      isContainer: Boolean(reviewer.isContainer)
    })),
    commentCount: commentStats.commentCount,
    commentCountByUser: commentStats.commentCountByUser,
    commentsLoaded: commentStats.loaded,
    reviewerVote: getReviewerVote(reviewers, user),
    lastActivityDate
  };
}

async function mapRelevantPullRequest({ pr, user, groups, organization, project, client }) {
  const repositoryId = pr.repository?.id;
  const reviewers = pr.reviewers || [];
  const directReviewer = reviewers.some((reviewer) => identityMatches(reviewer, user));
  const groupReviewer = reviewers.some((reviewer) => groupMatches(reviewer, groups));
  const authored = identityMatches(pr.createdBy || {}, user);

  let commentStats = emptyCommentStats();

  if (repositoryId) {
    const threads = await client.listPullRequestThreads(repositoryId, pr.pullRequestId);
    commentStats = collectCommentStats(threads, user);
  }

  if (!directReviewer && !groupReviewer && !authored && !commentStats.commented) {
    return null;
  }

  return mapPr({
    pr,
    commentStats,
    user,
    groups,
    organization,
    project
  });
}

export class PullRequestAggregator {
  constructor({ client, organization, project, repositories, daysBack = 60 }) {
    this.client = client;
    this.organization = organization;
    this.project = project;
    this.repositories = repositories || [];
    this.daysBack = Number(daysBack || 60);
  }

  async getTargetRepositories() {
    const allRepositories = await this.client.listRepositories();

    if (this.repositories.length === 0) {
      return allRepositories;
    }

    const requested = new Set(this.repositories.map((repo) => normalize(repo)));
    return allRepositories.filter((repo) => {
      return requested.has(normalize(repo.name)) || requested.has(normalize(repo.id));
    });
  }

  async collectRawPullRequests(repositories) {
    const minTime = new Date(Date.now() - this.daysBack * 24 * 60 * 60 * 1000).toISOString();
    const statuses = ['active', 'completed', 'abandoned'];
    const timeRanges = ['created', 'closed'];
    const byKey = new Map();

    for (const repository of repositories) {
      try {
        for (const status of statuses) {
          for (const queryTimeRangeType of timeRanges) {
            if (status === 'active' && queryTimeRangeType === 'closed') continue;

            const prs = await this.client.listAllPullRequests({
              repositoryId: repository.id,
              status,
              minTime,
              queryTimeRangeType
            });

            for (const pr of prs) {
              byKey.set(`${repository.id}:${pr.pullRequestId}`, pr);
            }
          }
        }
      } catch (error) {
        if (!isRepositoryAccessError(error)) {
          throw error;
        }

        console.warn(`Ignorando repositório inacessível no Azure DevOps: ${repository.name || repository.id}`);
      }
    }

    return [...byKey.values()];
  }

  async aggregate({ user, groups }) {
    const relevantPullRequests = [];

    for await (const pr of this.aggregateStream({ user, groups })) {
      relevantPullRequests.push(pr);
    }

    return relevantPullRequests.sort((a, b) => toDateValue(b.lastActivityDate) - toDateValue(a.lastActivityDate));
  }

  async *aggregateStream({ user, groups }) {
    const repositories = await this.getTargetRepositories();
    const minTime = new Date(Date.now() - this.daysBack * 24 * 60 * 60 * 1000).toISOString();
    const statuses = ['active', 'completed', 'abandoned'];
    const timeRanges = ['created', 'closed'];
    const seenKeys = new Set();

    for (const repository of repositories) {
      try {
        for (const status of statuses) {
          for (const queryTimeRangeType of timeRanges) {
            if (status === 'active' && queryTimeRangeType === 'closed') continue;

            const prs = await this.client.listAllPullRequests({
              repositoryId: repository.id,
              status,
              minTime,
              queryTimeRangeType
            });

            for (const pr of prs) {
              const key = `${repository.id}:${pr.pullRequestId}`;
              if (seenKeys.has(key)) continue;
              seenKeys.add(key);

              const mapped = await mapRelevantPullRequest({
                pr,
                user,
                groups,
                organization: this.organization,
                project: this.project,
                client: this.client
              });

              if (mapped) {
                yield mapped;
              }
            }
          }
        }
      } catch (error) {
        if (!isRepositoryAccessError(error)) {
          throw error;
        }

        console.warn(`Ignorando repositório inacessível no Azure DevOps: ${repository.name || repository.id}`);
      }
    }
  }
}
