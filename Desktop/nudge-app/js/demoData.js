const DEMO = {
  company: {
    name: 'Nexus Co.',
    id: 'demo_company_001',
    plan: 'Business'
  },

  owner: {
    name: 'Alex Morgan',
    email: 'alex@nexusco.com',
    role: 'owner'
  },

  employee: {
    name: 'Sarah Mitchell',
    email: 'sarah@nexusco.com',
    role: 'employee',
    department: 'Support'
  },

  metrics: {
    unread: 7,
    urgent: 2,
    pending: 3,
    activeTasks: 5,
    overdue: 1,
    events: 4
  },

  departments: [
    { id: 'd1', name: 'Support', color: '#1a7a4a', agents: 3, open_threads: 8, emails: 1 },
    { id: 'd2', name: 'Sales', color: '#92400e', agents: 2, open_threads: 5, emails: 1 },
    { id: 'd3', name: 'Finance', color: '#b91c1c', agents: 1, open_threads: 3, emails: 1 },
    { id: 'd4', name: 'Admin', color: '#0a0a0a', agents: 1, open_threads: 2, emails: 1 }
  ],

  team: [
    { id: 'tm1', name: 'Sarah Mitchell', email: 'sarah@nexusco.com', role: 'manager', dept: 'Support', department_color: '#1a7a4a', open_threads: 4, status: 'active' },
    { id: 'tm2', name: 'James Okonkwo', email: 'james@nexusco.com', role: 'agent', dept: 'Support', department_color: '#1a7a4a', open_threads: 4, status: 'active' },
    { id: 'tm3', name: 'Leo Torres', email: 'leo@nexusco.com', role: 'agent', dept: 'Sales', department_color: '#92400e', open_threads: 5, status: 'active' },
    { id: 'tm4', name: 'Priya Patel', email: 'priya@nexusco.com', role: 'agent', dept: 'Finance', department_color: '#b91c1c', open_threads: 3, status: 'active' },
    { id: 'tm5', name: 'Marcus Webb', email: 'marcus@nexusco.com', role: 'admin', dept: 'Admin', department_color: '#0a0a0a', open_threads: 2, status: 'invited' }
  ],

  companyEmails: [
    { id: 'ce1', address: 'support@nexusco.com', label: 'Main Support', department_name: 'Support', provider: 'google' },
    { id: 'ce2', address: 'sales@nexusco.com', label: 'Sales Inbox', department_name: 'Sales', provider: 'google' },
    { id: 'ce3', address: 'billing@nexusco.com', label: 'Billing', department_name: 'Finance', provider: 'microsoft' },
    { id: 'ce4', address: 'admin@nexusco.com', label: 'Admin', department_name: 'Admin', provider: 'google' }
  ],

  routingRules: [
    { id: 'r1', match_type: 'subject_contains', match_value: 'invoice', department_name: 'Finance' },
    { id: 'r2', match_type: 'from_domain', match_value: '@enterprise.com', department_name: 'Sales' },
    { id: 'r3', match_type: 'subject_contains', match_value: 'complaint', department_name: 'Support' },
    { id: 'r4', match_type: 'subject_contains', match_value: 'meeting', department_name: 'Admin' }
  ],

  inbox: [
    {
      id: '1', sender: 'Mary Johnson', email: 'mary@clientco.com',
      subject: 'Meeting Request — Product Complaint Follow-up',
      snippet: 'Hi, I wanted to schedule a call to discuss the issues we\'ve been having with the product. Can we meet tomorrow at 9am?',
      body: 'Hi Alex,\n\nI wanted to reach out regarding the ongoing issues we have been experiencing with the Nexus platform. Several of our team members have flagged problems with the reporting module and I think a quick call would help us get on the same page.\n\nCould we schedule a meeting tomorrow at 9:00 AM? I am available for 30 minutes.\n\nLooking forward to hearing from you.\n\nBest,\nMary Johnson\nClientCo',
      time: '8:42 AM', unread: true, tags: ['Meeting', 'Urgent'],
      aiCategory: 'meeting request',
      aiSummary: 'Mary from ClientCo wants to meet tomorrow at 9am to discuss product complaints about the reporting module.',
      createTask: true, taskTitle: 'Schedule meeting with Mary — product complaint'
    },
    {
      id: '2', sender: 'Finance Ops', email: 'finance@nexusco.com',
      subject: 'Invoice #4182 — Payment Overdue',
      snippet: 'This is a reminder that Invoice #4182 for $4,182 was due on May 1st and has not been paid.',
      body: 'Dear Alex,\n\nThis is an automated reminder that Invoice #4182 for $4,182.00 was due on May 1st, 2026. As of today the payment has not been received.\n\nPlease arrange payment at your earliest convenience to avoid a late fee.\n\nInvoice Details:\n- Invoice #: 4182\n- Amount: $4,182.00\n- Due Date: May 1, 2026\n- Status: OVERDUE\n\nThank you,\nFinance Ops\nNexus Co.',
      time: '7:30 AM', unread: true, tags: ['Urgent', 'Invoice'],
      aiCategory: 'task needed',
      aiSummary: 'Invoice #4182 for $4,182 is overdue since May 1st. Payment must be arranged immediately.',
      createTask: true, taskTitle: 'Pay overdue Invoice #4182 — $4,182'
    },
    {
      id: '3', sender: 'TechStart Inc', email: 'hello@techstart.com',
      subject: 'Monthly Retainer — Next Steps',
      snippet: 'Hi team, wanted to check in on the status of our monthly retainer renewal for Q3.',
      body: 'Hi Nexus Team,\n\nHope you are all doing well. I wanted to follow up on our monthly retainer agreement which is due for renewal at the end of this month.\n\nOur team has been very happy with the support so far. Could we get on a quick call to discuss the Q3 terms?\n\nBest,\nDavid Chen\nTechStart Inc',
      time: 'Yesterday', unread: false, tags: ['Follow-up'],
      aiCategory: 'needs reply',
      aiSummary: 'TechStart asking about Q3 retainer renewal. Wants a call to discuss terms — currently $3,200/month.',
      createTask: false
    },
    {
      id: '4', sender: 'Google Workspace', email: 'no-reply@google.com',
      subject: 'Your storage is 85% full',
      snippet: 'Your Google Workspace storage is nearly full. Upgrade your plan to continue.',
      body: 'Your Google Workspace account is currently using 85% of available storage. Please upgrade your plan or delete unused files to avoid service interruption.',
      time: 'Yesterday', unread: false, tags: ['FYI'],
      aiCategory: 'fyi',
      aiSummary: 'Google Workspace storage at 85%. No urgent action needed but worth monitoring.',
      createTask: false
    },
    {
      id: '5', sender: 'Rachel Adams', email: 'rachel@globalventures.com',
      subject: 'Partnership Proposal — AI Integration',
      snippet: 'We would love to explore a partnership with Nexus Co. for our upcoming AI integration project.',
      body: 'Dear Alex,\n\nMy name is Rachel Adams from Global Ventures. We have been following Nexus Co. and are very impressed with your AI workspace platform.\n\nWe are currently looking for a technology partner to help us integrate AI tools into our internal operations. Would you be available for a 30 minute intro call this week?\n\nBest regards,\nRachel Adams\nGlobal Ventures',
      time: 'Monday', unread: true, tags: ['Sales', 'Meeting'],
      aiCategory: 'meeting request',
      aiSummary: 'Rachel from Global Ventures wants a 30-min intro call to discuss an AI integration partnership.',
      createTask: true, taskTitle: 'Follow up with Rachel Adams — partnership opportunity'
    },
    {
      id: '6', sender: 'Marcus Webb', email: 'marcus@nexusco.com',
      subject: 'Team Update — Support Backlog',
      snippet: 'Hi Alex, just wanted to flag that we have 8 open support threads this week, 3 of which are marked urgent.',
      body: 'Hi Alex,\n\nQuick update from the support team. We currently have 8 open threads, 3 of which are urgent. Sarah and James are handling the priority ones but we may need an extra agent this week.\n\nAlso wanted to note that the new email routing rules are working well — complaint emails are being routed to the right team automatically.\n\nThanks,\nMarcus',
      time: 'Monday', unread: false, tags: ['FYI', 'Team'],
      aiCategory: 'fyi',
      aiSummary: 'Marcus flagging 8 open support threads, 3 urgent. May need additional agent coverage this week.',
      createTask: false
    },
    {
      id: '7', sender: 'Stripe', email: 'no-reply@stripe.com',
      subject: 'Payment received — $2,400.00',
      snippet: 'A payment of $2,400.00 has been successfully received from Acme Corp.',
      body: 'Payment Confirmation\n\nAmount: $2,400.00\nFrom: Acme Corp\nDate: May 7, 2026\nStatus: Completed\n\nThank you for using Stripe.',
      time: 'Monday', unread: false, tags: ['Payment', 'FYI'],
      aiCategory: 'fyi',
      aiSummary: 'Stripe confirmed $2,400 payment received from Acme Corp on May 7.',
      createTask: false
    },
    {
      id: '8', sender: 'James Okonkwo', email: 'james@nexusco.com',
      subject: 'Complaint — Client Angry About Delayed Response',
      snippet: 'Hi Alex, wanted to flag that ClientCo has escalated their complaint. They have been waiting 3 days for a response.',
      body: 'Hi Alex,\n\nI wanted to flag an escalation from ClientCo. They submitted a complaint 3 days ago about delayed responses and have not received a reply yet. The client is quite frustrated and has mentioned they may escalate further.\n\nI would recommend we respond immediately and perhaps offer a call.\n\nJames',
      time: 'Sunday', unread: true, tags: ['Urgent', 'Complaint'],
      aiCategory: 'task needed',
      aiSummary: 'ClientCo complaint escalated — 3 days without response. James recommending immediate reply and call offer.',
      createTask: true, taskTitle: 'Urgent: Respond to ClientCo complaint escalation'
    },
    {
      id: '9', sender: 'LinkedIn', email: 'no-reply@linkedin.com',
      subject: 'You have 5 new connection requests',
      snippet: 'You have 5 new connection requests waiting for you on LinkedIn.',
      body: 'You have 5 new connection requests on LinkedIn. Log in to review them.',
      time: 'Sunday', unread: false, tags: ['FYI'],
      aiCategory: 'fyi',
      aiSummary: '5 LinkedIn connection requests. No action needed unless relevant to sales outreach.',
      createTask: false
    },
    {
      id: '10', sender: 'Priya Patel', email: 'priya@nexusco.com',
      subject: 'Q2 Financial Report — Ready for Review',
      snippet: 'Hi Alex, the Q2 financial report is ready. Please review and approve before we share with the board.',
      body: 'Hi Alex,\n\nThe Q2 financial report has been completed. Key highlights:\n\n- Revenue: $142,000 (+18% vs Q1)\n- Expenses: $89,000\n- Net Profit: $53,000\n- Outstanding invoices: $12,400\n\nPlease review and provide approval so we can share with the board by Friday.\n\nThanks,\nPriya',
      time: 'Saturday', unread: true, tags: ['Urgent', 'Finance'],
      aiCategory: 'task needed',
      aiSummary: 'Q2 report ready. Revenue $142K, profit $53K. Needs your approval before Friday board meeting.',
      createTask: true, taskTitle: 'Review and approve Q2 financial report'
    },
    {
      id: '11', sender: 'Mary Johnson', email: 'mary@clientco.com',
      subject: 'Re: Product Issues — Still Unresolved',
      snippet: 'Hi, following up on my previous email. The reporting module issues are still happening and affecting our team.',
      body: 'Hi,\n\nI wanted to follow up on my previous email from last week. Unfortunately the issues with the reporting module are still occurring and are now affecting our entire team productivity.\n\nWe really need this resolved urgently. Is there any update?\n\nMary',
      time: 'Saturday', unread: true, tags: ['Urgent', 'Complaint'],
      aiCategory: 'needs reply',
      aiSummary: 'Mary following up — reporting module still broken, affecting entire ClientCo team. Urgent reply needed.',
      createTask: false
    },
    {
      id: '12', sender: 'Leo Torres', email: 'leo@nexusco.com',
      subject: 'New Lead — Enterprise Deal $45K',
      snippet: 'Hey Alex, just got off a call with Momentum Corp. They are interested in the enterprise package. Estimated deal size $45K.',
      body: 'Hey Alex,\n\nJust got off a discovery call with Momentum Corp. They have a 200-person team and are very interested in the Enterprise package.\n\nEstimated deal size: $45,000/year\nDecision timeline: End of Q2\nNext step: Technical demo next week\n\nI think this one is close. Should I set up the demo?\n\nLeo',
      time: 'Friday', unread: false, tags: ['Sales'],
      aiCategory: 'task needed',
      aiSummary: 'Leo landed $45K enterprise lead from Momentum Corp. Needs your go-ahead for technical demo next week.',
      createTask: true, taskTitle: 'Approve Momentum Corp demo — $45K deal'
    },
    {
      id: '13', sender: 'AWS', email: 'no-reply@aws.amazon.com',
      subject: 'Your monthly bill — $234.50',
      snippet: 'Your AWS bill for April 2026 is $234.50. Payment will be charged automatically.',
      body: 'Your AWS monthly bill for April 2026 is $234.50. This will be automatically charged to your card on file.',
      time: 'Friday', unread: false, tags: ['FYI', 'Invoice'],
      aiCategory: 'fyi',
      aiSummary: 'AWS April bill $234.50 — auto-charged. No action needed.',
      createTask: false
    },
    {
      id: '14', sender: 'Sarah Mitchell', email: 'sarah@nexusco.com',
      subject: 'New Support Process — Team Feedback',
      snippet: 'Hi Alex, the team has some feedback on the new support routing process we rolled out last week.',
      body: 'Hi Alex,\n\nThe team wanted to share some feedback on the new email routing rules we implemented.\n\nPositive: Complaint emails are being routed correctly. Response times improved by 20%.\nConcern: Some emails are still falling through the cracks when the subject line is vague.\n\nSuggestion: Add a catch-all rule for unclassified emails.\n\nHappy to discuss further.\n\nSarah',
      time: 'Thursday', unread: false, tags: ['Team', 'FYI'],
      aiCategory: 'needs reply',
      aiSummary: 'Sarah reporting 20% response time improvement from routing rules, but vague subjects still slipping through.',
      createTask: false
    },
    {
      id: '15', sender: 'Notion', email: 'no-reply@notion.so',
      subject: 'Your workspace is ready',
      snippet: 'Your Notion workspace has been set up. Start collaborating with your team.',
      body: 'Your Notion workspace is ready. Invite your team and start collaborating.',
      time: 'Thursday', unread: false, tags: ['FYI'],
      aiCategory: 'fyi',
      aiSummary: 'Notion workspace setup confirmation. No action needed.',
      createTask: false
    },
    {
      id: '16', sender: 'David Chen', email: 'david@techstart.com',
      subject: 'Retainer Invoice — May 2026',
      snippet: 'Please find attached the retainer invoice for May 2026 — $3,200.',
      body: 'Hi Nexus Team,\n\nPlease find the retainer invoice for May 2026 attached.\n\nAmount: $3,200.00\nDue: May 15, 2026\nReference: TechStart-May-2026\n\nThank you for your continued partnership.\n\nDavid Chen\nTechStart Inc',
      time: 'Wednesday', unread: false, tags: ['Invoice'],
      aiCategory: 'task needed',
      aiSummary: 'TechStart May retainer invoice — $3,200 due May 15th. Needs payment.',
      createTask: true, taskTitle: 'Pay TechStart retainer invoice — $3,200 due May 15'
    },
    {
      id: '17', sender: 'Rachel Adams', email: 'rachel@globalventures.com',
      subject: 'Re: Partnership — Available Tuesday?',
      snippet: 'Hi Alex, just following up on my previous email. Are you available Tuesday afternoon for a quick call?',
      body: 'Hi Alex,\n\nJust following up on my previous email about the partnership opportunity. Are you available Tuesday afternoon for a 30-minute intro call?\n\nLooking forward to connecting.\n\nRachel',
      time: 'Wednesday', unread: true, tags: ['Meeting', 'Sales'],
      aiCategory: 'meeting request',
      aiSummary: 'Rachel following up — asking if Tuesday afternoon works for the partnership intro call.',
      createTask: false
    },
    {
      id: '18', sender: 'GitHub', email: 'no-reply@github.com',
      subject: 'Security alert — dependency vulnerability',
      snippet: 'A vulnerability has been detected in one of your repository dependencies.',
      body: 'A high severity vulnerability has been detected in your repository. Please update the affected dependency immediately.',
      time: 'Tuesday', unread: false, tags: ['Urgent', 'FYI'],
      aiCategory: 'task needed',
      aiSummary: 'High severity GitHub security vulnerability detected in a dependency. Needs immediate update.',
      createTask: true, taskTitle: 'Fix GitHub security vulnerability — high severity'
    },
    {
      id: '19', sender: 'Priya Patel', email: 'priya@nexusco.com',
      subject: 'Expense Report — April 2026',
      snippet: 'Hi Alex, please find the April expense report attached for your approval.',
      body: 'Hi Alex,\n\nAttached is the April 2026 expense report for your approval.\n\nTotal expenses: $12,450\nLargest items: Travel ($4,200), Software ($3,800), Marketing ($2,100)\n\nPlease approve by end of week.\n\nPriya',
      time: 'Tuesday', unread: false, tags: ['Finance'],
      aiCategory: 'task needed',
      aiSummary: 'April expense report needs approval — $12,450 total. Largest spend: travel and software.',
      createTask: true, taskTitle: 'Approve April expense report — $12,450'
    },
    {
      id: '20', sender: 'James Okonkwo', email: 'james@nexusco.com',
      subject: 'ClientCo Issue Resolved',
      snippet: 'Hi Alex, just wanted to let you know that the ClientCo reporting module issue has been resolved.',
      body: 'Hi Alex,\n\nJust wanted to update you that the ClientCo reporting module issue has been resolved. James pushed a fix this morning and the client has confirmed everything is working.\n\nI will follow up with Mary to let her know and close the support thread.\n\nJames',
      time: 'Monday', unread: false, tags: ['FYI', 'Support'],
      aiCategory: 'fyi',
      aiSummary: 'Good news — ClientCo reporting module fixed. James will follow up with Mary to confirm and close thread.',
      createTask: false
    }
  ],

  tasks: [
    { id: 't1', title: 'Respond to ClientCo complaint escalation', status: 'todo', priority: 'high', assignee: 'Sarah Mitchell', tags: ['Urgent', 'Support'], createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 't2', title: 'Pay overdue Invoice #4182 — $4,182', status: 'todo', priority: 'high', assignee: 'Priya Patel', tags: ['Finance', 'Urgent'], createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 't3', title: 'Review and approve Q2 financial report', status: 'in-progress', priority: 'high', assignee: 'Alex Morgan', lockedBy: 'Alex Morgan', lockedAt: new Date(Date.now() - 1800000).toISOString(), tags: ['Finance'], createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 't4', title: 'Approve Momentum Corp demo — $45K deal', status: 'todo', priority: 'high', assignee: 'Leo Torres', tags: ['Sales'], createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 't5', title: 'Schedule meeting with Mary — product complaint', status: 'in-progress', priority: 'medium', assignee: 'Sarah Mitchell', lockedBy: 'Sarah Mitchell', lockedAt: new Date(Date.now() - 3600000).toISOString(), tags: ['Support', 'Meeting'], createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 't6', title: 'Fix GitHub security vulnerability', status: 'todo', priority: 'high', assignee: 'Marcus Webb', tags: ['Tech', 'Urgent'], createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: 't7', title: 'Pay TechStart retainer — $3,200 due May 15', status: 'todo', priority: 'medium', assignee: 'Priya Patel', tags: ['Finance'], createdAt: new Date(Date.now() - 345600000).toISOString() },
    { id: 't8', title: 'Follow up with Rachel Adams — partnership', status: 'done', priority: 'medium', assignee: 'Leo Torres', completedBy: 'Leo Torres', completedAt: new Date(Date.now() - 3600000).toISOString(), tags: ['Sales'], createdAt: new Date(Date.now() - 432000000).toISOString() },
    { id: 't9', title: 'Approve April expense report — $12,450', status: 'todo', priority: 'medium', assignee: 'Alex Morgan', tags: ['Finance'], createdAt: new Date(Date.now() - 518400000).toISOString() },
    { id: 't10', title: 'Add catch-all routing rule for unclassified emails', status: 'todo', priority: 'low', assignee: 'Marcus Webb', tags: ['Admin'], createdAt: new Date(Date.now() - 604800000).toISOString() }
  ],

  actions: [
    { id: 'a1', type: 'email_reply', subject: 'Re: Meeting Request — Product Complaint Follow-up', body: 'Hi Mary, thank you for reaching out. I would be happy to connect tomorrow at 9am. I will send over a Google Meet link shortly.', status: 'pending', from: 'Mary Johnson', hint: 'AI drafted reply to Mary\'s meeting request' },
    { id: 'a2', type: 'email_reply', subject: 'Re: Complaint — Client Angry About Delayed Response', body: 'Hi James, thank you for flagging this. I will reach out to ClientCo immediately and offer a call today.', status: 'pending', from: 'James Okonkwo', hint: 'AI drafted urgent reply to complaint escalation' },
    { id: 'a3', type: 'task_create', subject: 'Review Q2 Financial Report', body: 'Task created from Priya\'s email — Q2 report needs approval before Friday board meeting.', status: 'pending', from: 'Priya Patel', hint: 'AI created task from finance email' }
  ],

  schedule: [
    { id: 's1', title: '9am Standup — Nexus Team', date: new Date().toISOString().split('T')[0], start: '09:00', end: '09:30', source: 'confirmed', priority: 'medium', color: '#0a0a0a' },
    { id: 's2', title: 'Meeting — Mary Johnson (ClientCo Complaint)', date: new Date().toISOString().split('T')[0], start: '10:00', end: '10:30', source: 'ai_proposed', priority: 'high', color: '#b91c1c', meetLink: 'https://meet.google.com/demo-nexus-mary' },
    { id: 's3', title: 'Q2 Report Review — Finance Team', date: new Date().toISOString().split('T')[0], start: '14:00', end: '15:00', source: 'confirmed', priority: 'high', color: '#b91c1c' },
    { id: 's4', title: 'Sales Pipeline Review — Leo Torres', date: new Date().toISOString().split('T')[0], start: '16:00', end: '16:30', source: 'confirmed', priority: 'medium', color: '#92400e' },
    { id: 's5', title: 'Partnership Call — Rachel Adams', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], start: '14:00', end: '14:30', source: 'ai_proposed', priority: 'medium', color: '#92400e' }
  ],

  chat: [
    { id: 'c1', author: 'Sarah Mitchell', avatar: 'SM', message: 'Good morning team! Just flagged 3 urgent support threads that need attention today.', time: '8:30 AM', type: 'message' },
    { id: 'c2', author: 'James Okonkwo', avatar: 'JO', message: 'On it. I\'ll take the ClientCo escalation — already drafting a reply.', time: '8:32 AM', type: 'message' },
    { id: 'c3', author: 'Nudge AI', avatar: 'N', message: 'I detected a meeting request from Mary Johnson at ClientCo. She wants to meet tomorrow at 9am about the reporting module complaint. Should I create a Google Meet link and send it to her?', time: '8:35 AM', type: 'ai' },
    { id: 'c4', author: 'Alex Morgan', avatar: 'AM', message: 'Yes please do that.', time: '8:36 AM', type: 'message' },
    { id: 'c5', author: 'Nudge AI', avatar: 'N', message: 'Done! Google Meet link created: meet.google.com/demo-nexus-mary — Email sent to mary@clientco.com with the meeting details. Event added to your schedule for tomorrow 9:00–9:30 AM.', time: '8:36 AM', type: 'ai' },
    { id: 'c6', author: 'Leo Torres', avatar: 'LT', message: 'Great news on the Momentum Corp deal. I need approval to set up the technical demo. Alex can you confirm?', time: '8:45 AM', type: 'message' },
    { id: 'c7', author: 'Priya Patel', avatar: 'PP', message: 'Q2 report is ready for review Alex. Revenue is up 18% — good news for the board meeting Friday.', time: '9:00 AM', type: 'message' },
    { id: 'c8', author: 'Nudge AI', avatar: 'N', message: 'Reminder: You have 3 pending approvals on the Work Board and 7 unread emails. 2 are marked urgent — Invoice #4182 overdue and ClientCo escalation.', time: '9:05 AM', type: 'ai' }
  ],

  companyUpdates: [
    { id: 'u1', title: 'Welcome to Nexus Co. Workspace', body: 'Your Nudge AI workspace is live. All emails, tasks, and team activity are synced in real time.', date: 'Today' },
    { id: 'u2', title: 'Q2 Board Meeting — Friday 3pm', body: 'All department heads please prepare your summaries. Priya will share the financial report before the meeting.', date: 'Today' },
    { id: 'u3', title: 'New Email Routing Rules Active', body: 'Complaint and invoice emails are now automatically routed to the correct department. Response times improved 20%.', date: 'Yesterday' }
  ],

  quickLinks: [
    { label: 'HR Portal', url: '#' },
    { label: 'Submit Expense', url: '#' },
    { label: 'IT Support', url: '#' },
    { label: 'Team Directory', url: '#' }
  ]
};

window.DEMO = DEMO;

export { DEMO };
