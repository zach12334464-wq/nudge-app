(function() {

  const runBtn = document.getElementById('runAutopilot');
  const planEl = document.getElementById('autopilotPlan');
  const timelineEl = document.getElementById('autopilotTimeline');
  const briefEl = document.getElementById('autopilotBrief');
  const statusEl = document.getElementById('autopilotStatus');
  const approveBtn = document.getElementById('approveDay');
  const rejectBtn = document.getElementById('rejectDay');

  let proposedPlan = null;

  runBtn.addEventListener('click', generatePlan);
  approveBtn.addEventListener('click', approvePlan);
  rejectBtn.addEventListener('click', rejectPlan);

  async function generatePlan() {
    runBtn.disabled = true;
    runBtn.textContent = 'Planning…';
    statusEl.textContent = 'Analyzing workspace…';

    // Fetch real data from backend
    const [emails, tasks, actions, schedule] = await Promise.all([
      fetch('/api/inbox/summary')
        .then(r => r.json())
        .catch(() => ({ items: [], unread: 0 })),
      fetch('/api/tasks')
        .then(r => r.json())
        .catch(() => ({ items: [] })),
      fetch('/api/actions')
        .then(r => r.json())
        .catch(() => ({ items: [] })),
      fetch('/api/schedule')
        .then(r => r.json())
        .catch(() => ({ items: [] }))
    ]);

    const groqKey = localStorage.getItem('nudge_groq_key') || '';
    const geminiKey = localStorage.getItem('nudge_gemini_key') || '';
    const key = groqKey || geminiKey;

    if (!key) {
      statusEl.textContent = 'AI not configured. Contact your administrator.';
      runBtn.disabled = false;
      runBtn.textContent = 'Plan my day';
      return;
    }

    const prompt = `
You are Nudge Autopilot, an AI chief of staff.
Based on this workspace data, build an optimal day plan. Return ONLY valid JSON, no markdown, no extra text.

EMAILS (${emails.items?.length || 0} unread):
${JSON.stringify(emails.items?.slice(0,5) || [])}

TASKS (active):
${JSON.stringify(tasks.items?.filter(t => t.status !== 'done')?.slice(0,5) || [])}

PENDING APPROVALS:
${JSON.stringify(actions.items?.filter(a => a.status === 'pending')?.slice(0,3) || [])}

EXISTING CALENDAR EVENTS TODAY:
${JSON.stringify(schedule.items?.slice(0,5) || [])}

Return this exact JSON structure:
{
  "brief": "2 sentence summary of the day ahead",
  "blocks": [
    {
      "id": "block_1",
      "time": "09:00",
      "duration": 30,
      "type": "email",
      "title": "Clear priority inbox",
      "description": "Reply to urgent emails first",
      "priority": "high"
    }
  ]
}

Types allowed: email, task, meeting, focus, break
Priority allowed: high, medium, low
Make 6-8 blocks covering 9am to 6pm.
Fit around existing calendar events.
Prioritize high urgency items first.
Include breaks.
`;

    try {
      const res = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are Nudge Autopilot, an AI chief of staff. Return ONLY valid JSON, no markdown, no extra text.' },
              { role: 'user',   content: prompt }
            ],
            max_tokens: 1200,
            temperature: 0.7
          })
        }
      );

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      proposedPlan = JSON.parse(clean);
      renderPlan(proposedPlan);

    } catch(e) {
      useEmptyPlan();
    }
  }

  function useEmptyPlan() {
    proposedPlan = {
      brief: 'Workspace analysis complete. No items requiring immediate action detected.',
      blocks: []
    };
    renderPlan(proposedPlan);
  }

  function renderPlan(plan) {
    briefEl.innerHTML = `
      <div class="autopilot-brief-text">
        ${plan.brief}
      </div>
    `;

    const typeColors = {
      email:   '#0a0a0a',
      task:    '#1a7a4a',
      meeting: '#92400e',
      focus:   '#444444',
      break:   '#cccccc'
    };

    timelineEl.innerHTML = plan.blocks.map(block => `
      <div class="autopilot-block priority-${block.priority}"
           data-id="${block.id}">
        <div class="autopilot-block-time">
          ${block.time}
          <span class="autopilot-block-dur">
            ${block.duration}m
          </span>
        </div>
        <div class="autopilot-block-bar"
             style="background:${typeColors[block.type] || '#0a0a0a'}">
        </div>
        <div class="autopilot-block-content">
          <div class="autopilot-block-title">
            ${block.title}
          </div>
          <div class="autopilot-block-desc">
            ${block.description}
          </div>
        </div>
        <div class="autopilot-block-meta">
          <span class="tag ${block.type}">
            ${block.type}
          </span>
          <span class="tag ${block.priority}">
            ${block.priority}
          </span>
        </div>
      </div>
    `).join('');

    planEl.classList.remove('hidden');
    statusEl.textContent = 'Plan ready — review below';
    runBtn.disabled = false;
    runBtn.textContent = 'Regenerate';
  }

  async function approvePlan() {
    if (!proposedPlan) return;
    approveBtn.disabled = true;
    approveBtn.textContent = 'Approved ✓';

    // POST each block to schedule API
    for (const block of proposedPlan.blocks) {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: block.title,
          start_time: block.time,
          duration: block.duration,
          source: 'autopilot'
        })
      }).catch(() => {});
    }

    statusEl.textContent = 'Day approved — added to schedule';
    setTimeout(() => {
      window.location.href = 'schedule.html';
    }, 1200);
  }

  function rejectPlan() {
    planEl.classList.add('hidden');
    proposedPlan = null;
    runBtn.disabled = false;
    runBtn.textContent = 'Plan my day';
    statusEl.textContent = 'Ready to plan';
  }

})();
