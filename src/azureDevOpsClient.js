const API_VERSION = '7.1';
const GRAPH_API_VERSION = '7.1-preview.1';
const PAGE_SIZE = 100;

export class AzureDevOpsClient {
  constructor({ organization, project, pat }) {
    this.organization = organization;
    this.project = project;
    this.pat = pat;
    this.devOpsBaseUrl = `https://dev.azure.com/${encodeURIComponent(organization)}`;
    this.vsspsBaseUrl = `https://vssps.dev.azure.com/${encodeURIComponent(organization)}`;
  }

  ensureConfigured() {
    const missing = [];
    if (!this.organization) missing.push('AZURE_DEVOPS_ORG');
    if (!this.project) missing.push('AZURE_DEVOPS_PROJECT');
    if (!this.pat) missing.push('AZURE_DEVOPS_PAT');

    if (missing.length > 0) {
      throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
    }
  }

  async request(url, options = {}) {
    this.ensureConfigured();

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`:${this.pat}`).toString('base64')}`,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Azure DevOps respondeu ${response.status} para ${url}: ${body.slice(0, 500)}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  buildUrl(baseUrl, path, params = {}) {
    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  async listRepositories() {
    const url = this.buildUrl(
      this.devOpsBaseUrl,
      `/${encodeURIComponent(this.project)}/_apis/git/repositories`,
      { 'api-version': API_VERSION }
    );
    const data = await this.request(url);
    return data.value || [];
  }

  async findUsersByEmail(email) {
    const url = this.buildUrl(
      this.vsspsBaseUrl,
      '/_apis/graph/users',
      {
        'api-version': GRAPH_API_VERSION,
        'filterValue': email
      }
    );
    const data = await this.request(url);
    return data.value || [];
  }

  async getMemberships(descriptor) {
    const url = this.buildUrl(
      this.vsspsBaseUrl,
      `/_apis/graph/memberships/${encodeURIComponent(descriptor)}`,
      {
        'api-version': GRAPH_API_VERSION,
        direction: 'up'
      }
    );
    const data = await this.request(url);
    return data.value || [];
  }

  async getGraphGroup(descriptor) {
    const url = this.buildUrl(
      this.vsspsBaseUrl,
      `/_apis/graph/groups/${encodeURIComponent(descriptor)}`,
      { 'api-version': GRAPH_API_VERSION }
    );
    return this.request(url);
  }

  async getStorageKey(descriptor) {
    const url = this.buildUrl(
      this.vsspsBaseUrl,
      `/_apis/graph/storagekeys/${encodeURIComponent(descriptor)}`,
      { 'api-version': GRAPH_API_VERSION }
    );
    return this.request(url);
  }

  async listPullRequests({ repositoryId, status, minTime, queryTimeRangeType, skip = 0 }) {
    const url = this.buildUrl(
      this.devOpsBaseUrl,
      `/${encodeURIComponent(this.project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests`,
      {
        'api-version': API_VERSION,
        'searchCriteria.status': status,
        'searchCriteria.minTime': minTime,
        'searchCriteria.queryTimeRangeType': queryTimeRangeType,
        '$top': PAGE_SIZE,
        '$skip': skip
      }
    );

    const data = await this.request(url);
    return data.value || [];
  }

  async listAllPullRequests(args) {
    const all = [];
    let skip = 0;

    while (true) {
      const page = await this.listPullRequests({ ...args, skip });
      all.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return all;
  }

  async listPullRequestThreads(repositoryId, pullRequestId) {
    const url = this.buildUrl(
      this.devOpsBaseUrl,
      `/${encodeURIComponent(this.project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullRequests/${pullRequestId}/threads`,
      { 'api-version': API_VERSION }
    );
    const data = await this.request(url);
    return data.value || [];
  }
}
