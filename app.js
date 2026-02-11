const STORAGE = {
  profile: 'witProfile', xp: 'witXp', streak: 'witStreak', badges: 'witBadges', theme: 'witTheme',
  meetCount: 'witMeetCount', reflectionHistory: 'witReflectionHistory', weeklyIntent: 'witWeeklyIntent', dailyPromptAnswers:'witDailyPromptAnswers', trust:'witTrust', userConnections: 'witUserConnections'
};

const XP_REWARDS = { completeReflection: 20, detailedFeedback: 10, dailyReflectionStreak: 5 };
const OUTCOME_VALUES = ['again', 'maybe', 'pass'];
const FEEDBACK_TAGS = ['Good listener', 'Interesting ideas', 'Respectful', 'Funny', 'Too quiet', 'Off-topic'];
const DAILY_PROMPT = { id: 'dp-001', question: 'What value guided one decision you made today?', category: 'values' };

const db = {
  meet_reflections: [], // {id,meet_id,user_id,vibe_score,meet_outcome,feedback_tags,created_at}
  daily_prompt: [DAILY_PROMPT],
  user_weekly_intent: [], // {user_id, intent}
  trust_score: [], // {user_id, score}
  user_connections: [] // {user_id, linked_user_id}
};

const state = {
  accountStore: JSON.parse(localStorage.getItem(STORAGE.accounts) || '{}'),
  authSession: JSON.parse(localStorage.getItem(STORAGE.authSession) || 'null'),
  profile: JSON.parse(localStorage.getItem(STORAGE.profile) || 'null'),
  xp: Number(localStorage.getItem(STORAGE.xp) || 0),
  streak: Number(localStorage.getItem(STORAGE.streak) || 0),
  badges: JSON.parse(localStorage.getItem(STORAGE.badges) || '[]'),
  theme: localStorage.getItem(STORAGE.theme) || 'light',
  wizardStep: 1,
  timer: null,
  meetId: null,
  meetSeconds: 0,
  meetCount: Number(localStorage.getItem(STORAGE.meetCount) || 0),
  reflectionHistory: JSON.parse(localStorage.getItem(STORAGE.reflectionHistory) || '[]'),
  requireReflection: false,
  currentReflection: { meetId: '', userId: '', reason: '', vibe: 0, tags: [] },
  dailyPromptAnswers: JSON.parse(localStorage.getItem(STORAGE.dailyPromptAnswers) || '{}'),
  activeRequest: null,
  requestStatus: 'idle',
  notifications: [],
  directChats: [],
  activeDirectChatId: null,
  userConnections: JSON.parse(localStorage.getItem(STORAGE.userConnections) || '[]')
};


const USE_BACKEND = new URLSearchParams(window.location.search).get('backend') === '1';

const apiClient = window.createApiClient({
  baseUrl: '/api',
  useNetwork: USE_BACKEND,
  fallback: {
    submitMeetReflection: async (body) => {
      db.meet_reflections.push({ id: uuid(), ...body, created_at: new Date().toISOString() });
      return { success: true };
    },
    submitDailyPromptAnswer: async (body) => {
      state.dailyPromptAnswers[body.prompt_id] = body.answer;
      return { success: true };
    },
    submitWeeklyIntent: async (body) => {
      const idx = db.user_weekly_intent.findIndex((x) => x.user_id === body.user_id);
      if (idx >= 0) db.user_weekly_intent[idx] = body; else db.user_weekly_intent.push(body);
      return { success: true };
    },
    getTrustScore: async (userId) => ({ user_id: userId, score: getTrustScore(userId), cooldown_applied: false }),
    linkUsers: async (userId, linkedUserId) => {
      const linksToStore = [
        { user_id: userId, linked_user_id: linkedUserId },
        { user_id: linkedUserId, linked_user_id: userId }
      ];

      linksToStore.forEach((link) => {
        const exists = db.user_connections.some((entry) => entry.user_id === link.user_id && entry.linked_user_id === link.linked_user_id);
        if (!exists) db.user_connections.push(link);
      });

      return { success: true };
    },
    getUserConnections: async (userId) => ({
      userId,
      connections: db.user_connections
        .filter((entry) => entry.user_id === userId)
        .map((entry) => entry.linked_user_id)
    })
  }
});

const prompts = [
  'Your house catches fire. After saving loved ones and pets, what one item do you save and why?',
  'If you could relive one day in your life, which would it be and why?',
  'What hobby should everyone try at least once?'
];

function saveState() {
  localStorage.setItem(STORAGE.profile, JSON.stringify(state.profile));
  localStorage.setItem(STORAGE.accounts, JSON.stringify(state.accountStore));
  localStorage.setItem(STORAGE.authSession, JSON.stringify(state.authSession));
  localStorage.setItem(STORAGE.xp, String(state.xp));
  localStorage.setItem(STORAGE.streak, String(state.streak));
  localStorage.setItem(STORAGE.badges, JSON.stringify(state.badges));
  localStorage.setItem(STORAGE.theme, state.theme);
  localStorage.setItem(STORAGE.meetCount, String(state.meetCount));
  localStorage.setItem(STORAGE.reflectionHistory, JSON.stringify(state.reflectionHistory));
  localStorage.setItem(STORAGE.dailyPromptAnswers, JSON.stringify(state.dailyPromptAnswers));
  localStorage.setItem(STORAGE.userConnections, JSON.stringify(state.userConnections));
}

