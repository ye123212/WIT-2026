const storageKeys = {
  profile: 'witProfile',
  xp: 'witXp',
  streak: 'witStreak',
  badges: 'witBadges',
  quests: 'witQuests',
  theme: 'witTheme'
};

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
  timer: null
};

const prompts = [
  'Your house catches fire. After saving loved ones and pets, what one item do you save and why?',
  'If you could relive one day in your life, which would it be and why?',
  'What hobby should everyone try at least once?',
  'What value do you protect even when inconvenient?',
  'What makes you feel truly understood?'
];

const rooms = [
  { name: 'Travel Lounge', members: 42, when: 'Today 7:00 PM', cost: 'Free' },
  { name: 'Values Debate', members: 18, when: 'Fri 8:30 PM', cost: 'Free' },
  { name: 'Music Share Hour', members: 27, when: 'Sat 6:00 PM', cost: 'Free' }
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
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  document.getElementById('toastRoot').appendChild(node);
  setTimeout(() => node.remove(), 2600);
}

function levelFromXp() {
  return Math.floor(state.xp / 100) + 1;
}

function addXp(amount, reason) {
  state.xp += amount;
  if (reason) toast(`+${amount} XP • ${reason}`);
  if (state.xp % 100 < amount) {
    state.streak += 1;
    toast('Level up! Companion evolved ✨');
  }
  refreshStats();
  refreshGamification();
  unlockBadges();
  saveState();
}

function unlockBadges() {
  const available = [
    { name: 'Great Listener 🧠', cond: () => state.xp >= 60 },
    { name: 'Consistency Star 🔥', cond: () => state.streak >= 2 },
    { name: 'Deep Diver 🌊', cond: () => state.profile?.depth === 'Deep' },
    { name: 'Community Connector 🤝', cond: () => state.xp >= 140 }
  ];

  available.forEach((badge) => {
    if (badge.cond() && !state.badges.includes(badge.name)) {
      state.badges.push(badge.name);
      toast(`Badge unlocked: ${badge.name}`);
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

function updateWizardUI() {
  document.querySelectorAll('.wizard-step').forEach((step) => {
    step.classList.toggle('hidden', Number(step.dataset.step) !== state.wizardStep);
  });
  document.getElementById('wizardProgress').style.width = `${(state.wizardStep / 4) * 100}%`;
  document.getElementById('wizardBack').disabled = state.wizardStep === 1;
  document.getElementById('wizardNext').classList.toggle('hidden', state.wizardStep === 4);
  document.getElementById('wizardSubmit').classList.toggle('hidden', state.wizardStep !== 4);
  if (state.wizardStep === 4) renderProfileSummary();
}

function validateCurrentStep(form) {
  if (state.wizardStep !== 1) return true;
  const nickname = form.elements.nickname.value.trim();
  const age = form.elements.ageRange.value;
  if (!nickname || !age) {
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 250);
    toast('Complete nickname and age range to continue.');
    return false;
  }
  return true;
}

function summarizeProfile(profile) {
  const humor = Number(profile.humor) > 60 ? 'humorous' : 'serious';
  const direct = Number(profile.directness) > 60 ? 'direct' : 'indirect';
  return `${profile.avatar} ${profile.nickname} prefers ${profile.depth.toLowerCase()} conversations, ${humor} tone, ${direct} style. ` +
    `Top priorities: empathy ${profile.valueEmpathy}, creativity ${profile.valueCreativity}. Off-limits: ${profile.offLimits || 'none'}.`;
}

function renderProfileSummary() {
  const form = document.getElementById('profileWizard');
  const formData = new FormData(form);
  const profile = Object.fromEntries(formData.entries());
  document.getElementById('profileSummary').textContent = summarizeProfile(profile);
}

function setupWizard() {
  const form = document.getElementById('profileWizard');

  if (state.profile) {
    Object.entries(state.profile).forEach(([key, val]) => {
      if (form.elements[key]) form.elements[key].value = val;
    });
    document.querySelectorAll('.avatar-item').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.avatar === state.profile.avatar);
    });
  }

  document.querySelectorAll('.avatar-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-item').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      form.elements.avatar.value = btn.dataset.avatar;
    });
  });

  document.querySelectorAll('input[type="range"]').forEach((slider) => {
    const out = document.querySelector(`[data-output="${slider.name}"]`);
    if (out) out.textContent = slider.value;
    slider.addEventListener('input', () => {
      if (out) out.textContent = slider.value;
    });
  });

  document.getElementById('wizardNext').addEventListener('click', () => {
    if (!validateCurrentStep(form)) return;
    state.wizardStep = Math.min(4, state.wizardStep + 1);
    updateWizardUI();
  });

  document.getElementById('wizardBack').addEventListener('click', () => {
    state.wizardStep = Math.max(1, state.wizardStep - 1);
    updateWizardUI();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.profile = Object.fromEntries(new FormData(form).entries());
    addXp(20, 'Profile setup complete');
    toast('Profile saved. You can now meet someone!');
    saveState();
  });

  updateWizardUI();
}

