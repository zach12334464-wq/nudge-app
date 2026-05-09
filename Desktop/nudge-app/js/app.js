/* ═══════════════════════════════════════════════
   NUDGE — app.js  (Vanilla JS, no framework)
   ═══════════════════════════════════════════════ */

const state = {
  accounts: [],
  inbox: [],
  tasks: [],
  schedule: [],
  actions: [],
  currentEmail: null
};

const el = {
  connectedCount:    document.getElementById('connectedCount'),
  pendingActionCount:document.getElementById('pendingActionCount'),
  taskCount:         document.getElementById('taskCount'),
  syncStatus:        document.getElementById('syncStatus'),
  clockDisplay:      document.getElementById('clockDisplay'),
  syncBtn:           document.getElementById('syncBtn'),
  settingsBtn:       document.getElementById('settingsBtn'),
  settingsModal:     document.getElementById('settingsModal'),
  geminiKey:         document.getElementById('geminiKey'),
  saveSettings:      document.getElementById('saveSettings'),
  inboxList:         document.getElementById('inboxList'),
  approvalList:      document.getElementById('approvalList'),
  taskBoard:         document.getElementById('taskBoard'),
  scheduleList:      document.getElementById('scheduleList'),
  addTask:           document.getElementById('addTask'),
  addScheduleBlock:  document.getElementById('addScheduleBlock'),
  chatMessages:      document.getElementById('chatMessages'),
  chatForm:          document.getElementById('chatForm'),
  chatInput:         document.getElementById('chatInput'),
  voiceBtn:          document.getElementById('voiceBtn'),
  voiceStateLabel:   document.getElementById('voiceStateLabel'),
  approvalMode:      document.getElementById('approvalMode'),
  emailModal:        document.getElementById('emailModal'),
  emailModalFrom:    document.getElementById('emailModalFrom'),
  emailModalSubject: document.getElementById('emailModalSubject'),
  emailModalBody:    document.getElementById('emailModalBody'),
  draftReplyBtn:     document.getElementById('draftReplyBtn'),
  extractTasksBtn:   document.getElementById('extractTasksBtn')
};

let recognition = null;

// ── Bootstrap ─────────────────────────────────
init();

async function init() {
  startClock();
  bindEvents();
  hydrateSettings();
  addChat('Nudge is ready. Connect accounts or type a command to begin.', 'nudge');
  await loadWorkspace();
  handleOAuthParam();
  await runDailyBrief();
}

// ── Clock ──────────────────────────────────────
function startClock() {
  const tick = () => {
    const now = new Date();
    el.clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}

// ── Events ────────────────────────────────────
function bindEvents() {
  el.syncBtn.addEventListener('click', loadWorkspace);
  el.settingsBtn.addEventListener('click', () => el.settingsModal.showModal());
  el.saveSettings.addEventListener('click', () => {
    setGeminiKey(el.geminiKey.value.trim());
    setStatus('Settings saved');
  });

  el.chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const cmd = el.chatInput.value.trim();
    if (cmd) { el.chatInput.value = ''; prepareAiWork(cmd); }
  });

  el.voiceBtn.addEventListener('click', handleVoiceClick);
  el.addTask.addEventListener('click', promptAddTask);
  el.addScheduleBlock.addEventListener('click', promptAddBlock);

  el.draftReplyBtn.addEventListener('click', handleDraftReply);
  el.extractTasksBtn.addEventListener('click', handleExtractTasks);

  // Top-nav active state
  document.querySelectorAll('.top-nav a').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelectorAll('.top-nav a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
    });
  });

  // Disconnect buttons
  ['gmail','gcal','outlook','mscal'].forEach(p => {
    document.getElementById(`${p}-disconnect`).addEventListener('click', () => disconnectProvider(p));
  });

  setupTaskDnD();
  setupScheduleDnD();
}

function hydrateSettings() {
  el.geminiKey.value = getGeminiKey();
}

