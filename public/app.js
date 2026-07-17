const SNAPSHOT_KEY = 'azure-pr-dashboard:lastSnapshot';
const NOTIFICATIONS_KEY = 'azure-pr-dashboard:notifications';
const DEFAULT_AUTO_REFRESH_SECONDS = 300;

const state = {
  prs: [],
  changedIds: new Set(),
  unseenNotifications: [],
  firstLoad: true,
  currentStream: null,
  autoRefreshTimer: null,
  autoRefreshSeconds: DEFAULT_AUTO_REFRESH_SECONDS,
  refreshSecondsRemaining: DEFAULT_AUTO_REFRESH_SECONDS
};

const elements = {
  refreshFrequency: document.querySelector('#refreshFrequency'),
  lastUpdated: document.querySelector('#lastUpdated'),
  errorBox: document.querySelector('#errorBox'),
  loadingBox: document.querySelector('#loadingBox'),
  summaryGrid: document.querySelector('#summaryGrid'),
  statusFilter: document.querySelector('#statusFilter'),
  repositoryFilter: document.querySelector('#repositoryFilter'),
  involvementFilter: document.querySelector('#involvementFilter'),
  searchInput: document.querySelector('#searchInput'),
  prsTable: document.querySelector('#prsTable'),
  emptyState: document.querySelector('#emptyState'),
  notificationBell: document.querySelector('#notificationBell'),
  notificationCount: document.querySelector('#notificationCount'),
  notificationPanel: document.querySelector('#notificationPanel'),
  notificationList: document.querySelector('#notificationList'),
  clearNotificationsButton: document.querySelector('#clearNotificationsButton')
};

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function involvementLabels(involvement) {
  const labels = [];
  if (involvement.directReviewer) labels.push(['directReviewer', 'Reviewer direto']);
  if (involvement.groupReviewer) labels.push(['groupReviewer', 'Reviewer por time']);
  if (involvement.commented) labels.push(['commented', 'Comentei']);
  if (involvement.authored) labels.push(['authored', 'Autor']);
  return labels;
}

function formatCommentSummary(pr) {
  if (!pr.commentsLoaded) return '-';
  return `${escapeHtml(pr.commentCountByUser)} meus / ${escapeHtml(pr.commentCount)} total`;
}

function makeSnapshot(prs) {
  return prs.reduce((snapshot, pr) => {
    snapshot[pr.id] = {
      pullRequestId: pr.pullRequestId,
      status: pr.status,
      lastActivityDate: pr.lastActivityDate,
      commentCount: pr.commentCount,
      commentCountByUser: pr.commentCountByUser,
      reviewerVote: pr.reviewerVote,
      involvement: pr.involvement
    };
    return snapshot;
  }, {});
}

function readSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
  } catch {
    return {};
  }
}

function describeChange(pr, previous) {
  if (!previous) return `#${pr.pullRequestId} - ${pr.title} apareceu na sua lista.`;
  if (previous.status !== pr.status) return `#${pr.pullRequestId} - ${pr.title} mudou para ${pr.status}.`;
  if ((previous.commentCount || 0) < (pr.commentCount || 0)) return `#${pr.pullRequestId} - ${pr.title} recebeu novos comentários.`;
  if (previous.lastActivityDate !== pr.lastActivityDate) return `#${pr.pullRequestId} - ${pr.title} teve nova atividade.`;
  return `#${pr.pullRequestId} - ${pr.title} teve mudança no seu envolvimento.`;
}

function sameInvolvement(a = {}, b = {}) {
  return ['directReviewer', 'groupReviewer', 'commented', 'authored'].every((key) => Boolean(a[key]) === Boolean(b[key]));
}

function detectChanges(prs) {
  const previousSnapshot = readSnapshot();
  const changes = [];

  for (const pr of prs) {
    const previous = previousSnapshot[pr.id];
    if (!previous) {
      changes.push({ pr, message: describeChange(pr, previous), type: 'new' });
      continue;
    }

    if (previous.status !== pr.status) {
      changes.push({ pr, message: describeChange(pr, previous), type: 'status' });
      continue;
    }

    if ((previous.commentCount || 0) < (pr.commentCount || 0)) {
      changes.push({ pr, message: describeChange(pr, previous), type: 'comments' });
      continue;
    }

    if (previous.lastActivityDate !== pr.lastActivityDate) {
      changes.push({ pr, message: describeChange(pr, previous), type: 'activity' });
      continue;
    }

    const changed = previous.commentCount !== pr.commentCount
      || previous.commentCountByUser !== pr.commentCountByUser
      || previous.reviewerVote !== pr.reviewerVote
      || !sameInvolvement(previous.involvement, pr.involvement);

    if (changed) {
      changes.push({ pr, message: describeChange(pr, previous), type: 'involvement' });
    }
  }

  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnapshot(prs)));
  return changes;
}

function readStoredNotifications() {
  try {
    const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    return Array.isArray(notifications) ? notifications : [];
  } catch {
    return [];
  }
}

