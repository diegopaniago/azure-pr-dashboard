const AUTO_REFRESH_MS = 5 * 60 * 1000;
const SNAPSHOT_KEY = 'azure-pr-dashboard:lastSnapshot';

const state = {
  prs: [],
  changedIds: new Set(),
  firstLoad: true,
  notificationEnabled: 'Notification' in window && Notification.permission === 'granted'
};

const elements = {
  refreshButton: document.querySelector('#refreshButton'),
  notifyButton: document.querySelector('#notifyButton'),
  notificationStatus: document.querySelector('#notificationStatus'),
  lastUpdated: document.querySelector('#lastUpdated'),
  errorBox: document.querySelector('#errorBox'),
  loadingBox: document.querySelector('#loadingBox'),
  summaryGrid: document.querySelector('#summaryGrid'),
  statusFilter: document.querySelector('#statusFilter'),
  repositoryFilter: document.querySelector('#repositoryFilter'),
  involvementFilter: document.querySelector('#involvementFilter'),
  searchInput: document.querySelector('#searchInput'),
  prsTable: document.querySelector('#prsTable'),
  emptyState: document.querySelector('#emptyState')
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
      changes.push({ pr, message: describeChange(pr, previous) });
      continue;
    }

    const changed = previous.status !== pr.status
      || previous.lastActivityDate !== pr.lastActivityDate
      || previous.commentCount !== pr.commentCount
      || previous.commentCountByUser !== pr.commentCountByUser
      || previous.reviewerVote !== pr.reviewerVote
      || !sameInvolvement(previous.involvement, pr.involvement);

    if (changed) {
      changes.push({ pr, message: describeChange(pr, previous) });
    }
  }

  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnapshot(prs)));
  return changes;
}

function notifyChanges(changes) {
  if (state.firstLoad || !state.notificationEnabled) return;

  for (const change of changes.slice(0, 5)) {
    const notification = new Notification('Nova atualização em PR', {
      body: change.message,
      tag: change.pr.id
    });

    notification.onclick = () => {
      window.open(change.pr.url, '_blank', 'noopener');
      notification.close();
    };
  }
}

function updateNotificationStatus() {
  if (!('Notification' in window)) {
    elements.notificationStatus.textContent = 'Notificações: indisponíveis';
    elements.notifyButton.disabled = true;
    return;
  }

  const status = Notification.permission;
  state.notificationEnabled = status === 'granted';
  elements.notificationStatus.textContent = `Notificações: ${state.notificationEnabled ? 'ativadas' : 'desativadas'}`;
  elements.notifyButton.textContent = state.notificationEnabled ? 'Notificações ativadas' : 'Ativar notificações';
  elements.notifyButton.disabled = state.notificationEnabled;
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
        <td>${escapeHtml(pr.commentCountByUser)} meus / ${escapeHtml(pr.commentCount)} total</td>
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
  elements.refreshButton.disabled = isLoading;
}

function showError(message) {
  elements.errorBox.textContent = message;
  elements.errorBox.classList.remove('hidden');
}

function clearError() {
  elements.errorBox.textContent = '';
  elements.errorBox.classList.add('hidden');
}

async function loadPullRequests({ refresh = false } = {}) {
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

    notifyChanges(changes);
    renderAll();

    elements.lastUpdated.textContent = `Última atualização: ${formatDate(data.generatedAt)}`;
    state.firstLoad = false;
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

elements.refreshButton.addEventListener('click', () => loadPullRequests({ refresh: true }));
elements.notifyButton.addEventListener('click', async () => {
  if (!('Notification' in window)) return;
  await Notification.requestPermission();
  updateNotificationStatus();
});

for (const element of [
  elements.statusFilter,
  elements.repositoryFilter,
  elements.involvementFilter,
  elements.searchInput
]) {
  element.addEventListener('input', renderTable);
}

updateNotificationStatus();
loadPullRequests();
setInterval(() => loadPullRequests({ refresh: true }), AUTO_REFRESH_MS);
