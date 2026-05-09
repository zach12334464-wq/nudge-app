(function () {
  'use strict';

  // ── SVG icon paths ──────────────────────────
  const icons = {
    grid: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    mic: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 18v3"/><path d="M8 21h8"/></svg>',
    autopilot: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V7l-10-5z"/><path d="M10 16l-3-3m6 0l3-3"/></svg>',
    financial: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    focus:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h3M18 12h3M12 3v3M12 18v3"/><circle cx="12" cy="12" r="9" stroke-dasharray="4 2"/></svg>',
    stats:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>'
  };

  // ── Build sidebar HTML ──────────────────────
  const unread = 0;
  const pending = 0;

  const sidebarHTML = `
    <aside class="sidebar" id="mainSidebar">
      <div class="sidebar-brand">
        <span class="brand-mark">N</span>
        <span>Nudge</span>
      </div>
      <nav class="sidebar-nav">
<a href="dashboard.html" class="nav-item">Overview</a>
<a href="email-logs.html" class="nav-item">Email Logs</a>
<a href="work.html" class="nav-item">Work Board</a>
<a href="schedule.html" class="nav-item">Schedule</a>
<a href="inner.html" class="nav-item">Inner</a>
<a href="owner.html" class="nav-item">Business OS</a>
<a href="settings.html" class="nav-item">Settings</a>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-accounts-label">Accounts</div>
        <div class="provider-row-sm">
          <span class="provider-dot" id="googleDot"></span>
          <span class="provider-name-sm">Google Workspace</span>
        </div>
        <div class="provider-row-sm">
          <span class="provider-dot" id="microsoftDot"></span>
          <span class="provider-name-sm">Microsoft 365</span>
    </aside>

    <div class="topbar">
      <div class="topbar-left" id="topbarStatus">
        <span id="topbarGreeting" style="font-size:13px;font-weight:700;color:#000;"></span>
      </div>
      <div class="topbar-right">
        <div class="clock" id="clockDisplay" style="font-size:13px;font-weight:600;color:#000;"></div>
      </div>
    </div>
  `;

  // ── Inject sidebar & topbar ──────────────────────────
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  const autopilotScript = document.createElement('script');
  autopilotScript.src = 'js/autopilot-bg.js';
  document.body.appendChild(autopilotScript);

  // ── Highlight active nav link ───────────────
  // Initialize AI model preference to Groq (fallback to Gemini)
  localStorage.setItem('nudge_ai_model', 'groq');

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  const pageName = currentFile.replace('.html', '');

  document.querySelectorAll('.nav-item').forEach(link => {
    if (link.dataset.page === pageName) {
      link.classList.add('active');
    }
  });

  // ── Clock & Status (in topbar) ─────────────
  const clockEl = document.getElementById('clockDisplay');
  const greetingEl = document.getElementById('topbarGreeting');
  
  const tick = () => {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + 
                            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (greetingEl) {
      const hour = now.getHours();
      let greeting = 'Good evening';
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 17) greeting = 'Good afternoon';
      greetingEl.textContent = greeting;
    }
  };
  tick();
  setInterval(tick, 1000);

  // ── Shared utilities ────────────────────────
  window.NudgeShared = {
    esc(v) {
      return String(v ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    },

    async api(url, opts = {}) {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...opts
      });
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      return res.json();
    },

    updateBadges(unreadCount, pendingCount) {
      const ub = document.getElementById('navUnreadCount');
      const pb = document.getElementById('navPendingCount');
      if (ub) ub.textContent = unreadCount;
      if (pb) pb.textContent = pendingCount;
    }
  };

  // Meeting helpers: create a realistic Google Meet link and persist meeting
  window.NudgeShared.createMeetingLink = function() {
    // generate random friendly segments like abc-defg-hij
    function seg(len) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let s = '';
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }
    return `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`;
  };

  window.NudgeShared.handleMeetingCreation = function(toName, toEmail, topic, timeStr) {
    const link = window.NudgeShared.createMeetingLink();
    // Normalize time to a Date object; if missing, schedule 1 hour from now
    let meetingDate = new Date();
    if (timeStr) {
      const parsed = new Date(timeStr);
      if (!isNaN(parsed.getTime())) meetingDate = parsed;
      else {
        // try parsing simple yyyy-mm-dd or hh:mm patterns
        try {
          meetingDate = new Date(Date.parse(timeStr));
        } catch(e) {}
      }
    } else {
      meetingDate = new Date(Date.now() + 60 * 60 * 1000);
    }

    const date = meetingDate.toISOString().split('T')[0];
    const time = meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const ev = {
      id: 'meet_' + Date.now(),
      title: topic || `Meeting with ${toName || toEmail}`,
      date,
      start_time: time,
      meetLink: link,
      source: 'nudge_float',
      createdBy: localStorage.getItem('nudge_user_name') || 'You'
    };

    // Persist to schedule (localStorage 'nudge_schedule') — unshift so newest first
    const sched = JSON.parse(localStorage.getItem('nudge_schedule') || 'null') || [];
    sched.unshift(ev);
    localStorage.setItem('nudge_schedule', JSON.stringify(sched));

    // Persist a sent-email record
    const sent = JSON.parse(localStorage.getItem('nudge_sent_emails') || 'null') || [];
    sent.unshift({
      id: 'sent_' + Date.now(),
      to: toEmail || '',
      toName: toName || '',
      subject: `Meeting: ${ev.title}`,
      body: `I've scheduled ${ev.title} on ${date} at ${time}. Join: ${link}`,
      date: new Date().toISOString()
    });
    localStorage.setItem('nudge_sent_emails', JSON.stringify(sent));

    // Schedule a pending notification 30 minutes before the meeting
    const notifyAt = new Date(meetingDate.getTime() - 30 * 60000).toISOString();
    const pending = JSON.parse(localStorage.getItem('nudge_pending_notifications') || '[]');
    pending.unshift({ id: 'pn_' + Date.now(), sender: toName || toEmail || 'Meeting', meetingDate: meetingDate.toISOString(), notifyAt, fired: false });
    localStorage.setItem('nudge_pending_notifications', JSON.stringify(pending));

    return { link, event: ev };
  };

  // ── Helper function for Groq API calls ──────
  window.getAIKey = function() {
    return localStorage.getItem('nudge_groq_key') || localStorage.getItem('nudge_gemini_key') || '';
  };

  (function checkPendingNotifications() {
    const pending = JSON.parse(
      localStorage.getItem(
        'nudge_pending_notifications') || '[]');
    if (!pending.length) return;

    const now = new Date();
    let changed = false;

    pending.forEach(n => {
      if (n.fired) return;
      const notifyAt = new Date(n.notifyAt);
      const delay = notifyAt.getTime() - now.getTime();

      if (delay <= 0) {
        // Already past — fire immediately if 
        // meeting hasn't happened yet
        const meetDate = new Date(n.meetingDate);
        if (meetDate > now) {
          if (Notification.permission === 'granted') {
            const notif = new Notification(
              'Meeting soon — ' + n.sender, {
              body: 'Your meeting is coming up. ' +
                    'Click to send the link.',
              requireInteraction: true
            });
            notif.onclick = () => {
              window.focus();
              window.location.href = 
                'schedule.html';
            };
          }
        }
        n.fired = true;
        changed = true;
      } else {
        setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification(
              'Meeting in 30 minutes — ' + n.sender, {
              body: 'Click to confirm and send ' +
                    'the meeting link.',
              requireInteraction: true
            });
          }
          n.fired = true;
          const all = JSON.parse(
            localStorage.getItem(
              'nudge_pending_notifications') || '[]');
          const idx = all.findIndex(
            x => x.id === n.id);
          if (idx > -1) all[idx].fired = true;
          localStorage.setItem(
            'nudge_pending_notifications',
            JSON.stringify(all));
        }, delay);
      }
    });

    if (changed) {
      localStorage.setItem(
        'nudge_pending_notifications',
        JSON.stringify(pending));
    }
  })();

})();