function saveStoredNotifications(notifications) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

function addUnseenNotifications(changes) {
  if (state.firstLoad || changes.length === 0) return;

  const detectedAt = new Date().toISOString();
  const newNotifications = changes.map((change, index) => ({
    id: `${change.pr.id}:${Date.now()}:${index}`,
    message: change.message,
    url: change.pr.url,
    detectedAt
  }));

  state.unseenNotifications = [
    ...newNotifications,
    ...state.unseenNotifications
  ].slice(0, 50);

  saveStoredNotifications(state.unseenNotifications);
  renderNotificationCenter();
}

function clearUnseenNotifications() {
  state.unseenNotifications = [];
  saveStoredNotifications(state.unseenNotifications);
  renderNotificationCenter();
}

function renderNotificationCenter() {
  const count = state.unseenNotifications.length;

  elements.notificationCount.textContent = String(Math.min(count, 99));
  elements.notificationCount.classList.toggle('hidden', count === 0);

  if (count === 0) {
    elements.notificationList.innerHTML = '<div class="notification-empty">Nenhuma notificação nova.</div>';
    return;
  }

  elements.notificationList.innerHTML = state.unseenNotifications.map((notification) => `
    <a class="notification-item" href="${escapeHtml(notification.url)}" target="_blank" rel="noopener">
      <strong>${escapeHtml(notification.message)}</strong>
      <span>${formatDate(notification.detectedAt)}</span>
    </a>
  `).join('');
}

function toggleNotificationPanel() {
  const isHidden = elements.notificationPanel.classList.toggle('hidden');
  elements.notificationBell.setAttribute('aria-expanded', String(!isHidden));
}