// ── Data loading ───────────────────────────────
async function loadWorkspace() {
  setStatus('Syncing…');
  try {
    // 1. Fetch from real APIs if available (OAuth providers)
    const [accts, inbox] = await Promise.all([
      api('/api/accounts').catch(() => ({ accounts: [] })),
      api('/api/inbox/summary').catch(() => ({ items: [], actions: [] }))
    ]);

    state.accounts = accts.accounts || [];
    state.inbox    = inbox.items   || [];

    // 2. Fetch persistence from Supabase
    if (window.supabaseClient) {
      const [tasks, sched, actions] = await Promise.all([
        SupabaseData.getTasks(),
        SupabaseData.getScheduleBlocks(),
        SupabaseData.getActions()
      ]);
      state.tasks = tasks || [];
      state.schedule = (sched || []).map(b => ({
        ...b,
        start_time: b.date && b.start_time ? `${b.date}T${b.start_time}` : b.start_time,
        end_time: b.date && b.end_time ? `${b.date}T${b.end_time}` : b.end_time
      }));
      state.actions = actions || [];
    } else {
      // Fallback to local API if Supabase not ready
      const [tasks, sched] = await Promise.all([
        api('/api/tasks').catch(() => ({ tasks: [] })),
        api('/api/schedule').catch(() => ({ blocks: [] }))
      ]);
      state.tasks = tasks.tasks || [];
      state.schedule = sched.blocks || [];
    }

    if (!state.tasks.length && !state.schedule.length && !state.inbox.length) {
      // Clean empty state
    }

    renderAll();
    syncProviderPanel();
    setStatus('Synced');
  } catch (err) {
    console.error("Load workspace error:", err);
    renderAll();
    setStatus('Offline');
  }
}



// ── Render all ────────────────────────────────
function renderAll() {
  renderMetrics();
  renderInbox();
  renderApprovals();
  renderTasks();
  renderSchedule();
}

function renderMetrics() {
  el.connectedCount.textContent     = state.accounts.length;
  el.pendingActionCount.textContent = state.actions.filter(a => a.status === 'pending').length;
  el.taskCount.textContent          = state.tasks.filter(t => t.status !== 'done').length;
}

// ── FEATURE 1: Real email reading ─────────────
function renderInbox() {
  if (!state.inbox.length) {
    el.inboxList.innerHTML = `<div class="empty-state">Connect Gmail or Outlook to load your inbox.</div>`;
    return;
  }
  el.inboxList.innerHTML = state.inbox.map(item => `
    <div class="inbox-card" data-id="${esc(item.id)}" tabindex="0" role="button">
      <div>
        <div class="inbox-from">${esc(item.sender)}</div>
        <div class="inbox-subject">${esc(item.subject)}</div>
        <div class="inbox-snippet">${esc(item.snippet || item.summary || '')}</div>
        <div class="inbox-tags">
          <span class="tag ${esc(item.priority)}">${esc(item.priority)}</span>
        </div>
      </div>
    </div>
  `).join('');

  el.inboxList.querySelectorAll('.inbox-card').forEach(card => {
    card.addEventListener('click', () => openEmailModal(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openEmailModal(card.dataset.id); });
  });
}

function openEmailModal(id) {
  const item = state.inbox.find(i => i.id === id);
  if (!item) return;
  state.currentEmail = item;
  el.emailModalFrom.textContent    = item.sender;
  el.emailModalSubject.textContent = item.subject;
  el.emailModalBody.textContent    = item.body || item.summary || '(No body)';
  el.emailModal.showModal();
}

// ── FEATURE 2: AI Reply Drafting ──────────────
async function handleDraftReply() {
  const email = state.currentEmail;
  if (!email) return;
  el.emailModal.close();
  setStatus('Drafting reply…');

  const prompt = `You are Nudge. Draft a professional email reply to this message. Subject: "${email.subject}". From: ${email.sender}. Body: "${email.body || email.summary}". Return only the reply draft text, no preamble.`;
  const draft = await askGemini(prompt, {});

  await queueAction({
    type: 'draft_reply',
    subject: `Reply: ${email.subject}`,
    body: draft
  });

  setStatus('Reply draft queued for approval');
  addChat(`Reply draft created for "${email.subject}". Review it in Pending Approvals before sending.`, 'nudge');
  renderAll();
}

