(function() {

  const userName = localStorage.getItem(
    'nudge_user_name') || 'You';
  let emails = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let selectedEmail = null;

  // ── Meeting Request Logic ──────────────────
  function isMeetingRequest(email) {
    const text = (
      (email.subject || '') + ' ' + 
      (email.snippet || '') + ' ' +
      (email.body || '')
    ).toLowerCase();
    return ['meeting', 'call', 'schedule', 
            'zoom', 'catch up', 'sync', 
            'book', 'availability']
      .some(kw => text.includes(kw));
  }

  function extractDate(email) {
    const text = (
      (email.subject || '') + ' ' +
      (email.snippet || '') + ' ' +
      (email.body || '')
    ).toLowerCase();

    const days = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6,
      'sunday': 0
    };

    for (const [day, num] of Object.entries(days)) {
      if (text.includes(day)) {
        const today = new Date();
        const todayDay = today.getDay();
        let diff = num - todayDay;
        if (diff <= 0) diff += 7;
        const meetDate = new Date(today);
        meetDate.setDate(today.getDate() + diff);
        return meetDate;
      }
    }

    if (text.includes('tomorrow')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    }

    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  }

  function extractTime(email) {
    const text = (
      (email.snippet || '') + ' ' +
      (email.body || '')
    ).toLowerCase();

    const match = text.match(
      /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
    );
    if (match) {
      let hour = parseInt(match[1]);
      const min = parseInt(match[2] || '0');
      const period = match[3];
      if (period === 'pm' && hour < 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;
      return { hour, min };
    }
    return { hour: 10, min: 0 };
  }

  async function handleMeetingYes(email) {
    const meetDate = extractDate(email);
    const meetTime = extractTime(email);

    meetDate.setHours(meetTime.hour, meetTime.min, 0);

    const dateStr = meetDate.toLocaleDateString(
      [], { weekday: 'long', month: 'short', 
            day: 'numeric' });
    const timeStr = meetDate.toLocaleTimeString(
      [], { hour: '2-digit', minute: '2-digit' });

    const confirmed = confirm(
      'Confirm meeting with ' + 
      (email.sender || 'this person') + 
      ' on ' + dateStr + ' at ' + timeStr + '?\n\n' +
      'Nudge will:\n' +
      '1. Add it to your calendar\n' +
      '2. Create a pending task on the work board\n' +
      '3. Send you a browser notification ' +
         '30 minutes before\n' +
      '4. When you confirm on the day, generate ' +
         'a meeting link and email it to them'
    );

    if (!confirmed) return;

    let eventId;
    if (window.supabaseClient) {
      const event = await SupabaseData.saveScheduleBlock({
        title: 'Meeting with ' + (email.sender || 'Contact'),
        date: meetDate.toISOString().split('T')[0],
        start_time: timeStr,
        source: 'meeting_request'
      });
      eventId = event?.id;
      
      await SupabaseData.saveTask({
        title: 'Meeting with ' + (email.sender || 'Contact') + ' — ' + dateStr + ' ' + timeStr,
        status: 'in-progress',
        priority: 'high',
        description: 'Meeting request from ' + (email.sender || 'Contact')
      });
    } else {
      const scheduleEvents = JSON.parse(localStorage.getItem('nudge_schedule') || '[]');
      eventId = 'meet_' + Date.now();
      scheduleEvents.push({
        id: eventId,
        title: 'Meeting with ' + (email.sender || 'Contact'),
        date: meetDate.toISOString().split('T')[0],
        start: timeStr,
        source: 'meeting_request',
        confirmed: false
      });
      localStorage.setItem('nudge_schedule', JSON.stringify(scheduleEvents));

      const tasks = JSON.parse(localStorage.getItem('nudge_tasks') || '[]');
      tasks.unshift({
        id: 'task_meet_' + Date.now(),
        title: 'Meeting with ' + (email.sender || 'Contact') + ' — ' + dateStr + ' ' + timeStr,
        status: 'in-progress',
        priority: 'high'
      });
      localStorage.setItem('nudge_tasks', JSON.stringify(tasks));
    }

    scheduleMeetingNotification(
      email, meetDate, eventId);

    email.meetingAccepted = true;
    email.meetingDate = meetDate.toISOString();
    renderEmails();

    alert(
      'Done! Meeting added to calendar and work board.\n' +
      'You will get a browser notification 30 minutes ' +
      'before the meeting to confirm sending the link.'
    );
  }

  function handleMeetingNo(email) {
    const draftBody = 
      'Hi ' + (email.sender?.split(' ')[0] || 'there') +
      ',\n\nThank you for reaching out. Unfortunately ' +
      'I am not available for a meeting at this time. ' +
      'I will be in touch when my schedule opens up.\n\n' +
      'Best regards';

    const editedDraft = prompt(
      'Nudge drafted this decline reply. Edit if needed:',
      draftBody
    );

    if (editedDraft === null) return;

    const send = confirm(
      'Send this reply to ' + 
      (email.sender || 'this person') + '?\n\n' +
      editedDraft
    );

    if (!send) return;

    fetch('/api/emails/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: email.id,
        body: editedDraft,
        to: email.senderEmail || email.sender
      })
    }).catch(() => {});

    email.meetingDeclined = true;
    renderEmails();
    alert('Decline sent.');
  }

  function scheduleMeetingNotification(
    email, meetDate, eventId) {

    if (!('Notification' in window)) return;

    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') return;

      const notifyAt = new Date(meetDate.getTime() 
        - 30 * 60 * 1000);
      const now = new Date();
      const delay = notifyAt.getTime() - now.getTime();

      if (delay < 0) return;

      setTimeout(() => {
        fireMeetingNotification(email, meetDate, eventId);
      }, delay);

      const pending = JSON.parse(
        localStorage.getItem(
          'nudge_pending_notifications') || '[]');
      pending.push({
        id: 'notif_' + Date.now(),
        type: 'meeting',
        eventId,
        emailId: email.id,
        sender: email.sender,
        senderEmail: email.senderEmail || email.sender,
        meetingDate: meetDate.toISOString(),
        notifyAt: notifyAt.toISOString(),
        fired: false
      });
      localStorage.setItem(
        'nudge_pending_notifications',
        JSON.stringify(pending));
    });
  }

  function fireMeetingNotification(
    email, meetDate, eventId) {

    const timeStr = meetDate.toLocaleTimeString(
      [], { hour: '2-digit', minute: '2-digit' });

    const notif = new Notification(
      'Meeting in 30 minutes — ' + 
      (email.sender || 'Contact'), {
      body: 'Your meeting is at ' + timeStr + 
            '. Confirm to send the meeting link.',
      icon: '/favicon.ico',
      requireInteraction: true
    });

    notif.onclick = function() {
      window.focus();
      confirmAndSendMeetingLink(
        email, meetDate, eventId);
    };
  }

  function confirmAndSendMeetingLink(
    email, meetDate, eventId) {

    const timeStr = meetDate.toLocaleTimeString(
      [], { hour: '2-digit', minute: '2-digit' });

    const linkType = confirm(
      'Send meeting link to ' + 
      (email.sender || 'Contact') + '?\n\n' +
      'OK = Google Meet\nCancel = Zoom\n\n' +
      'Nudge will generate the link and email it.'
    );

    const meetLink = linkType ?
      'https://meet.google.com/new' :
      'https://zoom.us/j/' + 
      Math.floor(Math.random() * 9000000000 + 
                 1000000000);

    const emailBody = 
      'Hi ' + 
      (email.sender?.split(' ')[0] || 'there') +
      ',\n\nLooking forward to our meeting today at ' +
      timeStr + '.\n\nHere is the link to join:\n' +
      meetLink + '\n\nSee you soon!';

    const confirmed = confirm(
      'Nudge will send this email:\n\n' + emailBody +
      '\n\nTo: ' + 
      (email.senderEmail || email.sender) +
      '\n\nConfirm?'
    );

    if (!confirmed) return;

    fetch('/api/emails/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: email.id,
        body: emailBody,
        to: email.senderEmail || email.sender,
        meetLink
      })
    }).catch(() => {});

    const scheduleEvents = JSON.parse(
      localStorage.getItem('nudge_schedule') || '[]');
    const event = scheduleEvents.find(
      e => e.id === eventId);
    if (event) {
      event.confirmed = true;
      event.meetLink = meetLink;
      localStorage.setItem('nudge_schedule',
        JSON.stringify(scheduleEvents));
    }

    alert('Meeting link sent to ' + 
          (email.senderEmail || email.sender) + 
          '!\n\nLink: ' + meetLink);
  }

  // ── Load emails ────────────────────────────
  async function loadEmails() {
    const real = await fetch('/api/inbox/summary')
      .then(r => r.json())
      .catch(() => null);

    const demo = window.DEMO || {};
    // Load real items when available, otherwise load full DEMO inbox
    emails = real?.items?.length ? real.items : (demo.inbox || []);

    // If Gemini key exists run real AI on top
    const key = localStorage.getItem('nudge_gemini_key');
    if (key && emails.length) {
      await autoTagEmails(key);
    }

    // Ensure categories exist (DEMO already includes categories)
    applyDefaultCategories();

    autoCreateTasks();
    // Persist for Financial Pulse to read
    localStorage.setItem('nudge_email_log_data', JSON.stringify(emails));
    renderEmails();
    updateCounts();
  }

  // Tagging logic
  function applyDefaultCategories() {
    // Categories are now determined by AI or default rules
    emails.forEach(email => {
      if (!email.aiCategory) {
        // Default categorization based on tags
        const tags = email.tags || [];
        if (tags.includes('Meeting') || 
            email.subject?.toLowerCase().includes('meeting') ||
            email.subject?.toLowerCase().includes('call') ||
            email.subject?.toLowerCase().includes('schedule')) {
          email.aiCategory = 'meeting request';
          email.aiSummary = `Meeting request from ${email.sender} regarding ${email.subject}.`;
        } else if (tags.includes('Urgent') || 
                   tags.includes('high') ||
                   email.subject?.toLowerCase().includes('invoice') ||
                   email.subject?.toLowerCase().includes('payment')) {
          email.aiCategory = 'task needed';
          email.aiSummary = `Action required from ${email.sender}: ${email.subject}.`;
          email.createTask = true;
          email.taskTitle = `Action: ${email.subject}`;
        } else if (tags.includes('Unread') || email.unread) {
          email.aiCategory = 'needs reply';
          email.aiSummary = `${email.sender} is waiting for your reply on: ${email.subject}.`;
        } else {
          email.aiCategory = 'fyi';
          email.aiSummary = `No action needed — ${email.subject} from ${email.sender}.`;
        }
      }
    });
  }

  // ── Auto-tag with Gemini ───────────────────
  async function autoTagEmails(key) {
    if (!key) {
      return;
    }

    const prompt = `
Analyze these emails and categorize each one.
Return ONLY valid JSON, no markdown, no extra text.

EMAILS:
${JSON.stringify(emails.map(e => ({
  id: e.id,
  from: e.sender,
  subject: e.subject,
  snippet: e.snippet || e.body?.slice(0, 200)
})))}

Return exactly:
{
  "results": [
    {
      "id": "email_id",
      "category": "meeting request|task needed|needs reply|fyi",
      "summary": "one specific sentence about what this email actually says — mention names, amounts, dates if present",
      "createTask": true|false,
      "taskTitle": "specific task title if createTask is true"
    }
  ]
}

category rules:
- meeting request: someone wants to schedule a call, meeting, or zoom
- task needed: requires you to do something — pay, sign, send, review
- needs reply: waiting for your response, question directed at you
- fyi: informational only, no action needed
`;

    try {
      const clean = await window.nudgeAI(prompt, "You are an email categorization AI.");
      const parsed = JSON.parse(clean);

      parsed.results?.forEach(result => {
        const email = emails.find(e => e.id === result.id);
        if (email) {
          email.aiCategory = result.category;
          email.aiSummary = result.summary;
          email.createTask = result.createTask;
          email.taskTitle = result.taskTitle;
        }
      });

    } catch(e) {
      console.error("AI tag failed", e);
    }
  }

  // ── Auto create tasks ──────────────────────
  async function autoCreateTasks() {
    let existing = [];
    if (window.supabaseClient) {
      existing = await SupabaseData.getTasks();
    } else {
      existing = JSON.parse(localStorage.getItem('nudge_tasks') || '[]');
    }

    const tasksToAdd = [];

    emails.forEach(email => {
      if (!email.createTask && 
          email.aiCategory !== 'task needed') return;

      // Check if task already created for this email
      const alreadyCreated = existing.find(
        t => t.title.includes(email.id) || (email.taskTitle && t.title === email.taskTitle));
      if (alreadyCreated) {
        email.taskCreated = true;
        email.taskId = alreadyCreated.id;
        return;
      }

      const task = {
        title: email.taskTitle || `Follow up: ${email.subject}`,
        status: 'todo',
        priority: email.aiCategory === 'task needed' ? 'high' : 'medium',
        description: `Source: Email ${email.id}`
      };

      tasksToAdd.push(task);
      email.taskCreated = true;
    });

    if (tasksToAdd.length > 0) {
      for (const t of tasksToAdd) {
        if (window.supabaseClient) {
          await SupabaseData.saveTask(t);
        } else {
          t.id = 'task_email_' + Date.now();
          existing.push(t);
        }
      }
      if (!window.supabaseClient) {
        localStorage.setItem('nudge_tasks', JSON.stringify(existing));
      }
    }
  }

  window.dismissTask = function(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email || !email.taskId) return;

    // Mark task as dismissed in localStorage
    const saved = JSON.parse(
      localStorage.getItem('nudge_tasks') || '[]');
    const task = saved.find(t => t.id === email.taskId);
    if (task) {
      task.dismissed = true;
      task.status = 'done';
      task.dismissedAt = new Date().toISOString();
      task.dismissedBy = localStorage.getItem(
        'nudge_user_name') || 'You';
    }
    localStorage.setItem('nudge_tasks', 
      JSON.stringify(saved));

    email.dismissed = true;
    renderEmails();
    updateCounts();
  };

  window.manualCreateTask = async function(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email || email.taskCreated) return;

    const taskTitle = prompt('Enter task title:', 'Follow up: ' + email.subject);
    if (!taskTitle) return;

    const task = {
      title: taskTitle,
      status: 'todo',
      priority: 'high',
      description: 'Manually created from email log'
    };

    if (window.supabaseClient) {
      await SupabaseData.saveTask(task);
    } else {
      const existing = JSON.parse(localStorage.getItem('nudge_tasks') || '[]');
      task.id = 'task_manual_' + Date.now();
      existing.unshift(task);
      localStorage.setItem('nudge_tasks', JSON.stringify(existing));
    }
    
    email.taskCreated = true;
    renderEmails();
    updateCounts();
  };

  // ── Render email log ───────────────────────
  function renderEmails() {
    const list = document.getElementById('logList');
    const showDismissed = window._showDismissed || false;
    const q = searchQuery.toLowerCase();

    let filtered = currentFilter === 'all' ?
      emails :
      emails.filter(e => {
        if (currentFilter === 'tasks') return e.taskCreated;
        if (currentFilter === 'dismissed') return e.dismissed;
        return e.aiCategory === currentFilter;
      });

    if (q) {
      filtered = filtered.filter(e =>
        (e.sender || '').toLowerCase().includes(q) ||
        (e.subject || '').toLowerCase().includes(q) ||
        (e.snippet || '').toLowerCase().includes(q) ||
        (e.aiSummary || '').toLowerCase().includes(q)
      );
    }

    filtered = filtered.filter(e => showDismissed || !e.dismissed);

    document.getElementById('logTotalPill')
      .textContent = `${emails.length} emails`;

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          No emails in this category
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(email => {
      const catConfig = {
        'meeting request': { label: 'Meeting', color: '#0078d4', bg: '#f0f7ff', borderClass: 'cat-meeting' },
        'task needed':     { label: 'Task',    color: 'var(--warning)', bg: '#fffbf0', borderClass: 'cat-task' },
        'needs reply':     { label: 'Reply',   color: 'var(--danger)',  bg: '#fff5f5', borderClass: 'cat-reply' },
        'fyi':             { label: 'FYI',     color: 'var(--border-dark)', bg: 'var(--surface-alt)', borderClass: 'cat-fyi' }
      };

      const cat = catConfig[email.aiCategory] || catConfig['fyi'];

      return `
        <div class="log-item 
          ${email.unread ? 'unread' : ''}
          ${email.aiCategory ? cat.borderClass : ''}
          ${selectedEmail?.id === email.id ? 'selected' : ''}"
             data-id="${email.id}">

          <div class="log-item-left">
            <div class="avatar sm">
              ${(email.initials || email.sender?.slice(0,2) || 'XX').toUpperCase()}
            </div>
            <div class="log-item-body">
              <div class="log-item-sender-row">
                <span class="log-item-sender">
                  ${email.sender || 'Unknown'}
                </span>
                ${email.aiCategory ? `
                  <span class="log-cat-badge" 
                        style="color:${cat.color};
                               background:${cat.bg};
                               border-color:${cat.color}">
                    ${cat.label}
                  </span>` : ''}
              </div>
              <div class="log-item-subject">
                ${email.subject || '(No subject)'}
              </div>
              ${email.aiSummary ? `
                <div class="log-item-ai-summary">
                  ${email.aiSummary}
                </div>` : `
                <div class="log-item-summary">
                  ${email.snippet || ''}
                </div>`}
            </div>
          </div>

          <div class="log-item-right">
            <div class="log-item-time">
              ${email.time || ''}
            </div>
            <div class="log-item-tags">
              ${email.taskCreated ? `
                <span class="log-task-badge">
                  ✓ Task
                </span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.log-item').forEach(el => {
      el.addEventListener('click', () => {
        selectedEmail = emails.find(
          e => e.id === el.dataset.id);
        openReadingPane(selectedEmail);
        renderEmails();
      });
    });

    list.querySelectorAll('.meeting-yes').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const email = emails.find(em => em.id === btn.dataset.id);
        if (!email) return;
        handleMeetingYes(email);
      });
    });

    list.querySelectorAll('.meeting-no').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const email = emails.find(em => em.id === btn.dataset.id);
        if (!email) return;
        handleMeetingNo(email);
      });
    });
  }

  // ── Reading pane ───────────────────────────
  function openReadingPane(email) {
    const pane = document.getElementById(
      'logReadingPane');
    if (!email || !pane) return;

    document.getElementById('logPaneFrom')
      .textContent = `${email.sender} · ${email.time}`;
    document.getElementById('logPaneSubject')
      .textContent = email.subject;
    document.getElementById('logPaneAISummary')
      .textContent = email.aiSummary || '';
    document.getElementById('logPaneBody')
      .textContent = email.body || 
                     email.snippet || 
                     'No content available.';

    document.getElementById('logPaneCategory').value = email.aiCategory || 'fyi';
    document.getElementById('logPaneCategory').onchange = (e) => {
      email.aiCategory = e.target.value;
      renderEmails();
      updateCounts();
    };

    const createTaskBtn = document.getElementById('logPaneCreateTask');
    if (email.taskCreated) {
      createTaskBtn.style.display = 'none';
    } else {
      createTaskBtn.style.display = 'inline-flex';
      createTaskBtn.onclick = () => {
        manualCreateTask(email.id);
        openReadingPane(email);
      };
    }

    pane.classList.remove('hidden');
    document.getElementById('logPaneBackdrop').classList.remove('hidden');
  }

  document.getElementById('logPaneClose')
    .addEventListener('click', () => {
      document.getElementById('logReadingPane')
        .classList.add('hidden');
      document.getElementById('logPaneBackdrop')
        .classList.add('hidden');
      selectedEmail = null;
      renderEmails();
    });
    
  document.getElementById('logPaneBackdrop')
    .addEventListener('click', () => {
      document.getElementById('logPaneClose').click();
    });

  // ── Filter pills ───────────────────────────
  function updateCounts() {
    const cats = {
      'meeting request': 0,
      'task needed': 0,
      'needs reply': 0,
      'fyi': 0,
      'tasks': 0
    };

    emails.forEach(e => {
      if (e.aiCategory && cats[e.aiCategory] !== undefined) {
        cats[e.aiCategory]++;
      }
      if (e.taskCreated) cats['tasks']++;
    });

    const idMap = {
      'meeting request': 'countMeetingRequest',
      'task needed': 'countTaskNeeded',
      'needs reply': 'countNeedsReply',
      'fyi': 'countFyi',
      'tasks': 'countTasks'
    };

    Object.entries(idMap).forEach(([key, elId]) => {
      const el = document.getElementById(elId);
      if (el) el.textContent = cats[key];
    });
  }

  document.querySelectorAll('.log-filter:not(#showDismissed)')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.log-filter:not(#showDismissed)')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderEmails();
      });
    });

  document.getElementById('logRunAI')
    .addEventListener('click', async () => {
      const btn = document.getElementById('logRunAI');
      btn.textContent = 'Scanning…';
      btn.disabled = true;
      const key = localStorage.getItem(
        'nudge_gemini_key');
      if (key) await autoTagEmails(key);
      autoCreateTasks();
      renderEmails();
      updateCounts();
      btn.textContent = 'Run AI scan';
      btn.disabled = false;
    });

  // ── Search bar ─────────────────────────────
  const searchInput = document.getElementById('logSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      renderEmails();
    });
  }


  loadEmails();

})();
