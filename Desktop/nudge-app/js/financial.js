(function() {

  const scanBtn = document.getElementById('scanInbox');
  scanBtn.addEventListener('click', scanForFinancials);

  // Financial events data
  let financialEvents = [];

  async function scanForFinancials() {
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning…';

    // First try: read from email logs localStorage (set by email-logs.js)
    const loggedEmails = (() => {
      try {
        return JSON.parse(localStorage.getItem('nudge_email_log_data') || '[]');
      } catch(e) { return []; }
    })();

    // Second try: live API
    const apiEmails = loggedEmails.length ? null : await fetch('/api/inbox/summary')
      .then(r => r.json())
      .catch(() => null);

    const emailsToUse = loggedEmails.length
      ? loggedEmails
      : (apiEmails?.items?.length ? apiEmails.items : []);

    const groqKey = localStorage.getItem('nudge_groq_key');
    const geminiKey = localStorage.getItem('nudge_gemini_key');
    const key = groqKey || geminiKey;

    if (key && emailsToUse?.length) {
      await scanWithGemini(emailsToUse, key);
    } else {
      // Extract financial signals from emails using keyword rules
      const extracted = extractFinancialSignals(emailsToUse || []);
      renderFinancials(extracted);
    }

    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan inbox';
  }

  // ── Keyword-based financial extraction (no AI key needed)
  function extractFinancialSignals(emailList) {
    const signals = [];
    const amountRegex = /\$([\d,]+(?:\.\d{2})?)/;
    const invoiceKw = ['invoice', 'payment due', 'overdue', 'balance', 'amount due', 'receipt'];
    const paidKw = ['payment received', 'payment confirmed', 'paid', 'transaction complete'];
    const dealKw = ['proposal', 'contract', 'quote', 'deal', 'renewal', 'retainer', 'scope'];

    emailList.forEach((email, i) => {
      const text = ((email.subject || '') + ' ' + (email.snippet || '') + ' ' + (email.body || '')).toLowerCase();
      const amountMatch = (email.body || email.snippet || '').match(amountRegex);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

      if (paidKw.some(k => text.includes(k))) {
        signals.push({
          id: 'fin_e_' + email.id,
          type: 'payment_confirmed',
          amount,
          currency: 'USD',
          from: email.sender,
          description: email.subject,
          due: 'Received',
          status: 'paid',
          emailId: email.id,
          detected: email.time || 'recently'
        });
      } else if (invoiceKw.some(k => text.includes(k))) {
        const isOverdue = text.includes('overdue') || text.includes('past due');
        signals.push({
          id: 'fin_e_' + email.id,
          type: isOverdue ? 'overdue_payment' : 'invoice_received',
          amount,
          currency: 'USD',
          from: email.sender,
          description: email.subject,
          due: isOverdue ? 'Overdue' : 'Pending',
          status: isOverdue ? 'overdue' : 'pending',
          emailId: email.id,
          detected: email.time || 'recently'
        });
      } else if (dealKw.some(k => text.includes(k))) {
        signals.push({
          id: 'fin_e_' + email.id,
          type: 'deal_mentioned',
          amount,
          currency: 'USD',
          from: email.sender,
          description: email.subject,
          due: 'TBD',
          status: 'pipeline',
          emailId: email.id,
          detected: email.time || 'recently'
        });
      }
    });
    return signals;
  }

  async function scanWithGemini(emails, key) {
    const prompt = `
You are a financial intelligence system.
Read these emails and extract every financial event.
Return ONLY valid JSON, no markdown, no extra text.

EMAILS:
${JSON.stringify(emails.map(e => ({
  id: e.id,
  from: e.sender,
  subject: e.subject,
  body: e.body || e.snippet
})))}

Return this exact JSON structure:
{
  "events": [
    {
      "id": "fin_1",
      "type": "invoice_received|invoice_sent|payment_confirmed|deal_mentioned|subscription_renewal|overdue_payment",
      "amount": 1000,
      "currency": "USD",
      "from": "sender name",
      "description": "short description",
      "due": "due date or timeframe",
      "status": "overdue|pending|paid|pipeline",
      "emailId": "email id this came from",
      "detected": "just now"
    }
  ]
}

If no financial events found, return { "events": [] }
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
              { role: 'system', content: 'You are a financial intelligence system. Return ONLY valid JSON, no markdown, no extra text.' },
              { role: 'user',   content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.3
          })
        }
      );
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      renderFinancials(parsed.events || []);
    } catch(e) {
      console.error("Financial scan failed", e);
      renderFinancials([]);
    }
  }

  function renderFinancials(events) {
    // Update metric cards
    const overdue = events.filter(e => e.status === 'overdue');
    const paid = events.filter(e => e.status === 'paid');
    const pending = events.filter(e => e.status === 'pending');
    const pipeline = events.filter(e => e.status === 'pipeline');

    const sum = arr => arr.reduce((t, e) => t + (e.amount || 0), 0);
    const fmt = n => '$' + n.toLocaleString();

    document.getElementById('finIncoming').textContent = fmt(sum(pending));
    document.getElementById('finIncomingCount').textContent = `${pending.length} invoice${pending.length !== 1 ? 's' : ''}`;

    document.getElementById('finOverdue').textContent = fmt(sum(overdue));
    document.getElementById('finOverdueCount').textContent = `${overdue.length} overdue`;

    document.getElementById('finPaid').textContent = fmt(sum(paid));
    document.getElementById('finPaidCount').textContent = `${paid.length} payment${paid.length !== 1 ? 's' : ''}`;

    document.getElementById('finDeals').textContent = pipeline.length;

    // Status colors
    const statusConfig = {
      overdue:  { label: 'Overdue',  cls: 'danger'  },
      pending:  { label: 'Pending',  cls: 'warning' },
      paid:     { label: 'Paid',     cls: 'success' },
      pipeline: { label: 'Pipeline', cls: 'neutral' }
    };

    const typeIcons = {
      invoice_received:    '↓',
      invoice_sent:        '↑',
      payment_confirmed:   '✓',
      deal_mentioned:      '◈',
      subscription_renewal:'↻',
      overdue_payment:     '!'
    };

    // Render timeline
    const timeline = document.getElementById('finTimeline');
    if (!events.length) {
      timeline.innerHTML = `
        <div class="empty-state">
          No financial events detected in inbox.
        </div>`;
      return;
    }

    timeline.innerHTML = events.map(event => {
      const cfg = statusConfig[event.status] || statusConfig.pending;
      const icon = typeIcons[event.type] || '·';
      return `
        <div class="fin-event ${event.status}"
             data-email="${event.emailId}">
          <div class="fin-event-icon">${icon}</div>
          <div class="fin-event-body">
            <div class="fin-event-title">
              ${event.description}
            </div>
            <div class="fin-event-meta">
              ${event.from} · Due: ${event.due} · Detected ${event.detected}
            </div>
          </div>
            <div class="fin-event-right">
            <div class="fin-event-amount">
              ${event.amount ? '$' + event.amount.toLocaleString() : '—'}
            </div>
            <span class="tag ${cfg.cls}">
              ${cfg.label}
            </span>
            <button class="btn-secondary btn-sm add-to-board-btn"
              data-fin-id="${event.id}"
              data-title="${event.description}"
              data-priority="${event.status === 'overdue' ? 'high' : event.status === 'pending' ? 'medium' : 'low'}"
              style="margin-top:6px;font-size:10px;"
              onclick="event.stopPropagation()">
              + Work Board
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Click event → go to email-logs
    timeline.querySelectorAll('.fin-event').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.email) {
          window.location.href = `email-logs.html`;
        }
      });
    });

    timeline.querySelectorAll('.add-to-board-btn')
      .forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const task = {
            id: 'task_fin_' + Date.now(),
            title: this.dataset.title,
            priority: this.dataset.priority,
            status: 'todo',
            source: 'financial',
            tags: ['Financial'],
            assignee: 'You'
          };
          const existing = JSON.parse(
            localStorage.getItem('nudge_tasks') || '[]'
          );
          existing.unshift(task);
          localStorage.setItem(
            'nudge_tasks', JSON.stringify(existing)
          );
          this.textContent = 'Added ✓';
          this.disabled = true;
        });
      });
  }

  // Auto scan on load — reads from email logs data
  scanForFinancials();

})();
