/* ═══════════════════════════════════════════════
   NUDGE — dashboard.js  New dashboard logic
   Loads data via API, computes metrics, renders previews, Gemini brief
   ═══════════════════════════════════════════════ */

// Reuse shared utils + ai.js
const esc = NudgeShared.esc;

async function loadDashboard() {
  try {
    const [tasks, actions, scheduleBlocks, updates, links] = await Promise.all([
      SupabaseData.getTasks(),
      SupabaseData.getActions(),
      SupabaseData.getScheduleBlocks(),
      SupabaseData.getCompanyUpdates ? SupabaseData.getCompanyUpdates() : Promise.resolve([]),
      SupabaseData.getQuickLinks ? SupabaseData.getQuickLinks() : Promise.resolve([])
    ]);

    const demo = window.DEMO || {};

    // Use Supabase data when present, otherwise fall back to DEMO values
    const tasksData = (tasks && tasks.length) ? tasks : (demo.tasks || []);
    const actionsData = (actions && actions.length) ? actions : (demo.actions || []);
    const scheduleData = (scheduleBlocks && scheduleBlocks.length) ? scheduleBlocks : (demo.schedule || []);
    // Company updates: prefer localStorage override, then Supabase, then DEMO
    const savedUpdates = JSON.parse(localStorage.getItem('nudge_company_updates') || 'null');
    const updatesData = savedUpdates && savedUpdates.length ? savedUpdates : ((updates && updates.length) ? updates : (demo.companyUpdates || []));
    const linksData = (links && links.length) ? links : (demo.quickLinks || []);

    // Update Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const userName = localStorage.getItem('nudge_user_name') || 'there';
    document.getElementById('dashGreeting').textContent = greeting;
    document.getElementById('dashWelcome').textContent = `Here's your workspace, ${userName.split(' ')[0]}`;

    // Compute metrics (use DEMO.metrics where appropriate)
    const demoMetrics = demo.metrics || {};
    const activeTasks = (tasksData && tasksData.filter && tasksData.filter(t => t.status !== 'done').length) || demoMetrics.activeTasks || 0;
    const pendingActions = (actionsData && actionsData.filter && actionsData.filter(a => a.status === 'pending').length) || demoMetrics.pending || 0;
    const todayDate = new Date().toISOString().split('T')[0];
    const todayEvents = (scheduleData && scheduleData.filter && scheduleData.filter(s => s.date === todayDate).length) || demoMetrics.events || scheduleData.length || 0;
    const unreadEmails = demoMetrics.unread || ((demo.inbox || []).filter(e => e.unread).length) || 0;
    const urgentEmails = demoMetrics.urgent || ((demo.inbox || []).filter(e => e.tags && e.tags.includes('Urgent')).length) || 0;
    const overdueTasks = (tasksData && tasksData.filter && tasksData.filter(t => t.due_date && new Date(t.due_date) < new Date()).length) || demoMetrics.overdue || 0;
    const nextEvent = (scheduleData && scheduleData.find && (scheduleData.find(s => s.date === todayDate) || scheduleData[0])?.title) || 'No events';

    // Update metric cards
    document.getElementById('unreadCount').textContent = unreadEmails;
    document.getElementById('urgentCount').textContent = `${urgentEmails} urgent`;
    document.getElementById('pendingCount').textContent = pendingActions;
    document.getElementById('taskCount').textContent = activeTasks;
    document.getElementById('taskOverdueCount').textContent = overdueTasks === 0 ? '' : `${overdueTasks} overdue`;
    document.getElementById('eventCount').textContent = todayEvents;
    document.getElementById('nextEvent').textContent = `Next: ${nextEvent}`;

    // Update nav badges
    NudgeShared.updateBadges(unreadEmails, pendingActions);

    // Render Company Updates
    const updatesList = document.getElementById('companyUpdates');
    const displayUpdates = (updatesData && updatesData.length > 0) ? updatesData : [];
    // If owner, show edit button
    const role = localStorage.getItem('nudge_user_role');
    if (role === 'owner') {
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className = 'btn-sm';
      editBtn.id = 'editCompanyUpdates';
      const headerEl = updatesList.parentElement?.querySelector('.col-label');
      if (headerEl) headerEl.insertAdjacentElement('afterend', editBtn);
      else updatesList.parentElement?.insertBefore(editBtn, updatesList);
      editBtn.addEventListener('click', () => {
        const title = prompt('Update title:');
        if (!title) return;
        const body = prompt('Update body:');
        if (!body) return;
        const newUpd = { id: crypto.randomUUID(), date: new Date().toISOString().split('T')[0], title, body };
        const saved = JSON.parse(localStorage.getItem('nudge_company_updates') || 'null') || [];
        saved.unshift(newUpd);
        localStorage.setItem('nudge_company_updates', JSON.stringify(saved));
        loadDashboard();
      });
    }

    if (displayUpdates.length === 0) {
      updatesList.innerHTML = '<div style="font-size:11px; color:var(--muted); padding:10px;">No updates found.</div>';
    } else {
      updatesList.innerHTML = displayUpdates.map(upd => `
        <div style="padding:10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--page);">
          <div style="font-size:10px; color:var(--muted); margin-bottom:4px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">${esc(upd.date)}</div>
          <div style="font-size:12px; font-weight:600; color:var(--text);">${esc(upd.title)}</div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px; line-height:1.4;">${esc(upd.body)}</div>
        </div>
      `).join('');
    }

    // Render Quick Links
    const linksList = document.getElementById('quickLinks');
    const displayLinks = (linksData && linksData.length > 0) ? linksData : [];
    if (displayLinks.length === 0) {
       linksList.innerHTML = '<div style="font-size:11px; color:var(--muted); padding:10px;">No links configured.</div>';
    } else {
       linksList.innerHTML = displayLinks.map(link => `
        <a href="${esc(link.url)}" class="btn-secondary" style="justify-content:center; padding:14px 12px; flex-direction:column; gap:6px; height:auto;">
          <span style="font-size:16px;">${esc(link.icon)}</span>
          <span style="font-size:10px;">${esc(link.label)}</span>
        </a>
      `).join('');
    }

    // Render today's schedule
    const schedList = document.getElementById('dashSchedule');
    const displaySched = (scheduleData && scheduleData.length > 0) ? (scheduleData.filter(s => s.date === todayDate).length ? scheduleData.filter(s => s.date === todayDate) : scheduleData).map(b => ({
      time: b.start || b.start_time || '09:00',
      title: b.title,
      location: b.source || b.location || 'Scheduled',
      meetLink: b.meetLink || b.meetlink || b.meeting
    })) : [];
    
    if (displaySched.length === 0) {
      schedList.innerHTML = '<div style="font-size:11px; color:var(--muted); padding:10px;">No events today.</div>';
    } else {
      schedList.innerHTML = displaySched.slice(0, 3).map(event => `
        <div class="schedule-block">
          <div class="schedule-time">${esc(event.time)}</div>
          <div>
            <div class="schedule-title">${esc(event.title)}</div>
            <div class="schedule-sub">${esc(event.location)}</div>
          </div>
        </div>
      `).join('');
    }

    // Render pending approvals preview (Supabase or DEMO)
    const approvalPreview = document.getElementById('approvalPreview');
    const pending = (actionsData && actionsData.filter) ? actionsData.filter(a => a.status === 'pending').slice(0, 3) : [];
    if (pending.length === 0) {
      approvalPreview.innerHTML = '<div class="empty-state" style="font-size:12px;padding:12px;">No pending approvals</div>';
    } else {
      approvalPreview.innerHTML = pending.map(a => `
        <div class="approval-preview-item">
          <div class="approval-preview-title">${esc(a.subject || a.title)}</div>
          <div class="approval-actions-mini">
            <button class="btn-approve-mini" data-approve="${esc(a.id)}">Approve</button>
            <button class="btn-decline-mini" data-decline="${esc(a.id)}">Decline</button>
          </div>
        </div>
      `).join('');

      approvalPreview.querySelectorAll('[data-approve]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.approve;
          // If using demo actions, update localStorage; otherwise call Supabase
          if (actionsData === (demo.actions || [])) {
            const saved = JSON.parse(localStorage.getItem('nudge_actions') || 'null') || [...(demo.actions || [])];
            const idx = saved.findIndex(s => s.id === id);
            if (idx > -1) { saved[idx].status = 'approved'; localStorage.setItem('nudge_actions', JSON.stringify(saved)); }
            loadDashboard();
          } else {
            await SupabaseData.updateActionStatus(id, 'approved');
            loadDashboard();
          }
        });
      });
      approvalPreview.querySelectorAll('[data-decline]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.decline;
          if (actionsData === (demo.actions || [])) {
            const saved = JSON.parse(localStorage.getItem('nudge_actions') || 'null') || [...(demo.actions || [])];
            const idx = saved.findIndex(s => s.id === id);
            if (idx > -1) { saved[idx].status = 'declined'; localStorage.setItem('nudge_actions', JSON.stringify(saved)); }
            loadDashboard();
          } else {
            await SupabaseData.updateActionStatus(id, 'declined');
            loadDashboard();
          }
        });
      });
    }

    // Render priority emails (from DEMO inbox when available)
    const priorityEl = document.getElementById('priorityEmails');
    const inbox = demo.inbox || [];
    const priority = inbox.filter(e => e.unread).slice(0, 3);
    if (priority.length === 0) {
      priorityEl.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:10px;">No priority emails</div>';
    } else {
      priorityEl.innerHTML = priority.map(e => `
        <div class="priority-item">
          <div class="priority-title">${esc(e.subject)}</div>
          <div class="priority-sub">${esc(e.snippet)}</div>
        </div>
      `).join('');
    }

    // Generate brief (AI or fallback)
    generateBrief({
      unread: unreadEmails,
      urgent: urgentEmails,
      pending: pendingActions,
      active: activeTasks,
      overdue: overdueTasks,
      today: todayEvents,
      next: nextEvent,
      demo
    });

  } catch (error) {
    console.error('Dashboard load failed:', error);
    // Fall back to DEMO if available
    const demo = window.DEMO || {};
    const m = demo.metrics || {};
    document.getElementById('unreadCount').textContent = m.unread || 0;
    document.getElementById('pendingCount').textContent = m.pending || 0;
    document.getElementById('taskCount').textContent = m.activeTasks || 0;
    document.getElementById('eventCount').textContent = m.events || 0;
    NudgeShared.updateBadges(m.unread || 0, m.pending || 0);
  }
}

