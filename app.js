const STORAGE = {
  profile: 'witProfile', xp: 'witXp', streak: 'witStreak', badges: 'witBadges', theme: 'witTheme',
  meetCount: 'witMeetCount', reflectionHistory: 'witReflectionHistory', weeklyIntent: 'witWeeklyIntent', dailyPromptAnswers:'witDailyPromptAnswers', trust:'witTrust'
};

const XP_REWARDS = { completeReflection: 20, detailedFeedback: 10, dailyReflectionStreak: 5 };
const OUTCOME_VALUES = ['again', 'maybe', 'pass'];
const FEEDBACK_TAGS = ['Good listener', 'Interesting ideas', 'Respectful', 'Funny', 'Too quiet', 'Off-topic'];
const DAILY_PROMPT = { id: 'dp-001', question: 'What value guided one decision you made today?', category: 'values' };

const db = {
  meet_reflections: [], // {id,meet_id,user_id,vibe_score,meet_outcome,feedback_tags,created_at}
  daily_prompt: [DAILY_PROMPT],
  user_weekly_intent: [], // {user_id, intent}
  trust_score: [] // {user_id, score}
};

const state = {
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
  notifications: []
};

const prompts = [
  'Your house catches fire. After saving loved ones and pets, what one item do you save and why?',
  'If you could relive one day in your life, which would it be and why?',
  'What hobby should everyone try at least once?'
];

function saveState() {
  localStorage.setItem(STORAGE.profile, JSON.stringify(state.profile));
  localStorage.setItem(STORAGE.xp, String(state.xp));
  localStorage.setItem(STORAGE.streak, String(state.streak));
  localStorage.setItem(STORAGE.badges, JSON.stringify(state.badges));
  localStorage.setItem(STORAGE.theme, state.theme);
  localStorage.setItem(STORAGE.meetCount, String(state.meetCount));
  localStorage.setItem(STORAGE.reflectionHistory, JSON.stringify(state.reflectionHistory));
  localStorage.setItem(STORAGE.dailyPromptAnswers, JSON.stringify(state.dailyPromptAnswers));
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
  return state.profile?.nickname || 'anonymous_user';
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

  if (state.profile) {
    fillFormFromProfile();
    showSavedState();
  } else {
    showCreateState();
  }

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
    addXp(10, 'Profile saved');
    saveState();
    showSavedState();
  });
  updateWizardUI();
  form.dispatchEvent(new Event('input'));
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

function renderNotifications() {
  const list = document.getElementById('notificationList');
  const notice = document.getElementById('accountRequestNotice');
  if (!state.notifications.length) {
    notice.textContent = 'No new question requests yet.';
    list.textContent = 'No notifications.';
    return;
  }
  notice.textContent = `${state.notifications.length} notification(s)`;
  list.innerHTML = '';
  state.notifications.forEach((n) => {
    const row = document.createElement('div');
    row.className = 'notification-item';
    row.textContent = `${n.sender} • Answer: "${n.answer}" • Status: ${n.status}`;
    list.appendChild(row);
  });
}