// ── Floating AI Assistant ─────────────────────
(function() {

  // Check if already injected
  if (document.getElementById('nudgeFloatOrb')) 
    return;

  // ── One-time cleanup of stale position data ──
  if (!localStorage.getItem('nudge_pos_v2')) {
    localStorage.removeItem('nudge_float_pos');
    localStorage.removeItem('nudge_float_orb_pos');
    localStorage.setItem('nudge_pos_v2', '1');
  }


  // ── Build HTML ──────────────────────────────
  const floatHTML = `
    <div id="nudgeFloatOrb" 
         class="nudge-float-orb"
         title="Ask Nudge">
      <svg width="22" height="22" 
           viewBox="0 0 24 24" fill="none" 
           stroke="currentColor" 
           stroke-width="2" 
           stroke-linecap="round">
        <polygon points="13 2 3 14 12 14 
                         11 22 21 10 12 10 13 2"/>
      </svg>
      <div class="nudge-float-pulse"></div>
    </div>

    <div id="nudgeFloatBox" 
         class="nudge-float-box hidden">
      <div class="nudge-float-header" 
           id="nudgeFloatHeader">
        <div class="nudge-float-header-left">
          <div class="nudge-float-dot"></div>
          <span class="nudge-float-title">
            Nudge AI
          </span>
          <span class="nudge-float-page" 
                id="nudgeFloatPage"></span>
        </div>
        <div class="nudge-float-header-right">
          <button class="nudge-float-history-btn hidden" 
                  id="nudgeFloatHistory" 
                  title="Chat History">
            <svg width="12" height="12" 
                 viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" 
                 stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            History
          </button>
          <button class="nudge-float-btn" 
                  id="nudgeFloatExpand"
                  title="Expand">
            <svg width="12" height="12" 
                 viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" 
                 stroke-width="2.5">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
          <button class="nudge-float-btn" 
                  id="nudgeFloatClose"
                  title="Close">
            <svg width="12" height="12" 
                 viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" 
                 stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="nudge-float-feed" 
           id="nudgeFloatFeed"></div>
      <div class="nudge-float-composer">
        <textarea 
          id="nudgeFloatInput"
          class="nudge-float-input"
          placeholder="Ask Nudge anything..."
          rows="1"></textarea>
        <button class="nudge-float-send" 
                id="nudgeFloatSend">
          <svg width="14" height="14" 
               viewBox="0 0 24 24" fill="none"
               stroke="currentColor" 
               stroke-width="2"
               stroke-linecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 
                             11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML(
    'beforeend', floatHTML);

  // ── Elements ────────────────────────────────
  const orb = document.getElementById(
    'nudgeFloatOrb');
  const box = document.getElementById(
    'nudgeFloatBox');
  const closeBtn = document.getElementById(
    'nudgeFloatClose');
  const expandBtn = document.getElementById(
    'nudgeFloatExpand');
  const feed = document.getElementById(
    'nudgeFloatFeed');
  const input = document.getElementById(
    'nudgeFloatInput');
  const sendBtn = document.getElementById(
    'nudgeFloatSend');
  const pageLabel = document.getElementById(
    'nudgeFloatPage');
  const historyBtn = document.getElementById(
    'nudgeFloatHistory');

  // ── Page context label ───────────────────── 
  const pageNames = {
    'dashboard.html': 'Overview',
    'email-logs.html': 'Email Logs',
    'work.html': 'Work Board',
    'schedule.html': 'Schedule',
    'inner.html': 'Inner',
    'owner.html': 'Business OS',
    'settings.html': 'Settings'
  };
  const currentPage = window.location.pathname
    .split('/').pop() || 'dashboard.html';
  pageLabel.textContent = 
    pageNames[currentPage] || '';

  // ── Position from localStorage ───────────── 
  function loadPosition() {
    const pos = JSON.parse(
      localStorage.getItem('nudge_float_pos') || 'null');
    if (pos && isFinite(pos.x) && isFinite(pos.y)) {
      // Clamp to visible viewport
      const maxX = window.innerWidth  - box.offsetWidth  - 10;
      const maxY = window.innerHeight - box.offsetHeight - 10;
      const x = Math.max(10, Math.min(pos.x, maxX));
      const y = Math.max(10, Math.min(pos.y, maxY));
      box.style.left   = x + 'px';
      box.style.top    = y + 'px';
      box.style.right  = 'auto';
      box.style.bottom = 'auto';
    }
    // If no valid saved position, CSS default (bottom/right) is used
  }

  function savePosition() {
    const rect = box.getBoundingClientRect();
    localStorage.setItem('nudge_float_pos',
      JSON.stringify({ 
        x: rect.left, 
        y: rect.top 
      }));
  }


  // Restore orb position if user previously dragged it
  (function() {
    const pos = JSON.parse(
      localStorage.getItem('nudge_float_orb_pos') || 'null');
    if (pos && isFinite(pos.x) && isFinite(pos.y)) {
      orb.style.left   = pos.x + 'px';
      orb.style.top    = pos.y + 'px';
      orb.style.right  = 'auto';
      orb.style.bottom = 'auto';
    }
  })();

  // ── Open/close state ─────────────────────── 
  function isOpen() {
    return localStorage.getItem(
      'nudge_float_open') === 'true';
  }

  function openBox() {
    box.classList.remove('hidden');
    orb.classList.add('active');
    orb.style.opacity = '0';
    orb.style.pointerEvents = 'none';
    orb.style.transform = 'scale(0.7)';
    localStorage.setItem('nudge_float_open', 'true');
    loadPosition();
    
    if (!historyLoaded) {
      initHistory();
    }
    
    input.focus();
  }

  function closeBox() {
    box.classList.add('hidden');
    orb.classList.remove('active');
    orb.style.opacity = '1';
    orb.style.pointerEvents = '';
    orb.style.transform = '';
    localStorage.setItem('nudge_float_open', 
      'false');
  }

  // ── Auto-open if was open on last page ───── 
  if (isOpen()) {
    setTimeout(openBox, 300);
  }

  // ── Orb drag + click (Pointer Events API) ───
  let orbDragging = false;
  let orbDidMove  = false;
  let orbPX = 0, orbPY = 0; // pointer start
  let orbOX = 0, orbOY = 0; // offset within orb

  orb.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    orb.setPointerCapture(e.pointerId);
    orbDragging = true;
    orbDidMove  = false;
    orbPX = e.clientX;
    orbPY = e.clientY;
    const r = orb.getBoundingClientRect();
    // Pin left/top from visual rect BEFORE clearing right/bottom
    orb.style.left   = r.left + 'px';
    orb.style.top    = r.top  + 'px';
    orb.style.right  = 'auto';
    orb.style.bottom = 'auto';
    orbOX = e.clientX - r.left;
    orbOY = e.clientY - r.top;
    orb.style.transition = 'none';
  });

  orb.addEventListener('pointermove', e => {
    if (!orbDragging) return;
    const dx = e.clientX - orbPX;
    const dy = e.clientY - orbPY;
    if (!orbDidMove && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      orbDidMove = true;
    }
    if (orbDidMove) {
      let x = e.clientX - orbOX;
      let y = e.clientY - orbOY;
      x = Math.max(0, Math.min(x, window.innerWidth  - orb.offsetWidth));
      y = Math.max(0, Math.min(y, window.innerHeight - orb.offsetHeight));
      orb.style.left = x + 'px';
      orb.style.top  = y + 'px';
    }
  });

  orb.addEventListener('pointerup', e => {
    if (!orbDragging) return;
    orbDragging = false;
    orb.style.transition = '';
    orb.releasePointerCapture(e.pointerId);
    if (!orbDidMove) {
      // It was a tap/click — toggle the chat box
      if (box.classList.contains('hidden')) {
        openBox();
      } else {
        closeBox();
      }
    } else {
      // Save final dragged position
      const r = orb.getBoundingClientRect();
      localStorage.setItem('nudge_float_orb_pos',
        JSON.stringify({ x: r.left, y: r.top }));
    }
  });

  orb.addEventListener('pointercancel', e => {
    orbDragging = false;
    orb.style.transition = '';
  });

  closeBtn.addEventListener('click', closeBox);

  // ── Expand/collapse ──────────────────────── 
  let isExpanded = false;
  expandBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    box.classList.toggle('expanded', isExpanded);
    if (isExpanded) {
      historyBtn.classList.remove('hidden');
    } else {
      historyBtn.classList.add('hidden');
    }
  });

  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      addMsg('Your chat history is now persistent across all pages and saved to Supabase.', 'ai');
    });
  }

  // ── Dragging ─────────────────────────────── 
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const header = document.getElementById(
    'nudgeFloatHeader');

  header.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    isDragging = true;
    const style = window.getComputedStyle(box);
    const left = parseFloat(style.left);
    const top = parseFloat(style.top);
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    dragOffsetX = e.clientX - left;
    dragOffsetY = e.clientY - top;
    box.style.transition = 'none';
    box.style.right = 'auto';
    box.style.bottom = 'auto';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    let x = e.clientX - dragOffsetX;
    let y = e.clientY - dragOffsetY;

    // Keep within viewport
    const maxX = window.innerWidth - 
                 box.offsetWidth;
    const maxY = window.innerHeight - 
                 box.offsetHeight;
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    box.style.left = x + 'px';
    box.style.top = y + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      box.style.transition = '';
      document.body.style.userSelect = '';
      savePosition();
    }
  });

  // Touch drag support for mobile
  header.addEventListener('touchstart', e => {
    if (e.target.closest('button')) return;
    const touch = e.touches[0];
    isDragging = true;
    const style = window.getComputedStyle(box);
    const left = parseFloat(style.left);
    const top = parseFloat(style.top);
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    dragOffsetX = touch.clientX - left;
    dragOffsetY = touch.clientY - top;
    box.style.right = 'auto';
    box.style.bottom = 'auto';
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const touch = e.touches[0];
    let x = touch.clientX - dragOffsetX;
    let y = touch.clientY - dragOffsetY;
    const maxX = window.innerWidth - 
                 box.offsetWidth;
    const maxY = window.innerHeight - 
                 box.offsetHeight;
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    box.style.left = x + 'px';
    box.style.top = y + 'px';
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      savePosition();
    }
  });

  // ── History & Chat messages ────────────────
  let historyLoaded = false;
  
  async function initHistory() {
    if (historyLoaded) return;
    historyLoaded = true;
    
    feed.innerHTML = '';
    let history = [];
    
    try {
      if (window.supabase) {
        const { data, error } = await window.supabase
          .from('ai_chat_history')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          history = data;
        }
      }
    } catch(e) {
      console.log('Supabase history load failed', e);
    }

    if (!history.length) {
      history = JSON.parse(localStorage.getItem('nudge_ai_history') || '[]');
    }

    if (history.length > 0) {
      history.forEach(msg => {
        addMsgToDOM(msg.content, msg.role);
      });
      // Scroll to bottom
      setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 50);
    } else {
      const welcomes = {
        'dashboard.html': 'Good morning. Your workspace is ready. Ask me to brief you on today.',
        'email-logs.html': 'I can see your inbox. Ask me to summarize emails, draft replies, or extract tasks.',
        'work.html': 'Your task board is loaded. Ask me to create tasks, move items, or schedule a meeting.',
        'schedule.html': 'I can see your calendar. Ask me to schedule a meeting or block time.',
        'inner.html': 'Team workspace open. Ask me about task assignments or team status.',
        'owner.html': 'Business OS open. Ask me about team performance or department status.',
        'settings.html': 'Settings open. Ask me how to configure Nudge.'
      };
      const welcomeText = welcomes[currentPage] || 'Nudge is ready. How can I help?';
      addMsg(welcomeText, 'ai');
    }
  }

  function addMsgToDOM(text, type) {
    const msg = document.createElement('div');
    msg.className = 'nudge-float-msg ' + type;
    msg.textContent = text;
    feed.appendChild(msg);
    feed.scrollTop = feed.scrollHeight;
  }

  function addMeetingMsg(link, toEmail, date, time, createdBy) {
    const container = document.createElement('div');
    container.className = 'nudge-float-msg ai meeting';
    const html = `
      <div style="margin-bottom:8px; font-weight:600">Meeting created ✓</div>
      <div style="font-size:13px; margin-bottom:6px;">${createdBy ? window.NudgeShared.esc(createdBy) + ' — ' : ''}${window.NudgeShared.esc(date)} ${window.NudgeShared.esc(time)} — Sent to: ${window.NudgeShared.esc(toEmail)}</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <a class="btn-secondary btn-sm" href="${link}" target="_blank">Join Meeting</a>
        <a class="btn-tertiary btn-sm" href="schedule.html">View in schedule</a>
      </div>
    `;
    container.innerHTML = html;
    feed.appendChild(container);
    feed.scrollTop = feed.scrollHeight;
    // Save to AI history
    saveMsgToHistory(`Meeting created: ${link}`, 'ai');
  }

  async function saveMsgToHistory(text, role) {
    const history = JSON.parse(localStorage.getItem('nudge_ai_history') || '[]');
    history.push({ role, content: text, created_at: new Date().toISOString() });
    if(history.length > 100) history.shift();
    localStorage.setItem('nudge_ai_history', JSON.stringify(history));

    try {
      if (window.supabase) {
        await window.supabase.from('ai_chat_history').insert([{
          role: role,
          content: text
        }]);
      }
    } catch(e) {}
  }

  function addMsg(text, type) {
    addMsgToDOM(text, type);
    if (type === 'ai' || type === 'user') {
      saveMsgToHistory(text, type);
    }
  }

  function removeLoading() {
    const l = feed.querySelector('.loading');
    if (l) l.remove();
  }

  // ── Send message ─────────────────────────── 
  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
    input.style.height = 'auto';

    const groqKey = localStorage.getItem('nudge_groq_key');
    const geminiKey = localStorage.getItem('nudge_gemini_key');
    const key = groqKey || geminiKey;

    if (!key) {
      setTimeout(() => {
        addMsg(
          'AI is not configured. For now I can ' +
          'navigate you — try "go to inbox" or ' +
          '"open work board".',
          'ai'
        );
        handleNavCommand(text);
      }, 400);
      return;
    }

    addMsg('Thinking...', 'ai loading');

    // Gather live data context
    let tasksCtx = '[]';
    let scheduleCtx = '[]';
    let teamCtx = '[]';
    let emailsCtx = '[]';

    try {
      if (window.supabase) {
        const [t, s, m, e] = await Promise.all([
          window.supabase.from('tasks').select('title,status,priority,company_id').limit(10),
          window.supabase.from('schedule_blocks').select('title,date,start_time').limit(10),
          window.supabase.from('profiles').select('full_name,role,department').limit(10),
          window.supabase.from('connected_emails').select('subject,snippet,sender,date').limit(10)
        ]);
        tasksCtx = JSON.stringify(t.data || []);
        scheduleCtx = JSON.stringify(s.data || []);
        teamCtx = JSON.stringify(m.data || []);
        if (e && e.data && e.data.length > 0) {
          emailsCtx = JSON.stringify(e.data);
        } else {
          // Prefer saved demo inbox when available, otherwise local email log
          const demoInbox = (window.DEMO && window.DEMO.inbox) ? window.DEMO.inbox : null;
          emailsCtx = JSON.stringify(demoInbox || JSON.parse(localStorage.getItem('nudge_email_log_data') || '[]'));
        }
      } else {
        emailsCtx = localStorage.getItem('nudge_email_log_data') || '[]';
      }
    } catch(err) {
      console.log("Could not fetch live context", err);
    }
    
    // Get recent chat context
    let chatContext = '';
    try {
      const hist = JSON.parse(localStorage.getItem('nudge_ai_history') || '[]');
      const recent = hist.slice(-10);
      chatContext = recent.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\\n');
    } catch(e) {}

    // Build page-aware context
    const context = `
You are Nudge, an AI business operating system. You have full visibility over the company's real data.
Current page: ${pageNames[currentPage] || currentPage}

--- RECENT CHAT HISTORY ---
${chatContext}
---------------------------

--- LIVE BUSINESS DATA ---
TASKS: ${tasksCtx}
SCHEDULE: ${scheduleCtx}
TEAM: ${teamCtx}
EMAILS: ${emailsCtx}
--------------------------

Instructions:
1. READ THE REAL DATA above to answer questions (e.g. who is on the team, what tasks exist). Don't invent fake data.
2. If the user asks to DRAFT an email/reply (even with typos like 'dafrta'), write the ACTUAL full draft in your 'message'. DO NOT give generic summaries.
3. Interpret user typos intelligently (e.g. 'dafrta' = 'draft', 'inbux' = 'inbox').
4. If the user asks to navigate to a page, DO NOT set navigateTo yet. First, ASK for their confirmation in the 'message' (e.g. "Should I open the inbox for you?"). ONLY set navigateTo if they explicitly confirm 'yes', 'do it', etc. based on recent chat history.
5. If the user explicitly confirmed navigation in this prompt or commanded it forcefully, set navigateTo (e.g., "work.html", "schedule.html", "email-logs.html", "inner.html", "owner.html", "dashboard.html").
6. If the user asks you to send a message to the team or tell someone something in the chat, set action to "send_inner_message" and include the exact message in innerMessagePayload.
7. If the user intends to schedule a meeting (e.g., "schedule a meeting with Mary tomorrow at 10am"), set action to "create_meeting" and include a JSON object named "meetingPayload" with fields: "toName", "toEmail", "topic", "time" (ISO or human text). Do NOT actually create the meeting unless the user confirmed — return an explicit confirmation prompt in "message" when uncertain.

Respond in valid JSON only:
{
  "message": "your conversational response text",
  "navigateTo": "page.html or null",
  "action": "none|navigate|create_task|send_inner_message|create_meeting",
  "innerMessagePayload": "exact message to post to the team chat, if action is send_inner_message",
  "meetingPayload": { "toName": "", "toEmail": "", "topic": "", "time": "" }
}
`;

    try {
      const clean = await window.nudgeAI(text, context);
      removeLoading();
      
      try {
        const parsed = JSON.parse(clean);
        addMsg(parsed.message || 'Done.', 'ai');

        if (parsed.action === 'send_inner_message' && parsed.innerMessagePayload) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newMsg = {
            author: localStorage.getItem('nudge_user_name') || 'You',
            initials: (localStorage.getItem('nudge_user_name') || 'Y').charAt(0).toUpperCase(),
            text: parsed.innerMessagePayload,
            time: timeStr
          };
          
          if (window.supabase) {
            await window.supabase.from('chat_messages').insert([newMsg]);
          } else {
            const msgs = JSON.parse(localStorage.getItem('nudge_inner_chat') || '[]');
            msgs.push(newMsg);
            localStorage.setItem('nudge_inner_chat', JSON.stringify(msgs));
          }
          addMsg("I've posted that to the Inner team chat for you.", "ai loading");
        }

        // Create meeting action
        if (parsed.action === 'create_meeting' && parsed.meetingPayload) {
          try {
            const p = parsed.meetingPayload;
            const res = window.NudgeShared.handleMeetingCreation(p.toName, p.toEmail, p.topic, p.time);
            addMeetingMsg(res.link, p.toEmail || p.toName || '', res.event.date, res.event.start_time, localStorage.getItem('nudge_user_name'));
            addMsg(`Created meeting ${res.event.title} and added to your schedule.`, 'ai');
          } catch (e) {
            addMsg('Could not create meeting in demo mode.', 'ai');
          }
        }

        if (parsed.navigateTo && parsed.navigateTo !== 'null') {
          setTimeout(() => {
            window.location.href = parsed.navigateTo;
          }, 800);
        }
      } catch {
        addMsg(clean || 'I processed that.', 'ai');
      }

    } catch(e) {
      removeLoading();
      const msg = e.message.includes('API') 
        ? `AI Error: ${e.message}. Check your keys in Settings.`
        : 'Could not reach AI. Check your internet connection or settings.';
      addMsg(msg, 'ai');
    }
  }

// ── Unified AI Call Function (Groq/Llama with Gemini fallback) ───────────────
window.nudgeAI = async function(promptText, systemContext = '') {
  const groqKey = localStorage.getItem('nudge_groq_key');
  const geminiKey = localStorage.getItem('nudge_gemini_key');
  
  if (!groqKey && !geminiKey) {
    throw new Error('Missing Groq or Gemini API key');
  }

  // Try Groq first
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + groqKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemContext || 'You are Nudge, an AI business assistant.' },
            { role: 'user',   content: promptText }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`Groq error (${res.status})`);
      }
      const data = await res.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.warn('Groq failed, trying Gemini fallback', e);
    }
  }

  // Fall back to Gemini
  if (geminiKey) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=' + geminiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: (systemContext || 'You are Nudge, an AI business assistant.') + '\n\nUser: ' + promptText }] }]
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Gemini error (${res.status}): ${errData.error?.message || res.statusText}`);
    }
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error('No AI provider configured');
};

  // ── Navigation without AI key ────────────── 
  function handleNavCommand(text) {
    const lower = text.toLowerCase();
    const navMap = {
      'inbox': 'email-logs.html',
      'email': 'email-logs.html',
      'work': 'work.html',
      'task': 'work.html',
      'board': 'work.html',
      'schedule': 'schedule.html',
      'calendar': 'schedule.html',
      'overview': 'dashboard.html',
      'dashboard': 'dashboard.html',
      'inner': 'inner.html',
      'team': 'inner.html',
      'business': 'owner.html',
      'owner': 'owner.html',
      'settings': 'settings.html'
    };

    for (const [key, page] of 
         Object.entries(navMap)) {
      if (lower.includes(key)) {
        addMsg(`Taking you to ${page
          .replace('.html', '')}...`, 'ai');
        setTimeout(() => {
          window.location.href = page;
        }, 600);
        return;
      }
    }
  }

  sendBtn.addEventListener('click', handleSend);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    // Auto resize textarea
    setTimeout(() => {
      input.style.height = 'auto';
      input.style.height = Math.min(
        input.scrollHeight, 80) + 'px';
    }, 0);
  });

})();
