// ── Command definitions ─────────────────────────
const COMMANDS = [
  {
    id: 'draft_reply',
    patterns: ['draft', 'reply', 'respond', 'write back'],
    label: 'Draft reply',
    hint: 'Draft a reply to an email',
    icon: '✉',
    action: (input) => {
      window.location.href = `email-logs.html?draft=${encodeURIComponent(input)}`;
    }
  },
  {
    id: 'schedule_meeting',
    patterns: ['schedule', 'meeting', 'call', 'zoom', 'book'],
    label: 'Schedule meeting',
    hint: 'Create a new meeting or call',
    icon: '📅',
    action: (input) => {
      window.location.href = `schedule.html?create=${encodeURIComponent(input)}`;
    }
  },
  {
    id: 'add_task',
    patterns: ['task', 'todo', 'remind', 'add', 'create task'],
    label: 'Add task',
    hint: 'Add a task to your work board',
    icon: '✓',
    action: (input) => {
      window.location.href = `work.html?task=${encodeURIComponent(input)}`;
    }
  },
  {
    id: 'brief_me',
    patterns: ['brief', 'summary', 'whats up', "what's happening", 'catch me up'],
    label: 'Brief me',
    hint: 'Get your daily AI briefing',
    icon: '◉',
    action: () => {
      window.location.href = 'dashboard.html?brief=1';
    }
  },
  {
    id: 'find_email',
    patterns: ['find', 'search', 'look for', 'show me'],
    label: 'Find email',
    hint: 'Search your inbox',
    icon: '⌕',
    action: (input) => {
      window.location.href = `email-logs.html?search=${encodeURIComponent(input)}`;
    }
  },
  {
    id: 'go_inbox',
    patterns: ['inbox', 'emails', 'messages'],
    label: 'Go to Inbox',
    hint: 'Open your inbox',
    icon: '→',
    action: () => { window.location.href = 'email-logs.html'; }
  },
  {
    id: 'go_work',
    patterns: ['work', 'tasks', 'approvals', 'board'],
    label: 'Go to Work Board',
    hint: 'Open the work board',
    icon: '→',
    action: () => { window.location.href = 'work.html'; }
  },
  {
    id: 'go_schedule',
    patterns: ['schedule', 'calendar', 'events', 'today'],
    label: 'Go to Schedule',
    hint: 'Open the schedule',
    icon: '→',
    action: () => { window.location.href = 'schedule.html'; }
  },
  {
    id: 'go_focus',
    patterns: ['focus', 'email focus', 'deep work', 'distraction'],
    label: 'Email Focus Mode',
    hint: 'Enter distraction-free email workspace',
    icon: '◎',
    action: () => { window.location.href = 'email-focus.html'; }
  },
  {
    id: 'go_stats',
    patterns: ['stats', 'analytics', 'patterns', 'report', 'who emails'],
    label: 'Email Analytics',
    hint: 'See email volume, senders, and patterns',
    icon: '📊',
    action: () => { window.location.href = 'email-stats.html'; }
  }
];

// ── Match engine ────────────────────────────────
function matchCommand(input) {
  if (!input || input.length < 2) return null;
  const lower = input.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const cmd of COMMANDS) {
    for (const pattern of cmd.patterns) {
      if (lower.includes(pattern)) {
        const score = pattern.length;
        if (score > bestScore) {
          bestScore = score;
          best = cmd;
        }
      }
    }
  }
  return best;
}

