import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AzureDevOpsClient } from './azureDevOpsClient.js';
import { MemoryCache } from './cache.js';
import { loadDotEnv } from './env.js';
import { resolveIdentity } from './identityResolver.js';
import { PullRequestAggregator } from './prAggregator.js';

loadDotEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const organization = process.env.AZURE_DEVOPS_ORG;
const project = process.env.AZURE_DEVOPS_PROJECT;
const userEmail = process.env.AZURE_DEVOPS_USER_EMAIL;
const daysBack = Number(process.env.DAYS_BACK || 60);
const autoRefreshSeconds = Math.max(10, Number(process.env.AUTO_REFRESH_SECONDS || 300) || 300);
const repositories = (process.env.AZURE_DEVOPS_REPOSITORIES || '')
  .split(',')
  .map((repo) => repo.trim())
  .filter(Boolean);

const cache = new MemoryCache(autoRefreshSeconds);
const client = new AzureDevOpsClient({
  organization,
  project,
  pat: process.env.AZURE_DEVOPS_PAT
});
const cacheKey = 'pull-requests';

function createAggregator() {
  return new PullRequestAggregator({
    client,
    organization,
    project,
    repositories,
    daysBack
  });
}

function sortPullRequests(prs) {
  return prs.sort((a, b) => {
    return new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime();
  });
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'azure-pr-dashboard',
    configured: {
      organization: Boolean(organization),
      project: Boolean(project),
      pat: Boolean(process.env.AZURE_DEVOPS_PAT),
      userEmail: Boolean(userEmail)
    }
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    autoRefreshSeconds
  });
});

app.get('/api/prs', async (req, res) => {
  const shouldRefresh = req.query.refresh === 'true';

  try {
    if (!shouldRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        res.json({ ...cached, cached: true });
        return;
      }
    }

    const identity = await resolveIdentity(client, userEmail);
    const aggregator = createAggregator();

    const prs = await aggregator.aggregate(identity);
    const payload = {
      generatedAt: new Date().toISOString(),
      daysBack,
      organization,
      project,
      user: {
        displayName: identity.user.displayName,
        uniqueName: identity.user.uniqueName
      },
      prs
    };

    cache.set(cacheKey, payload);
    res.json({ ...payload, cached: false });
  } catch (error) {
    res.status(500).json({
      error: 'Não foi possível carregar as Pull Requests.',
      details: error.message
    });
  }
});

app.get('/api/prs/stream', async (req, res) => {
  const shouldRefresh = req.query.refresh === 'true';
  let closed = false;

  req.on('close', () => {
    closed = true;
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    if (!shouldRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        sendEvent(res, 'start', {
          generatedAt: cached.generatedAt,
          daysBack: cached.daysBack,
          organization: cached.organization,
          project: cached.project,
          user: cached.user,
          cached: true
        });

        for (const pr of cached.prs) {
          if (closed) return;
          sendEvent(res, 'pr', pr);
        }

        sendEvent(res, 'done', {
          generatedAt: cached.generatedAt,
          count: cached.prs.length,
          cached: true
        });
        res.end();
        return;
      }
    }

    const identity = await resolveIdentity(client, userEmail);
    const aggregator = createAggregator();
    const prs = [];
    const generatedAt = new Date().toISOString();
    const user = {
      displayName: identity.user.displayName,
      uniqueName: identity.user.uniqueName
    };

    sendEvent(res, 'start', {
      generatedAt,
      daysBack,
      organization,
      project,
      user,
      cached: false
    });

    for await (const pr of aggregator.aggregateStream(identity)) {
      if (closed) return;
      prs.push(pr);
      sendEvent(res, 'pr', pr);
    }

    const payload = {
      generatedAt,
      daysBack,
      organization,
      project,
      user,
      prs: sortPullRequests(prs)
    };

    cache.set(cacheKey, payload);
    sendEvent(res, 'done', {
      generatedAt,
      count: payload.prs.length,
      cached: false
    });
    res.end();
  } catch (error) {
    if (!closed) {
      sendEvent(res, 'failure', {
        error: 'Não foi possível carregar as Pull Requests.',
        details: error.message
      });
      res.end();
    }
  }
});

app.listen(port, () => {
  console.log(`Azure PR Dashboard disponível em http://localhost:${port}`);
});
