-- MASUMI Sales CRM Cloud — initial D1 schema
-- Traceability: FUN-003–009, FUN-012–019, FUN-023, DAT-002–006,
-- NFR-002, NFR-005, SEC-003, SEC-010–011.
-- This migration intentionally contains no users, leads, or other seed data.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY
    CHECK (length(trim(id)) BETWEEN 1 AND 120),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE
    CHECK (length(trim(email)) BETWEEN 3 AND 320 AND instr(email, '@') > 1),
  display_name TEXT NOT NULL
    CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  role TEXT NOT NULL
    CHECK (role IN ('admin', 'sales')),
  active INTEGER NOT NULL DEFAULT 1
    CHECK (typeof(active) = 'integer' AND active IN (0, 1)),
  created_at TEXT NOT NULL
    CHECK (length(trim(created_at)) BETWEEN 20 AND 40),
  updated_at TEXT NOT NULL
    CHECK (length(trim(updated_at)) BETWEEN 20 AND 40)
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY
    CHECK (length(trim(id)) BETWEEN 1 AND 120),
  lead_date TEXT NOT NULL DEFAULT ''
    CHECK (
      lead_date = '' OR
      (length(lead_date) = 10 AND lead_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
    ),
  source TEXT NOT NULL DEFAULT ''
    CHECK (length(source) <= 120),
  company TEXT NOT NULL
    CHECK (length(trim(company)) BETWEEN 1 AND 180),
  pic_name TEXT NOT NULL
    CHECK (length(trim(pic_name)) BETWEEN 1 AND 140),
  pic_role TEXT NOT NULL DEFAULT ''
    CHECK (length(pic_role) <= 120),
  decision_maker_status TEXT NOT NULL DEFAULT 'Unknown'
    CHECK (decision_maker_status IN ('Unknown', 'Influencer', 'Recommender', 'Decision Maker')),
  contact TEXT NOT NULL DEFAULT ''
    CHECK (length(contact) <= 80),
  city TEXT NOT NULL DEFAULT ''
    CHECK (length(city) <= 120),
  owner_user_id TEXT NOT NULL,
  brand_status TEXT NOT NULL DEFAULT 'Idea'
    CHECK (brand_status IN ('Idea', 'New Brand', 'Existing Brand', 'Rebrand')),
  needs TEXT NOT NULL DEFAULT ''
    CHECK (length(needs) <= 500),
  estimated_quantity INTEGER NOT NULL DEFAULT 0
    CHECK (
      typeof(estimated_quantity) = 'integer' AND
      estimated_quantity BETWEEN 0 AND 100000000
    ),
  potential_value INTEGER NOT NULL DEFAULT 0
    CHECK (
      typeof(potential_value) = 'integer' AND
      potential_value BETWEEN 0 AND 999999999999
    ),
  target_launch TEXT NOT NULL DEFAULT ''
    CHECK (length(target_launch) <= 80),
  pipeline TEXT NOT NULL DEFAULT 'New'
    CHECK (
      pipeline IN (
        'New',
        'Contacted',
        'Qualified',
        'Needs Discovery',
        'Proposal Sent',
        'Negotiation',
        'Won',
        'Lost',
        'Nurture'
      )
    ),
  last_contact TEXT NOT NULL DEFAULT ''
    CHECK (
      last_contact = '' OR
      (length(last_contact) = 10 AND last_contact GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
    ),
  next_action TEXT NOT NULL DEFAULT ''
    CHECK (length(next_action) <= 500),
  next_action_date TEXT NOT NULL DEFAULT ''
    CHECK (
      next_action_date = '' OR
      (length(next_action_date) = 10 AND next_action_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
    ),
  compliance_status TEXT NOT NULL DEFAULT 'Not Checked'
    CHECK (compliance_status IN ('Not Checked', 'Ready', 'Needs Review', 'Blocked')),
  blocker TEXT NOT NULL DEFAULT ''
    CHECK (length(blocker) <= 500),
  lost_reason TEXT NOT NULL DEFAULT ''
    CHECK (length(lost_reason) <= 500),
  notes TEXT NOT NULL DEFAULT ''
    CHECK (length(notes) <= 3000),
  fit_score INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(fit_score) = 'integer' AND fit_score BETWEEN 0 AND 5),
  readiness_score INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(readiness_score) = 'integer' AND readiness_score BETWEEN 0 AND 5),
  urgency_score INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(urgency_score) = 'integer' AND urgency_score BETWEEN 0 AND 5),
  value_score INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(value_score) = 'integer' AND value_score BETWEEN 0 AND 5),
  version INTEGER NOT NULL DEFAULT 1
    CHECK (typeof(version) = 'integer' AND version >= 1),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL
    CHECK (length(trim(created_at)) BETWEEN 20 AND 40),
  updated_at TEXT NOT NULL
    CHECK (length(trim(updated_at)) BETWEEN 20 AND 40),
  deleted_at TEXT NULL
    CHECK (deleted_at IS NULL OR length(trim(deleted_at)) BETWEEN 20 AND 40),
  CHECK (pipeline <> 'Lost' OR length(trim(lost_reason)) > 0),
  FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (updated_by) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY
    CHECK (length(trim(id)) BETWEEN 1 AND 120),
  actor_user_id TEXT NOT NULL,
  mode TEXT NOT NULL
    CHECK (mode IN ('append', 'replace', 'migration')),
  source_schema TEXT NOT NULL
    CHECK (length(trim(source_schema)) BETWEEN 1 AND 160),
  source_version INTEGER NOT NULL
    CHECK (typeof(source_version) = 'integer' AND source_version >= 1),
  checksum TEXT NOT NULL
    CHECK (
      length(checksum) = 64 AND
      checksum = lower(checksum) AND
      checksum NOT GLOB '*[^0-9a-f]*'
    ),
  row_count INTEGER NOT NULL
    CHECK (typeof(row_count) = 'integer' AND row_count BETWEEN 0 AND 2000),
  status TEXT NOT NULL
    CHECK (status IN ('validated', 'committed', 'failed', 'cancelled')),
  created_at TEXT NOT NULL
    CHECK (length(trim(created_at)) BETWEEN 20 AND 40),
  committed_at TEXT NULL
    CHECK (committed_at IS NULL OR length(trim(committed_at)) BETWEEN 20 AND 40),
  error_code TEXT NULL
    CHECK (error_code IS NULL OR length(trim(error_code)) BETWEEN 1 AND 120),
  CHECK (
    (status = 'committed' AND committed_at IS NOT NULL) OR
    (status <> 'committed' AND committed_at IS NULL)
  ),
  FOREIGN KEY (actor_user_id) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY
    CHECK (length(trim(id)) BETWEEN 1 AND 120),
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN ('lead.create', 'lead.update', 'lead.delete', 'lead.restore', 'import.commit')),
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('lead', 'import')),
  entity_id TEXT NOT NULL
    CHECK (length(trim(entity_id)) BETWEEN 1 AND 120),
  request_id TEXT NOT NULL
    CHECK (length(trim(request_id)) BETWEEN 1 AND 160),
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (
      length(metadata_json) <= 4000 AND
      json_valid(metadata_json) AND
      json_type(metadata_json) = 'object'
    ),
  created_at TEXT NOT NULL
    CHECK (length(trim(created_at)) BETWEEN 20 AND 40),
  FOREIGN KEY (actor_user_id) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_leads_owner_active_updated
  ON leads (owner_user_id, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_active
  ON leads (pipeline, deleted_at);

CREATE INDEX IF NOT EXISTS idx_leads_follow_up_active
  ON leads (next_action_date, owner_user_id)
  WHERE deleted_at IS NULL AND pipeline NOT IN ('Won', 'Lost') AND next_action <> '';

CREATE INDEX IF NOT EXISTS idx_leads_company_search
  ON leads (company COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_import_jobs_actor_created
  ON import_jobs (actor_user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_import_jobs_committed_checksum
  ON import_jobs (checksum)
  WHERE status = 'committed';

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
  ON audit_logs (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created
  ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_leads_active_limit_insert
BEFORE INSERT ON leads
WHEN
  NEW.deleted_at IS NULL AND
  (SELECT count(*) FROM leads WHERE deleted_at IS NULL) >= 2000
BEGIN
  SELECT RAISE(ABORT, 'LEAD_LIMIT');
END;

CREATE TRIGGER IF NOT EXISTS trg_leads_active_limit_restore
BEFORE UPDATE OF deleted_at ON leads
WHEN
  OLD.deleted_at IS NOT NULL AND
  NEW.deleted_at IS NULL AND
  (SELECT count(*) FROM leads WHERE deleted_at IS NULL) >= 2000
BEGIN
  SELECT RAISE(ABORT, 'LEAD_LIMIT');
END;
