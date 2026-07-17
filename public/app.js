const SNAPSHOT_KEY = 'azure-pr-dashboard:lastSnapshot';
const NOTIFICATIONS_KEY = 'azure-pr-dashboard:notifications';
const LANGUAGE_KEY = 'azure-pr-dashboard:language';
const THEME_KEY = 'azure-pr-dashboard:theme';
const DEFAULT_AUTO_REFRESH_SECONDS = 300;
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_THEME = 'dark';
const DEFAULT_STATUS_FILTER = 'active';
const THEMES = new Set(['light', 'dark']);

const translations = {
  en: {
    heroTitle: 'Pull Requests to review',
    heroSubtitle: 'Track PRs where you were called directly, through a team, or joined through comments.',
    languageLegend: 'Language',
    themeLegend: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    notificationCenterLabel: 'Unseen notifications',
    notificationsTitle: 'Notifications',
    clearNotifications: 'Clear',
    monitoringActive: 'Monitoring active',
    loadingPullRequests: 'Loading Pull Requests...',
    statusLabel: 'Status',
    repositoryLabel: 'Repository',
    involvementLabel: 'Involvement',
    searchLabel: 'Search',
    searchPlaceholder: 'Title, author, or branch',
    authorColumn: 'Author',
    createdColumn: 'Created',
    closedColumn: 'Closed',
    myInvolvementColumn: 'My involvement',
    commentsColumn: 'Comments',
    actionColumn: 'Action',
    allOption: 'All',
    directReviewer: 'Direct reviewer',
    groupReviewer: 'Team reviewer',
    commented: 'Commented',
    authored: 'Author',
    total: 'Total',
    teamReviewerShort: 'By team',
    emptyState: 'No Pull Requests found for the current filters.',
    noNewNotifications: 'No new notifications.',
    open: 'Open',
    unknownError: 'Unknown error.',
    refreshInterrupted: 'The refresh connection was interrupted.',
    collectingPullRequests: 'Collecting Pull Requests...',
    loadingFromCache: 'Loading Pull Requests from cache...',
    lastUpdatedNever: 'Last updated: never',
    lastUpdated: 'Last updated: {date}',
    refreshesIn: 'Refreshes in {seconds} {unit}',
    second: 'second',
    seconds: 'seconds',
    commentSummary: '{mine} mine / {total} total',
    newPr: '#{id} - {title} appeared in your list.',
    statusChanged: '#{id} - {title} changed to {status}.',
    newComments: '#{id} - {title} received new comments.',
    newActivity: '#{id} - {title} had new activity.',
    involvementChanged: '#{id} - {title} had a change in your involvement.',
    statusActive: 'Active',
    statusCompleted: 'Completed',
    statusAbandoned: 'Abandoned'
  },
  'pt-BR': {
    heroTitle: 'Pull Requests para avaliar',
    heroSubtitle: 'Acompanhe PRs em que você foi chamado diretamente, por time ou participou por comentários.',
    languageLegend: 'Idioma',
    themeLegend: 'Tema',
    themeDark: 'Escuro',
    themeLight: 'Claro',
    notificationCenterLabel: 'Notificações não vistas',
    notificationsTitle: 'Notificações',
    clearNotifications: 'Limpar',
    monitoringActive: 'Monitoramento ativo',
    loadingPullRequests: 'Carregando Pull Requests...',
    statusLabel: 'Status',
    repositoryLabel: 'Repositório',
    involvementLabel: 'Envolvimento',
    searchLabel: 'Buscar',
    searchPlaceholder: 'Título, autor ou branch',
    authorColumn: 'Autor',
    createdColumn: 'Criada',
    closedColumn: 'Fechada',
    myInvolvementColumn: 'Meu envolvimento',
    commentsColumn: 'Comentários',
    actionColumn: 'Ação',
    allOption: 'Todos',
    directReviewer: 'Reviewer direto',
    groupReviewer: 'Reviewer por time',
    commented: 'Comentei',
    authored: 'Autor',
    total: 'Total',
    teamReviewerShort: 'Por time',
    emptyState: 'Nenhuma Pull Request encontrada para os filtros atuais.',
    noNewNotifications: 'Nenhuma notificação nova.',
    open: 'Abrir',
    unknownError: 'Erro desconhecido.',
    refreshInterrupted: 'A conexão de atualização foi interrompida.',
    collectingPullRequests: 'Coletando Pull Requests...',
    loadingFromCache: 'Carregando Pull Requests do cache...',
    lastUpdatedNever: 'Última atualização: nunca',
    lastUpdated: 'Última atualização: {date}',
    refreshesIn: 'Atualiza em {seconds} {unit}',
    second: 'segundo',
    seconds: 'segundos',
    commentSummary: '{mine} meus / {total} total',
    newPr: '#{id} - {title} apareceu na sua lista.',
    statusChanged: '#{id} - {title} mudou para {status}.',
    newComments: '#{id} - {title} recebeu novos comentários.',
    newActivity: '#{id} - {title} teve nova atividade.',
    involvementChanged: '#{id} - {title} teve mudança no seu envolvimento.',
    statusActive: 'Ativa',
    statusCompleted: 'Concluída',
    statusAbandoned: 'Abandonada'
  }
};