function emitEvent(name, payload = {}) {
  console.log('ANALYTICS_EVENT', { name, ...payload, at: new Date().toISOString() });
}

function toast(msg) {
  const n = document.createElement('div');
  n.className = 'toast';
  n.textContent = msg;
  document.getElementById('toastRoot').appendChild(n);
  setTimeout(() => n.remove(), 3500);
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addXp(amount, reason) {
  state.xp += amount;
  toast(`+${amount} XP • ${reason}`);
  refreshStats();
  saveState();
}

function getAvatarStage(xp) {
  if (xp >= 21) return 'stage-mature';
  if (xp >= 11) return 'stage-growing';
  return 'stage-young';
}

function updateAvatarGrowth() {
  const avatar = document.getElementById('xpAvatar');
  const growthLabel = document.getElementById('avatarGrowthLabel');
  if (!avatar || !growthLabel) return;

  const stage = getAvatarStage(state.xp);
  avatar.classList.remove('stage-young', 'stage-growing', 'stage-mature');
  avatar.classList.add(stage);

  if (stage === 'stage-young') growthLabel.textContent = 'XP 1–10: Baby panda form';
  else if (stage === 'stage-growing') growthLabel.textContent = 'XP 11–20: Growing panda with extra detail';
  else growthLabel.textContent = 'XP 21+: Fully grown panda with playful style';
}

function refreshStats() {
  document.getElementById('xpStat').textContent = `XP ${state.xp}`;
  document.getElementById('streakStat').textContent = `🔥 ${state.streak}`;
  document.getElementById('streakBig').textContent = state.streak;
  document.getElementById('xpFill').style.width = `${state.xp % 100}%`;
  document.getElementById('levelLabel').textContent = `Level ${Math.floor(state.xp / 100) + 1}`;
  document.getElementById('reflectionStreakLabel').textContent = `${state.streak} days`;
  updateAvatarGrowth();
  renderBadges();
}

function renderBadges() {
  const root = document.getElementById('badgeList');
  const all = ['Great Listener', 'Reflection Pro', 'Trusted Member'];
  if (state.xp >= 60 && !state.badges.includes('Great Listener')) state.badges.push('Great Listener');
  if (db.meet_reflections.length >= 3 && !state.badges.includes('Reflection Pro')) state.badges.push('Reflection Pro');
  if (getTrustScore(getUserId()) >= 70 && !state.badges.includes('Trusted Member')) state.badges.push('Trusted Member');
  root.innerHTML = '';
  all.forEach((b) => {
    const e = document.createElement('span');
    e.className = `badge ${state.badges.includes(b) ? 'earned' : 'locked'}`;
    e.textContent = b;
    root.appendChild(e);
  });
}

function getUserId() {
  const account = getCurrentAccount();
  if (account?.username) return account.username;
  return state.profile?.nickname || 'anonymous_user';
}


function getCurrentAccount() {
  if (!state.authSession?.email) return null;
  return state.accountStore[state.authSession.email] || null;
}

function createSessionToken() {
  return `session_${uuid()}`;
}

function initialsForName(name = '') {
  return (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function syncProfileFromAccount() {
  const account = getCurrentAccount();
  if (!account) return;
  if (account.preferences && Object.keys(account.preferences).length) {
    state.profile = { ...account.preferences };
  }
}

function saveCurrentAccount() {
  const account = getCurrentAccount();
  if (!account) return;
  const nickname = state.profile?.nickname || account.username;
  account.username = nickname || account.username || account.email.split('@')[0];
  account.avatar = initialsForName(account.username);
  account.preferences = state.profile ? { ...state.profile } : account.preferences;
  state.accountStore[account.email] = account;
}

function renderAccountOverview() {
  const account = getCurrentAccount();
  if (!account) return;
  document.getElementById('accountOverviewName').textContent = account.username || account.email;
  document.getElementById('accountOverviewEmail').textContent = account.email;
  document.getElementById('accountAvatar').textContent = account.avatar || initialsForName(account.username || account.email);
  document.getElementById('accountPreferencesText').textContent = summarizeProfile(state.profile || account.preferences || {});
}

function setupAccountAuth(wizardControls) {
  const loginCard = document.getElementById('loginCard');
  const accountOverviewCard = document.getElementById('accountOverviewCard');
  const loginForm = document.getElementById('loginForm');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const appleLoginBtn = document.getElementById('appleLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const editAccountProfileBtn = document.getElementById('editAccountProfileBtn');

  const renderAuthState = () => {
    const isLoggedIn = Boolean(state.authSession?.token);
    loginCard.classList.toggle('hidden', isLoggedIn);
    accountOverviewCard.classList.toggle('hidden', !isLoggedIn);

    if (!isLoggedIn) {
      wizardControls.showSignedOutState();
      return;
    }

    syncProfileFromAccount();
    renderAccountOverview();
    wizardControls.showSignedInState();
    wizardControls.fillFormFromProfile();
    saveState();
  };

  const handleCredentialLogin = ({ email, password, provider = 'password' }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = state.accountStore[normalizedEmail];

    if (existing && existing.password !== password) {
      toast('Incorrect password for this account.');
      return;
    }

    const account = existing || {
      email: normalizedEmail,
      password,
      username: normalizedEmail.split('@')[0],
      avatar: initialsForName(normalizedEmail),
      preferences: {}
    };

    state.accountStore[normalizedEmail] = account;
    state.authSession = { token: createSessionToken(), email: normalizedEmail, provider };
    syncProfileFromAccount();
    renderAuthState();
    toast(existing ? 'Logged in successfully.' : 'Account created and logged in.');
  };

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm).entries());
    handleCredentialLogin({ email: data.email || '', password: data.password || '' });
    loginForm.reset();
  });

  const socialLogin = (provider) => {
    const fakeEmail = `${provider.toLowerCase()}_user@social.local`;
    handleCredentialLogin({ email: fakeEmail, password: `${provider.toLowerCase()}_oauth`, provider });
  };

  googleLoginBtn.addEventListener('click', () => socialLogin('google'));
  appleLoginBtn.addEventListener('click', () => socialLogin('apple'));

  logoutBtn.addEventListener('click', () => {
    saveCurrentAccount();
    state.authSession = null;
    saveState();
    renderAuthState();
    toast('Logged out.');
  });

  editAccountProfileBtn.addEventListener('click', () => {
    wizardControls.openWizard();
  });

  renderAuthState();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

function summarizeProfile(data) {
  const points = [
    `Nickname: ${data.nickname || 'User'}`,
    `Age range: ${data.ageRange || 'Not set'}`,
    `Depth: ${data.depth || 'Moderate'}`,
    `Topics: ${data.topics || 'n/a'}`,
    `Off-limits: ${data.offLimits || 'none'}`
  ];
  return points.join('\n');
}

function updateWizardUI() {
  document.querySelectorAll('.wizard-step').forEach((step) => step.classList.toggle('hidden', Number(step.dataset.step) !== state.wizardStep));
  document.getElementById('wizardProgress').style.width = `${state.wizardStep * 25}%`;
  document.getElementById('wizardBack').disabled = state.wizardStep === 1;
  document.getElementById('wizardNext').classList.toggle('hidden', state.wizardStep === 4);
  document.getElementById('wizardSubmit').classList.toggle('hidden', state.wizardStep !== 4);
}

function setupWizard() {
  const form = document.getElementById('profileWizard');
  const createAccountCard = document.getElementById('createAccountCard');
  const createAccountBtn = document.getElementById('createAccountBtn');
  const accountSetupFlow = document.getElementById('accountSetupFlow');
  const savedProfileCard = document.getElementById('savedProfileCard');
  const savedProfileText = document.getElementById('savedProfileText');
  const editProfileBtn = document.getElementById('editProfileBtn');

  const fillFormFromProfile = () => {
    if (!state.profile) return;
    for (const [k, v] of Object.entries(state.profile)) if (form.elements[k]) form.elements[k].value = v;
  };

  const renderSavedProfile = () => {
    savedProfileText.textContent = summarizeProfile(state.profile || {});
  };

  const showCreateState = () => {
    accountSetupFlow.classList.add('hidden');
    savedProfileCard.classList.add('hidden');
    createAccountCard.classList.remove('hidden');
  };

  const showWizard = () => {
    if (!state.authSession?.token) return toast('Please log in first.');
    accountSetupFlow.classList.remove('hidden');
    savedProfileCard.classList.add('hidden');
    createAccountCard.classList.add('hidden');
  };

  const showSavedState = () => {
    renderSavedProfile();
    accountSetupFlow.classList.add('hidden');
    createAccountCard.classList.add('hidden');
    savedProfileCard.classList.remove('hidden');
  };

  const showSignedOutState = () => {
    accountSetupFlow.classList.add('hidden');
    savedProfileCard.classList.add('hidden');
    createAccountCard.classList.add('hidden');
  };

  const showSignedInState = () => {
    if (state.profile) showSavedState();
    else showCreateState();
  };

  if (state.authSession?.token) showSignedInState();
  else showSignedOutState();

  createAccountBtn.addEventListener('click', () => {
    state.wizardStep = 1;
    updateWizardUI();
    showWizard();
  });

  editProfileBtn.addEventListener('click', () => {
    fillFormFromProfile();
    state.wizardStep = 1;
    updateWizardUI();
    form.dispatchEvent(new Event('input'));
    showWizard();
  });

  document.querySelectorAll('input[type="range"]').forEach((slider) => {
    const out = document.querySelector(`[data-output="${slider.name}"]`);
    if (out) out.textContent = slider.value;
    slider.addEventListener('input', () => { if (out) out.textContent = slider.value; });
  });

  form.addEventListener('input', () => {
    const data = Object.fromEntries(new FormData(form).entries());
    document.getElementById('livePreview').textContent = summarizeProfile(data);
    document.getElementById('profileSummary').textContent = summarizeProfile(data);
    document.getElementById('wizardNext').disabled = state.wizardStep === 1 && !(data.nickname && data.ageRange);
  });

  document.getElementById('wizardNext').addEventListener('click', () => { state.wizardStep = Math.min(4, state.wizardStep + 1); updateWizardUI(); });
  document.getElementById('wizardBack').addEventListener('click', () => { state.wizardStep = Math.max(1, state.wizardStep - 1); updateWizardUI(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.profile = Object.fromEntries(new FormData(form).entries());
    saveCurrentAccount();
    renderAccountOverview();
    addXp(10, 'Profile saved');
    saveState();
    showSavedState();
  });
  updateWizardUI();
  form.dispatchEvent(new Event('input'));

  return {
    fillFormFromProfile,
    openWizard: () => {
      fillFormFromProfile();
      state.wizardStep = 1;
      updateWizardUI();
      form.dispatchEvent(new Event('input'));
      showWizard();
    },
    showSignedOutState,
    showSignedInState
  };
}

// Match quality engine
function toSetTopics(user) { return new Set((user.topics || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean)); }
function overlapTopics(userA, userB) {
  const a = toSetTopics(userA), b = toSetTopics(userB);
  if (!a.size || !b.size) return 0;
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return inter / union;
}
function overlapPreferences(userA, userB) {
  const keys = ['depth', 'frequency'];
  const matches = keys.filter((k) => userA[k] === userB[k]).length;
  return matches / keys.length;
}
function averageVibe(userA, userB) {
  const a = db.meet_reflections.filter((r) => r.user_id === userA.id).map((r) => r.vibe_score);
  const b = db.meet_reflections.filter((r) => r.user_id === userB.id).map((r) => r.vibe_score);
  const all = [...a, ...b];
  return all.length ? (all.reduce((s, v) => s + v, 0) / all.length) / 5 : 0.6;
}
function meetCompletionRate(userA, userB) {
  const ids = new Set([userA.id, userB.id]);
  const meets = db.meet_reflections.filter((r) => ids.has(r.user_id));
  if (!meets.length) return 0.5;
  const completed = meets.filter((r) => r.meet_outcome !== 'pass').length;
  return completed / meets.length;
}
function reflectionOutcomeBias(userA, userB) {
  const ids = new Set([userA.id, userB.id]);
  const meets = db.meet_reflections.filter((r) => ids.has(r.user_id));
  if (!meets.length) return 0.5;
  const again = meets.filter((r) => r.meet_outcome === 'again').length;
  return again / meets.length;
}
function computeMatchScore(userA, userB) {
  const topicScore = overlapTopics(userA, userB);
  const preferenceScore = overlapPreferences(userA, userB);
  const vibeAvg = averageVibe(userA, userB);
  const completionRate = meetCompletionRate(userA, userB);
  const outcomeBias = reflectionOutcomeBias(userA, userB);
  return topicScore * 0.3 + preferenceScore * 0.2 + vibeAvg * 0.25 + completionRate * 0.15 + outcomeBias * 0.1;
}

function explainMatch(userA, userB) {
  const reasons = [];
  const topicsA = toSetTopics(userA), topicsB = toSetTopics(userB);
  const shared = [...topicsA].filter((x) => topicsB.has(x));
  if (shared.length) reasons.push(`Shared interest in ${shared[0]}`);
  if (averageVibe(userA, userB) > 0.7) reasons.push('Similar vibe history');
  return reasons.slice(0, 2);
}

function forceReflectionBeforeNextMeet() {
  state.requireReflection = true;
  toast('Cold start mode: submit reflection before next meet.');
}


function showAnswerInput() {
  const wrap = document.getElementById('promptAnswerWrap');
  const input = document.getElementById('promptAnswerInput');
  wrap.classList.remove('hidden');
  input.disabled = false;
  input.value = '';
}

function hideAnswerInput() {
  const wrap = document.getElementById('promptAnswerWrap');
  const input = document.getElementById('promptAnswerInput');
  wrap.classList.add('hidden');
  input.disabled = true;
  input.value = '';
}

function resetMeetTimerUI() {
  state.meetSeconds = 0;
  document.getElementById('chatTimer').textContent = '00:00';
  const ring = document.getElementById('ringProgress');
  ring.style.strokeDashoffset = '327';
  ring.style.stroke = '#50E3C2';
}

function updateRequestStatus(message, show = true) {
  const gate = document.getElementById('decisionGate');
  const label = document.getElementById('requestSentMessage');
  label.textContent = message;
  gate.classList.toggle('hidden', !show);
}

function sendPositiveFeedback(notificationId) {
  emitEvent('NOTIFICATION_FEEDBACK_POSITIVE', { notification_id: notificationId });
}

function sendNegativeFeedback(notificationId) {
  emitEvent('NOTIFICATION_FEEDBACK_NEGATIVE', { notification_id: notificationId });
}

function formatChatTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function renderConnectionsList() {
  const list = document.getElementById('connectionsList');
  if (!list) return;

  if (!state.userConnections.length) {
    list.innerHTML = '<li class="small">No connections yet. Approve a notification to create one.</li>';
    return;
  }

  list.innerHTML = '';
  state.userConnections.forEach((connectionUserId) => {
    const item = document.createElement('li');
    item.textContent = connectionUserId;
    list.appendChild(item);
  });
}

async function linkUsersAndRefreshConnections(userId, linkedUserId) {
  const response = await apiClient.linkUsers(userId, linkedUserId);
  if (!response?.success) return;

  const connections = await apiClient.getUserConnections(userId);
  state.userConnections = connections.connections || [];
  saveState();
  renderConnectionsList();
}

async function loadConnections() {
  const userId = getUserId();
  const connections = await apiClient.getUserConnections(userId);
  state.userConnections = connections.connections || [];
  saveState();
  renderConnectionsList();
}

function getOrCreateDirectChat(notification) {
  let thread = state.directChats.find((chat) => chat.sender === notification.sender);
  if (!thread) {
    thread = {
      id: uuid(),
      sender: notification.sender,
      messages: [],
      unread: false,
      updatedAt: new Date().toISOString()
    };
    state.directChats.unshift(thread);
  }

  const alreadyHasSeed = thread.messages.some((msg) => msg.sourceNotificationId === notification.id);
  if (!alreadyHasSeed) {
    thread.messages.push({
      id: uuid(),
      from: 'sender',
      text: notification.answer,
      createdAt: new Date().toISOString(),
      sourceNotificationId: notification.id
    });
  }
  thread.updatedAt = new Date().toISOString();
  state.directChats = [thread, ...state.directChats.filter((chat) => chat.id !== thread.id)];
  return thread;
}

function renderDirectChatCollapsed() {
  const card = document.getElementById('directChatCollapsed');
  const sender = document.getElementById('directChatSender');
  const summary = document.getElementById('directChatSummary');
  const time = document.getElementById('directChatTime');
  const unread = document.getElementById('directChatUnread');
  const latest = state.directChats[0];

  if (!latest) {
    sender.textContent = 'No active chats';
    summary.textContent = 'Give a notification a thumbs up to start a thread.';
    time.textContent = '—';
    unread.classList.add('hidden');
    card.classList.add('is-empty');
    return;
  }

  const lastMessage = latest.messages[latest.messages.length - 1];
  sender.textContent = latest.sender;
  summary.textContent = lastMessage ? lastMessage.text : 'Tap to view conversation';
  time.textContent = formatChatTime(new Date(latest.updatedAt));
  unread.classList.toggle('hidden', !latest.unread);
  card.classList.remove('is-empty');
}

function renderDirectChatHistory() {
  const history = document.getElementById('directChatHistory');
  history.innerHTML = '';

  if (!state.activeDirectChatId) {
    history.innerHTML = '<p class="small">Tap the compact chat card to expand the latest thread.</p>';
    return;
  }

  const active = state.directChats.find((chat) => chat.id === state.activeDirectChatId);
  if (!active) return;

  active.messages.forEach((message) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${message.from === 'user' ? 'from-user' : 'from-sender'}`;
    bubble.textContent = message.text;
    history.appendChild(bubble);
  });
  history.scrollTop = history.scrollHeight;
}

function setDirectChatExpanded(expanded) {
  const panel = document.getElementById('directChatPanel');
  const collapsed = document.getElementById('directChatCollapsed');
  panel.classList.toggle('expanded', expanded);
  collapsed.setAttribute('aria-expanded', String(expanded));
  panel.setAttribute('aria-hidden', String(!expanded));
  if (expanded) renderDirectChatHistory();
}

function openChatForNotification(notification, linkedUserId = notification.sender) {
  const thread = getOrCreateDirectChat(notification);
  state.activeDirectChatId = thread.id;
  thread.unread = false;
  renderDirectChatCollapsed();
  setDirectChatExpanded(true);
  updateRequestStatus(`Connected with ${linkedUserId}. Continue the conversation in Direct Chat.`, true);

  document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
  document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
  const chatTab = document.querySelector('.tab[data-tab="community"]');
  if (chatTab) chatTab.classList.add('active');
  document.getElementById('community').classList.add('active');
}

async function animateNotificationToChat(row, notification) {
  const target = document.getElementById('directChatCollapsed');
  if (!target || !row) {
    openChatForNotification(notification);
    renderNotifications();
    return;
  }

  const sourceRect = row.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const clone = row.cloneNode(true);
  clone.classList.add('notification-flyer');
  clone.style.width = `${sourceRect.width}px`;
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  document.body.appendChild(clone);

  row.classList.add('is-dampened');

  requestAnimationFrame(() => {
    clone.style.transform = `translate(${targetRect.left - sourceRect.left}px, ${targetRect.top - sourceRect.top}px) scale(0.72)`;
    clone.style.opacity = '0.15';
  });

  setTimeout(() => {
    clone.remove();
    openChatForNotification(notification);
    renderNotifications();
  }, 540);
}

async function applyNotificationFeedback(notification, type, row) {
  notification.feedback = type;
  notification.status = type === 'positive' ? 'Acknowledged' : 'Dismissed';

  if (type === 'positive') {
    state.activeRequest = notification;
    sendPositiveFeedback(notification.id);
    await linkUsersAndRefreshConnections(getUserId(), notification.sender);
    toast(`Connected with ${notification.sender}`);
    animateNotificationToChat(row, notification);
    return;
  }

  sendNegativeFeedback(notification.id);
  row.classList.add('is-dampened');
  setTimeout(() => renderNotifications(), 320);
}

function renderNotifications() {
  const list = document.getElementById('notificationList');
  const notice = document.getElementById('accountRequestNotice');
  if (!state.notifications.length) {
    notice.textContent = 'No new notifications yet.';
    list.textContent = 'No notifications.';
    return;
  }
  notice.textContent = `${state.notifications.length} notification(s)`;
  list.innerHTML = '';
  state.notifications.forEach((n) => {
    const row = document.createElement('div');
    row.className = 'notification-item';
    const text = document.createElement('p');
    text.className = 'notification-text';
    const notificationTime = n.createdAt ? formatChatTime(new Date(n.createdAt)) : '';
    text.textContent = `${n.sender} • Answer: "${n.answer}" • Status: ${n.status}${notificationTime ? ` • ${notificationTime}` : ''}`;

    const actions = document.createElement('div');
    actions.className = 'notification-actions';
    const goodBtn = document.createElement('button');
    goodBtn.type = 'button';
    goodBtn.className = `feedback-btn good ${n.feedback === 'positive' ? 'selected' : ''}`;
    goodBtn.setAttribute('aria-label', 'Positive feedback');
    goodBtn.textContent = '👍';

    const badBtn = document.createElement('button');
    badBtn.type = 'button';
    badBtn.className = `feedback-btn bad ${n.feedback === 'negative' ? 'selected' : ''}`;
    badBtn.setAttribute('aria-label', 'Negative feedback');
    badBtn.textContent = '👎';

    if (n.feedback) {
      goodBtn.disabled = true;
      badBtn.disabled = true;
    } else {
      goodBtn.addEventListener('click', () => applyNotificationFeedback(n, 'positive', row));
      badBtn.addEventListener('click', () => applyNotificationFeedback(n, 'negative', row));
    }

    actions.append(goodBtn, badBtn);
    row.append(text, actions);
    list.appendChild(row);
  });
}

function startMeet() {
  if (!state.profile) return toast('Complete profile first.');
  if (state.requireReflection) return toast('Please submit pending reflection first.');

  const self = { id: getUserId(), ...state.profile };
  const candidate = { id: 'peer_001', topics: 'music,travel,tech', depth: 'Deep', frequency: 'Weekly' };
  const score = computeMatchScore(self, candidate);
  const reasons = explainMatch(self, candidate);
  document.getElementById('matchReasons').textContent = reasons.join(' • ') || 'Strong compatibility signals';
  document.getElementById('matchStatus').textContent = `Matched (score ${score.toFixed(2)})`;
  state.meetId = uuid();
  resetMeetTimerUI();
  state.requestStatus = 'idle';
  renderNotifications();
  updateRequestStatus('No request sent yet.', false);
  document.getElementById('currentPrompt').textContent = prompts[0];
  showAnswerInput();
  document.getElementById('respondPromptBtn').disabled = false;
  document.getElementById('reportBtn').disabled = false;
  emitEvent('MATCH_MADE', { meet_id: state.meetId, score });

  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.meetSeconds += 1;
    document.getElementById('chatTimer').textContent = `${String(Math.floor(state.meetSeconds/60)).padStart(2,'0')}:${String(state.meetSeconds%60).padStart(2,'0')}`;
    const ring = document.getElementById('ringProgress');
    const pct = Math.min(state.meetSeconds / 60, 1);
    ring.style.strokeDashoffset = String(327 - 327 * pct);
    ring.style.stroke = state.meetSeconds < 20 ? '#50E3C2' : state.meetSeconds < 40 ? '#F5A623' : '#ef4444';
    if (state.meetSeconds >= 60) {
      endMeet('timeout');
    }
  }, 1000);
}

function endMeet(reason) {
  clearInterval(state.timer);
  document.getElementById('respondPromptBtn').disabled = true;
  hideAnswerInput();
  document.getElementById('reportBtn').disabled = true;
  document.getElementById('decisionGate').classList.add('hidden');
  emitEvent('MEET_ENDED', { meet_id: state.meetId, reason });
  onMeetEnd(state.meetId, getUserId(), reason);
}

function setupMeet() {
  document.getElementById('startMatchBtn').addEventListener('click', startMeet);
  document.getElementById('respondPromptBtn').addEventListener('click', () => {
    const answerInput = document.getElementById('promptAnswerInput');
    const answer = answerInput.value.trim();
    if (!answer) return toast('Please type an answer before submitting.');

    const currentPrompt = document.getElementById('currentPrompt').textContent;
    const notification = { id: uuid(), sender: getUserId(), prompt: currentPrompt, answer, status: 'Pending', createdAt: new Date().toISOString() };
    state.notifications.unshift(notification);
    state.activeRequest = notification;
    state.requestStatus = 'sent';
    clearInterval(state.timer);
    resetMeetTimerUI();

    hideAnswerInput();
    document.getElementById('respondPromptBtn').disabled = true;
    updateRequestStatus('Request sent successfully. Waiting for receiver action.', true);
    renderNotifications();
    addXp(5, 'Prompt response');
  });
  const reportModal = document.getElementById('reportModal');
  document.getElementById('reportBtn').addEventListener('click', () => reportModal.showModal());
  document.getElementById('cancelReport').addEventListener('click', () => reportModal.close());
  document.getElementById('confirmReport').addEventListener('click', () => { reportModal.close(); endMeet('left_early'); });
}

function setupDirectChat() {
  const collapsed = document.getElementById('directChatCollapsed');
  const panel = document.getElementById('directChatPanel');
  const input = document.getElementById('directChatInput');
  const sendBtn = document.getElementById('directChatSendBtn');

  const togglePanel = () => {
    if (!state.directChats.length) return;
    const isExpanded = panel.classList.contains('expanded');
    if (!state.activeDirectChatId) state.activeDirectChatId = state.directChats[0].id;
    setDirectChatExpanded(!isExpanded);
  };

  const sendMessage = () => {
    const text = input.value.trim();
    if (!text) return;
    const active = state.directChats.find((chat) => chat.id === state.activeDirectChatId) || state.directChats[0];
    if (!active) return toast('No direct chat available yet.');

    active.messages.push({
      id: uuid(),
      from: 'user',
      text,
      createdAt: new Date().toISOString()
    });
    active.updatedAt = new Date().toISOString();
    state.directChats = [active, ...state.directChats.filter((chat) => chat.id !== active.id)];
    state.activeDirectChatId = active.id;
    input.value = '';
    renderDirectChatCollapsed();
    renderDirectChatHistory();
  };

  collapsed.addEventListener('click', togglePanel);
  collapsed.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePanel();
    }
  });
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  renderDirectChatCollapsed();
  renderConnectionsList();
  setDirectChatExpanded(false);
}

// Reflection flow
function onMeetEnd(meetId, userId, reason) {
  openReflectionModal(meetId, userId, reason);
}

function openReflectionModal(meetId, userId, reason) {
  state.currentReflection = { meetId, userId, reason, vibe: 0, tags: [] };
  const vibe = document.getElementById('vibePicker');
  vibe.innerHTML = '';
  ['😕','🙂','😊','😁','🤩'].forEach((emoji, i) => {
    const c = document.createElement('button');
    c.className = 'chip'; c.type = 'button'; c.textContent = emoji;
    c.addEventListener('click', () => { state.currentReflection.vibe = i + 1; [...vibe.children].forEach(x=>x.classList.remove('active')); c.classList.add('active'); });
    vibe.appendChild(c);
  });
  const chips = document.getElementById('feedbackChips');
  chips.innerHTML = '';
  FEEDBACK_TAGS.forEach((tag) => {
    const c = document.createElement('button');
    c.className='chip'; c.type='button'; c.textContent=tag;
    c.addEventListener('click', () => {
      if (c.classList.contains('active')) {
        c.classList.remove('active');
        state.currentReflection.tags = state.currentReflection.tags.filter((t) => t !== tag);
      } else if (state.currentReflection.tags.length < 3) {
        c.classList.add('active');
        state.currentReflection.tags.push(tag);
      } else toast('Max 3 feedback tags.');
    });
    chips.appendChild(c);
  });
  document.getElementById('meetOutcome').value = '';
  document.getElementById('reflectionModal').showModal();
}

function updateReflectionStreak() {
  const days = [...new Set(state.reflectionHistory)].sort();
  const today = new Date();
  const dayMs = 86400000;
  let streak = 0;
  let misses = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - i * dayMs).toISOString().slice(0, 10);
    if (days.includes(d)) streak++;
    else misses++;
    if (misses >= 2) break;
  }
  state.streak = streak;
}

function computeTrustScore(userId) {
  const refs = db.meet_reflections.filter((r) => r.user_id === userId);
  const positive = refs.filter((r) => r.vibe_score >= 4).length;
  const earlyExits = refs.filter((r) => r.meet_outcome === 'pass').length;
  const score = Math.max(0, Math.min(100, 50 + positive * 8 - earlyExits * 12));
  const idx = db.trust_score.findIndex((x) => x.user_id === userId);
  if (idx >= 0) db.trust_score[idx].score = score; else db.trust_score.push({ user_id: userId, score });
  return score;
}
function getTrustScore(userId){ return db.trust_score.find((x)=>x.user_id===userId)?.score ?? 50; }
function applyCooldownsIfNeeded(userId){ if (getTrustScore(userId) < 30) { state.requireReflection = true; toast('Trust cooldown applied.'); } }


async function syncTrustScoreFromApi() {
  if (!USE_BACKEND) return;
  const trust = await apiClient.getTrustScore(getUserId());
  const idx = db.trust_score.findIndex((x) => x.user_id === trust.user_id);
  const entry = { user_id: trust.user_id, score: trust.score, cooldown_applied: trust.cooldown_applied };
  if (idx >= 0) db.trust_score[idx] = entry;
  else db.trust_score.push(entry);
}

function setupReflectionSubmit() {
  document.getElementById('submitReflection').addEventListener('click', async () => {
    const outcome = document.getElementById('meetOutcome').value;
    if (!state.currentReflection.vibe || !OUTCOME_VALUES.includes(outcome)) return toast('Vibe rating and outcome are required.');

    const payload = {
      meet_id: state.currentReflection.meetId,
      user_id: state.currentReflection.userId,
      vibe_score: state.currentReflection.vibe,
      feedback_tags: state.currentReflection.tags,
      meet_outcome: outcome
    };
    const res = await apiClient.submitMeetReflection(payload);
    if (!res.success) return toast('Could not submit reflection.');

    addXp(XP_REWARDS.completeReflection, 'Reflection submitted');
    if (payload.feedback_tags.length >= 2) addXp(XP_REWARDS.detailedFeedback, 'Detailed feedback');

    const day = new Date().toISOString().slice(0, 10);
    if (!state.reflectionHistory.includes(day)) {
      state.reflectionHistory.push(day);
      updateReflectionStreak();
      addXp(XP_REWARDS.dailyReflectionStreak, 'Daily reflection streak');
    }

    state.meetCount += 1;
    if (state.meetCount < 3) forceReflectionBeforeNextMeet(); else state.requireReflection = false;

    if (USE_BACKEND) await syncTrustScoreFromApi();
    else computeTrustScore(getUserId());
    applyCooldownsIfNeeded(getUserId());

    document.getElementById('reflectionModal').close();
    emitEvent('REFLECTION_SUBMITTED', payload);
    toast('Reflection submitted. Thanks!');
    saveState();
    refreshStats();
  });
}

function setupDashboardData() {
  renderNotifications();
  document.getElementById('dailyPromptQuestion').textContent = DAILY_PROMPT.question;
  document.getElementById('saveDailyPrompt').addEventListener('click', async () => {
    const ans = document.getElementById('dailyPromptAnswer').value.trim();
    if (!ans) return toast('Please enter an answer.');
    await apiClient.submitDailyPromptAnswer({ prompt_id: DAILY_PROMPT.id, user_id: getUserId(), answer: ans });
    emitEvent('DAILY_PROMPT_COMPLETED', { prompt_id: DAILY_PROMPT.id });
    addXp(5, 'Daily prompt');
    saveState();
  });

  const weekly = document.getElementById('weeklyIntent');
  const saved = db.user_weekly_intent.find((x) => x.user_id === getUserId());
  if (saved) weekly.value = saved.intent;
  document.getElementById('saveWeeklyIntent').addEventListener('click', async () => {
    const intent = weekly.value;
    await apiClient.submitWeeklyIntent({ user_id: getUserId(), intent });
    document.getElementById('weeklyIntentSaved').textContent = `Saved: ${intent}`;
    emitEvent('WEEKLY_INTENT_SET', { intent });
  });

  const prev = state.dailyPromptAnswers[DAILY_PROMPT.id];
  if (prev) document.getElementById('dailyPromptAnswer').value = prev;
}

function setupThemeAndReset() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const t = document.getElementById('themeToggle');
  t.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  t.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    t.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    saveState();
  });
  document.getElementById('resetBtn').addEventListener('click', () => { Object.values(STORAGE).forEach((k) => localStorage.removeItem(k)); location.reload(); });
}

setupTabs();
setupThemeAndReset();
const wizardControls = setupWizard();
setupAccountAuth(wizardControls);
setupMeet();
setupDirectChat();
setupReflectionSubmit();
setupDashboardData();
loadConnections();
refreshStats();
saveState();