// ── Build HTML ──────────────────────────────────
function buildCommandCenter() {
  const overlay = document.createElement('div');
  overlay.id = 'nudgeCmdOverlay';
  overlay.innerHTML = `
    <div id="nudgeCmd" role="dialog" aria-label="Nudge Command Center">
      <div id="nudgeCmdHeader">
        <span id="nudgeCmdLogo">N</span>
        <input 
          id="nudgeCmdInput" 
          type="text" 
          placeholder="Ask Nudge anything — search, draft, schedule…"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd id="nudgeCmdEsc">ESC</kbd>
      </div>

      <div id="nudgeCmdPredict" class="hidden">
        <span id="nudgeCmdPredictIcon"></span>
        <span id="nudgeCmdPredictLabel"></span>
        <kbd>Tab</kbd>
        <span class="predict-confirm">to confirm</span>
      </div>

      <div id="nudgeCmdResults"></div>

      <div id="nudgeCmdFooter">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>↵</kbd> execute</span>
        <span><kbd>Tab</kbd> predict</span>
        <span><kbd>ESC</kbd> close</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById('nudgeCmdInput');
  const predict = document.getElementById('nudgeCmdPredict');
  const predictIcon = document.getElementById('nudgeCmdPredictIcon');
  const predictLabel = document.getElementById('nudgeCmdPredictLabel');
  const results = document.getElementById('nudgeCmdResults');
  let selectedIndex = -1;
  let currentMatch = null;

  // Show all commands on empty input
  function showAllCommands() {
    results.innerHTML = COMMANDS.slice(0, 6).map((cmd, i) => `
      <div class="cmd-item" data-index="${i}" data-id="${cmd.id}">
        <span class="cmd-item-icon">${cmd.icon}</span>
        <div class="cmd-item-info">
          <span class="cmd-item-label">${cmd.label}</span>
          <span class="cmd-item-hint">${cmd.hint}</span>
        </div>
      </div>
    `).join('');
    bindResultClicks();
  }

  function updateResults(val) {
    currentMatch = matchCommand(val);

    if (!val) {
      predict.classList.add('hidden');
      showAllCommands();
      return;
    }

    if (currentMatch) {
      predictIcon.textContent = currentMatch.icon;
      predictLabel.textContent = currentMatch.label;
      predict.classList.remove('hidden');
    } else {
      predict.classList.add('hidden');
    }

    // Filter commands
    const lower = val.toLowerCase();
    const filtered = COMMANDS.filter(cmd =>
      cmd.patterns.some(p => p.includes(lower) || lower.includes(p)) ||
      cmd.label.toLowerCase().includes(lower) ||
      cmd.hint.toLowerCase().includes(lower)
    );

    if (!filtered.length) {
      results.innerHTML = `
        <div class="cmd-empty">
          <span>Ask Nudge AI: "${val}"</span>
          <button class="cmd-ask-btn" id="cmdAskNudge">Ask Nudge AI →</button>
        </div>`;
      document.getElementById('cmdAskNudge')?.addEventListener('click', () => {
        closeCmd();
        window.location.href = `ai.html?q=${encodeURIComponent(val)}`;
      });
      return;
    }

    results.innerHTML = filtered.map((cmd, i) => `
      <div class="cmd-item" data-index="${i}" data-id="${cmd.id}">
        <span class="cmd-item-icon">${cmd.icon}</span>
        <div class="cmd-item-info">
          <span class="cmd-item-label">${cmd.label}</span>
          <span class="cmd-item-hint">${cmd.hint}</span>
        </div>
      </div>
    `).join('');
    bindResultClicks();
  }

  function bindResultClicks() {
    results.querySelectorAll('.cmd-item').forEach(item => {
      item.addEventListener('click', () => {
        const cmd = COMMANDS.find(c => c.id === item.dataset.id);
        if (cmd) { closeCmd(); cmd.action(input.value); }
      });
      item.addEventListener('mouseenter', () => {
        results.querySelectorAll('.cmd-item').forEach(x => x.classList.remove('selected'));
        item.classList.add('selected');
        selectedIndex = parseInt(item.dataset.index);
      });
    });
  }

  input.addEventListener('input', () => {
    selectedIndex = -1;
    updateResults(input.value);
  });

  input.addEventListener('keydown', e => {
    const items = results.querySelectorAll('.cmd-item');

    if (e.key === 'Tab') {
      e.preventDefault();
      if (currentMatch) { closeCmd(); currentMatch.action(input.value); }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      items.forEach((x, i) => x.classList.toggle('selected', i === selectedIndex));
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      items.forEach((x, i) => x.classList.toggle('selected', i === selectedIndex));
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        const id = items[selectedIndex].dataset.id;
        const cmd = COMMANDS.find(c => c.id === id);
        if (cmd) { closeCmd(); cmd.action(input.value); }
      } else if (currentMatch) {
        closeCmd(); currentMatch.action(input.value);
      }
    }

    if (e.key === 'Escape') closeCmd();
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeCmd();
  });

  showAllCommands();
  setTimeout(() => input.focus(), 50);
}

// ── Open / Close ────────────────────────────────
function openCmd() {
  if (document.getElementById('nudgeCmdOverlay')) {
    document.getElementById('nudgeCmdOverlay').remove();
  }
  buildCommandCenter();
  document.getElementById('nudgeCmdOverlay').classList.add('open');
  document.body.classList.add('cmd-open');
}

function closeCmd() {
  const overlay = document.getElementById('nudgeCmdOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 200);
  }
  document.body.classList.remove('cmd-open');
}

// ── Global keyboard shortcut ────────────────────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const overlay = document.getElementById('nudgeCmdOverlay');
    if (overlay) closeCmd(); else openCmd();
  }
});

// ── Expose globally ─────────────────────────────
window.NudgeCommand = { open: openCmd, close: closeCmd };