async function generateBrief(ctx) {
  const briefBody = document.getElementById('briefBody');
  const briefTime = document.getElementById('briefTime');
  
  briefBody.textContent = 'Loading your brief...';

  try {
    const groqKey = localStorage.getItem('nudge_groq_key');
    const geminiKey = localStorage.getItem('nudge_gemini_key');
    const key = groqKey || geminiKey;
    
    if (!key) {
      // If no API key but DEMO context is available, show the defined fallback brief.
      if (ctx && ctx.demo) {
        briefBody.textContent = 'You have 7 unread emails, 2 urgent. 3 pending approvals. Revenue up 18% this quarter. Mary Johnson meeting at 10am today.';
        briefTime.textContent = 'Using DEMO fallback';
        return;
      }
      briefBody.textContent = 'Add your Groq or Gemini API key in Settings → AI to enable daily briefs.';
      return;
    }

    const prompt = `You are Nudge, an AI chief of staff. Give a 2-3 sentence morning brief based on:
- ${ctx.unread} unread emails, ${ctx.urgent || 0} urgent
- ${ctx.pending} pending approvals  
- ${ctx.active} active tasks, ${ctx.overdue || 0} overdue
- ${ctx.today} events today, next: ${ctx.next}

Be direct, professional, and actionable. No bullet points. No emoji.`;

    const response = await askGemini(prompt, ctx);
    briefBody.textContent = response;
    briefTime.textContent = 'Generated just now';

  } catch (error) {
    // If DEMO context exists, show the specific DEMO fallback sentence per requirements
    if (ctx && ctx.demo) {
      briefBody.textContent = 'You have 7 unread emails, 2 urgent. 3 pending approvals. Revenue up 18% this quarter. Mary Johnson meeting at 10am today.';
      briefTime.textContent = 'Using DEMO fallback';
      return;
    }
    briefBody.textContent = `Good morning. You have ${ctx.unread} unread emails (${ctx.urgent || 0} urgent), ${ctx.pending} pending approvals, ${ctx.active} active tasks (${ctx.overdue || 0} overdue), and ${ctx.today} events today (next: ${ctx.next}). Prioritize urgent items first.`;
    briefTime.textContent = 'Using fallback';
  }
}

// Init on load
document.addEventListener('DOMContentLoaded', loadDashboard);
document.getElementById('refreshBrief')?.addEventListener('click', () => loadDashboard());

// Expose for shared/reuse
window.Dashboard = { loadDashboard, generateBrief };

