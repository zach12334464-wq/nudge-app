require("dotenv").config();
const { initDb } = require("./server/database");

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const port = Number(process.env.PORT || 3000);
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;
const dbDir = path.join(__dirname, "data");
const dbPath = path.join(dbDir, "nudge.sqlite");

fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const oauthStates = new Map();

initDb(db);
seedDb();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/auth/google/start", (req, res) => {
  const config = getGoogleConfig();
  if (!config.clientId || !config.clientSecret) {
    return res.redirect("/?oauth=missing");
  }

  const state = createOAuthState("google", res);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state,
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events"
    ].join(" ")
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    assertOAuthState("google", req);
    const config = getGoogleConfig();
    const token = await postForm("https://oauth2.googleapis.com/token", {
      code: req.query.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    });

    const profile = await getJson("https://openidconnect.googleapis.com/v1/userinfo", token.access_token);
    saveAccount({
      provider: "google",
      providerLabel: "Google Workspace",
      providerAccountId: profile.sub,
      email: profile.email,
      displayName: profile.name || profile.email,
      permissions: ["Gmail", "Google Calendar"],
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: expiresAt(token.expires_in),
      syncStatus: "connected"
    });

    res.clearCookie("nudge_oauth_state");
    res.redirect("/?oauth=connected");
  } catch (error) {
    console.error("Google OAuth failed:", error);
    res.redirect("/?oauth=failed");
  }
});

app.get("/auth/microsoft/start", (req, res) => {
  const config = getMicrosoftConfig();
  if (!config.clientId || !config.clientSecret) {
    return res.redirect("/?oauth=missing");
  }

  const state = createOAuthState("microsoft", res);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    response_mode: "query",
    state,
    scope: "offline_access User.Read Mail.Read Mail.Send Calendars.ReadWrite"
  });

  res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`);
});

app.get("/auth/microsoft/callback", async (req, res) => {
  try {
    assertOAuthState("microsoft", req);
    const config = getMicrosoftConfig();
    const token = await postForm("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: req.query.code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    });

    const profile = await getJson("https://graph.microsoft.com/v1.0/me", token.access_token);
    saveAccount({
      provider: "microsoft",
      providerLabel: "Microsoft 365",
      providerAccountId: profile.id,
      email: profile.mail || profile.userPrincipalName,
      displayName: profile.displayName || profile.userPrincipalName,
      permissions: ["Outlook", "Microsoft Calendar"],
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: expiresAt(token.expires_in),
      syncStatus: "connected"
    });

    res.clearCookie("nudge_oauth_state");
    res.redirect("/?oauth=connected");
  } catch (error) {
    console.error("Microsoft OAuth failed:", error);
    res.redirect("/?oauth=failed");
  }
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("nudge_oauth_state");
  res.json({ ok: true });
});

app.get("/api/config", (req, res) => {
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  });
});

app.get("/api/accounts", (req, res) => {
  const accounts = db.prepare(`
    SELECT id, provider, provider_label AS providerLabel, email, display_name AS displayName,
      permissions, sync_status AS syncStatus, created_at AS createdAt, updated_at AS updatedAt
    FROM accounts
    ORDER BY updated_at DESC
  `).all().map((account) => ({
    ...account,
    permissions: JSON.parse(account.permissions)
  }));

  res.json({ accounts });
});

app.delete("/api/accounts/:id", (req, res) => {
  db.prepare("DELETE FROM accounts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/inbox/summary", async (req, res) => {
  const { data } = await supabase.from('actions').select('*').order('created_at', { ascending: false });
  const actions = (data || []).sort((a,b) => (a.status === 'pending' ? -1 : 1));
  res.json({ items: [], actions });
});

app.get("/api/tasks", async (req, res) => {
  const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });
  const tasks = (data || []).map(mapTask);
  res.json({ tasks });
});

app.post("/api/tasks", async (req, res) => {
  const task = normalizeTask(req.body);
  const id = crypto.randomUUID();
  await supabase.from('tasks').insert([{ id, user_id: null, title: task.title, status: task.status, priority: task.priority, due_date: task.dueDate }]);
  res.status(201).json({ task: { id, ...task } });
});

app.patch("/api/tasks/:id", async (req, res) => {
  const { data: existing } = await supabase.from('tasks').select('*').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: "Task not found" });
  const next = normalizeTask({ ...mapTask(existing), ...req.body });
  await supabase.from('tasks').update({ title: next.title, status: next.status, priority: next.priority, due_date: next.dueDate }).eq('id', req.params.id);
  res.json({ task: { id: req.params.id, ...next } });
});

app.post("/api/actions", async (req, res) => {
  const { id, type, subject, body } = req.body;
  const aid = id || crypto.randomUUID();
  await supabase.from('actions').insert([{ id: aid, user_id: null, type: type || 'ai_action', subject: subject || '', body: body || '', status: 'pending' }]);
  res.status(201).json({ ok: true, id: aid });
});

app.post("/api/actions/:id/approve", async (req, res) => {
  await updateActionStatus(req.params.id, "approved", res);
});

app.post("/api/actions/:id/decline", async (req, res) => {
  await updateActionStatus(req.params.id, "declined", res);
});

app.get("/api/schedule", async (req, res) => {
  const { data } = await supabase.from('schedule_blocks').select('*').order('date', { ascending: true }).order('start_time', { ascending: true });
  const blocks = (data || []).map(mapScheduleBlock);
  res.json({ blocks });
});

app.patch("/api/schedule/:id", async (req, res) => {
  const { data: existing } = await supabase.from('schedule_blocks').select('*').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: "Schedule block not found" });

  const existingBlock = mapScheduleBlock(existing);
  const body = { ...req.body };
  if (body.startTime && !body.endTime) {
    body.endTime = addMinutes(body.startTime, minutesBetween(existingBlock.startTime, existingBlock.endTime));
  }

  const next = normalizeScheduleBlock({ ...existingBlock, ...body });
  await supabase.from('schedule_blocks').update({ title: next.title, date: next.date, start_time: next.startTime, end_time: next.endTime, source: next.source }).eq('id', req.params.id);

  res.json({ block: { id: req.params.id, ...next } });
});

app.listen(port, () => {
  console.log(`Nudge workspace running at ${appBaseUrl}`);
});

// Schema is now managed by server/database.js via initDb(db)
app.use('/api/business', require('./routes/business'));

function seedDb() {
  // Seed tasks if empty
  const count = db.prepare("SELECT COUNT(*) AS c FROM tasks").get().c;
  if (count > 0) return;

  const it = db.prepare("INSERT OR IGNORE INTO tasks (id, user_id, title, status, priority, due_date) VALUES (?,?,?,?,?,?)");
  it.run("task-1", "local", "Review investor reply",  "review",    "high",   "2026-05-05");
  it.run("task-2", "local", "Prepare board deck edit","scheduled", "medium", "2026-05-08");

  const ia = db.prepare("INSERT OR IGNORE INTO actions (id, user_id, type, subject, body, status) VALUES (?,?,?,?,?,?)");
  ia.run("action-1", "local", "draft_reply", "Confirm Q3 planning call", "Draft accepts Tuesday 10:30 AM and asks Maya to send the agenda.", "pending");

  const is2 = db.prepare("INSERT OR IGNORE INTO schedule (id, user_id, title, start_time, end_time, source) VALUES (?,?,?,?,?,?)");
  is2.run("sched-1", "local", "Priority inbox review", "2026-05-05 09:00", "2026-05-05 09:30", "ai_proposed");
}

function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${appBaseUrl}/auth/google/callback`
  };
}