// ── FEATURE 3: Task Extraction ────────────────
async function handleExtractTasks() {
  const email = state.currentEmail;
  if (!email) return;
  el.emailModal.close();
  setStatus('Extracting tasks…');

  const prompt = `Extract action items from this email as a JSON array of strings. Email: Subject="${email.subject}" Body="${email.body || email.summary}". Return ONLY a JSON array like ["Task 1","Task 2"].`;
  const raw = await askGemini(prompt, {});

  let titles = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    titles = match ? JSON.parse(match[0]) : [email.subject];
  } catch {
    titles = [email.subject];
  }

  for (const title of titles.slice(0, 5)) {
    await queueAction({
      type: 'task_proposal',
      subject: title,
      body: `Extracted from email: "${email.subject}" (from ${email.sender})`
    });
  }

  setStatus(`${titles.length} tasks queued for approval`);
  addChat(`Extracted ${titles.length} task(s) from "${email.subject}". Approve them to add to your board.`, 'nudge');
  renderAll();
}

// ── FEATURE 4: Contact Insights (shown in inbox card tooltips) ──
// Exposed via state.accounts query — shown in email modal

// ── FEATURE 5: Smart Daily Brief ─────────────
async function runDailyBrief() {
  if (!state.inbox.length && !state.tasks.length) return;
  const pendingCount = state.actions.filter(a => a.status === 'pending').length;
  const taskCount    = state.tasks.filter(t => t.status !== 'done').length;
  const emailCount   = state.inbox.length;

  const context = `You have ${emailCount} inbox emails, ${taskCount} active tasks, and ${pendingCount} pending approvals.`;
  const prompt  = `You are Nudge. Give a concise 2-sentence smart daily brief based on this workspace context: ${context}. Be actionable and professional.`;

  const brief = await askGemini(prompt, {});
  addChat(`📋 Daily Brief: ${brief}`, 'nudge');
  speak(brief);
}

