/* ═══════════════════════════════════════════════
   NUDGE — inbox2.js
   Reworked inbox: reading pane, meeting detection,
   reminders, alerts, Nudge AI triage
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  const esc = NudgeShared.esc;

  /* ── Inbox data ────────────────── */
  let inbox = [];

  /* ── State ─────────────────────────────── */
  let reminders = JSON.parse(localStorage.getItem('nudge_reminders') || '[]');
  let currentEmail = null;
  let currentFilter = 'all';
  let pendingCalEmail = null;

  async function loadInbox() {
    try {
      const res = await fetch('/api/inbox/summary');
      const data = await res.json();
      inbox = data.items || [];
    } catch (e) {
      inbox = [];
    }
    updatePill();
    renderList();
  }

  /* ── Render ─────────────────────────────── */
  loadInbox();
  startReminderChecker();

  /* ── Filter chips ───────────────────────── */
  document.querySelectorAll('.inb-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.inb-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderList();
    });
  });

  /* ── Search ─────────────────────────────── */
  document.getElementById('inboxSearch').addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    document.querySelectorAll('.email-card').forEach(card => {
      const em = inbox.find(e => e.id === card.dataset.id);
      const match = !q || em.sender.toLowerCase().includes(q) ||
        em.subject.toLowerCase().includes(q) || em.snippet.toLowerCase().includes(q);
      card.style.display = match ? '' : 'none';
    });
  });

  /* ── Nudge AI Triage ────────────────────── */
  document.getElementById('nudgeTriage').addEventListener('click', async () => {
    const btn = document.getElementById('nudgeTriage');
    btn.disabled = true;
    btn.innerHTML = '<span class="inb-spinner"></span> Triaging…';
    const prompt = `Triage these emails and return JSON array [{id, priority}]: ${JSON.stringify(inbox.map(e=>({id:e.id,sender:e.sender,subject:e.subject,snippet:e.snippet})))}. Priority: high/medium/low.`;
    try {
      const raw = await askGemini(prompt, {});
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        JSON.parse(match[0]).forEach(r => {
          const em = inbox.find(e => e.id === r.id);
          if (em) em.priority = r.priority;
        });
        renderList();
      }
    } catch {}
    btn.disabled = false;
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Nudge: Triage';
    showToast('✓', 'Triage complete', 'Emails re-prioritised by Nudge AI');
  });

  /* ── Render list ────────────────────────── */
  function renderList() {
    const list = document.getElementById('emailList');
    let filtered = inbox;
    if (currentFilter === 'unread') filtered = inbox.filter(e => e.unread);
    else if (currentFilter === 'high') filtered = inbox.filter(e => e.priority === 'high');
    else if (currentFilter === 'meeting') filtered = inbox.filter(e => e.meetingDate || (e.tags||[]).some(t=>t.toLowerCase().includes('meet')));
    else if (currentFilter === 'finance') filtered = inbox.filter(e => (e.tags||[]).some(t=>t.toLowerCase().includes('financ')));

    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state">No emails in this category.</div>';
      return;
    }

    const hasReminder = id => reminders.some(r => r.emailId === id);

    list.innerHTML = filtered.map(e => `
      <div class="email-card ${e.unread?'unread':''}" data-id="${esc(e.id)}">
        <div>
          <div class="email-sender">${esc(e.sender)}${hasReminder(e.id)?'<span class="inb-reminder-dot" title="Reminder set"></span>':''}</div>
          <div class="email-subject">${esc(e.subject)}</div>
          <div class="email-snippet">${esc(e.snippet)}</div>
          <div class="email-tags">
            <span class="tag ${esc(e.priority)}">${esc(e.priority)}</span>
            ${e.meetingDate ? '<span class="tag meeting">📅 Meeting</span>' : ''}
          </div>
        </div>
        <div class="email-meta-col">
          <span class="email-time">${esc(e.time)}</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.email-card').forEach(card => {
      card.addEventListener('click', () => openEmail(card.dataset.id));
    });
  }

  /* ── Open email (reading pane) ──────────── */
  function openEmail(id) {
    currentEmail = inbox.find(e => e.id === id);
    if (!currentEmail) return;
    const e = currentEmail;

    document.querySelectorAll('.email-card').forEach(c =>
      c.classList.toggle('active', c.dataset.id === id));

    const pane = document.getElementById('inbReadCol');

    pane.innerHTML = `
      <div class="inb-rp-header">
        <div class="inb-rp-from">${esc(e.sender)} &lt;${esc(e.address)}&gt; · ${esc(e.time)}</div>
        <div class="inb-rp-subject">${esc(e.subject)}</div>
        <div class="inb-rp-tags">
          <span class="tag ${esc(e.priority)}">${esc(e.priority)}</span>
          ${(e.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}
        </div>
      </div>
      ${e.meetingDate ? `
      <div class="inb-meeting-banner" id="meetingBanner">
        <div class="inb-meeting-icon">📅</div>
        <div class="inb-meeting-text">
          <div class="inb-meeting-title">Nudge AI detected a meeting request</div>
          <div class="inb-meeting-desc">Proposed: <strong>${formatDate(e.meetingDate)}</strong> — add to calendar?</div>
        </div>
        <div class="inb-meeting-actions">
          <button class="inb-meeting-btn" id="openCalModal">Add to Calendar</button>
          <button class="inb-meeting-dismiss" id="dismissMeeting">Dismiss</button>
        </div>
      </div>` : ''}
      <div class="inb-ai-banner" id="aiSummaryBanner">
        <div class="inb-ai-banner-label"><span class="inb-spinner"></span> Nudge AI is summarising…</div>
      </div>
      <div class="inb-rp-body">${esc(e.body)}</div>
      <div class="inb-rp-actions">
        <button class="btn-primary btn-sm" id="rpDraft">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          AI Draft Reply
        </button>
        <button class="btn-secondary btn-sm" id="rpExtract">Extract Tasks</button>
        <button class="btn-secondary btn-sm" id="rpReminder">🔔 Set Reminder</button>
        <button class="btn-secondary btn-sm" id="rpArchive">Archive</button>
        ${e.meetingDate ? `<button class="btn-secondary btn-sm" id="rpCalBtn">📅 Add to Calendar</button>` : ''}
      </div>
    `;

    // Wire buttons
    document.getElementById('rpDraft').addEventListener('click', () => openDraftModal(e));
    document.getElementById('rpExtract').addEventListener('click', () => extractTasks(e));
    document.getElementById('rpReminder').addEventListener('click', () => openReminderModal(e));
    document.getElementById('rpArchive').addEventListener('click', () => archiveEmail(id));
    document.getElementById('openCalModal')?.addEventListener('click', () => openCalModal(e));
    document.getElementById('dismissMeeting')?.addEventListener('click', () => {
      document.getElementById('meetingBanner')?.remove();
    });
    document.getElementById('rpCalBtn')?.addEventListener('click', () => openCalModal(e));

    // Auto AI summary
    autoSummarise(e);
  }

  async function autoSummarise(email) {
    const banner = document.getElementById('aiSummaryBanner');
    if (!banner) return;
    const prompt = `Summarise in 1-2 sentences and suggest ONE next action. Subject: "${email.subject}". Body: "${email.body}". Format: just the summary and action, no preamble.`;
    try {
      const result = await askGemini(prompt, {});
      banner.innerHTML = `<div class="inb-ai-banner-label">⚡ Nudge AI Summary</div>${esc(result)}`;
    } catch {
      banner.innerHTML = `<div class="inb-ai-banner-label">Nudge AI</div>Add your API key in settings to get AI summaries.`;
    }
  }

  /* ── Draft modal ────────────────────────── */
  function openDraftModal(email) {
    const modal = document.getElementById('draftModal');
    document.getElementById('draftSubject').textContent = 'Re: ' + email.subject;
    document.getElementById('draftMeta').textContent = `To: ${email.sender} <${email.address}>`;
    document.getElementById('draftBody').value = 'Drafting with Nudge AI…';
    modal.classList.add('open');

    const prompt = `Draft a professional, concise email reply. Subject: "${email.subject}". From: ${email.sender}. Body: "${email.body}". Return reply text only.`;
    askGemini(prompt, {}).then(draft => {
      const area = document.getElementById('draftBody');
      if (area) area.value = draft;
    }).catch(() => {
      const area = document.getElementById('draftBody');
      if (area) area.value = 'Add your API key in Settings to generate AI drafts.';
    });
  }

  document.getElementById('draftClose').addEventListener('click', () => document.getElementById('draftModal').classList.remove('open'));
  document.getElementById('draftCancel').addEventListener('click', () => document.getElementById('draftModal').classList.remove('open'));
  document.getElementById('draftApprove').addEventListener('click', () => {
    document.getElementById('draftModal').classList.remove('open');
    showToast('✉', 'Reply queued', 'Review and approve it on the Work Board.');
  });
  document.getElementById('draftRegen').addEventListener('click', () => {
    if (currentEmail) openDraftModal(currentEmail);
  });

  /* ── Extract tasks ──────────────────────── */
  async function extractTasks(email) {
    const prompt = `Extract action items as a JSON array of strings. Subject: "${email.subject}". Body: "${email.body}". Return ONLY a JSON array.`;
    try {
      const raw = await askGemini(prompt, {});
      const match = raw.match(/\[[\s\S]*\]/);
      const tasks = match ? JSON.parse(match[0]) : [email.subject];
      const existing = JSON.parse(localStorage.getItem('nudge_tasks') || '[]');
      tasks.slice(0,5).forEach(t => existing.unshift({ id:'task_'+Date.now()+Math.random(), title:t, priority:'medium', status:'todo', source:'inbox' }));
      localStorage.setItem('nudge_tasks', JSON.stringify(existing));
      showToast('✓', `${tasks.length} task(s) added`, 'Review them on the Work Board.');
    } catch {
      showToast('⚠', 'Could not extract tasks', 'Add your API key in Settings.');
    }
  }

  /* ── Archive ────────────────────────────── */
  function archiveEmail(id) {
    const card = document.querySelector(`.email-card[data-id="${id}"]`);
    if (card) { card.style.opacity='0'; card.style.transition='opacity 0.3s'; setTimeout(()=>card.remove(),300); }
    document.getElementById('inbReadCol').innerHTML = `
      <div class="inb-read-empty">
        <p style="font-size:24px;">✓</p>
        <p>Email archived</p>
      </div>`;
    currentEmail = null;
  }

  /* ── Calendar modal ─────────────────────── */
  function openCalModal(email) {
    pendingCalEmail = email;
    document.getElementById('calModalTitle').textContent = email.subject;
    document.getElementById('calModalDesc').textContent =
      `Nudge AI detected a meeting request from ${email.sender}. Would you like to add this to your calendar and send a confirmation?`;
    const dt = document.getElementById('calDate');
    dt.value = email.meetingDate || new Date().toISOString().slice(0,16);
    document.getElementById('calWith').value = email.sender;
    document.getElementById('calendarModal').classList.add('open');
  }

  document.getElementById('calModalClose').addEventListener('click', () => document.getElementById('calendarModal').classList.remove('open'));
  document.getElementById('calIgnore').addEventListener('click', () => {
    document.getElementById('calendarModal').classList.remove('open');
    document.getElementById('meetingBanner')?.remove();
  });

  document.getElementById('calSave').addEventListener('click', () => {
    const dt    = document.getElementById('calDate').value;
    const dur   = document.getElementById('calDuration').value;
    const with_ = document.getElementById('calWith').value;
    const setRem = document.getElementById('calReminder').checked;
    const sendConf = document.getElementById('calSendConfirm').checked;

    if (!dt) { alert('Please pick a date and time.'); return; }

    // Save to schedule localStorage
    const schedule = JSON.parse(localStorage.getItem('nudge_schedule') || '[]');
    const startDt = new Date(dt);
    const endDt   = new Date(startDt.getTime() + dur * 60000);
    const block = {
      id: 'cal_' + Date.now(),
      title: pendingCalEmail?.subject || 'Meeting',
      date: startDt.toISOString().slice(0,10),
      start: startDt.toTimeString().slice(0,5),
      end: endDt.toTimeString().slice(0,5),
      with: with_,
      source: 'inbox_detected',
      emailId: pendingCalEmail?.id
    };
    schedule.push(block);
    localStorage.setItem('nudge_schedule', JSON.stringify(schedule));

    // Set reminder if checked
    if (setRem) {
      const remTime = new Date(startDt.getTime() - 30 * 60000);
      const rem = {
        id: 'rem_' + Date.now(),
        emailId: pendingCalEmail?.id || '',
        title: 'Upcoming: ' + (pendingCalEmail?.subject || 'Meeting'),
        note: `Meeting with ${with_} at ${formatDate(dt)}`,
        at: remTime.toISOString(),
        fired: false
      };
      reminders.push(rem);
      localStorage.setItem('nudge_reminders', JSON.stringify(reminders));
    }

    document.getElementById('calendarModal').classList.remove('open');
    document.getElementById('meetingBanner')?.remove();

    // Mark email card
    const card = document.querySelector(`.email-card[data-id="${pendingCalEmail?.id}"]`);
    if (card) {
      const sender = card.querySelector('.email-sender');
      if (sender && !sender.querySelector('.inb-reminder-dot')) {
        sender.insertAdjacentHTML('beforeend','<span class="inb-reminder-dot" title="Reminder set"></span>');
      }
    }

    let toastMsg = `📅 "${block.title}" added to calendar for ${formatDate(dt)}.`;
    if (setRem) toastMsg += ' Reminder set for 30 min before.';
    if (sendConf) toastMsg += ' Confirmation draft queued.';
    showToast('📅', 'Calendar updated', toastMsg);
    pendingCalEmail = null;
  });

  /* ── Reminder modal ─────────────────────── */
  function openReminderModal(email) {
    document.getElementById('reminderTitle').textContent = email.subject;
    // Default: 1 hour from now
    const def = new Date(Date.now() + 3600000);
    document.getElementById('reminderTime').value = def.toISOString().slice(0,16);
    document.getElementById('reminderNote').value = '';
    renderExistingReminders(email.id);
    document.getElementById('reminderModal').classList.add('open');
  }

  function renderExistingReminders(emailId) {
    const mine = reminders.filter(r => r.emailId === emailId);
    const list = document.getElementById('existingReminders');
    list.innerHTML = mine.length
      ? mine.map(r => `
          <div class="inb-reminder-item">
            🔔 <span>${esc(r.title)}</span>
            <span style="color:var(--muted);font-size:10px;">${formatDate(r.at)}</span>
            <button class="inb-reminder-del" data-rid="${esc(r.id)}">×</button>
          </div>
        `).join('')
      : '';
    list.querySelectorAll('.inb-reminder-del').forEach(btn => {
      btn.addEventListener('click', () => {
        reminders = reminders.filter(r => r.id !== btn.dataset.rid);
        localStorage.setItem('nudge_reminders', JSON.stringify(reminders));
        renderExistingReminders(emailId);
        renderList();
      });
    });
  }

  document.getElementById('reminderClose').addEventListener('click', () => document.getElementById('reminderModal').classList.remove('open'));
  document.getElementById('reminderCancel').addEventListener('click', () => document.getElementById('reminderModal').classList.remove('open'));
  document.getElementById('reminderSave').addEventListener('click', () => {
    if (!currentEmail) return;
    const at = document.getElementById('reminderTime').value;
    const note = document.getElementById('reminderNote').value.trim();
    if (!at) { alert('Please pick a date and time.'); return; }
    const rem = {
      id: 'rem_' + Date.now(),
      emailId: currentEmail.id,
      title: currentEmail.subject,
      note,
      at: new Date(at).toISOString(),
      fired: false
    };
    reminders.push(rem);
    localStorage.setItem('nudge_reminders', JSON.stringify(reminders));
    document.getElementById('reminderModal').classList.remove('open');
    renderList();
    showToast('🔔', 'Reminder set', `You'll be alerted at ${formatDate(at)}.`);
  });

  /* ── Reminder checker (polls every 30s) ── */
  function startReminderChecker() {
    function check() {
      const now = Date.now();
      let changed = false;
      reminders.forEach(rem => {
        if (!rem.fired && new Date(rem.at).getTime() <= now) {
          rem.fired = true;
          changed = true;
          showToast('🔔', 'Reminder: ' + rem.title, rem.note || 'Time to act on this email.', 8000);
        }
      });
      if (changed) {
        localStorage.setItem('nudge_reminders', JSON.stringify(reminders));
      }
    }
    check();
    setInterval(check, 30000);
  }

  /* ── Toast ──────────────────────────────── */
  function showToast(icon, title, msg, duration = 5000) {
    const wrap = document.getElementById('inbToastWrap');
    const id = 'toast_' + Date.now();
    const div = document.createElement('div');
    div.className = 'inb-toast';
    div.id = id;
    div.innerHTML = `
      <div class="inb-toast-icon">${icon}</div>
      <div class="inb-toast-body">
        <div class="inb-toast-title">${esc(title)}</div>
        <div class="inb-toast-msg">${esc(msg)}</div>
      </div>
      <button class="inb-toast-close" onclick="document.getElementById('${id}')?.remove()">×</button>
    `;
    wrap.appendChild(div);
    setTimeout(() => div.remove(), duration);
  }
  window.showInboxToast = showToast;

  /* ── Helpers ────────────────────────────── */
  function updatePill() {
    const u = inbox.filter(e => e.unread).length;
    document.getElementById('unreadPill').textContent = u + ' unread';
    NudgeShared.updateBadges(u, 0);
  }

  function formatDate(dt) {
    if (!dt) return '';
    try {
      return new Date(dt).toLocaleString('en-US', {
        weekday:'short', month:'short', day:'numeric',
        hour:'2-digit', minute:'2-digit'
      });
    } catch { return String(dt); }
  }

})();
