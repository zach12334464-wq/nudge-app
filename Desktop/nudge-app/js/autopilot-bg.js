(function() {
  // Only run once per day
  const today = new Date().toDateString();
  const lastRun = localStorage.getItem(
    'nudge_autopilot_last_run');
  if (lastRun === today) return;

  // Run autopilot background logic
  setTimeout(async function runAutopilot() {
    const emails = await fetch('/api/inbox/summary')
      .then(r => r.json())
      .catch(() => ({ items: [] }));

    const tasks = await fetch('/api/tasks')
      .then(r => r.json())
      .catch(() => ({ items: [] }));

    const existing = JSON.parse(
      localStorage.getItem('nudge_tasks') || '[]');

    // For each unread email, create a task if 
    // one doesn't already exist for it
    const inbox = emails.items || [];
    inbox.forEach(email => {
      if (!email.unread) return;

      const alreadyExists = existing.find(
        t => t.sourceEmailId === email.id);
      if (alreadyExists) return;

      const isUrgent = (email.tags || [])
        .some(t => ['Urgent','high','Payment']
          .includes(t));

      existing.unshift({
        id: 'task_auto_' + email.id,
        title: 'Follow up: ' + email.subject,
        status: 'todo',
        priority: isUrgent ? 'high' : 'medium',
        assignee: null,
        source: 'autopilot',
        sourceEmailId: email.id,
        dismissed: false,
        createdAt: new Date().toISOString()
      });
    });

    localStorage.setItem('nudge_tasks',
      JSON.stringify(existing));
    localStorage.setItem(
      'nudge_autopilot_last_run', today);

  }, 1500);
})();
