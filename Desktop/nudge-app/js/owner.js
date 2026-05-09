(function() {

  // State
  let state = {
    departments: [],
    team: [],
    emails: [],
    rules: []
  };

  // Load/save helpers for owner page state
  function loadState() {
    const saved = localStorage.getItem('nudge_owner_state');
    if (saved) {
      try {
        state = JSON.parse(saved);
        return true;
      } catch(e) {}
    }
    return false;
  }

  function saveState() {
    localStorage.setItem('nudge_owner_state', JSON.stringify(state));
  }

  // ── Load data ────────────────────────────────
  async function loadAll() {
    let retries = 0;
    while (!window.supabaseClient && retries < 10) {
      await new Promise(r => setTimeout(r, 100));
      retries++;
    }
    // Prefer persisted owner state first
    const loaded = loadState();
    if (loaded) {
      renderAll();
      return;
    }

    if (!window.supabaseClient) {
      // No Supabase — load from DEMO if available
      const demo = window.DEMO || {};
      state.departments = demo.departments ? [...demo.departments] : [];
      state.team = demo.team ? [...demo.team] : [];
      state.emails = demo.companyEmails ? [...demo.companyEmails] : [];
      state.rules = demo.routingRules ? [...demo.routingRules] : [];
      renderAll();
      saveState();
      return;
    }

    const [deptRes, teamRes, emailRes] = await Promise.all([
      window.supabaseClient.from('departments').select('*'),
      window.supabaseClient.from('team_members').select('*'),
      window.supabaseClient.from('connected_emails').select('*')
    ]);

    state.departments = deptRes.data || [];
    state.team = teamRes.data ? teamRes.data.map(p => ({
       id: p.id,
       name: p.name,
       email: p.email,
       role: p.role,
       dept: p.department_name,
       department_color: p.department_color,
       status: p.status || 'invited'
    })) : [];
    
    state.emails = emailRes.data ? emailRes.data.map(e => ({
       id: e.id,
       address: e.email,
       label: e.display_name,
       department_name: e.department,
       provider: e.provider
    })) : [];

    state.rules = [];
    renderAll();
  }

  // ── Render everything ────────────────────────
  function renderAll() {
    renderHealthBar();
    renderDepts();
    renderTeam();
    renderEmails();
    renderRules();
    populateDeptSelects();
  }

  function renderHealthBar() {
    const totalAgents = state.team.length;
    const totalDepts = state.departments.length;
    const totalEmails = state.emails.length;
    const totalOpen = state.team.reduce(
      (sum, m) => sum + (m.open_threads || 0), 0);

    document.getElementById('totalAgents')
      .textContent = totalAgents;
    document.getElementById('totalDepts')
      .textContent = totalDepts;
    document.getElementById('totalEmails')
      .textContent = totalEmails;
    document.getElementById('totalOpen')
      .textContent = totalOpen;
  }

  function renderDepts() {
    const grid = document.getElementById('deptGrid');
    grid.innerHTML = state.departments.map(d => `
      <div class="owner-dept-card">
        <div class="owner-dept-color-bar"
             style="background:${d.color}"></div>
        <div class="owner-dept-body">
          <div class="owner-dept-name">${d.name}</div>
          <div class="owner-dept-stats">
            <span>${d.agents || 0} agents</span>
            <span>${d.emails || 0} emails</span>
            <span class="${(d.open_threads||0) > 3 ? 
              'text-danger' : ''}">
              ${d.open_threads || 0} open
            </span>
          </div>
        </div>
        <button class="btn-icon owner-dept-delete"
                data-id="${d.id}" 
                title="Delete department">×</button>
      </div>
    `).join('');

    grid.querySelectorAll('.owner-dept-delete')
      .forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this department?')) return;
          if (window.supabaseClient) {
            await window.supabaseClient.from('departments').delete().eq('id', btn.dataset.id);
          }
          state.departments = state.departments.filter(d => d.id !== btn.dataset.id);
          renderAll();
          saveState();
        });
      });
  }

  function renderTeam() {
    const rows = document.getElementById('teamRows');
    rows.innerHTML = state.team.map(m => `
      <div class="owner-table-row">
        <div class="owner-agent-cell">
          <div class="avatar sm">
            ${m.name.slice(0,2).toUpperCase()}
          </div>
          <div>
            <div class="owner-agent-name">
              ${m.name}
            </div>
            <div class="owner-agent-email">
              ${m.email}
            </div>
          </div>
        </div>
        <span>
          <span class="owner-dept-badge"
                style="border-color:${
                  m.department_color || '#cccccc'}; 
                  color:${
                  m.department_color || '#888888'}">
            ${m.dept || m.department_name || '—'}
          </span>
        </span>
        <span class="tag ${m.role}">${m.role}</span>
        <span class="${(m.open_threads||0) > 4 ? 
          'text-danger font-bold' : ''}">
          ${m.open_threads || 0}
        </span>
        <span class="owner-status-dot 
                     ${m.status}">
          ${m.status}
        </span>
        <button class="btn-decline btn-sm 
                       owner-remove-agent"
                data-id="${m.id}">
          Remove
        </button>
      </div>
    `).join('');

    rows.querySelectorAll('.owner-remove-agent')
      .forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Remove this agent?')) return;
          if (window.supabaseClient) {
            await window.supabaseClient.from('team_members').delete().eq('id', btn.dataset.id);
          }
          state.team = state.team.filter(m => m.id !== btn.dataset.id);
          renderAll();
          saveState();
        });
      });
  }

  function renderEmails() {
    const rows = document.getElementById('emailRows');
    rows.innerHTML = state.emails.map(e => `
      <div class="owner-table-row">
        <span class="owner-email-address">
          ${e.address}
        </span>
        <span>${e.label || '—'}</span>
        <span>${e.department_name || 'Unassigned'}</span>
        <span class="owner-provider-badge 
                     ${e.provider}">
          ${e.provider === 'google' ? 
            'Google' : 'Microsoft'}
        </span>
        <span class="owner-status-dot active">
          connected
        </span>
        <button class="btn-decline btn-sm 
                       owner-remove-email"
                data-id="${e.id}">
          Disconnect
        </button>
      </div>
    `).join('');

    rows.querySelectorAll('.owner-remove-email')
      .forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Disconnect this email?')) return;
          if (window.supabaseClient) {
            await window.supabaseClient.from('connected_emails').delete().eq('id', btn.dataset.id);
          }
          state.emails = state.emails.filter(e => e.id !== btn.dataset.id);
          renderEmails();
          saveState();
        });
      });
  }

  function renderRules() {
    const el = document.getElementById('routingRules');
    const matchLabels = {
      subject_contains: 'Subject contains',
      from_domain: 'From domain',
      from_email: 'From email',
      has_attachment: 'Has attachment'
    };
    el.innerHTML = state.rules.map(r => `
      <div class="owner-rule">
        <span class="owner-rule-type">
          ${matchLabels[r.match_type] || r.match_type}
        </span>
        <span class="owner-rule-value">
          "${r.match_value}"
        </span>
        <span class="owner-rule-arrow">→</span>
        <span class="owner-rule-dept">
          ${r.department_name}
        </span>
        <button class="btn-decline btn-sm owner-rule-remove"
                data-id="${r.id}">
          Remove
        </button>
      </div>
    `).join('') || 
    '<div class="empty-state" style="padding:12px">No routing rules yet</div>';

    // Attach remove handlers
    el.querySelectorAll('.owner-rule-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Remove this routing rule?')) return;
        state.rules = state.rules.filter(r => r.id !== btn.dataset.id);
        renderRules();
        saveState();
      });
    });
  }

  function populateDeptSelects() {
    const opts = state.departments.map(d =>
      `<option value="${d.id}">${d.name}</option>`
    ).join('');
    ['inviteDept', 'emailDept'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = opts;
    });
  }

  // ── Modals ───────────────────────────────────
  function openModal(id) {
    document.getElementById(id)
      .classList.remove('hidden');
  }
  function closeModal(id) {
    document.getElementById(id)
      .classList.add('hidden');
  }

  // Invite agent
  document.getElementById('inviteBtn')
    .addEventListener('click', () => 
      openModal('inviteModal'));
  document.getElementById('closeInvite')
    .addEventListener('click', () => 
      closeModal('inviteModal'));
  document.getElementById('cancelInvite')
    .addEventListener('click', () => 
      closeModal('inviteModal'));
  document.getElementById('confirmInvite')
    .addEventListener('click', async () => {
      const name = document.getElementById('inviteName').value.trim();
      const email = document.getElementById('inviteEmail').value.trim();
      const departmentId = document.getElementById('inviteDept').value;
      const role = document.getElementById('inviteRole').value;
      if (!name || !email) return;

      const dept = state.departments.find(d => d.id === departmentId);
      
      const newMember = {
         name, 
         email, 
         role, 
         department_name: dept ? dept.name : '—',
         department_color: dept ? dept.color : '#888',
         status: 'invited'
      };

      if (window.supabaseClient) {
         const { data } = await window.supabaseClient.from('team_members').insert([newMember]).select().single();
         if (data) newMember.id = data.id;
      } else {
         newMember.id = crypto.randomUUID();
      }

      state.team.push(newMember);
      closeModal('inviteModal');
      renderAll();
      saveState();
      alert(`Invite sent to ${email}`);
    });

  // Add department
  document.getElementById('addDeptBtn')
    .addEventListener('click', () => 
      openModal('deptModal'));
  document.getElementById('closeDept')
    .addEventListener('click', () => 
      closeModal('deptModal'));
  document.getElementById('cancelDept')
    .addEventListener('click', () => 
      closeModal('deptModal'));
  document.getElementById('deptColor')
    .addEventListener('input', e => {
      document.getElementById('deptColorLabel')
        .textContent = e.target.value;
    });
  document.getElementById('confirmDept')
    .addEventListener('click', async () => {
      const name = document.getElementById('deptName').value.trim();
      const color = document.getElementById('deptColor').value;
      if (!name) return;

      const newDept = { name, color };

      if (window.supabaseClient) {
         const { data } = await window.supabaseClient.from('departments').insert([newDept]).select().single();
         if (data) newDept.id = data.id;
      } else {
         newDept.id = crypto.randomUUID();
      }
      
      state.departments.push({
        ...newDept,
        agents: 0,
        open_threads: 0,
        emails: 0
      });
      closeModal('deptModal');
      renderAll();
      saveState();
    });

  // Connect email
  document.getElementById('addEmailBtn')
    .addEventListener('click', () => 
      openModal('emailModal'));
  document.getElementById('closeEmail')
    .addEventListener('click', () => 
      closeModal('emailModal'));
  document.getElementById('cancelEmail')
    .addEventListener('click', () => 
      closeModal('emailModal'));
  document.getElementById('confirmEmail')
    .addEventListener('click', async () => {
      const address = document.getElementById('emailAddress').value.trim();
      const label = document.getElementById('emailLabel').value.trim();
      const departmentId = document.getElementById('emailDept').value;
      const provider = document.getElementById('emailProvider').value;
      if (!address) return;

      const dept = state.departments.find(d => d.id === departmentId);
      const newEmail = { 
         email: address, 
         display_name: label, 
         department: dept ? dept.name : '—', 
         provider 
      };

      if (window.supabaseClient) {
         const { data } = await window.supabaseClient.from('connected_emails').insert([newEmail]).select().single();
         if (data) newEmail.id = data.id;
      } else {
         newEmail.id = crypto.randomUUID();
      }

      state.emails.push({
        id: newEmail.id,
        address: newEmail.email,
        label: newEmail.display_name,
        department_name: newEmail.department,
        provider: newEmail.provider
      });
      closeModal('emailModal');
      renderEmails();
      saveState();
    });

  // Add routing rule
  document.getElementById('addRuleBtn')
    .addEventListener('click', () => {
      const matchType = prompt(
        'Match type:\nsubject_contains\nfrom_domain\nfrom_email',
        'subject_contains'
      );
      if (!matchType) return;
      const matchValue = prompt('Match value:');
      if (!matchValue) return;
      const deptName = prompt(
        'Department name:\n' + 
        state.departments.map(d => d.name).join('\n')
      );
      if (!deptName) return;
      const dept = state.departments.find(
        d => d.name.toLowerCase() === 
             deptName.toLowerCase()
      );
      if (!dept) return alert('Department not found');

      state.rules.push({
        id: crypto.randomUUID(),
        match_type: matchType,
        match_value: matchValue,
        department_name: dept.name,
        department_id: dept.id
      });
      renderRules();
      saveState();
    });

  loadAll();

})();
