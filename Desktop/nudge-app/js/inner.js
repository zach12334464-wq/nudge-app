import { getChatMessages, sendChatMessage, subscribeToChatMessages, getUser, getProfile } from './supabaseData.js';
import { DEMO } from './demoData.js';

const isDemoMode = localStorage.getItem('nudge_demo_mode') === 'true' || !(await getUser());

let companyId = null;
let currentUser = null;
let userName = localStorage.getItem('nudge_user_name') || 'You';
let userInitials = userName.slice(0,2).toUpperCase();

const avatarEl = document.getElementById('userAvatar');
if (avatarEl) avatarEl.textContent = userInitials;

async function initSupabase() {
  currentUser = await getUser();
  if (currentUser) {
    const profile = await getProfile(currentUser.id);
    companyId = profile?.company_id;
    userName = profile?.full_name || currentUser.email?.split('@')[0] || 'You';
    userInitials = userName.slice(0,2).toUpperCase();
    if (avatarEl) avatarEl.textContent = userInitials;

    // Load real messages
    const realMsgs = await getChatMessages(companyId);
    if (realMsgs.length) {
      messages = realMsgs.map(m => ({
        ...m,
        isMe: m.author === userName,
        status: 'active'
      }));
    }

    // Subscribe to real-time messages
    subscribeToChatMessages(companyId, newMsg => {
      messages.push({
        ...newMsg,
        isMe: newMsg.author === userName,
        status: 'active'
      });
      renderChat();
    });
  }
  renderPresence();
  renderActivity();
  renderChat();
  updateNotifBadge();
  renderNotifications();
}

  // ── Status colors ─────────────────────────
  // green = active (currently working on task)
  // blue = idle (online but no task)
  // red = offline
  const STATUS_COLORS = {
    active:  '#22c55e',
    idle:    '#3b82f6',
    offline: '#ef4444',
    ai: '#8b5cf6'
  };

  // Use DEMO-provided team/activity/chat when available
  const TEAM = (DEMO && DEMO.team) ? DEMO.team : [];
  const DEMO_ACTIVITY = (DEMO && DEMO.team) ? DEMO.team.map((m, idx) => ({
    id: 'act_' + idx,
    member: m.name,
    initials: (m.name || '').slice(0,2).toUpperCase(),
    status: m.status || 'active',
    action: 'active',
    task: m.currentTask || null,
    time: 'Just now',
    timestamp: Date.now() - (idx * 60000)
  })) : [];
  const DEMO_CHAT = (DEMO && DEMO.chat) ? DEMO.chat.map(c => ({
    id: c.id,
    author: c.author,
    initials: c.avatar || (c.author || '').slice(0,2).toUpperCase(),
    text: c.message || c.text || '',
    time: c.time || 'Now',
    isMe: c.author === userName,
    status: c.type === 'ai' ? 'ai' : 'active',
    type: c.type || 'message'
  })) : [];

  // Primary team array used by renderPresence
  let team = TEAM || [];

  let activity = isDemoMode ? [...DEMO_ACTIVITY] : [];
  let messages = isDemoMode ? (JSON.parse(localStorage.getItem('nudge_inner_chat') || 'null') || [...DEMO_CHAT]) : [];
  let notifications = JSON.parse(
    localStorage.getItem('nudge_inner_notifs') ||
    '[]');
  let activityOpen = false;

  // ── Render presence row ───────────────────────────────────────────────
  function renderPresence() {
    const row     = document.getElementById('presenceRow');
    const countEl = document.getElementById('onlineCount');
    if (!row) return;

    const online = team.filter(m => m.online);
    if (countEl) countEl.textContent = online.length + ' online';

    row.innerHTML = team.map(m => `
      <div class="inner-presence-member"
           title="${m.name}${m.currentTask ? ' \u2014 ' + m.currentTask : (m.online ? ' (idle)' : ' (offline)')}">
        <div class="inner-member-avatar ${m.online ? 'online' : 'offline'}">${m.initials}</div>
        <div class="inner-member-info">
          <span class="inner-member-name">${m.name === userName ? 'You' : m.name}</span>
          ${m.online && m.currentTask
            ? `<span class="inner-member-task">${m.currentTask}</span>`
            : m.online
              ? `<span class="inner-member-idle">idle</span>`
              : `<span class="inner-member-offline">offline</span>`}
        </div>
        <div class="inner-member-dot ${m.online ? 'online' : ''}"></div>
      </div>
    `).join('');
  }

  // ── Activity panel toggle ──────────────────
  const activityToggle = document.getElementById(
    'activityToggle');
  const activityPanel = document.getElementById(
    'activityPanel');
  const chevron = document.getElementById(
    'activityChevron');

  activityToggle?.addEventListener('click', () => {
    activityOpen = !activityOpen;
    activityPanel.classList.toggle(
      'hidden', !activityOpen);
    activityPanel.classList.toggle(
      'open', activityOpen);
    chevron.style.transform = activityOpen ?
      'rotate(180deg)' : 'rotate(0deg)';
  });

  // ── Render activity panel ──────────────────
  function renderActivity() {
    const feed = document.getElementById(
      'activityFeed');
    if (!feed) return;

    // Merge real task activity
    const tasks = JSON.parse(
      localStorage.getItem('nudge_tasks') || 
      '[]');

    const realActivity = tasks
      .filter(t => t.lockedBy || t.completedBy)
      .map(t => ({
        id: 'real_' + t.id,
        member: t.completedBy || 
                t.lockedBy || 'Someone',
        initials: (t.completedBy || 
                   t.lockedBy || 'S')
                  .slice(0,2).toUpperCase(),
        status: t.status === 'done' ? 
                'active' : 'active',
        action: t.status === 'done' ?
                'completed' : 'started',
        task: t.title,
        time: timeAgo(new Date(
          t.completedAt || 
          t.lockedAt || 
          Date.now()
        )),
        timestamp: new Date(
          t.completedAt || 
          t.lockedAt || 
          Date.now()
        ).getTime()
      }));

    const all = [...realActivity, ...activity]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15);

    feed.innerHTML = all.map(item => {
      const color = STATUS_COLORS[
        item.status] || '#888888';
      const actionColor = 
        item.action === 'completed' ? 
          '#22c55e' :
        item.action === 'started' ? 
          '#3b82f6' :
        item.action === 'went offline' ?
          '#ef4444' : '#888888';

      return `
        <div class="inner-activity-card">
          <div class="inner-act-avatar"
               style="background:${color}15;
                      color:${color};
                      border-color:${color}30">
            ${item.initials}
          </div>
          <div class="inner-act-body">
            <div class="inner-act-text">
              <span class="inner-act-name">
                ${item.member}
              </span>
              <span class="inner-act-verb"
                    style="color:${actionColor}">
                ${item.action}
              </span>
              ${item.task ? `
                <span class="inner-act-task">
                  ${item.task}
                </span>` : ''}
            </div>
            <div class="inner-act-time">
              ${item.time}
            </div>
          </div>
          <button class="inner-act-reply"
                  data-member="${item.member}">
            Reply
          </button>
        </div>
      `;
    }).join('');

    feed.querySelectorAll('.inner-act-reply')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          const input = document.getElementById(
            'chatInput');
          if (input) {
            input.value = 
              `@${btn.dataset.member} `;
            input.focus();
            // Close panel after reply
            activityOpen = false;
            activityPanel.classList.add('hidden');
            activityPanel.classList
              .remove('open');
            if (chevron) chevron.style.transform 
              = 'rotate(0deg)';
          }
        });
      });
  }

  // ── Render chat ────────────────────────────
  function renderChat() {
    const feed = document.getElementById(
      'chatFeed');
    if (!feed) return;

    feed.innerHTML = messages.map(msg => {
      const color = STATUS_COLORS[
        msg.status] || '#888888';
      return `
        <div class="inner-msg 
          ${msg.isMe ? 'me' : 'them'}">
          ${!msg.isMe ? `
            <div class="inner-msg-avatar"
                 style="background:${color}15;
                        color:${color};
                        border-color:${color}30">
              ${msg.initials}
            </div>` : ''}
          <div class="inner-msg-wrap">
            ${!msg.isMe ? `
              <div class="inner-msg-author">
                ${msg.author}
                <span class="inner-msg-status"
                      style="color:${color}">
                  ● ${msg.status}
                </span>
              </div>` : ''}
            <div class="inner-msg-bubble">
              ${msg.text}
            </div>
            <div class="inner-msg-actions">
              <button class="inner-msg-reply-btn"
                      data-author="${msg.author}"
                      data-text="${msg.text.replace(/\"/g, '&quot;').slice(0,60)}">
                Reply
              </button>
            </div>
            <div class="inner-msg-time">
              ${msg.time}
            </div>
          </div>
        </div>
      `;
    }).join('');

    feed.scrollTop = feed.scrollHeight;

    // Bind reply buttons for newly rendered messages
    document.querySelectorAll('.inner-msg-reply-btn')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          const input = document.getElementById('chatInput');
          if (!input) return;
          input.value = `> ${btn.dataset.author}: "${btn.dataset.text}"\n`;
          input.focus();
          input.style.height = 'auto';
          input.style.height = Math.min(
            input.scrollHeight, 100) + 'px';
        });
      });
  }

  // ── Send message ───────────────────────────
  async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add to UI immediately
    const newMsg = {
      id: 'temp_' + Date.now(),
      author: userName,
      initials: userInitials,
      text,
      time: timeStr,
      isMe: true,
      status: 'active'
    };
    messages.push(newMsg);
    renderChat();

    input.value = '';
    input.style.height = 'auto';

    // Save to Supabase if connected
    if (companyId) {
      await sendChatMessage(companyId, userName, userInitials, text);
    } else {
      // Demo mode — save to localStorage
      localStorage.setItem('nudge_inner_chat', JSON.stringify(messages));
    }

    // Check mentions
    TEAM.forEach(member => {
      if (text.toLowerCase().includes('@' + member.name.toLowerCase())) {
        addNotification(
          `${userName} mentioned you: "${text.length > 40 ? text.slice(0,40) + '...' : text}"`,
          member.name
        );
      }
    });
  }

  // ── Notifications ──────────────────────────
  function addNotification(text, forMember) {
    notifications.push({
      id: 'n_' + Date.now(),
      text,
      forMember,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      read: false
    });
    localStorage.setItem('nudge_inner_notifs',
      JSON.stringify(notifications));
    updateNotifBadge();
    renderNotifications();
  }

  function updateNotifBadge() {
    const dot = document.getElementById(
      'notifDot');
    const unread = notifications.filter(
      n => !n.read).length;
    if (dot) {
      if (unread > 0) {
        dot.classList.remove('hidden');
        dot.textContent = unread > 9 ? 
          '9+' : unread;
      } else {
        dot.classList.add('hidden');
      }
    }
  }

  function renderNotifications() {
    const list = document.getElementById(
      'notifList');
    if (!list) return;
    const unread = notifications.filter(
      n => !n.read);
    if (!unread.length) {
      list.innerHTML = `
        <div class="inner-notif-empty">
          No new notifications
        </div>`;
      return;
    }
    list.innerHTML = unread.map(n => `
      <div class="inner-notif-item">
        <div class="inner-notif-text">
          ${n.text}
        </div>
        <div class="inner-notif-time">
          ${n.time}
        </div>
      </div>
    `).join('');
  }

  // Notif toggle
  const notifBtn = document.getElementById(
    'notifBtn');
  const notifDropdown = document.getElementById(
    'notifDropdown');

  notifBtn?.addEventListener('click', () => {
    notifDropdown.classList.toggle('hidden');
    notifications.forEach(n => n.read = true);
    localStorage.setItem('nudge_inner_notifs',
      JSON.stringify(notifications));
    updateNotifBadge();
    renderNotifications();
  });

  document.addEventListener('click', e => {
    if (!notifBtn?.contains(e.target) &&
        !notifDropdown?.contains(e.target)) {
      notifDropdown?.classList.add('hidden');
    }
    if (!activityToggle?.contains(e.target) &&
        !activityPanel?.contains(e.target)) {
      if (activityOpen) {
        activityOpen = false;
        activityPanel?.classList.add('hidden');
        activityPanel?.classList
          .remove('open');
        if (chevron) chevron.style.transform 
          = 'rotate(0deg)';
      }
    }
  });

  // Send handlers
  document.getElementById('chatSend')
    ?.addEventListener('click', sendMessage);

  document.getElementById('chatInput')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        return;
      }
      setTimeout(() => {
        const el = e.target;
        el.style.height = 'auto';
        el.style.height = Math.min(
          el.scrollHeight, 100) + 'px';
      }, 0);
    });

  // Auto-open task from work board
  const autoTask = localStorage.getItem(
    'nudge_inner_task');
  if (autoTask) {
    const tasks = JSON.parse(
      localStorage.getItem('nudge_tasks') || 
      '[]');
    const task = tasks.find(
      t => t.id === autoTask);
    if (task) {
      activity.unshift({
        id: 'auto_' + autoTask,
        member: task.lockedBy || userName,
        initials: (task.lockedBy || userName)
          .slice(0,2).toUpperCase(),
        status: 'active',
        action: 'started',
        task: task.title,
        time: 'just now',
        timestamp: Date.now()
      });
    }
    localStorage.removeItem('nudge_inner_task');
  }

  // Time ago helper
  function timeAgo(date) {
    const mins = Math.floor(
      (Date.now() - date) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  }

  // Simulate live activity every 45s
  const LIVE = [
    { member: 'Mary', initials: 'MA',
      status: 'active', action: 'completed',
      task: 'Client Invoice Review' },
    { member: 'Jeff', initials: 'JE',
      status: 'active', action: 'started',
      task: 'Q4 Budget Planning' },
    { member: 'Aisha', initials: 'AI',
      status: 'idle', action: 'went idle',
      task: null }
  ];
  let liveIdx = 0;
  setInterval(() => {
    const item = LIVE[liveIdx % LIVE.length];
    activity.unshift({
      id: 'live_' + Date.now(),
      ...item,
      time: 'just now',
      timestamp: Date.now()
    });
    liveIdx++;
    if (activityOpen) renderActivity();
    const countEl = document.getElementById(
      'activityCount');
    if (countEl) countEl.textContent = 
      activity.length;
  }, 45000);

  // Init
  // Init
  if (isDemoMode) {
    renderPresence();
    renderActivity();
    renderChat();
    updateNotifBadge();
    renderNotifications();
  } else {
    initSupabase();
  }
