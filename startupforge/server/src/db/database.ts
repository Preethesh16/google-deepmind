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
`);

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