const state = {
  prs: [],
  changedIds: new Set(),
  unseenNotifications: [],
  firstLoad: true,
  currentStream: null,
  autoRefreshTimer: null,
  autoRefreshSeconds: DEFAULT_AUTO_REFRESH_SECONDS,
  refreshSecondsRemaining: DEFAULT_AUTO_REFRESH_SECONDS,
  lastGeneratedAt: null,
  language: readStoredLanguage(),
  theme: readStoredTheme()
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
  clearNotificationsButton: document.querySelector('#clearNotificationsButton'),
  languageInputs: document.querySelectorAll('input[name="language"]'),
  themeInputs: document.querySelectorAll('input[name="theme"]')
};

function readStoredLanguage() {
  try {
    const storedLanguage = localStorage.getItem(LANGUAGE_KEY);
    return translations[storedLanguage] ? storedLanguage : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function saveStoredLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The UI can still switch languages if browser storage is unavailable.
  }
}

function readStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
    return THEMES.has(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function saveStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The UI can still switch themes if browser storage is unavailable.
  }
}

function t(key, params = {}) {
  const template = translations[state.language][key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
  return Object.entries(params).reduce((text, [name, value]) => {
    return text.replaceAll(`{${name}}`, String(value));
  }, template);
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat(state.language, {
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

function localizedStatus(status) {
  const statusKey = `status${String(status || '').charAt(0).toUpperCase()}${String(status || '').slice(1)}`;
  return translations[state.language][statusKey] || translations[DEFAULT_LANGUAGE][statusKey] || status;
}

function applyStaticTranslations() {
  document.documentElement.lang = state.language;

  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }

  for (const element of document.querySelectorAll('[data-i18n-attr]')) {
    const mappings = element.dataset.i18nAttr.split(',');
    for (const mapping of mappings) {
      const [attribute, key] = mapping.split(':');
      element.setAttribute(attribute, t(key));
    }
  }

  for (const input of elements.languageInputs) {
    input.checked = input.value === state.language;
  }

  for (const input of elements.themeInputs) {
    input.checked = input.value === state.theme;
  }

  if (elements.statusFilter.value !== DEFAULT_STATUS_FILTER && !elements.statusFilter.dataset.userChanged) {
    elements.statusFilter.value = DEFAULT_STATUS_FILTER;
  }
}

function applyTheme() {
  document.body.dataset.theme = state.theme;

  for (const input of elements.themeInputs) {
    input.checked = input.value === state.theme;
  }
}

function renderLastUpdated() {
  elements.lastUpdated.textContent = state.lastGeneratedAt
    ? t('lastUpdated', { date: formatDate(state.lastGeneratedAt) })
    : t('lastUpdatedNever');
}

function setLanguage(language) {
  if (!translations[language]) return;

  state.language = language;
  saveStoredLanguage(language);
  applyStaticTranslations();
  renderRefreshCountdown();
  renderLastUpdated();
  renderNotificationCenter();
  renderAll();
}

function setTheme(theme) {
  if (!THEMES.has(theme)) return;

  state.theme = theme;
  saveStoredTheme(theme);
  applyTheme();
}

function involvementLabels(involvement) {
  const labels = [];
  if (involvement.directReviewer) labels.push(['directReviewer', t('directReviewer')]);
  if (involvement.groupReviewer) labels.push(['groupReviewer', t('groupReviewer')]);
  if (involvement.commented) labels.push(['commented', t('commented')]);
  if (involvement.authored) labels.push(['authored', t('authored')]);
  return labels;
}

function formatCommentSummary(pr) {
  if (!pr.commentsLoaded) return '-';
  return t('commentSummary', {
    mine: escapeHtml(pr.commentCountByUser),
    total: escapeHtml(pr.commentCount)
  });
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
  const params = {
    id: pr.pullRequestId,
    title: pr.title,
    status: localizedStatus(pr.status)
  };

  if (!previous) return t('newPr', params);
  if (previous.status !== pr.status) return t('statusChanged', params);
  if ((previous.commentCount || 0) < (pr.commentCount || 0)) return t('newComments', params);
  if (previous.lastActivityDate !== pr.lastActivityDate) return t('newActivity', params);
  return t('involvementChanged', params);
}

function formatNotificationMessage(notification) {
  if (!notification.changeType) {
    return notification.message || '';
  }

  const keyByType = {
    new: 'newPr',
    status: 'statusChanged',
    comments: 'newComments',
    activity: 'newActivity',
    involvement: 'involvementChanged'
  };

  return t(keyByType[notification.changeType] || 'involvementChanged', {
    id: notification.pullRequestId,
    title: notification.title,
    status: localizedStatus(notification.status)
  });
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
    changeType: change.type,
    pullRequestId: change.pr.pullRequestId,
    title: change.pr.title,
    status: change.pr.status,
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
    elements.notificationList.innerHTML = `<div class="notification-empty">${t('noNewNotifications')}</div>`;
    return;
  }

  elements.notificationList.innerHTML = state.unseenNotifications.map((notification) => `
    <a class="notification-item" href="${escapeHtml(notification.url)}" target="_blank" rel="noopener">
      <strong>${escapeHtml(formatNotificationMessage(notification))}</strong>
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
    [t('total'), prs.length],
    [t('directReviewer'), prs.filter((pr) => pr.involvement.directReviewer).length],
    [t('teamReviewerShort'), prs.filter((pr) => pr.involvement.groupReviewer).length],
    [t('commented'), prs.filter((pr) => pr.involvement.commented).length],
    [t('statusActive'), prs.filter((pr) => pr.status === 'active').length],
    [t('statusCompleted'), prs.filter((pr) => pr.status === 'completed').length]
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
  elements.repositoryFilter.innerHTML = `<option value="all">${t('allOption')}</option>`
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
        <td><span class="status ${escapeHtml(pr.status)}">${escapeHtml(localizedStatus(pr.status))}</span></td>
        <td>${escapeHtml(pr.repository)}</td>
        <td>${escapeHtml(pr.createdBy)}</td>
        <td>${formatDate(pr.creationDate)}</td>
        <td>${formatDate(pr.closedDate)}</td>
        <td><div class="badges">${badges || '-'}</div></td>
        <td>${formatCommentSummary(pr)}</td>
        <td><a class="link" href="${escapeHtml(pr.url)}" target="_blank" rel="noopener">${t('open')}</a></td>
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
  elements.refreshFrequency.textContent = t('refreshesIn', {
    seconds,
    unit: seconds === 1 ? t('second') : t('seconds')
  });
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
      throw new Error(data.details || data.error || t('unknownError'));
    }

    const changes = detectChanges(data.prs || []);
    state.changedIds = new Set(state.firstLoad ? [] : changes.map((change) => change.pr.id));
    state.prs = data.prs || [];

    addUnseenNotifications(changes);
    renderAll();

    state.lastGeneratedAt = data.generatedAt;
    renderLastUpdated();
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
  state.lastGeneratedAt = null;
  elements.lastUpdated.textContent = t('collectingPullRequests');

  stream.addEventListener('start', (event) => {
    const data = JSON.parse(event.data);
    elements.lastUpdated.textContent = data.cached
      ? t('loadingFromCache')
      : t('collectingPullRequests');
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

    state.lastGeneratedAt = data.generatedAt;
    renderLastUpdated();
    state.firstLoad = false;
    setLoading(false);
  });

  stream.addEventListener('failure', (event) => {
    const data = JSON.parse(event.data);
    finished = true;
    stream.close();
    state.currentStream = null;
    showError(data.details || data.error || t('unknownError'));
    setLoading(false);
  });

  stream.onerror = () => {
    if (finished) return;
    finished = true;
    stream.close();
    state.currentStream = null;
    showError(t('refreshInterrupted'));
    setLoading(false);
  };
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || t('unknownError'));
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
  applyTheme();
  applyStaticTranslations();
  saveStoredLanguage(state.language);
  saveStoredTheme(state.theme);
  elements.statusFilter.value = DEFAULT_STATUS_FILTER;

  const config = await loadConfig();

  state.autoRefreshSeconds = config.autoRefreshSeconds;
  state.refreshSecondsRemaining = config.autoRefreshSeconds;
  state.unseenNotifications = readStoredNotifications();
  renderLastUpdated();
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
for (const input of elements.languageInputs) {
  input.addEventListener('change', () => setLanguage(input.value));
}
for (const input of elements.themeInputs) {
  input.addEventListener('change', () => setTheme(input.value));
}

for (const element of [
  elements.statusFilter,
  elements.repositoryFilter,
  elements.involvementFilter,
  elements.searchInput
]) {
  element.addEventListener('input', () => {
    element.dataset.userChanged = 'true';
    renderTable();
  });
}

startApp();
