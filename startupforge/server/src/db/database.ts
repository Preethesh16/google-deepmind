import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'startupforge.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS business_profiles (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name       TEXT NOT NULL,
    founder_name        TEXT DEFAULT '',
    industry            TEXT DEFAULT '',
    stage               TEXT DEFAULT 'idea',
    location            TEXT DEFAULT '',
    udyam_number        TEXT DEFAULT '',
    gst_number          TEXT DEFAULT '',
    problem_statement   TEXT DEFAULT '',
    solution            TEXT DEFAULT '',
    mission             TEXT DEFAULT '',
    vision              TEXT DEFAULT '',
    unique_value_prop   TEXT DEFAULT '',
    product_type        TEXT DEFAULT 'webapp',
    revenue_model       TEXT DEFAULT '',
    target_market       TEXT DEFAULT '',
    market_size         TEXT DEFAULT '',
    preferred_frontend  TEXT DEFAULT 'React + Vite + TypeScript',
    preferred_backend   TEXT DEFAULT 'Node.js + Express',
    preferred_db        TEXT DEFAULT 'SQLite',
    preferred_cloud     TEXT DEFAULT 'Vercel',
    design_style        TEXT DEFAULT 'Modern dark with gradient accents',
    brand_colors        TEXT DEFAULT '["#6366F1","#8B5CF6","#22D3EE"]',
    github_repo_url     TEXT DEFAULT '',
    has_existing_code   INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id     INTEGER NOT NULL,
    name            TEXT NOT NULL,
    role            TEXT DEFAULT '',
    skills          TEXT DEFAULT '[]',
    equity          REAL DEFAULT 0,
    linkedin        TEXT DEFAULT '',
    responsibilities TEXT DEFAULT '[]',
    FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS core_features (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id  INTEGER NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    priority     INTEGER DEFAULT 1,
    is_mvp       INTEGER DEFAULT 1,
    FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_personas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id  INTEGER NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    pain_points  TEXT DEFAULT '[]',
    FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mvp_builds (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id  INTEGER NOT NULL,
    status       TEXT DEFAULT 'pending',
    project_path TEXT DEFAULT '',
    deploy_url   TEXT DEFAULT '',
    github_url   TEXT DEFAULT '',
    files_created TEXT DEFAULT '[]',
    build_log    TEXT DEFAULT '[]',
    command_used TEXT DEFAULT '',
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE
  );

  -- User feedback collected from an Excel sheet (e.g. a Google Form export)
  -- and turned into autonomous fix requests.
  CREATE TABLE IF NOT EXISTS feedback (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id   TEXT DEFAULT '',        -- stable key from the source row (dedupe)
    source        TEXT DEFAULT 'excel',   -- excel | form | manual
    user_name     TEXT DEFAULT '',
    email         TEXT DEFAULT '',
    project_path  TEXT DEFAULT '',
    category      TEXT DEFAULT 'bug',     -- bug | error | feature | ux | performance | other
    message       TEXT NOT NULL,
    priority      TEXT DEFAULT 'medium',  -- high | medium | low
    urgency       TEXT DEFAULT 'normal',  -- critical | high | normal | low
    score         INTEGER DEFAULT 0,      -- computed priority*urgency ranking
    status        TEXT DEFAULT 'open',    -- open | fixing | pending_approval | completed | rejected
    build_id      INTEGER,
    files_changed TEXT DEFAULT '[]',
    fix_summary   TEXT DEFAULT '',
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    fixed_at      TEXT DEFAULT '',
    approved_at   TEXT DEFAULT ''
  );

  -- Single connected GitHub account (this is a local, single-admin tool).
  -- Populated either via OAuth login or a pasted Personal Access Token.
  CREATE TABLE IF NOT EXISTS github_accounts (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    username      TEXT DEFAULT '',
    avatar_url    TEXT DEFAULT '',
    access_token  TEXT DEFAULT '',
    connected_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── MIGRATIONS (best-effort ALTER TABLE for columns added after initial release) ──
function tryAddColumn(table: string, columnDef: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  } catch {
    // Already exists — ignore.
  }
}
tryAddColumn('mvp_builds', "github_pages_url TEXT DEFAULT ''");

// Helper functions
export function getBusinessProfile(id: number) {
  return db.prepare('SELECT * FROM business_profiles WHERE id = ?').get(id);
}

export function getTeamMembers(businessId: number) {
  return db.prepare('SELECT * FROM team_members WHERE business_id = ?').all(businessId);
}

export function getCoreFeatures(businessId: number) {
  return db.prepare('SELECT * FROM core_features WHERE business_id = ? ORDER BY priority ASC').all(businessId);
}

export function getUserPersonas(businessId: number) {
  return db.prepare('SELECT * FROM user_personas WHERE business_id = ?').all(businessId);
}

export function getLatestBuild(businessId: number) {
  return db.prepare('SELECT * FROM mvp_builds WHERE business_id = ? ORDER BY created_at DESC LIMIT 1').get(businessId);
}

// ─── FEEDBACK HELPERS ──────────────────────────────────────────────────────

export function listFeedback() {
  // Rank: active work first, then by computed score (priority x urgency), newest first.
  return db.prepare(`
    SELECT * FROM feedback
    ORDER BY
      CASE status
        WHEN 'fixing' THEN 0
        WHEN 'pending_approval' THEN 1
        WHEN 'open' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'rejected' THEN 4
        ELSE 5
      END ASC,
      score DESC,
      datetime(created_at) DESC
  `).all();
}

export function getFeedback(id: number) {
  return db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
}

// ─── GITHUB ACCOUNT HELPERS ─────────────────────────────────────────────────

export function getGithubAccount() {
  return db.prepare('SELECT * FROM github_accounts WHERE id = 1').get();
}

export function saveGithubAccount(data: { username: string; avatarUrl: string; accessToken: string }) {
  db.prepare(`
    INSERT INTO github_accounts (id, username, avatar_url, access_token, connected_at)
    VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      avatar_url = excluded.avatar_url,
      access_token = excluded.access_token,
      connected_at = CURRENT_TIMESTAMP
  `).run(data.username, data.avatarUrl, data.accessToken);
}

export function clearGithubAccount() {
  db.prepare('DELETE FROM github_accounts WHERE id = 1').run();
}

// ─── PROJECT LIBRARY HELPERS ────────────────────────────────────────────────

/** All generated MVPs (builds with an actual project folder), newest first. */
export function listProjects() {
  return db.prepare(`
    SELECT
      b.id AS build_id, b.business_id, b.status, b.project_path, b.deploy_url,
      b.github_url, b.github_pages_url, b.files_created, b.command_used, b.created_at,
      p.business_name, p.industry, p.stage
    FROM mvp_builds b
    JOIN business_profiles p ON p.id = b.business_id
    WHERE b.id IN (
      SELECT MAX(id) FROM mvp_builds WHERE project_path != '' GROUP BY project_path
    )
    ORDER BY b.created_at DESC
  `).all();
}
