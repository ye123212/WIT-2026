const storageKeys = {
  profile: 'witProfile', xp: 'witXp', streak: 'witStreak', badges: 'witBadges', quests: 'witQuests', theme: 'witTheme'
};

const allBadges = [
  { name: 'Great Listener 🧠', cond: (s) => s.xp >= 60 },
  { name: 'Consistency Star 🔥', cond: (s) => s.streak >= 2 },
  { name: 'Deep Diver 🌊', cond: (s) => s.profile?.depth === 'Deep' },
  { name: 'Community Connector 🤝', cond: (s) => s.xp >= 140 }
];

const state = {
  profile: JSON.parse(localStorage.getItem(storageKeys.profile) || 'null'),
  xp: Number(localStorage.getItem(storageKeys.xp) || 0),
  streak: Number(localStorage.getItem(storageKeys.streak) || 0),
  badges: JSON.parse(localStorage.getItem(storageKeys.badges) || '[]'),
  theme: localStorage.getItem(storageKeys.theme) || 'light',
  quests: JSON.parse(localStorage.getItem(storageKeys.quests) || 'null') || [
    { id: 1, text: 'Share your favorite song today', done: false, reward: 20 },
    { id: 2, text: 'Recommend a book or movie', done: false, reward: 20 },
    { id: 3, text: 'Ask a values-based question', done: false, reward: 20 }
  ],
  wizardStep: 1,
  match: null,
  matchSeconds: 0,
  timer: null,
  activity: ['Welcome to WIT Friends!']
};

const prompts = [
  'Your house catches fire. After saving loved ones and pets, what one item do you save and why?',
  'If you could relive one day in your life, which would it be and why?',
  'What hobby should everyone try at least once?',
  'What value do you protect even when inconvenient?',
  'What makes you feel truly understood?'
];

const offLimitTopics = ['Politics', 'Religion', 'Finances', 'Family', 'Mental Health'];
const microPrefs = ['1:1 only', 'Small groups', 'Long-term', 'Quick replies', 'Voice notes'];

const rooms = [
  { name: 'Travel Lounge', interest: 'Travel', members: 42, when: 'Today 7:00 PM', cost: 'Free', status: 'Active' },
  { name: 'Values Debate', interest: 'Values', members: 18, when: 'Fri 8:30 PM', cost: 'Free', status: 'Upcoming' },
  { name: 'Music Share Hour', interest: 'Music', members: 27, when: 'Sat 6:00 PM', cost: 'Free', status: 'Active' },
  { name: 'Curiosity Circle', interest: 'Values', members: 60, when: 'Now', cost: 'Free', status: 'Full' }
];

function saveState() {
  localStorage.setItem(storageKeys.profile, JSON.stringify(state.profile));
  localStorage.setItem(storageKeys.xp, String(state.xp));
  localStorage.setItem(storageKeys.streak, String(state.streak));
  localStorage.setItem(storageKeys.badges, JSON.stringify(state.badges));
  localStorage.setItem(storageKeys.quests, JSON.stringify(state.quests));
  localStorage.setItem(storageKeys.theme, state.theme);
}

function toast(message) {
  const n = document.createElement('div');
  n.className = 'toast';
  n.textContent = message;
  document.getElementById('toastRoot').appendChild(n);
  setTimeout(() => n.remove(), 3500);
}

function confettiBurst() {
  const c = document.getElementById('confetti');
  c.classList.remove('hidden');
  c.classList.remove('confetti');
  void c.offsetWidth;
  c.classList.add('confetti');
  setTimeout(() => c.classList.add('hidden'), 1100);
}

function addActivity(item) {
  state.activity.unshift(item);
  state.activity = state.activity.slice(0, 8);
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  feed.innerHTML = '';
  state.activity.forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    feed.appendChild(li);
  });
}

function levelFromXp() { return Math.floor(state.xp / 100) + 1; }

function addXp(amount, reason) {
  const beforeLvl = levelFromXp();
  state.xp += amount;
  const afterLvl = levelFromXp();
  toast(`+${amount} XP • ${reason}`);
  if (afterLvl > beforeLvl) {
    state.streak += 1;
    toast('Companion leveled up ✨');
    confettiBurst();
  }
  refreshStats();
  refreshGamification();
  unlockBadges();
  saveState();
}

function unlockBadges() {
  allBadges.forEach((b) => {
    if (b.cond(state) && !state.badges.includes(b.name)) {
      state.badges.push(b.name);
      toast(`Badge unlocked: ${b.name}`);
      addActivity(`Unlocked badge: ${b.name}`);
    }
  });
  renderBadges();
}

