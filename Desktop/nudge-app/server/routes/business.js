const express = require('express');
const router = express.Router();
const db = require('../database');
const crypto = require('crypto');

// ── Company setup ──────────────────────────────
// POST /api/business/setup
// Owner creates their company on first login
router.post('/setup', (req, res) => {
  const { name } = req.body;
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ 
    error: 'Not logged in' 
  });

  const companyId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO companies (id, name, owner_id)
    VALUES (?, ?, ?)
  `).run(companyId, name, userId);

  // Update user role to owner
  db.prepare(`
    UPDATE users SET role = 'owner', 
    company_id = ? WHERE id = ?
  `).run(companyId, userId);

  req.session.companyId = companyId;
  req.session.role = 'owner';
  res.json({ companyId, name });
});

// ── Departments ────────────────────────────────
// GET /api/business/departments
router.get('/departments', (req, res) => {
  const { companyId } = req.session;
  if (!companyId) return res.status(401).json([]);
  const rows = db.prepare(`
    SELECT d.*, 
      COUNT(DISTINCT tm.id) as member_count,
      COUNT(DISTINCT ce.id) as email_count
    FROM departments d
    LEFT JOIN team_members tm 
      ON tm.department_id = d.id
    LEFT JOIN company_emails ce 
      ON ce.department_id = d.id
    WHERE d.company_id = ?
    GROUP BY d.id
  `).all(companyId);
  res.json(rows);
});

// POST /api/business/departments
router.post('/departments', (req, res) => {
  const { name, color } = req.body;
  const { companyId } = req.session;
  if (!companyId) return res.status(401).json({});
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO departments (id, company_id, name, color)
    VALUES (?, ?, ?, ?)
  `).run(id, companyId, name, color || '#0a0a0a');
  res.json({ id, name, color });
});

// DELETE /api/business/departments/:id
router.delete('/departments/:id', (req, res) => {
  const { companyId } = req.session;
  db.prepare(`
    DELETE FROM departments 
    WHERE id = ? AND company_id = ?
  `).run(req.params.id, companyId);
  res.json({ deleted: true });
});

// ── Team members ───────────────────────────────
// GET /api/business/team
router.get('/team', (req, res) => {
  const { companyId } = req.session;
  if (!companyId) return res.status(401).json([]);
  const rows = db.prepare(`
    SELECT tm.*, d.name as department_name,
      d.color as department_color,
      COUNT(DISTINCT ta.id) as open_threads
    FROM team_members tm
    LEFT JOIN departments d 
      ON d.id = tm.department_id
    LEFT JOIN thread_assignments ta 
      ON ta.assigned_to = tm.id 
      AND ta.status = 'open'
    WHERE tm.company_id = ?
    GROUP BY tm.id
  `).all(companyId);
  res.json(rows);
});

// POST /api/business/team/invite
router.post('/team/invite', (req, res) => {
  const { name, email, role, departmentId } = req.body;
  const { companyId } = req.session;
  if (!companyId) return res.status(401).json({});

  const id = crypto.randomUUID();
  const inviteToken = crypto.randomBytes(32)
    .toString('hex');

  db.prepare(`
    INSERT INTO team_members 
      (id, company_id, email, name, role, 
       department_id, invite_token)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, companyId, email, name, 
         role || 'agent', departmentId, inviteToken);

  // In production send invite email here
  // Return the invite link
  const inviteLink = 
    `http://localhost:3001/join?token=${inviteToken}`;
  res.json({ id, name, email, inviteLink });
});

// PATCH /api/business/team/:id
router.patch('/team/:id', (req, res) => {
  const { departmentId, role } = req.body;
  const { companyId } = req.session;
  db.prepare(`
    UPDATE team_members 
    SET department_id = ?, role = ?
    WHERE id = ? AND company_id = ?
  `).run(departmentId, role, 
         req.params.id, companyId);
  res.json({ updated: true });
});

// DELETE /api/business/team/:id
router.delete('/team/:id', (req, res) => {
  const { companyId } = req.session;
  db.prepare(`
    DELETE FROM team_members 
    WHERE id = ? AND company_id = ?
  `).run(req.params.id, companyId);
  res.json({ deleted: true });
});

// ── Company emails ─────────────────────────────
// GET /api/business/emails
router.get('/emails', (req, res) => {
  const { companyId } = req.session;
  if (!companyId) return res.status(401).json([]);
  const rows = db.prepare(`
    SELECT ce.*, d.name as department_name
    FROM company_emails ce
    LEFT JOIN departments d 
      ON d.id = ce.department_id
    WHERE ce.company_id = ?
  `).all(companyId);
  res.json(rows);
});

// POST /api/business/emails
router.post('/emails', (req, res) => {
  const { address, label, departmentId, provider } = 
    req.body;
  const { companyId } = req.session;
  if (!companyId) return res.status(401).json({});
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO company_emails 
      (id, company_id, address, label, 
       department_id, provider)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, companyId, address, label, 
         departmentId, provider || 'google');
  res.json({ id, address, label });
});

// DELETE /api/business/emails/:id
router.delete('/emails/:id', (req, res) => {
  const { companyId } = req.session;
  db.prepare(`
    DELETE FROM company_emails 
    WHERE id = ? AND company_id = ?
  `).run(req.params.id, companyId);
  res.json({ deleted: true });
});

// ── Routing rules ──────────────────────────────
// GET /api/business/rules
router.get('/rules', (req, res) => {
  const { companyId } = req.session;
  if (!companyId) return res.status(401).json([]);
  const rows = db.prepare(`
    SELECT rr.*, d.name as department_name
    FROM routing_rules rr
    JOIN departments d ON d.id = rr.department_id
    WHERE rr.company_id = ?
  `).all(companyId);
  res.json(rows);
});

// POST /api/business/rules
router.post('/rules', (req, res) => {
  const { departmentId, matchType, matchValue } = 
    req.body;
  const { companyId } = req.session;
  if (!companyId) return res.status(401).json({});
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO routing_rules 
      (id, company_id, department_id, 
       match_type, match_value)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, companyId, departmentId, 
         matchType, matchValue);
  res.json({ id });
});

// ── God view stats (owner only) ────────────────
// GET /api/business/overview
router.get('/overview', (req, res) => {
  const { companyId, role } = req.session || {};
  if (!companyId || role !== 'owner') {
    return res.status(403).json({ 
      error: 'Owner only' 
    });
  }

  const departments = db.prepare(`
    SELECT d.*,
      COUNT(DISTINCT tm.id) as agents,
      COUNT(DISTINCT ta.id) as open_threads,
      COUNT(DISTINCT ce.id) as emails
    FROM departments d
    LEFT JOIN team_members tm 
      ON tm.department_id = d.id
    LEFT JOIN thread_assignments ta 
      ON ta.department_id = d.id 
      AND ta.status = 'open'
    LEFT JOIN company_emails ce 
      ON ce.department_id = d.id
    WHERE d.company_id = ?
    GROUP BY d.id
  `).all(companyId);

  const team = db.prepare(`
    SELECT tm.*, d.name as dept,
      COUNT(ta.id) as open_threads
    FROM team_members tm
    LEFT JOIN departments d 
      ON d.id = tm.department_id
    LEFT JOIN thread_assignments ta 
      ON ta.assigned_to = tm.id 
      AND ta.status = 'open'
    WHERE tm.company_id = ?
    GROUP BY tm.id
    ORDER BY open_threads DESC
  `).all(companyId);

  res.json({ departments, team });
});

module.exports = router;
