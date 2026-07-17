import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AzureDevOpsClient } from './azureDevOpsClient.js';
import { MemoryCache } from './cache.js';
import { resolveIdentity } from './identityResolver.js';
import { PullRequestAggregator } from './prAggregator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const organization = process.env.AZURE_DEVOPS_ORG;
const project = process.env.AZURE_DEVOPS_PROJECT;
const userEmail = process.env.AZURE_DEVOPS_USER_EMAIL;
const daysBack = Number(process.env.DAYS_BACK || 60);
const cacheTtlSeconds = Number(process.env.CACHE_TTL_SECONDS || 300);
const repositories = (process.env.AZURE_DEVOPS_REPOSITORIES || '')
  .split(',')
  .map((repo) => repo.trim())
  .filter(Boolean);

const cache = new MemoryCache(cacheTtlSeconds);
const client = new AzureDevOpsClient({
  organization,
  project,
  pat: process.env.AZURE_DEVOPS_PAT
});

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

app.get('/api/prs', async (req, res) => {
  const cacheKey = 'pull-requests';
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
    const aggregator = new PullRequestAggregator({
      client,
      organization,
      project,
      repositories,
      daysBack
    });

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

app.listen(port, () => {
  console.log(`Azure PR Dashboard disponível em http://localhost:${port}`);
});