function refreshStats() {
  document.getElementById('xpStat').textContent = `XP ${state.xp}`;
  document.getElementById('streakStat').textContent = `🔥 ${state.streak}`;
  document.getElementById('streakBig').textContent = state.streak;
}

function refreshGamification() {
  const current = state.xp % 100;
  document.getElementById('xpFill').style.width = `${current}%`;
  document.getElementById('levelLabel').textContent = `Level ${levelFromXp()} • ${current}/100 XP`;
  const level = levelFromXp();
  document.getElementById('companionLevel').textContent = `Level ${level} Companion`;
  document.getElementById('companion').textContent = level < 3 ? '🐣' : level < 5 ? '🐥' : '🦄';
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((n) => n.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((n) => n.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

function summarizeProfile(profile) {
  const humorous = Number(profile.humor) > 60 ? 'humorous' : 'serious';
  const direct = Number(profile.directness) > 60 ? 'direct' : 'indirect';
  return `${profile.avatar} ${profile.nickname || 'User'} prefers ${profile.depth?.toLowerCase() || 'moderate'} conversation, ${humorous} tone, and ${direct} style. ` +
    `Priorities: empathy ${profile.valueEmpathy || 0}, creativity ${profile.valueCreativity || 0}. Off-limits: ${profile.offLimits || 'none'}.`;
}

function updateLivePreview(form) {
  const draft = Object.fromEntries(new FormData(form).entries());
  document.getElementById('livePreview').textContent = summarizeProfile(draft);
  if (state.wizardStep === 4) document.getElementById('profileSummary').textContent = summarizeProfile(draft);
}

function updateWizardButtons(form) {
  const requiredFilled = form.elements.nickname.value.trim() && form.elements.ageRange.value;
  document.getElementById('wizardNext').disabled = state.wizardStep === 1 && !requiredFilled;
}

function updateWizardUI(form) {
  document.querySelectorAll('.wizard-step').forEach((step) => {
    step.classList.toggle('hidden', Number(step.dataset.step) !== state.wizardStep);
  });
  document.getElementById('wizardProgress').style.width = `${(state.wizardStep / 4) * 100}%`;
  document.getElementById('wizardBack').disabled = state.wizardStep === 1;
  document.getElementById('wizardNext').classList.toggle('hidden', state.wizardStep === 4);
  document.getElementById('wizardSubmit').classList.toggle('hidden', state.wizardStep !== 4);
  updateWizardButtons(form);
}

function bindChips(rootId, items, hiddenName) {
  const root = document.getElementById(rootId);
  const hidden = document.querySelector(`input[name="${hiddenName}"]`);
  const selected = new Set((hidden.value || '').split(',').map((s) => s.trim()).filter(Boolean));
  root.innerHTML = '';
  items.forEach((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chip ${selected.has(name) ? 'active' : ''}`;
    b.textContent = name;
    b.addEventListener('click', () => {
      if (selected.has(name)) selected.delete(name); else selected.add(name);
      b.classList.toggle('active');
      hidden.value = Array.from(selected).join(',');
    });
    root.appendChild(b);
  });
}

function setupWizard() {
  const form = document.getElementById('profileWizard');
  bindChips('offLimitsChips', offLimitTopics, 'offLimits');
  bindChips('microPrefs', microPrefs, 'microPrefs');

  if (state.profile) {
    Object.entries(state.profile).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
    document.querySelectorAll('.avatar-item').forEach((a) => a.classList.toggle('selected', a.dataset.avatar === state.profile.avatar));
  }

  document.querySelectorAll('.avatar-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-item').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      form.elements.avatar.value = btn.dataset.avatar;
      updateLivePreview(form);
    });
  });

  form.querySelectorAll('input[type="range"]').forEach((slider) => {
    const out = document.querySelector(`[data-output="${slider.name}"]`);
    if (out) out.textContent = slider.value;
    slider.addEventListener('input', () => {
      if (out) out.textContent = slider.value;
      updateLivePreview(form);
    });
  });

  form.addEventListener('input', () => {
    updateWizardButtons(form);
    updateLivePreview(form);
  });

  document.getElementById('wizardNext').addEventListener('click', () => {
    if (state.wizardStep === 1 && !(form.elements.nickname.value.trim() && form.elements.ageRange.value)) {
      toast('Complete nickname and age range first.');
      return;
    }
    state.wizardStep = Math.min(4, state.wizardStep + 1);
    updateWizardUI(form);
    updateLivePreview(form);
  });

  document.getElementById('wizardBack').addEventListener('click', () => {
    state.wizardStep = Math.max(1, state.wizardStep - 1);
    updateWizardUI(form);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.profile = Object.fromEntries(new FormData(form).entries());
    addXp(20, 'Profile setup complete');
    toast('Profile saved. You can now meet someone!');
    confettiBurst();
    addActivity('Completed onboarding wizard');
    saveState();
  });

  updateWizardUI(form);
  updateLivePreview(form);
}

function formatClock(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

function ringUpdate(seconds) {
  const total = 60;
  const pct = Math.min(seconds / total, 1);
  const c = 327;
  const ring = document.getElementById('ringProgress');
  ring.style.strokeDashoffset = String(c - c * pct);
  ring.style.stroke = seconds < 20 ? '#50E3C2' : seconds < 40 ? '#F5A623' : '#ef4444';
}

function startMatch() {
  if (!state.profile) return toast('Please finish account setup first.');
  state.match = { alias: 'SkyLumen', prompt: 0 };
  state.matchSeconds = 0;
  document.getElementById('anonAvatar').textContent = '👤';
  document.getElementById('matchStatus').textContent = 'Matched anonymously with SkyLumen';
  document.getElementById('sharedTraits').textContent = 'Empathy, Humor, Travel';
  document.getElementById('currentPrompt').textContent = prompts[0];
  document.getElementById('decisionGate').classList.add('hidden');
  document.getElementById('friendReveal').classList.add('hidden');
  document.getElementById('respondPromptBtn').disabled = false;
  document.getElementById('reportBtn').disabled = false;
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.matchSeconds += 1;
    document.getElementById('chatTimer').textContent = formatClock(state.matchSeconds);
    ringUpdate(state.matchSeconds);
    if ([20, 40, 60].includes(state.matchSeconds)) {
      document.getElementById('decisionGate').classList.remove('hidden');
      document.getElementById('matchStatus').textContent = `Checkpoint at ${(state.matchSeconds / 20) * 10} min`;
      toast('Checkpoint reached. Choose whether to reveal profiles.');
    }
  }, 1000);
}

function endMatch() {
  clearInterval(state.timer);
  state.timer = null;
  document.getElementById('respondPromptBtn').disabled = true;
  document.getElementById('reportBtn').disabled = true;
}

function setupMatchFlow() {
  document.getElementById('startMatchBtn').addEventListener('click', startMatch);
  document.getElementById('respondPromptBtn').addEventListener('click', () => {
    if (!state.match) return;
    state.match.prompt = (state.match.prompt + 1) % prompts.length;
    document.getElementById('currentPrompt').textContent = prompts[state.match.prompt];
    document.getElementById('promptPanel').classList.add('bump');
    setTimeout(() => document.getElementById('promptPanel').classList.remove('bump'), 180);
    addXp(15, 'Meaningful response');
    addActivity('Answered a guided prompt');
  });

  document.getElementById('emojiLike').addEventListener('click', () => toast('Reaction sent 👍'));
  document.getElementById('emojiHeart').addEventListener('click', () => toast('Reaction sent 💙'));
  document.getElementById('promptRating').addEventListener('change', (e) => toast(`Prompt rated ${e.target.value}`));

  const modal = document.getElementById('reportModal');
  document.getElementById('reportBtn').addEventListener('click', () => modal.showModal());
  document.getElementById('cancelReport').addEventListener('click', () => modal.close());
  document.getElementById('confirmReport').addEventListener('click', () => {
    modal.close();
    document.getElementById('matchStatus').textContent = 'Reported and blocked safely.';
    addActivity('Reported and blocked a user');
    endMatch();
  });

  document.querySelectorAll('#decisionGate [data-decision]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!state.match) return;
      const choice = btn.dataset.decision;
      if (choice === 'yes') {
        addXp(40, 'Mutual reveal');
        const reveal = document.getElementById('friendReveal');
        reveal.classList.remove('hidden');
        reveal.innerHTML = `<strong>Friendship created 🎉</strong><p>You and ${state.match.alias} revealed profiles and unlocked friend chat.</p>`;
        document.getElementById('matchStatus').textContent = 'Profiles revealed. You are now friends.';
        confettiBurst();
        addActivity('Matched and revealed profiles');
        endMatch();
      } else if (choice === 'notyet') {
        document.getElementById('matchStatus').textContent = 'Continuing anonymously...';
        document.getElementById('decisionGate').classList.add('hidden');
      } else {
        document.getElementById('matchStatus').textContent = 'Chat ended.';
        endMatch();
      }
    });
  });
}

function renderQuests() {
  const root = document.getElementById('dailyQuests');
  root.innerHTML = '';
  state.quests.forEach((q) => {
    const li = document.createElement('li');
    li.innerHTML = `${q.text} <button class="btn ${q.done ? 'ghost' : 'primary'}" ${q.done ? 'disabled' : ''}>${q.done ? 'Done' : `+${q.reward} XP`}</button>`;
    li.querySelector('button').addEventListener('click', () => {
      if (q.done) return;
      q.done = true;
      addXp(q.reward, 'Quest complete');
      confettiBurst();
      addActivity(`Completed quest: ${q.text}`);
      renderQuests();
      saveState();
    });
    root.appendChild(li);
  });
}

function renderBadges() {
  const root = document.getElementById('badgeList');
  root.innerHTML = '';
  allBadges.forEach((badge) => {
    const chip = document.createElement('span');
    const earned = state.badges.includes(badge.name);
    chip.className = `badge ${earned ? 'earned' : 'locked'}`;
    chip.title = earned ? 'Earned' : 'Locked';
    chip.textContent = badge.name;
    root.appendChild(chip);
  });
}

function renderRooms() {
  const interest = document.getElementById('roomFilter').value;
  const status = document.getElementById('roomStatus').value;
  const root = document.getElementById('roomGrid');
  root.innerHTML = '';

  const filtered = rooms.filter((r) => (interest === 'all' || r.interest === interest) && (status === 'all' || r.status === status));
  if (!filtered.length) {
    root.innerHTML = '<article class="card"><p class="small">No rooms active for this filter yet.</p></article>';
    return;
  }

  filtered.forEach((room) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `<h3>${room.name}</h3><p class="small">👥 ${room.members} • 🕒 ${room.when} • ${room.cost}</p><p class="small">Status: ${room.status} • QR: ▣▣▢▣</p><button class="btn primary" type="button">Join Room</button>`;
    card.querySelector('button').addEventListener('click', () => {
      addXp(10, `Joined ${room.name}`);
      addActivity(`Joined room: ${room.name}`);
      toast(`Joined ${room.name}`);
    });
    root.appendChild(card);
  });
}

function setupCommunity() {
  document.getElementById('roomFilter').addEventListener('change', renderRooms);
  document.getElementById('roomStatus').addEventListener('change', renderRooms);
  renderRooms();
  document.getElementById('joinCodeRoom').addEventListener('click', () => {
    const code = document.getElementById('roomCodeInput').value.trim();
    document.getElementById('codeRoomResult').textContent = code ? `Joined room ${code.toUpperCase()} successfully.` : 'Please enter a room code.';
    if (code) {
      addXp(5, 'Joined by code');
      addActivity(`Joined private room ${code.toUpperCase()}`);
    }
  });
  addActivity('Community rooms loaded');
}

function setupDashboard() {
  const visibility = document.getElementById('privacyVisibility');
  const anon = document.getElementById('anonToggle');
  const summary = document.getElementById('privacySummary');
  const update = () => summary.textContent = `Visibility: ${visibility.value}. Anonymous mode: ${anon.checked ? 'ON' : 'OFF'}.`;
  visibility.addEventListener('change', update);
  anon.addEventListener('change', update);
  update();

  document.getElementById('dailyPromptBtn').addEventListener('click', () => {
    addXp(10, 'Daily prompt reward');
    addActivity('Claimed daily prompt reward');
  });

  const chart = document.getElementById('activityChart');
  [30, 52, 24, 60, 78, 46, 70].forEach((v) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${v}%`;
    chart.appendChild(bar);
  });

  let secs = 7200;
  setInterval(() => {
    secs = Math.max(0, secs - 1);
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    document.getElementById('rewardCountdown').textContent = `${h}:${m}:${s}`;
  }, 1000);
}

function setupTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const t = document.getElementById('themeToggle');
  t.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  t.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    t.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    saveState();
  });
}

function setupReset() {
  document.getElementById('resetBtn').addEventListener('click', () => {
    Object.values(storageKeys).forEach((k) => localStorage.removeItem(k));
    location.reload();
  });
}

setupTabs();
setupTheme();
setupWizard();
setupMatchFlow();
setupCommunity();
setupDashboard();
setupReset();
refreshStats();
refreshGamification();
renderQuests();
renderBadges();
unlockBadges();
saveState();