function renderIncomingRequest() {
  const incomingCard = document.getElementById('incomingRequestCard');
  const incomingSummary = document.getElementById('incomingRequestSummary');
  const pending = state.notifications.find((x) => x.status === 'Pending');
  if (!pending) {
    state.activeRequest = null;
    incomingCard.classList.add('hidden');
    renderNotifications();
    return;
  }
  state.activeRequest = pending;
  incomingSummary.textContent = `Question asked by ${pending.sender}: "${pending.prompt}" • Submitted answer: "${pending.answer}" • Status: ${pending.status}`;
  incomingCard.classList.remove('hidden');
  renderNotifications();
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
  document.getElementById('requestChatCard').classList.add('hidden');
  renderIncomingRequest();
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
  document.getElementById('requestChatCard').classList.add('hidden');
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
    const notification = { id: uuid(), sender: getUserId(), prompt: currentPrompt, answer, status: 'Pending' };
    state.notifications.unshift(notification);
    state.activeRequest = notification;
    state.requestStatus = 'sent';
    clearInterval(state.timer);
    resetMeetTimerUI();

    hideAnswerInput();
    document.getElementById('respondPromptBtn').disabled = true;
    updateRequestStatus('Request sent successfully. Waiting for receiver action.', true);
    renderIncomingRequest();
    addXp(5, 'Prompt response');
  });
  const reportModal = document.getElementById('reportModal');
  document.getElementById('reportBtn').addEventListener('click', () => reportModal.showModal());
  document.getElementById('cancelReport').addEventListener('click', () => reportModal.close());
  document.getElementById('confirmReport').addEventListener('click', () => { reportModal.close(); endMeet('left_early'); });
  document.getElementById('acceptRequestBtn').addEventListener('click', () => {
    if (!state.activeRequest) return;
    state.activeRequest.status = 'Accepted';
    document.getElementById('incomingRequestSummary').textContent = `Accepted question from ${state.activeRequest.sender}: "${state.activeRequest.prompt}" • Sender answer: "${state.activeRequest.answer}"`;
    renderNotifications();
    const chatLog = document.getElementById('requestChatLog');
    chatLog.textContent = `${state.activeRequest.sender}: ${state.activeRequest.answer}`;
    document.getElementById('requestChatCard').classList.remove('hidden');
    updateRequestStatus('Receiver accepted the request. Typing chat opened.', true);
    document.getElementById('incomingRequestCard').classList.add('hidden');

    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
    const chatTab = document.querySelector('.tab[data-tab="community"]');
    if (chatTab) chatTab.classList.add('active');
    document.getElementById('community').classList.add('active');
  });

  document.getElementById('rejectRequestBtn').addEventListener('click', () => {
    if (!state.activeRequest) return;
    state.activeRequest.status = 'Rejected';
    document.getElementById('incomingRequestCard').classList.add('hidden');
    document.getElementById('requestChatCard').classList.add('hidden');
    updateRequestStatus('Receiver rejected the request.', true);
    state.activeRequest = null;
    renderIncomingRequest();
  });

  document.getElementById('sendChatReplyBtn').addEventListener('click', () => {
    const input = document.getElementById('requestChatInput');
    const text = input.value.trim();
    if (!text) return toast('Type a reply message first.');
    const chatLog = document.getElementById('requestChatLog');
    chatLog.textContent += `
Receiver: ${text}`;
    input.value = '';
  });
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

async function mockApiPost(path, body) {
  if (path === '/api/meet_reflections') {
    db.meet_reflections.push({ id: uuid(), ...body, created_at: new Date().toISOString() });
    return { success: true };
  }
  if (path === '/api/daily_prompts/answers') {
    state.dailyPromptAnswers[body.prompt_id] = body.answer;
    return { success: true };
  }
  if (path === '/api/weekly_intent') {
    const idx = db.user_weekly_intent.findIndex((x) => x.user_id === body.user_id);
    if (idx >= 0) db.user_weekly_intent[idx] = body; else db.user_weekly_intent.push(body);
    return { success: true };
  }
  return { success: false };
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
    const res = await mockApiPost('/api/meet_reflections', payload);
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

    computeTrustScore(getUserId());
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
  renderIncomingRequest();
  document.getElementById('dailyPromptQuestion').textContent = DAILY_PROMPT.question;
  document.getElementById('saveDailyPrompt').addEventListener('click', async () => {
    const ans = document.getElementById('dailyPromptAnswer').value.trim();
    if (!ans) return toast('Please enter an answer.');
    await mockApiPost('/api/daily_prompts/answers', { prompt_id: DAILY_PROMPT.id, user_id: getUserId(), answer: ans });
    emitEvent('DAILY_PROMPT_COMPLETED', { prompt_id: DAILY_PROMPT.id });
    addXp(5, 'Daily prompt');
    saveState();
  });

  const weekly = document.getElementById('weeklyIntent');
  const saved = db.user_weekly_intent.find((x) => x.user_id === getUserId());
  if (saved) weekly.value = saved.intent;
  document.getElementById('saveWeeklyIntent').addEventListener('click', async () => {
    const intent = weekly.value;
    await mockApiPost('/api/weekly_intent', { user_id: getUserId(), intent });
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
setupWizard();
setupMeet();
setupReflectionSubmit();
setupDashboardData();
refreshStats();
saveState();
