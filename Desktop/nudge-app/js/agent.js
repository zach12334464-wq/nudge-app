(function() {

  // Initial state
  const EMPTY_AGENT = {
    name: localStorage.getItem('nudge_user_name')?.split(' ')[0] || 'Agent',
    role: 'Agent',
    department: 'Unassigned',
    assigned: [],
    unassigned: [],
    resolved: 0,
    deptOpen: 0
  };

  async function loadAgent() {
    // Try real backend
    const data = await fetch('/api/agent/dashboard')
      .then(r => r.json())
      .catch(() => EMPTY_AGENT);

    render(data);
  }

  function render(data) {
    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' :
                     hour < 17 ? 'Good afternoon' :
                     'Good evening';
    document.getElementById('agentGreeting')
      .textContent = `${greeting}, ${data.name}`;

    document.getElementById('agentDeptBadge')
      .textContent = data.department;
    document.getElementById('agentRoleBadge')
      .textContent = data.role;

    // Metrics
    document.getElementById('agentAssigned')
      .textContent = data.assigned.length;
    document.getElementById('agentUnassigned')
      .textContent = data.unassigned.length;
    document.getElementById('agentResolved')
      .textContent = data.resolved;
    document.getElementById('deptOpen')
      .textContent = data.deptOpen;

    // Assigned threads
    const assignedEl = 
      document.getElementById('agentThreads');
    assignedEl.innerHTML = data.assigned.map(t => `
      <div class="email-card unread">
        <div class="avatar">
          ${t.from.slice(0,2).toUpperCase()}
        </div>
        <div class="email-sender">
          <div class="sender-name">${t.from}</div>
        </div>
        <div class="email-subject">${t.subject}</div>
        <div class="email-meta">
          <span class="tag ${t.priority}">
            ${t.priority}
          </span>
          <span class="email-time">${t.time}</span>
        </div>
        <div class="email-actions">
          <button class="btn-primary btn-sm"
            onclick="window.location.href=
              'prototype.html?thread=${t.id}'">
            Open thread
          </button>
          <button class="btn-secondary btn-sm 
                         resolve-btn"
                  data-id="${t.id}">
            Resolve
          </button>
        </div>
      </div>
    `).join('') || 
    '<div class="empty-state">No assigned threads</div>';

    // Unassigned threads
    const unassignedEl = 
      document.getElementById('unassignedThreads');
    unassignedEl.innerHTML = data.unassigned.map(t =>`
      <div class="email-card">
        <div class="avatar">
          ${t.from.slice(0,2).toUpperCase()}
        </div>
        <div class="email-sender">
          <div class="sender-name">${t.from}</div>
        </div>
        <div class="email-subject">${t.subject}</div>
        <div class="email-meta">
          <span class="tag ${t.priority}">
            ${t.priority}
          </span>
          <span class="email-time">${t.time}</span>
        </div>
        <div class="email-actions">
          <button class="btn-approve btn-sm 
                         claim-btn"
                  data-id="${t.id}">
            Claim thread
          </button>
        </div>
      </div>
    `).join('') || 
    '<div class="empty-state">No unassigned threads</div>';

    // Claim button
    unassignedEl.querySelectorAll('.claim-btn')
      .forEach(btn => {
        btn.addEventListener('click', async () => {
          await fetch(
            `/api/agent/claim/${btn.dataset.id}`,
            { method: 'POST' }
          ).catch(() => {});
          btn.textContent = 'Claimed ✓';
          btn.disabled = true;
          btn.className = 'btn-secondary btn-sm';
        });
      });

    // Resolve button
    assignedEl.querySelectorAll('.resolve-btn')
      .forEach(btn => {
        btn.addEventListener('click', async () => {
          await fetch(
            `/api/agent/resolve/${btn.dataset.id}`,
            { method: 'POST' }
          ).catch(() => {});
          btn.closest('.email-card').style.opacity 
            = '0.5';
          btn.textContent = 'Resolved ✓';
          btn.disabled = true;
        });
      });
  }

  loadAgent();

})();