function getFilteredPrs() {
  const status = elements.statusFilter.value;
  const repository = elements.repositoryFilter.value;
  const involvement = elements.involvementFilter.value;
  const search = normalize(elements.searchInput.value);

  return state.prs.filter((pr) => {
    if (status !== 'all' && pr.status !== status) return false;
    if (repository !== 'all' && pr.repository !== repository) return false;
    if (involvement !== 'all' && !pr.involvement[involvement]) return false;

    if (search) {
      const haystack = normalize([
        pr.title,
        pr.createdBy,
        pr.repository,
        pr.sourceBranch,
        pr.targetBranch,
        pr.pullRequestId
      ].join(' '));
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

function renderSummary() {
  const prs = state.prs;
  const cards = [
    ['Total', prs.length],
    ['Reviewer direto', prs.filter((pr) => pr.involvement.directReviewer).length],
    ['Por time', prs.filter((pr) => pr.involvement.groupReviewer).length],
    ['Comentei', prs.filter((pr) => pr.involvement.commented).length],
    ['Active', prs.filter((pr) => pr.status === 'active').length],
    ['Completed', prs.filter((pr) => pr.status === 'completed').length]
  ];

  elements.summaryGrid.innerHTML = cards.map(([label, value]) => `
    <article class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join('');
}

function renderRepositoryOptions() {
  const current = elements.repositoryFilter.value;
  const repositories = [...new Set(state.prs.map((pr) => pr.repository))].sort();
  elements.repositoryFilter.innerHTML = '<option value="all">Todos</option>'
    + repositories.map((repo) => `<option value="${escapeHtml(repo)}">${escapeHtml(repo)}</option>`).join('');
  elements.repositoryFilter.value = repositories.includes(current) ? current : 'all';
}

function renderTable() {
  const prs = getFilteredPrs();
  elements.emptyState.classList.toggle('hidden', prs.length > 0);

  elements.prsTable.innerHTML = prs.map((pr) => {
    const badges = involvementLabels(pr.involvement)
      .map(([key, label]) => `<span class="badge ${key}">${escapeHtml(label)}</span>`)
      .join('');

    return `
      <tr class="${state.changedIds.has(pr.id) ? 'changed' : ''}">
        <td>
          <div class="pr-title">
            <strong>#${escapeHtml(pr.pullRequestId)} - ${escapeHtml(pr.title)}</strong>
            <span class="branch">${escapeHtml(pr.sourceBranch)} -> ${escapeHtml(pr.targetBranch)}</span>
          </div>
        </td>
        <td><span class="status ${escapeHtml(pr.status)}">${escapeHtml(pr.status)}</span></td>
        <td>${escapeHtml(pr.repository)}</td>
        <td>${escapeHtml(pr.createdBy)}</td>
        <td>${formatDate(pr.creationDate)}</td>
        <td>${formatDate(pr.closedDate)}</td>
        <td><div class="badges">${badges || '-'}</div></td>
        <td>${formatCommentSummary(pr)}</td>
        <td><a class="link" href="${escapeHtml(pr.url)}" target="_blank" rel="noopener">Abrir</a></td>
      </tr>
    `;
  }).join('');
}

function renderAll() {
  renderSummary();
  renderRepositoryOptions();
  renderTable();
}

function setLoading(isLoading) {
  elements.loadingBox.classList.toggle('hidden', !isLoading);
}

function showError(message) {
  elements.errorBox.textContent = message;
  elements.errorBox.classList.remove('hidden');
}

function clearError() {
  elements.errorBox.textContent = '';
  elements.errorBox.classList.add('hidden');
}

function renderRefreshCountdown() {
  const seconds = Math.max(0, state.refreshSecondsRemaining);
  elements.refreshFrequency.textContent = `Atualiza em ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
}

function resetRefreshCountdown() {
  state.refreshSecondsRemaining = state.autoRefreshSeconds;
  renderRefreshCountdown();
}

function sortPrsByActivity(prs) {
  return prs.sort((a, b) => new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime());
}

function upsertPullRequest(pr) {
  const currentIndex = state.prs.findIndex((current) => current.id === pr.id);

  if (currentIndex >= 0) {
    state.prs[currentIndex] = pr;
  } else {
    state.prs.push(pr);
  }

  sortPrsByActivity(state.prs);
}

async function loadPullRequestsWithFetch({ refresh = false } = {}) {
  setLoading(true);
  clearError();

  try {
    const response = await fetch(`/api/prs${refresh ? '?refresh=true' : ''}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || 'Erro desconhecido.');
    }

    const changes = detectChanges(data.prs || []);
    state.changedIds = new Set(state.firstLoad ? [] : changes.map((change) => change.pr.id));
    state.prs = data.prs || [];

    addUnseenNotifications(changes);
    renderAll();

    elements.lastUpdated.textContent = `Última atualização: ${formatDate(data.generatedAt)}`;
    state.firstLoad = false;
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function loadPullRequests({ refresh = false } = {}) {
  resetRefreshCountdown();

  if (!('EventSource' in window)) {
    loadPullRequestsWithFetch({ refresh });
    return;
  }

  if (state.currentStream) {
    state.currentStream.close();
    state.currentStream = null;
  }

  const stream = new EventSource(`/api/prs/stream${refresh ? '?refresh=true' : ''}`);
  let finished = false;

  state.currentStream = stream;
  state.prs = [];
  state.changedIds = new Set();
  setLoading(true);
  clearError();
  renderAll();
  elements.lastUpdated.textContent = 'Coletando Pull Requests...';

  stream.addEventListener('start', (event) => {
    const data = JSON.parse(event.data);
    elements.lastUpdated.textContent = data.cached
      ? 'Carregando Pull Requests do cache...'
      : 'Coletando Pull Requests...';
  });

  stream.addEventListener('pr', (event) => {
    const pr = JSON.parse(event.data);
    upsertPullRequest(pr);
    renderAll();
  });

  stream.addEventListener('done', (event) => {
    const data = JSON.parse(event.data);
    finished = true;
    stream.close();
    state.currentStream = null;

    const changes = detectChanges(state.prs);
    state.changedIds = new Set(state.firstLoad ? [] : changes.map((change) => change.pr.id));
    addUnseenNotifications(changes);
    renderAll();

    elements.lastUpdated.textContent = `Última atualização: ${formatDate(data.generatedAt)}`;
    state.firstLoad = false;
    setLoading(false);
  });

  stream.addEventListener('failure', (event) => {
    const data = JSON.parse(event.data);
    finished = true;
    stream.close();
    state.currentStream = null;
    showError(data.details || data.error || 'Erro desconhecido.');
    setLoading(false);
  });

  stream.onerror = () => {
    if (finished) return;
    finished = true;
    stream.close();
    state.currentStream = null;
    showError('A conexão de atualização foi interrompida.');
    setLoading(false);
  };
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || 'Erro desconhecido.');
    }

    return {
      autoRefreshSeconds: Math.max(10, Number(data.autoRefreshSeconds) || DEFAULT_AUTO_REFRESH_SECONDS)
    };
  } catch {
    return {
      autoRefreshSeconds: DEFAULT_AUTO_REFRESH_SECONDS
    };
  }
}

async function startApp() {
  const config = await loadConfig();

  state.autoRefreshSeconds = config.autoRefreshSeconds;
  state.refreshSecondsRemaining = config.autoRefreshSeconds;
  state.unseenNotifications = readStoredNotifications();
  renderNotificationCenter();
  renderRefreshCountdown();
  loadPullRequests();

  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
  }

  state.autoRefreshTimer = setInterval(() => {
    state.refreshSecondsRemaining -= 1;
    renderRefreshCountdown();

    if (state.refreshSecondsRemaining <= 0) {
      loadPullRequests({ refresh: true });
    }
  }, 1000);
}

elements.notificationBell.addEventListener('click', toggleNotificationPanel);
elements.clearNotificationsButton.addEventListener('click', clearUnseenNotifications);

for (const element of [
  elements.statusFilter,
  elements.repositoryFilter,
  elements.involvementFilter,
  elements.searchInput
]) {
  element.addEventListener('input', renderTable);
}

startApp();
