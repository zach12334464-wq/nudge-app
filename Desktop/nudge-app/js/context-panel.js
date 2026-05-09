// This renders the context panel UI that appears
// when user clicks any email, task, or approval.
// It shows everything connected to that item.

const NudgeContextPanel = (function() {

  function build() {
    const panel = document.createElement('div');
    panel.id = 'contextPanel';
    panel.innerHTML = `
      <div id="contextPanelHeader">
        <span id="contextPanelTitle">Context</span>
        <button id="contextPanelClose">×</button>
      </div>
      <div id="contextPanelThread"></div>
      <div id="contextPanelRelated"></div>
      <div id="contextPanelAI">
        <div id="ctxAISuggestions"></div>
        <div id="ctxAIInputRow">
          <input 
            id="ctxAIInput"
            type="text"
            placeholder="Ask Nudge to do something…"
            autocomplete="off"
          />
          <button id="ctxAISend">→</button>
        </div>
        <div id="ctxAIResult" class="hidden"></div>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('contextPanelClose')
      .addEventListener('click', close);
  }

  function open(itemId, label) {
    const panel = document.getElementById('contextPanel');
    if (!panel) return;

    const related = NudgeContext.getRelated(itemId);
    const threadsList = NudgeContext.getThreadsForItem(itemId);

    document.getElementById('contextPanelTitle')
      .textContent = label || 'Context';

    // Render threads this item belongs to
    const threadEl = document.getElementById('contextPanelThread');
    if (threadsList.length) {
      threadEl.innerHTML = `
        <div class="ctx-section-label">Connected threads</div>
        ${threadsList.map(t => `
          <div class="ctx-thread-tag">
            <span class="ctx-thread-dot"></span>
            ${t.label}
            <span class="ctx-thread-count">
              ${t.items.length} items
            </span>
          </div>
        `).join('')}
      `;
    } else {
      threadEl.innerHTML = `
        <div class="ctx-empty">
          No connected threads found
        </div>`;
    }

    // Render related items
    const relatedEl = document.getElementById('contextPanelRelated');
    if (related.length) {
      relatedEl.innerHTML = `
        <div class="ctx-section-label">Related items</div>
        ${related.map(item => `
          <div class="ctx-related-item" 
               data-type="${item._type}"
               data-id="${item._id}">
            <span class="ctx-related-type-badge 
                         ${item._type}">
              ${typeLabel(item._type)}
            </span>
            <div class="ctx-related-info">
              <span class="ctx-related-title">
                ${item.subject || item.title || 
                  item.sender || 'Item'}
              </span>
              <span class="ctx-related-sub">
                ${item.snippet || item.body || 
                  item.hint || ''}
              </span>
            </div>
            <span class="ctx-related-arrow">→</span>
          </div>
        `).join('')}
      `;

      // Click related items to navigate
      relatedEl.querySelectorAll('.ctx-related-item')
        .forEach(el => {
          el.addEventListener('click', () => {
            const type = el.dataset.type;
            const pages = {
              email: 'email-logs.html',
              task: 'work.html',
              approval: 'work.html',
              event: 'schedule.html'
            };
            if (pages[type]) {
              window.location.href = 
                `${pages[type]}?highlight=${el.dataset.id}`;
            }
          });
        });

      const suggestionsByType = {
        email: [
          'Draft a reply',
          'Summarize this email',
          'Create a meeting',
          'Add task to work board'
        ],
        task: [
          'Mark as in progress',
          'Set high priority',
          'Schedule time for this',
          'Summarize related emails'
        ],
        approval: [
          'Summarize what needs approval',
          'Draft a response',
          'Add to work board',
          'Schedule a review meeting'
        ],
        event: [
          'Summarize related emails',
          'Create follow-up task',
          'Draft meeting agenda',
          'Add task from this event'
        ]
      };

      // Detect type from related items or default to email
      const dominantType = related.length 
        ? related[0]._type 
        : 'email';

      const suggestions = suggestionsByType[dominantType] 
        || suggestionsByType.email;

      const suggestionsEl = document.getElementById('ctxAISuggestions');
      if (suggestionsEl) {
        suggestionsEl.innerHTML = suggestions.map(s => `
          <button class="ctx-chip" data-prompt="${s}">
            ${s}
          </button>
        `).join('');

        suggestionsEl.querySelectorAll('.ctx-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            document.getElementById('ctxAIInput').value = 
              chip.dataset.prompt;
            handleCtxAI(label, chip.dataset.prompt);
          });
        });
      }
    } else {
      relatedEl.innerHTML = `
        <div class="ctx-empty">
          No related items yet
        </div>`;
    }

    panel.classList.add('open');
    document.body.classList.add('ctx-panel-open');
  }

  function close() {
    const panel = document.getElementById('contextPanel');
    if (panel) panel.classList.remove('open');
    document.body.classList.remove('ctx-panel-open');
  }

  function typeLabel(type) {
    return { 
      email: 'Email', 
      task: 'Task', 
      approval: 'Approval',
      event: 'Event' 
    }[type] || type;
  }

  async function handleCtxAI(itemLabel, prompt) {
    const resultEl = document.getElementById('ctxAIResult');
    const inputEl = document.getElementById('ctxAIInput');
    if (!resultEl) return;

    resultEl.classList.remove('hidden');
    resultEl.innerHTML = `
      <div class="ctx-ai-loading">
        <span class="ctx-ai-dot"></span>
        Nudge is working…
      </div>`;

    const lower = prompt.toLowerCase();

    // ── Route by intent ─────────────────────────

    // Add to work board
    if (lower.includes('task') || 
        lower.includes('work board') || 
        lower.includes('add')) {
      const task = {
        id: 'task_ctx_' + Date.now(),
        title: itemLabel,
        priority: 'medium',
        status: 'todo',
        source: 'nudge-ai',
        tags: ['Nudge AI'],
        assignee: 'You'
      };
      const existing = JSON.parse(
        localStorage.getItem('nudge_tasks') || '[]'
      );
      existing.unshift(task);
      localStorage.setItem(
        'nudge_tasks', JSON.stringify(existing)
      );
      resultEl.innerHTML = `
        <div class="ctx-ai-response">
          <div class="ctx-ai-response-label">Done</div>
          Added "<strong>${itemLabel}</strong>" to your 
          Work Board as a medium priority task.
          <a href="work.html" class="ctx-ai-link">
            View Work Board →
          </a>
        </div>`;
      inputEl.value = '';
      return;
    }

    // Schedule a meeting / create calendar event
    if (lower.includes('meeting') || 
        lower.includes('calendar') || 
        lower.includes('schedule')) {
      const event = {
        id: 'evt_' + Date.now(),
        title: 'Meeting re: ' + itemLabel,
        date: new Date().toISOString().split('T')[0],
        start: '10:00',
        end: '10:30',
        source: 'nudge-ai',
        color: '#0a0a0a'
      };
      const existing = JSON.parse(
        localStorage.getItem('nudge_events') || '[]'
      );
      existing.unshift(event);
      localStorage.setItem(
        'nudge_events', JSON.stringify(existing)
      );
      resultEl.innerHTML = `
        <div class="ctx-ai-response">
          <div class="ctx-ai-response-label">Done</div>
          Meeting "<strong>re: ${itemLabel}</strong>" 
          added to your schedule for today at 10:00am.
          <a href="schedule.html" class="ctx-ai-link">
            View Schedule →
          </a>
        </div>`;
      inputEl.value = '';
      return;
    }

    // Draft a reply / draft response
    if (lower.includes('draft') || 
        lower.includes('reply') || 
        lower.includes('response')) {
      resultEl.innerHTML = `
        <div class="ctx-ai-response">
          <div class="ctx-ai-response-label">
            Draft ready
          </div>
          <div class="ctx-ai-draft">
Hi,

Thank you for reaching out regarding 
"${itemLabel}". I wanted to follow up and 
confirm I've reviewed this. I'll get back 
to you with a full response shortly.

Best regards
          </div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button class="ctx-action-btn" 
              onclick="navigator.clipboard.writeText(
                document.querySelector('.ctx-ai-draft')
                  .textContent.trim()
              );showToast('Copied to clipboard')">
              Copy draft
            </button>
            <a href="email-logs.html" class="ctx-action-btn"
               style="text-decoration:none;
                      text-align:center;">
              Go to inbox →
            </a>
          </div>
        </div>`;
      inputEl.value = '';
      return;
    }

    // Summarize
    if (lower.includes('summarize') || 
        lower.includes('summary')) {
      resultEl.innerHTML = `
        <div class="ctx-ai-response">
          <div class="ctx-ai-response-label">Summary</div>
          This item is connected to 
          ${document.querySelectorAll('.ctx-related-item')
            .length} related items across your workspace. 
          It was flagged as requiring your attention and 
          has pending actions associated with it.
          Check the related items above for full context.
        </div>`;
      inputEl.value = '';
      return;
    }

    // Mark as in progress
    if (lower.includes('in progress') || 
        lower.includes('mark')) {
      resultEl.innerHTML = `
        <div class="ctx-ai-response">
          <div class="ctx-ai-response-label">Updated</div>
          Task moved to In Progress on your Work Board.
          <a href="work.html" class="ctx-ai-link">
            View Work Board →
          </a>
        </div>`;
      inputEl.value = '';
      return;
    }

    // Fallback
    resultEl.innerHTML = `
      <div class="ctx-ai-response">
        <div class="ctx-ai-response-label">Nudge</div>
        I can help with: drafting a reply, creating a 
        meeting, adding a task, or summarizing this item.
        Try one of the suggestions above.
      </div>`;
    inputEl.value = '';
  }

  // ── Wire send button and enter key
  setTimeout(() => {
    const sendBtn = document.getElementById('ctxAISend');
    const inputEl = document.getElementById('ctxAIInput');
    if (sendBtn && inputEl) {
      sendBtn.addEventListener('click', () => {
        const val = inputEl.value.trim();
        if (val) handleCtxAI(
          document.getElementById('contextPanelTitle')
            .textContent, val
        );
      });
      inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const val = inputEl.value.trim();
          if (val) handleCtxAI(
            document.getElementById('contextPanelTitle')
              .textContent, val
          );
        }
      });
    }
  }, 100);

  build();
  return { open, close };
})();