function formatClock(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function ringUpdate(seconds) {
  const total = 60; // demo
  const pct = Math.min(seconds / total, 1);
  const circumference = 327;
  document.getElementById('ringProgress').style.strokeDashoffset = String(circumference - circumference * pct);
}

function startMatch() {
  if (!state.profile) {
    toast('Please finish account setup first.');
    return;
  }

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
    addXp(15, 'Meaningful response');
  });

  const modal = document.getElementById('reportModal');
  document.getElementById('reportBtn').addEventListener('click', () => modal.showModal());
  document.getElementById('cancelReport').addEventListener('click', () => modal.close());
  document.getElementById('confirmReport').addEventListener('click', () => {
    modal.close();
    document.getElementById('matchStatus').textContent = 'Reported and blocked safely.';
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
      renderQuests();
      saveState();
    });
    root.appendChild(li);
  });
}

function renderBadges() {
  const root = document.getElementById('badgeList');
  root.innerHTML = '';
  if (!state.badges.length) {
    root.textContent = 'No badges yet — keep engaging daily.';
    return;
  }
  state.badges.forEach((badge) => {
    const chip = document.createElement('span');
    chip.className = 'badge';
    chip.title = 'Earned through activity, consistency, or connection depth.';
    chip.textContent = badge;
    root.appendChild(chip);
  });
}

function renderRooms() {
  const root = document.getElementById('roomGrid');
  root.innerHTML = '';
  rooms.forEach((room) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <h3>${room.name}</h3>
      <p class="small">👥 ${room.members} members • 🕒 ${room.when} • ${room.cost}</p>
      <p class="small">QR: ▣▣▢▣</p>
      <button class="btn primary" type="button">Join Room</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      addXp(10, `Joined ${room.name}`);
      toast(`Joined ${room.name}`);
    });
    root.appendChild(card);
  });
}

function setupCommunity() {
  renderRooms();
  document.getElementById('joinCodeRoom').addEventListener('click', () => {
    const code = document.getElementById('roomCodeInput').value.trim();
    document.getElementById('codeRoomResult').textContent = code ? `Joined room ${code.toUpperCase()} successfully.` : 'Please enter a room code.';
    if (code) addXp(5, 'Joined by code');
  });
}

function setupDashboard() {
  const privacyVisibility = document.getElementById('privacyVisibility');
  const anonToggle = document.getElementById('anonToggle');
  const summary = document.getElementById('privacySummary');
  const update = () => {
    summary.textContent = `Visibility: ${privacyVisibility.value}. Anonymous mode: ${anonToggle.checked ? 'ON' : 'OFF'}.`;
  };
  privacyVisibility.addEventListener('change', update);
  anonToggle.addEventListener('change', update);
  update();

  document.getElementById('dailyPromptBtn').addEventListener('click', () => addXp(10, 'Daily prompt reward'));

  const chart = document.getElementById('activityChart');
  [30, 52, 24, 60, 78, 46, 70].forEach((v) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${v}%`;
    chart.appendChild(bar);
  });
}

function setupTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const toggle = document.getElementById('themeToggle');
  toggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  toggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    toggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    saveState();
  });
}

function setupReset() {
  document.getElementById('resetBtn').addEventListener('click', () => {
    Object.values(storageKeys).forEach((key) => localStorage.removeItem(key));
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
unlockBadges();
saveState();