function getMicrosoftConfig() {
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${appBaseUrl}/auth/microsoft/callback`
  };
}

function createOAuthState(provider, res) {
  const state = crypto.randomBytes(24).toString("hex");
  oauthStates.set(state, { provider, expiresAt: Date.now() + 10 * 60 * 1000 });
  res.cookie("nudge_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: appBaseUrl.startsWith("https://"),
    maxAge: 10 * 60 * 1000
  });
  return state;
}

function assertOAuthState(provider, req) {
  const cookieState = parseCookies(req.headers.cookie || "").nudge_oauth_state;
  const queryState = req.query.state;
  const saved = oauthStates.get(queryState);

  if (!saved || saved.provider !== provider || saved.expiresAt < Date.now() || cookieState !== queryState) {
    throw new Error("Invalid OAuth state");
  }

  oauthStates.delete(queryState);
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(";").reduce((cookies, item) => {
    const [key, ...value] = item.trim().split("=");
    if (key) {
      cookies[key] = decodeURIComponent(value.join("="));
    }
    return cookies;
  }, {});
}

async function postForm(url, form) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "OAuth token request failed");
  }
  return data;
}

async function getJson(url, accessToken) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error?.message || "Provider API request failed");
  }
  return data;
}

function saveAccount(account) {
  db.prepare(`
    INSERT INTO accounts (
      provider, provider_label, provider_account_id, email, display_name,
      permissions, access_token, refresh_token, expires_at, sync_status
    ) VALUES (
      @provider, @providerLabel, @providerAccountId, @email, @displayName,
      @permissions, @accessToken, @refreshToken, @expiresAt, @syncStatus
    )
    ON CONFLICT(provider, provider_account_id) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      permissions = excluded.permissions,
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, accounts.refresh_token),
      expires_at = excluded.expires_at,
      sync_status = excluded.sync_status,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    ...account,
    permissions: JSON.stringify(account.permissions)
  });
}

function expiresAt(seconds) {
  if (!seconds) {
    return null;
  }
  return new Date(Date.now() + Number(seconds) * 1000).toISOString();
}

function mapTask(row) {
  return {
    id:       row.id,
    title:    row.title,
    status:   row.status,
    priority: row.priority,
    due_date: row.due_date
  };
}

function normalizeTask(body) {
  return {
    title:    String(body.title || 'Untitled task').slice(0, 140),
    status:   ['todo','review','scheduled','done'].includes(body.status) ? body.status : 'todo',
    priority: ['high','medium','low'].includes(body.priority) ? body.priority : 'medium',
    dueDate:  body.dueDate || body.due_date || null
  };
}

function mapScheduleBlock(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    source: row.source
  };
}

function normalizeScheduleBlock(body) {
  return {
    title: String(body.title || "Work block").slice(0, 140),
    date: body.date || new Date().toISOString().slice(0, 10),
    startTime: body.startTime || "09:00",
    endTime: body.endTime || "09:30",
    source: body.source || "manual"
  };
}

function minutesBetween(start, end) {
  const [startHour, startMinute] = String(start).split(":").map(Number);
  const [endHour, endMinute] = String(end).split(":").map(Number);
  const diff = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  return diff > 0 ? diff : 30;
}

function addMinutes(time, minutes) {
  const [hour, minute] = String(time).split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const nextHour = String(Math.floor(normalized / 60)).padStart(2, "0");
  const nextMinute = String(normalized % 60).padStart(2, "0");
  return `${nextHour}:${nextMinute}`;
}

async function updateActionStatus(id, status, res) {
  const { data, error } = await supabase.from('actions').update({ status }).eq('id', id).select();
  if (error || !data || data.length === 0) {
    return res.status(404).json({ error: "Action not found" });
  }
  res.json({ ok: true, id, status });
}
