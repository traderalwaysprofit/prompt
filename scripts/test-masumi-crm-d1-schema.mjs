import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSqliteD1 } from './helpers/sqlite-d1.mjs';

const migrationSql = await readFile(
  new URL('../migrations/masumi-crm/0001_initial.sql', import.meta.url),
  'utf8'
);

const { database, close } = createSqliteD1();

const timestamp = '2026-09-08T12:00:00.000Z';

const expectDatabaseRejection = async (operation, pattern) => {
  let failure;
  try {
    await operation();
  } catch (error) {
    failure = error;
  }

  assert.ok(failure, 'Expected D1 to reject the operation.');
  const diagnostic = [failure?.message, failure?.cause?.message, failure?.cause]
    .filter(Boolean)
    .join(' ');
  assert.match(diagnostic, pattern);
};

try {
  await database.exec(migrationSql);
  await database.exec(migrationSql);

  const expectedTables = ['app_users', 'audit_logs', 'import_jobs', 'leads'];
  const tableResult = await database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%' ORDER BY name")
    .all();
  assert.deepEqual(tableResult.results.map(({ name }) => name), expectedTables);

  for (const table of expectedTables) {
    const row = await database.prepare(`SELECT count(*) AS total FROM ${table}`).first();
    assert.equal(row.total, 0, `${table} must not contain seed data.`);
  }

  const schemaObjects = await database
    .prepare("SELECT type, name FROM sqlite_master WHERE type IN ('index', 'trigger')")
    .all();
  const schemaObjectNames = new Set(schemaObjects.results.map(({ name }) => name));
  for (const name of [
    'idx_leads_owner_active_updated',
    'idx_leads_pipeline_active',
    'idx_leads_follow_up_active',
    'idx_import_jobs_actor_created',
    'ux_import_jobs_committed_checksum',
    'idx_audit_logs_actor_created',
    'idx_audit_logs_entity_created',
    'trg_leads_active_limit_insert',
    'trg_leads_active_limit_restore'
  ]) {
    assert.ok(schemaObjectNames.has(name), `Missing schema object: ${name}`);
  }

  const insertUser = (id, email, role = 'sales', active = 1) => database.prepare(`
    INSERT INTO app_users (id, email, display_name, role, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, email, `TEST-${id}`, role, active, timestamp, timestamp).run();

  await insertUser('user-admin', 'admin@example.invalid', 'admin');
  await insertUser('user-sales', 'sales@example.invalid');

  await expectDatabaseRejection(
    () => insertUser('user-duplicate', 'ADMIN@EXAMPLE.INVALID', 'sales'),
    /UNIQUE constraint failed/i
  );
  await expectDatabaseRejection(
    () => insertUser('user-role', 'role@example.invalid', 'viewer'),
    /CHECK constraint failed/i
  );

  const insertLead = (id, overrides = {}) => {
    const values = {
      company: 'TEST-ONLY-COMPANY',
      picName: 'TEST-ONLY-PIC',
      ownerUserId: 'user-sales',
      pipeline: 'New',
      lostReason: '',
      fitScore: 0,
      readinessScore: 0,
      urgencyScore: 0,
      valueScore: 0,
      createdBy: 'user-admin',
      updatedBy: 'user-admin',
      deletedAt: null,
      ...overrides
    };

    return database.prepare(`
      INSERT INTO leads (
        id, company, pic_name, owner_user_id, pipeline, lost_reason,
        fit_score, readiness_score, urgency_score, value_score,
        created_by, updated_by, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      values.company,
      values.picName,
      values.ownerUserId,
      values.pipeline,
      values.lostReason,
      values.fitScore,
      values.readinessScore,
      values.urgencyScore,
      values.valueScore,
      values.createdBy,
      values.updatedBy,
      timestamp,
      timestamp,
      values.deletedAt
    ).run();
  };

  await insertLead('lead-valid', {
    pipeline: 'Qualified',
    fitScore: 5,
    readinessScore: 4,
    urgencyScore: 3,
    valueScore: 5
  });
  await expectDatabaseRejection(
    () => insertLead('lead-pipeline', { pipeline: 'Closed' }),
    /CHECK constraint failed/i
  );
  await expectDatabaseRejection(
    () => insertLead('lead-lost', { pipeline: 'Lost' }),
    /CHECK constraint failed/i
  );
  await insertLead('lead-lost-valid', { pipeline: 'Lost', lostReason: 'TEST-ONLY-REASON' });
  await expectDatabaseRejection(
    () => insertLead('lead-score', { fitScore: 6 }),
    /CHECK constraint failed/i
  );
  await expectDatabaseRejection(
    () => insertLead('lead-owner', { ownerUserId: 'missing-user' }),
    /FOREIGN KEY constraint failed/i
  );
  await expectDatabaseRejection(
    () => insertLead('lead-valid'),
    /UNIQUE constraint failed/i
  );

  await database.prepare("DELETE FROM leads WHERE id = 'lead-lost-valid'").run();
  await database.exec(`
    WITH RECURSIVE sequence(value) AS (
      SELECT 2
      UNION ALL
      SELECT value + 1 FROM sequence WHERE value < 2000
    )
    INSERT INTO leads (
      id, company, pic_name, owner_user_id, created_by, updated_by, created_at, updated_at
    )
    SELECT
      printf('lead-capacity-%04d', value),
      'TEST-ONLY-COMPANY',
      'TEST-ONLY-PIC',
      'user-sales',
      'user-admin',
      'user-admin',
      '${timestamp}',
      '${timestamp}'
    FROM sequence;
  `);

  const activeCount = await database
    .prepare('SELECT count(*) AS total FROM leads WHERE deleted_at IS NULL')
    .first();
  assert.equal(activeCount.total, 2000);
  await expectDatabaseRejection(
    () => insertLead('lead-over-limit'),
    /LEAD_LIMIT/i
  );

  await database.prepare(`
    UPDATE leads
    SET deleted_at = ?, updated_at = ?, version = version + 1
    WHERE id = ?
  `).bind(timestamp, timestamp, 'lead-valid').run();
  await insertLead('lead-after-delete');
  await expectDatabaseRejection(
    () => database.prepare(`
      UPDATE leads
      SET deleted_at = NULL, updated_at = ?, version = version + 1
      WHERE id = ?
    `).bind(timestamp, 'lead-valid').run(),
    /LEAD_LIMIT/i
  );

  const committedChecksum = 'a'.repeat(64);
  const insertImportJob = (id, overrides = {}) => {
    const values = {
      mode: 'append',
      sourceSchema: 'samson.masumi-crm.backup',
      sourceVersion: 1,
      checksum: committedChecksum,
      rowCount: 2,
      status: 'committed',
      committedAt: timestamp,
      ...overrides
    };
    return database.prepare(`
      INSERT INTO import_jobs (
        id, actor_user_id, mode, source_schema, source_version, checksum,
        row_count, status, created_at, committed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      'user-admin',
      values.mode,
      values.sourceSchema,
      values.sourceVersion,
      values.checksum,
      values.rowCount,
      values.status,
      timestamp,
      values.committedAt
    ).run();
  };

  await insertImportJob('import-committed');
  await expectDatabaseRejection(
    () => insertImportJob('import-duplicate', { mode: 'replace' }),
    /UNIQUE constraint failed/i
  );
  await insertImportJob('import-validated', { status: 'validated', committedAt: null });
  await expectDatabaseRejection(
    () => insertImportJob('import-count', {
      checksum: 'b'.repeat(64),
      rowCount: 2001,
      status: 'validated',
      committedAt: null
    }),
    /CHECK constraint failed/i
  );
  await expectDatabaseRejection(
    () => insertImportJob('import-state', { checksum: 'c'.repeat(64), committedAt: null }),
    /CHECK constraint failed/i
  );

  const insertAudit = (id, action, metadata) => database.prepare(`
    INSERT INTO audit_logs (
      id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json, created_at
    ) VALUES (?, ?, ?, 'lead', 'lead-after-delete', ?, ?, ?)
  `).bind(id, 'user-admin', action, `request-${id}`, metadata, timestamp).run();

  await insertAudit('audit-valid', 'lead.create', '{"changed_fields":["pipeline"]}');
  await expectDatabaseRejection(
    () => insertAudit('audit-action', 'lead.read', '{}'),
    /CHECK constraint failed/i
  );
  await expectDatabaseRejection(
    () => insertAudit('audit-json', 'lead.update', 'not-json'),
    /CHECK constraint failed/i
  );

  const foreignKeyViolations = await database.prepare('PRAGMA foreign_key_check').all();
  assert.equal(foreignKeyViolations.results.length, 0);

  console.log('MASUMI CRM D1 SCHEMA TESTS: PASS');
} finally {
  close();
}
