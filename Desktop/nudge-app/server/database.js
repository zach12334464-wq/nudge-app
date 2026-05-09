/**
 * database.js — Nudge SQLite schema (spec-exact)
 * Imported by server.js; call initDb(db) after opening the connection.
 */

function initDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      name       TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      provider      TEXT NOT NULL,
      access_token  TEXT,
      refresh_token TEXT,
      email         TEXT,
      connected_at  INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      title        TEXT NOT NULL,
      status       TEXT DEFAULT 'todo',
      priority     TEXT DEFAULT 'medium',
      due_date     TEXT,
      source_email TEXT,
      created_at   INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS actions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      type       TEXT NOT NULL,
      subject    TEXT,
      body       TEXT,
      status     TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      title      TEXT NOT NULL,
      start_time TEXT,
      end_time   TEXT,
      meet_link  TEXT,
      source     TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      plan TEXT DEFAULT 'starter',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#0a0a0a',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_emails (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      department_id TEXT,
      address TEXT NOT NULL,
      label TEXT,
      provider TEXT DEFAULT 'google',
      access_token TEXT,
      refresh_token TEXT,
      connected_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE CASCADE,
      FOREIGN KEY (department_id) 
        REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'agent',
      department_id TEXT,
      status TEXT DEFAULT 'invited',
      invite_token TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE CASCADE,
      FOREIGN KEY (department_id) 
        REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS thread_assignments (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      assigned_to TEXT,
      department_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (assigned_to) 
        REFERENCES team_members(id),
      FOREIGN KEY (department_id) 
        REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS routing_rules (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      match_type TEXT NOT NULL,
      match_value TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE CASCADE,
      FOREIGN KEY (department_id) 
        REFERENCES departments(id)
    );
  `);
}

module.exports = { initDb };
