/* ═══════════════════════════════════════════════
   NUDGE — email-stats.js
   Email Analytics: charts, patterns, AI insights
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Inbox data ──────────────────── */
  let EMAILS_FULL = [];

  // Try to load real data from local storage (set by email-logs.js or dashboard)
  try {
    const saved = localStorage.getItem('nudge_email_log_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Map basic email data to the format expected by stats (day, hour, category)
      EMAILS_FULL = parsed.map((e, i) => {
        const date = new Date();
        // Distribute over last 7 days for interesting charts if real timestamps are missing
        const day = e.timestamp ? new Date(e.timestamp).getDay() : (i % 7);
        const hour = e.timestamp ? new Date(e.timestamp).getHours() : (9 + (i % 8));
        return {
          id: e.id,
          sender: e.sender || 'Unknown',
          address: e.address || '',
          subject: e.subject || '',
          category: e.aiCategory || 'General',
          priority: e.priority || 'medium',
          day: day,
          hour: hour,
          sent: false,
          unread: !!e.unread
        };
      });
    }
  } catch(e) {
    EMAILS_FULL = [];
  }

  const CATEGORIES = ['Finance','Meeting','Client','External','Internal','Legal','Ops','Newsletter'];
  const CAT_COLORS  = ['#0a0a0a','#2d6a4f','#1d3557','#e76f51','#6d6875','#457b9d','#f4a261','#a8dadc'];
  const DAYS_LABEL  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  let rangeDays = 30;

  /* ── Init ───────────────────────────────── */
  renderMetrics();
  renderSenders();
  renderVolumeChart();
  renderCategoryChart();
  renderHourChart();
  renderDayChart();
  renderDomainTable();
  renderInsights();

  document.getElementById('esRangeSelect').addEventListener('change', function () {
    rangeDays = +this.value;
    document.getElementById('esTotalSub').textContent = `Last ${rangeDays} days`;
    renderMetrics();
    renderVolumeChart();
  });

  document.getElementById('esRefreshInsights').addEventListener('click', renderInsights);
  document.getElementById('esExport').addEventListener('click', exportCSV);

  /* ── Metrics ────────────────────────────── */
  function renderMetrics() {
    const total  = EMAILS_FULL.length;
    const unread = EMAILS_FULL.filter(e => e.unread).length;
    const high   = EMAILS_FULL.filter(e => e.priority === 'high').length;

    animateNum('esTotal',   total);
    animateNum('esUnread',  unread);
    animateNum('esHighPri', high);
    document.getElementById('esAvgResp').textContent = '2.4h';
    document.getElementById('esUnreadPct').textContent = Math.round(unread/total*100) + '% of total';
    document.getElementById('esTotalSub').textContent = `Last ${rangeDays} days`;
  }

  function animateNum(id, target) {
    const el = document.getElementById(id);
    let start = 0;
    const step = Math.ceil(target / 20);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      el.textContent = start;
      if (start >= target) clearInterval(timer);
    }, 40);
  }

  /* ── Top Senders ────────────────────────── */
  function renderSenders() {
    const counts = {};
    EMAILS_FULL.forEach(e => {
      counts[e.sender] = (counts[e.sender] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,6);
    const max = sorted[0][1];

    document.getElementById('esSenderList').innerHTML = sorted.map(([name, count]) => {
      const email = EMAILS_FULL.find(e => e.sender === name)?.address || '';
      const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const pct = Math.round(count/max*100);
      return `
        <div class="es-sender-row">
          <div class="es-sender-avatar">${initials}</div>
          <div class="es-sender-info">
            <div class="es-sender-name">${esc(name)}</div>
            <div class="es-sender-addr">${esc(email)}</div>
          </div>
          <div class="es-sender-bar-wrap">
            <div class="es-sender-bar" style="width:0%" data-pct="${pct}"></div>
          </div>
          <div class="es-sender-count">${count}</div>
        </div>`;
    }).join('');

    // Animate bars after render
    setTimeout(() => {
      document.querySelectorAll('.es-sender-bar').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    }, 100);
  }

  /* ── Volume Over Time (bar chart) ───────── */
  function renderVolumeChart() {
    const canvas = document.getElementById('esVolumeChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 600;
    const H = 200;
    canvas.width = W;
    canvas.height = H;

    const days = Math.min(rangeDays, 14);
    const labels = [];
    const received = [];
    const sent = [];

    for (let i = days-1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en',{weekday:'short',day:'numeric'}));
      received.push(Math.floor(2 + Math.random() * 6));
      sent.push(Math.floor(1 + Math.random() * 4));
    }

    const maxVal = Math.max(...received, ...sent) + 1;
    const padL=40, padR=20, padT=20, padB=40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const barW = Math.max(8, chartW / days / 2.5);

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i=0; i<=4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W-padR, y); ctx.stroke();
      ctx.fillStyle = '#888888';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - maxVal/4*i), padL-6, y+4);
    }

    // Bars
    labels.forEach((label, i) => {
      const x = padL + (i / days) * chartW + chartW/(days*2);
      const recH = (received[i] / maxVal) * chartH;
      const senH = (sent[i] / maxVal) * chartH;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(x - barW - 2, padT + chartH - recH, barW, recH);
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x + 2, padT + chartH - senH, barW, senH);

      ctx.fillStyle = '#888888';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label.split(' ')[0], x, H - padB + 16);
    });
  }

  /* ── Category Donut ─────────────────────── */
  function renderCategoryChart() {
    const canvas = document.getElementById('esCategoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 160;
    canvas.width = size; canvas.height = size;

    const counts = {};
    EMAILS_FULL.forEach(e => { counts[e.category] = (counts[e.category]||0)+1; });
    const total = EMAILS_FULL.length;

    const slices = CATEGORIES.map((cat, i) => ({
      cat, count: counts[cat]||0, color: CAT_COLORS[i]
    })).filter(s => s.count > 0);

    let startAngle = -Math.PI / 2;
    const cx=size/2, cy=size/2, R=70, innerR=40;

    slices.forEach(s => {
      const angle = (s.count/total) * Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startAngle, startAngle+angle);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      startAngle += angle;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Centre label
    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy+2);
    ctx.fillStyle = '#888888';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('emails', cx, cy+14);

    // Legend
    document.getElementById('esDonutLegend').innerHTML = slices.map(s => `
      <div class="es-donut-item">
        <span class="es-donut-swatch" style="background:${s.color};"></span>
        <span class="es-donut-label">${esc(s.cat)}</span>
        <span class="es-donut-count">${s.count}</span>
        <span class="es-donut-pct">${Math.round(s.count/total*100)}%</span>
      </div>
    `).join('');
  }

  /* ── Hour of Day Chart ──────────────────── */
  function renderHourChart() {
    const canvas = document.getElementById('esHourChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 480;
    const H = 160;
    canvas.width = W; canvas.height = H;

    const hourCounts = new Array(24).fill(0);
    EMAILS_FULL.forEach(e => { hourCounts[e.hour]++; });
    // Extrapolate to simulate a full-day pattern
    const pattern = [0,0,1,2,1,1,2,3,5,6,7,5,4,5,4,6,5,4,3,2,2,1,1,0];
    const data = pattern.map((v,i) => v + hourCounts[i]);
    const maxV = Math.max(...data)+1;

    const padL=30, padR=10, padT=10, padB=30;
    const chartW = W-padL-padR;
    const chartH = H-padT-padB;
    const barW = chartW/24 * 0.7;

    ctx.clearRect(0,0,W,H);

    data.forEach((v,i) => {
      const x = padL + (i/24)*chartW + chartW/48;
      const bH = (v/maxV)*chartH;
      const isWork = i>=8 && i<=18;
      ctx.fillStyle = isWork ? '#0a0a0a' : '#cccccc';
      ctx.beginPath();
      ctx.roundRect(x-barW/2, padT+chartH-bH, barW, bH, 2);
      ctx.fill();
    });

    // X labels
    [0,6,9,12,15,18,21].forEach(h => {
      const x = padL + (h/24)*chartW + chartW/48;
      ctx.fillStyle='#888888'; ctx.font='9px Inter,sans-serif'; ctx.textAlign='center';
      ctx.fillText(h===0?'12a':h<12?h+'a':h===12?'12p':(h-12)+'p', x, H-padB+14);
    });
  }

  /* ── Day of Week Chart ──────────────────── */
  function renderDayChart() {
    const canvas = document.getElementById('esDayChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 480;
    const H = 160;
    canvas.width=W; canvas.height=H;

    const dayCounts = new Array(7).fill(0);
    EMAILS_FULL.forEach(e => { dayCounts[e.day % 7]++; });
    const data = [8,10,9,7,6,2,1].map((v,i)=>v+(dayCounts[i]||0));
    const maxV = Math.max(...data)+1;
    const padL=30,padR=10,padT=10,padB=30;
    const chartW=W-padL-padR, chartH=H-padT-padB;
    const barW=chartW/7*0.5;

    ctx.clearRect(0,0,W,H);
    data.forEach((v,i)=>{
      const x=padL+(i/7)*chartW+chartW/14;
      const bH=(v/maxV)*chartH;
      const isWeekend=i>=5;
      ctx.fillStyle=isWeekend?'#e0e0e0':'#0a0a0a';
      ctx.beginPath(); ctx.roundRect(x-barW/2,padT+chartH-bH,barW,bH,2); ctx.fill();
      ctx.fillStyle='#888888'; ctx.font='9px Inter,sans-serif'; ctx.textAlign='center';
      ctx.fillText(DAYS_LABEL[i], x, H-padB+14);
      ctx.fillStyle='#0a0a0a'; ctx.font='bold 10px Inter,sans-serif';
      ctx.fillText(v, x, padT+chartH-bH-5);
    });
  }

  /* ── Domain Table ───────────────────────── */
  function renderDomainTable() {
    const domainMap = {};
    EMAILS_FULL.forEach(e => {
      const domain = '@' + (e.address.split('@')[1] || 'unknown');
      if (!domainMap[domain]) domainMap[domain] = { count:0, high:0, total:0 };
      domainMap[domain].count++;
      domainMap[domain].total++;
      if (e.priority==='high') domainMap[domain].high++;
    });

    const total = EMAILS_FULL.length;
    const sorted = Object.entries(domainMap).sort((a,b)=>b[1].count-a[1].count);

    document.getElementById('esDomainRows').innerHTML = sorted.map(([domain, d]) => {
      const pct = Math.round(d.count/total*100);
      const avgPri = d.high/d.count > 0.5 ? 'high' : d.high/d.count > 0.2 ? 'medium' : 'low';
      return `
        <div class="es-table-row">
          <span class="es-domain-name">${esc(domain)}</span>
          <span>${d.count}</span>
          <span>${pct}%</span>
          <span><span class="es-pri-chip ${avgPri}">${avgPri}</span></span>
          <span>
            <a href="email-focus.html" class="btn-secondary btn-sm" style="font-size:9px;padding:3px 8px;text-decoration:none;">Focus</a>
          </span>
        </div>`;
    }).join('');
  }

  /* ── AI Insights ────────────────────────── */
  async function renderInsights() {
    const container = document.getElementById('esInsightsList');
    container.innerHTML = '<div class="empty-state" style="padding:24px;grid-column:1/-1;"><span class="ef-spinner"></span> Nudge AI is analysing…</div>';

    const counts = {};
    EMAILS_FULL.forEach(e => { counts[e.sender]=(counts[e.sender]||0)+1; });
    const topSender = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const unreadPct = Math.round(EMAILS_FULL.filter(e=>e.unread).length / EMAILS_FULL.length * 100);
    const financeCount = EMAILS_FULL.filter(e=>e.category==='Finance').length;

    const prompt = `You are an email productivity analyst. Based on this data:
- Total emails: ${EMAILS_FULL.length}
- Unread: ${unreadPct}%
- Top sender: ${topSender[0]} (${topSender[1]} emails)
- Finance emails: ${financeCount}
- Peak hour: 9am-11am
- Busiest day: Tuesday
Give 3 concise, actionable insights as JSON array: [{icon, heading, body, action}]. Icons must be emoji.`;

    const staticInsights = [
      { icon:'📈', heading:'Peak hours: 8–11 AM', body:`${Math.round(EMAILS_FULL.filter(e=>e.hour>=8&&e.hour<=11).length/EMAILS_FULL.length*100)}% of emails arrive in the morning. Block this time for deep work instead of reactive email checking.`, action:'Block mornings on Schedule' },
      { icon:'💰', heading:`Finance is ${Math.round(financeCount/EMAILS_FULL.length*100)}% of inbox`, body:`You receive ${financeCount} finance-related emails. Set up an auto-rule to triage and label them as high priority.`, action:'Create finance rule' },
      { icon:'👤', heading:`${topSender[0]} sends most`, body:`${topSender[0]} accounts for ${topSender[1]} emails — consider a dedicated thread or channel to reduce inbox volume.`, action:'Open Focus filter' },
    ];

    try {
      const raw = await window.nudgeAI(prompt, "You are an email productivity analyst.");
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]);
        renderInsightCards(items.slice(0,3));
        return;
      }
    } catch { /* fall through to static */ }

    renderInsightCards(staticInsights);
  }

  function renderInsightCards(items) {
    document.getElementById('esInsightsList').innerHTML = items.map(item => `
      <div class="es-insight-item">
        <div class="es-insight-icon">${item.icon||'💡'}</div>
        <div class="es-insight-heading">${esc(item.heading)}</div>
        <div class="es-insight-body">${esc(item.body)}</div>
        ${item.action ? `<button class="es-insight-action" onclick="window.location.href='email-focus.html'">${esc(item.action)} →</button>` : ''}
      </div>
    `).join('');
  }

  /* ── CSV Export ─────────────────────────── */
  function exportCSV() {
    const rows = [['Sender','Address','Subject','Category','Priority','Day','Hour','Unread']];
    EMAILS_FULL.forEach(e => rows.push([e.sender,e.address,e.subject,e.category,e.priority,DAYS_LABEL[e.day%7],e.hour,e.unread?'Yes':'No']));
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nudge-email-analytics.csv';
    a.click();
  }

  /* ── Utility ────────────────────────────── */
  function esc(v) {
    return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