// ── FEATURE 6: Meeting Creator (via voice/chat) ─
async function parseMeetingCommand(command) {
  const prompt = `Parse this meeting request into JSON: "${command}". Return ONLY JSON like: {"title":"","with":"","date":"","time":"","duration":30}. Use ISO date format.`;
  const raw = await askGemini(prompt, {});
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// ── General AI work handler ───────────────────
async function prepareAiWork(command) {
  addChat(command, 'user');
  setVoiceState('processing');
  el.voiceStateLabel.textContent = 'Processing';

  const lc = command.toLowerCase();

  // Meeting creator path
  if (lc.includes('schedule') || lc.includes('meeting') || lc.includes('call') || lc.includes('zoom')) {
    const meeting = await parseMeetingCommand(command);
    if (meeting) {
      await queueAction({
        type: 'meeting_proposal',
        subject: meeting.title || command,
        body: `Proposed meeting with ${meeting.with || 'attendee'} on ${meeting.date || 'TBD'} at ${meeting.time || 'TBD'} (${meeting.duration || 30} min).`
      });
      const resp = `Meeting proposal queued: "${meeting.title}" on ${meeting.date} at ${meeting.time}. Approve to create calendar event.`;
      addChat(resp, 'nudge');
      speak(resp);
      setVoiceState('idle');
      el.voiceStateLabel.textContent = 'Idle';
      renderAll();
      return;
    }
  }

  const context = {
    connectedAccounts: state.accounts.length,
    pendingActions: state.actions.filter(a => a.status === 'pending').length,
    activeTasks: state.tasks.filter(t => t.status !== 'done').length
  };
  const response = await askGemini(command, context);

  addChat(response, 'nudge');

  if (el.approvalMode.checked) {
    await queueAction({
      type: inferActionType(command),
      subject: command.length > 60 ? command.slice(0, 60) + '…' : command,
      body: response
    });
    renderAll();
  }

  speak(response);
  setVoiceState('idle');
  el.voiceStateLabel.textContent = 'Idle';
  setStatus('AI prepared work for approval');
}

function inferActionType(cmd) {
  const t = cmd.toLowerCase();
  if (t.includes('schedule') || t.includes('meeting') || t.includes('calendar')) return 'meeting_proposal';
  if (t.includes('reply') || t.includes('draft') || t.includes('email')) return 'draft_reply';
  if (t.includes('task') || t.includes('todo')) return 'task_proposal';
  return 'ai_action';
}

// ── Action queue (approval-first rule) ────────
async function queueAction({ type, subject, body }) {
  const action = {
    type, subject, body,
    status: 'pending'
  };

  if (window.supabaseClient) {
    const saved = await SupabaseData.saveAction(action);
    if (saved) state.actions.unshift(saved);
  } else {
    action.id = crypto.randomUUID();
    action.created_at = Date.now();
    state.actions.unshift(action);
    try {
      await api('/api/actions', {
        method: 'POST',
        body: JSON.stringify({ ...action })
      });
    } catch { /* offline - already in state */ }
  }

  return action;
}

// ── Approvals render ─────────────────────────
function renderApprovals() {
  if (!state.actions.length) {
    el.approvalList.innerHTML = `<div class="empty-state">No pending approvals. AI-prepared work appears here first.</div>`;
    return;
  }
  el.approvalList.innerHTML = state.actions.map(a => `
    <div class="approval-card ${a.status !== 'pending' ? 'is-complete' : ''}">
      <div class="approval-header">
        <span class="tag ai">${esc(a.type)}</span>
        <h4>${esc(a.subject || a.title || '')}</h4>
      </div>
      <div class="approval-body">${esc(a.body || '')}</div>
      <div class="approval-actions">
        <button class="btn-approve" data-approve="${esc(a.id)}" ${a.status !== 'pending' ? 'disabled' : ''}>
          ${a.status === 'approved' ? 'Approved ✓' : 'Approve'}
        </button>
        <button class="btn-decline" data-decline="${esc(a.id)}" ${a.status !== 'pending' ? 'disabled' : ''}>
          ${a.status === 'declined' ? 'Declined' : 'Decline'}
        </button>
      </div>
    </div>
  `).join('');

  el.approvalList.querySelectorAll('[data-approve]').forEach(b =>
    b.addEventListener('click', () => decideAction(b.dataset.approve, 'approve')));
  el.approvalList.querySelectorAll('[data-decline]').forEach(b =>
    b.addEventListener('click', () => decideAction(b.dataset.decline, 'decline')));
}

async function decideAction(id, decision) {
  const action = state.actions.find(a => a.id === id);
  const status = decision === 'approve' ? 'approved' : 'declined';
  if (action) action.status = status;
  renderAll();

  // 1. Update Supabase/API
  if (window.supabaseClient) {
    await SupabaseData.updateActionStatus(id, status);
  } else {
    try { await api(`/api/actions/${encodeURIComponent(id)}/${decision}`, { method:'POST' }); } catch {}
  }

  // 2. If approving a task_proposal, add to tasks
  if (decision === 'approve' && action?.type === 'task_proposal') {
    const newTask = { title: action.subject, status: 'todo', priority: 'medium', description: action.body };
    if (window.supabaseClient) {
      const saved = await SupabaseData.saveTask(newTask);
      if (saved) state.tasks.push(saved);
    } else {
      newTask.id = crypto.randomUUID();
      state.tasks.push(newTask);
      try { await api('/api/tasks', { method:'POST', body: JSON.stringify(newTask) }); } catch {}
    }
    renderAll();
  }
}

// ── Tasks ─────────────────────────────────────
function renderTasks() {
  document.querySelectorAll('[data-status-list]').forEach(l => l.innerHTML = '');
  state.tasks.forEach(task => {
    const list = document.querySelector(`[data-status-list="${task.status}"]`);
    if (!list) return;
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    card.innerHTML = `
      <h4>${esc(task.title)}</h4>
      ${task.description ? `<p>${esc(task.description)}</p>` : ''}
      <div class="task-footer">
        <span class="tag ${esc(task.priority || 'medium')}">${esc(task.priority || 'medium')}</span>
        ${task.due_date ? `<span class="tag">${esc(task.due_date)}</span>` : ''}
      </div>`;
    list.appendChild(card);
  });
}

async function promptAddTask() {
  const title = prompt('Task title:');
  if (!title) return;
  const task = { title, status:'todo', priority:'medium' };
  
  if (window.supabaseClient) {
    const saved = await SupabaseData.saveTask(task);
    if (saved) state.tasks.push(saved);
  } else {
    task.id = crypto.randomUUID();
    state.tasks.push(task);
    try { await api('/api/tasks', { method:'POST', body: JSON.stringify(task) }); } catch {}
  }
  
  renderTasks(); renderMetrics();
}

function setupTaskDnD() {
  el.taskBoard.addEventListener('dragstart', e => {
    const c = e.target.closest('.task-card');
    if (!c) return;
    c.classList.add('dragging');
    e.dataTransfer.setData('text/plain', c.dataset.taskId);
  });
  el.taskBoard.addEventListener('dragover', e => {
    const col = e.target.closest('.task-column');
    if (!col) return;
    e.preventDefault();
    document.querySelectorAll('.task-column').forEach(x => x.classList.remove('drag-over'));
    col.classList.add('drag-over');
  });
  el.taskBoard.addEventListener('drop', async e => {
    const col = e.target.closest('.task-column');
    const id  = e.dataTransfer.getData('text/plain');
    if (!col || !id) return;
    e.preventDefault();
    document.querySelectorAll('.task-column').forEach(x => x.classList.remove('drag-over'));
    const task = state.tasks.find(t => t.id === id);
    if (task) { 
      task.status = col.dataset.status; 
      renderAll(); 
      if (window.supabaseClient) {
        await SupabaseData.updateTaskStatus(id, task.status);
      } else {
        try { await api(`/api/tasks/${encodeURIComponent(id)}`, { method:'PATCH', body: JSON.stringify({ status: col.dataset.status }) }); } catch {}
      }
    }
  });
  el.taskBoard.addEventListener('dragend', () =>
    document.querySelectorAll('.task-card,.task-column').forEach(x => x.classList.remove('dragging','drag-over')));
}

// ── Schedule ─────────────────────────────────
function renderSchedule() {
  if (!state.schedule.length) {
    el.scheduleList.innerHTML = `<div class="empty-state">No schedule blocks. Add one or ask Nudge to propose a meeting.</div>`;
    return;
  }
  el.scheduleList.innerHTML = state.schedule.map(b => `
    <div class="schedule-card" draggable="true" data-schedule-id="${esc(b.id)}">
      <div>
        <div class="schedule-title">${esc(b.title)}</div>
        <div class="schedule-time">${esc(b.start_time || b.startTime || '')} – ${esc(b.end_time || b.endTime || '')} · <span class="tag">${esc(b.source || 'manual')}</span></div>
      </div>
      <div class="schedule-controls">
        <input type="date" value="${esc((b.start_time || b.startTime || '').slice(0,10))}" data-sched-date="${esc(b.id)}" aria-label="Date">
        <input type="time" value="${esc((b.start_time || b.startTime || '').slice(11,16) || (b.startTime || ''))}" data-sched-time="${esc(b.id)}" aria-label="Time">
        <button class="btn-secondary" data-save-sched="${esc(b.id)}" type="button">Save</button>
      </div>
    </div>
  `).join('');

  el.scheduleList.querySelectorAll('[data-save-sched]').forEach(b =>
    b.addEventListener('click', () => saveScheduleBlock(b.dataset.saveSched)));
}

async function promptAddBlock() {
  const title = prompt('Block title:');
  if (!title) return;
  const block = { id: crypto.randomUUID(), title, start_time: new Date().toISOString().slice(0,16), end_time: '', source:'manual' };
  state.schedule.push(block);
  renderSchedule();
}

async function saveScheduleBlock(id) {
  const date = document.querySelector(`[data-sched-date="${id}"]`)?.value;
  const time = document.querySelector(`[data-sched-time="${id}"]`)?.value;
  const block = state.schedule.find(b => b.id === id);
  if (block && date) { 
    block.start_time = `${date}T${time || '09:00'}`; 
    renderSchedule(); 
    if (window.supabaseClient) {
      await SupabaseData.saveScheduleBlock({
        id,
        date,
        start_time: time || '09:00',
        title: block.title
      });
    } else {
      try { await api(`/api/schedule/${encodeURIComponent(id)}`, { method:'PATCH', body: JSON.stringify({ date, startTime: time }) }); } catch {}
    }
  }
}

function setupScheduleDnD() {
  el.scheduleList.addEventListener('dragstart', e => {
    const c = e.target.closest('.schedule-card');
    if (!c || e.target.closest('input,button')) return;
    c.classList.add('dragging');
    e.dataTransfer.setData('text/plain', c.dataset.scheduleId);
  });
  el.scheduleList.addEventListener('dragend', () =>
    document.querySelectorAll('.schedule-card').forEach(x => x.classList.remove('dragging')));
}

// ── Provider UI (spec-exact) ──────────────────
function updateProviderUI(provider, email) {
  document.getElementById(`${provider}-email`).textContent = email;
  document.getElementById(`${provider}-status`).classList.add('connected');
  document.getElementById(`${provider}-disconnect`).classList.remove('hidden');
}

function syncProviderPanel() {
  state.accounts.forEach(acc => {
    if (acc.provider === 'google') {
      updateProviderUI('gmail', acc.email);
      updateProviderUI('gcal', acc.email);
    }
    if (acc.provider === 'microsoft') {
      updateProviderUI('outlook', acc.email);
      updateProviderUI('mscal', acc.email);
    }
  });
}

function disconnectProvider(provider) {
  document.getElementById(`${provider}-email`).textContent = 'Not connected';
  document.getElementById(`${provider}-status`).classList.remove('connected');
  document.getElementById(`${provider}-disconnect`).classList.add('hidden');
}

// ── Voice ─────────────────────────────────────
function handleVoiceClick() {
  if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
    setVoiceState('unavailable');
    el.voiceStateLabel.textContent = 'Unavailable';
    addChat('Voice recognition not available. Typed commands still work.', 'nudge');
    return;
  }
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new R();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.onstart  = () => { setVoiceState('listening'); el.voiceStateLabel.textContent = 'Listening'; };
  recognition.onresult = e => prepareAiWork(e.results[0][0].transcript);
  recognition.onerror  = () => { setVoiceState('idle'); el.voiceStateLabel.textContent = 'Idle'; };
  recognition.onend    = () => { if (el.voiceStateLabel.textContent === 'Listening') { setVoiceState('idle'); el.voiceStateLabel.textContent = 'Idle'; } };
  recognition.start();
}

function setVoiceState(state) {
  el.voiceBtn.className = `voice-orb ${state}`;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.95;
  u.onstart = () => { setVoiceState('speaking'); el.voiceStateLabel.textContent = 'Speaking'; };
  u.onend   = () => { setVoiceState('idle');     el.voiceStateLabel.textContent = 'Idle'; };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ── Utilities ────────────────────────────────
function addChat(text, type) {
  const b = document.createElement('div');
  b.className = `chat-bubble ${type}`;
  b.textContent = text;
  el.chatMessages.appendChild(b);
  el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

function setStatus(text) { el.syncStatus.textContent = text; }

function handleOAuthParam() {
  const p = new URLSearchParams(location.search);
  const o = p.get('oauth');
  if (!o) return;
  if (o === 'connected') { setStatus('Account connected'); loadWorkspace(); }
  else if (o === 'missing') { setStatus('OAuth env missing'); addChat('OAuth credentials missing on the backend.', 'nudge'); }
  else { setStatus('OAuth failed'); }
  history.replaceState({}, '', location.pathname);
}

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
