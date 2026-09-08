import {
  cleanCrmText,
  CRM_SCHEMA,
  CRM_SCHEMA_VERSION,
  CrmValidationError,
  MAX_CRM_LEADS,
  MAX_IMPORT_BYTES,
  normalizeLead
} from '../../src/tools/masumi-crm-core.js';
import { CrmApiError, methodNotAllowed } from './errors.js';
import {
  databaseFailure,
  insertLeadStatement,
  isoNow,
  newIdentifier,
  requestIdFor,
  validIdentifier
} from './lead-api.js';

const API_PREFIX = '/api/crm/v1';
const MAX_IMPORT_REQUEST_BYTES = MAX_IMPORT_BYTES + (1024 * 1024);
const MAX_PREVIEW_ERRORS = 50;
const IMPORT_MODES = new Set(['append', 'replace', 'migration']);
const IMPORT_FIELDS = new Set(['backup', 'mode', 'ownerMappings', 'checksum', 'confirm']);
const BACKUP_FIELDS = new Set(['schema', 'version', 'exportedAt', 'leads']);

const requireAdmin = (user) => {
  if (user.role !== 'admin') {
    throw new CrmApiError('ADMIN_REQUIRED', 403, 'Hanya Admin yang dapat memvalidasi dan mengimpor backup.');
  }
};

const rejectUnknownFields = (input, allowed) => {
  for (const field of Object.keys(input)) {
    if (!allowed.has(field)) {
      throw new CrmApiError('UNKNOWN_FIELD', 422, 'Terdapat field impor yang tidak dikenal.');
    }
  }
};

const readBody = async (request) => {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new CrmApiError('UNSUPPORTED_MEDIA_TYPE', 415, 'Content-Type harus application/json.');
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMPORT_REQUEST_BYTES) {
    throw new CrmApiError('PAYLOAD_TOO_LARGE', 413, 'File backup melebihi batas 5 MB.');
  }
  if (!request.body) throw new CrmApiError('INVALID_JSON', 400, 'Body JSON tidak valid.');

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMPORT_REQUEST_BYTES) {
        await reader.cancel();
        throw new CrmApiError('PAYLOAD_TOO_LARGE', 413, 'File backup melebihi batas 5 MB.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  } catch {
    throw new CrmApiError('INVALID_JSON', 400, 'Body JSON tidak valid.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new CrmApiError('INVALID_JSON_OBJECT', 400, 'Body harus berupa JSON object.');
  }
  rejectUnknownFields(payload, IMPORT_FIELDS);
  return payload;
};

const validateBackupEnvelope = (backup) => {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw new CrmApiError('INVALID_SCHEMA', 422, 'Schema backup tidak valid.');
  }
  rejectUnknownFields(backup, BACKUP_FIELDS);
  if (backup.schema !== CRM_SCHEMA || backup.version !== CRM_SCHEMA_VERSION || !Array.isArray(backup.leads)) {
    throw new CrmApiError('INVALID_SCHEMA', 422, 'Schema atau versi backup tidak didukung.');
  }
  if (backup.leads.length === 0) {
    throw new CrmApiError('EMPTY_IMPORT', 422, 'Backup tidak berisi lead.');
  }
  if (backup.leads.length > MAX_CRM_LEADS) {
    throw new CrmApiError('LEAD_LIMIT', 422, 'Backup melebihi maksimum 2.000 lead.');
  }
  const bytes = new TextEncoder().encode(JSON.stringify(backup)).byteLength;
  if (bytes > MAX_IMPORT_BYTES) {
    throw new CrmApiError('PAYLOAD_TOO_LARGE', 413, 'File backup melebihi batas 5 MB.');
  }
};

const validateMode = (value) => {
  if (!IMPORT_MODES.has(value)) {
    throw new CrmApiError('INVALID_IMPORT_MODE', 422, 'Mode impor tidak dikenal.');
  }
  return value;
};

const activeUserIds = async (database) => {
  const result = await database.prepare('SELECT id FROM app_users WHERE active = 1').all();
  return new Set(result.results.map(({ id }) => id));
};

const buildOwnerMap = async (input, database) => {
  if (!Array.isArray(input) || input.length > MAX_CRM_LEADS) {
    throw new CrmApiError('INVALID_OWNER_MAPPING', 422, 'Pemetaan owner tidak valid.');
  }
  const activeIds = await activeUserIds(database);
  const mapping = new Map();
  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new CrmApiError('INVALID_OWNER_MAPPING', 422, 'Pemetaan owner tidak valid.');
    }
    rejectUnknownFields(item, new Set(['sourceOwner', 'ownerUserId']));
    const sourceOwner = cleanCrmText(item.sourceOwner, 120);
    const ownerUserId = validIdentifier(item.ownerUserId, 'Owner');
    if (mapping.has(sourceOwner)) {
      throw new CrmApiError('DUPLICATE_OWNER_MAPPING', 422, 'Owner sumber tidak boleh dipetakan lebih dari sekali.');
    }
    if (!activeIds.has(ownerUserId)) {
      throw new CrmApiError('INVALID_OWNER', 422, 'Owner tujuan tidak ditemukan atau tidak aktif.');
    }
    mapping.set(sourceOwner, ownerUserId);
  }
  return mapping;
};

const existingIds = async (database, ids) => {
  const found = new Set();
  for (let start = 0; start < ids.length; start += 400) {
    const batch = ids.slice(start, start + 400);
    if (!batch.length) continue;
    const placeholders = batch.map(() => '?').join(',');
    const result = await database.prepare(`SELECT id FROM leads WHERE id IN (${placeholders})`)
      .bind(...batch)
      .all();
    for (const { id } of result.results) found.add(id);
  }
  return found;
};

const checksumFor = async (value, dependencies) => {
  const cryptoApi = dependencies.crypto || globalThis.crypto;
  if (!cryptoApi?.subtle) throw new CrmApiError('CRYPTO_UNAVAILABLE', 500, 'Checksum impor tidak dapat dibuat.');
  const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const pushError = (errors, row, code, message) => {
  if (errors.length < MAX_PREVIEW_ERRORS) errors.push({ row, code, message });
};

const analyzeImport = async (payload, database, dependencies) => {
  validateBackupEnvelope(payload.backup);
  const mode = validateMode(payload.mode);
  const ownerMap = await buildOwnerMap(payload.ownerMappings, database);
  const normalizedLeads = [];
  const rowIds = new Set();
  const sourceOwners = new Set();
  const errors = [];
  const exportedAt = new Date(payload.backup.exportedAt || '');
  const normalizationNow = Number.isNaN(exportedAt.getTime())
    ? '1970-01-01T00:00:00.000Z'
    : exportedAt.toISOString();
  let invalid = 0;
  let duplicateFile = 0;

  for (let index = 0; index < payload.backup.leads.length; index += 1) {
    const rawLead = payload.backup.leads[index];
    sourceOwners.add(cleanCrmText(rawLead?.owner, 120));
    let lead;
    try {
      lead = normalizeLead(rawLead, {
        preserveUpdatedAt: true,
        now: normalizationNow
      });
    } catch (error) {
      invalid += 1;
      const code = error instanceof CrmValidationError ? error.code : 'INVALID_DATA';
      pushError(errors, index + 1, code, error.message || 'Data lead tidak valid.');
      continue;
    }
    if (!ownerMap.has(lead.owner)) {
      invalid += 1;
      pushError(errors, index + 1, 'OWNER_MAPPING_REQUIRED', 'Owner sumber belum dipetakan ke user cloud.');
      continue;
    }
    if (rowIds.has(lead.id)) {
      duplicateFile += 1;
      pushError(errors, index + 1, 'DUPLICATE_ID', 'ID lead duplikat ditemukan di dalam file.');
      continue;
    }
    rowIds.add(lead.id);
    normalizedLeads.push({ lead, ownerUserId: ownerMap.get(lead.owner) });
  }

  const targetIds = await existingIds(database, normalizedLeads.map(({ lead }) => lead.id));
  const duplicateTarget = targetIds.size;
  const activeCountRow = await database.prepare('SELECT count(*) AS total FROM leads WHERE deleted_at IS NULL').first();
  const activeCount = Number(activeCountRow?.total || 0);
  const additionalCount = normalizedLeads.length - duplicateTarget;
  const finalCount = mode === 'replace' ? normalizedLeads.length : activeCount + additionalCount;
  if (finalCount > MAX_CRM_LEADS) {
    throw new CrmApiError('LEAD_LIMIT', 409, 'Hasil impor akan melebihi maksimum 2.000 lead aktif.');
  }

  const targetBlocksCommit = mode !== 'replace' && duplicateTarget > 0;
  const structurallyValid = invalid === 0 && duplicateFile === 0 &&
    normalizedLeads.length === payload.backup.leads.length;
  const canCommit = structurallyValid && !targetBlocksCommit;
  const checksum = structurallyValid ? await checksumFor({
    schema: payload.backup.schema,
    version: payload.backup.version,
    mode,
    leads: normalizedLeads
  }, dependencies) : '';

  return {
    mode,
    normalizedLeads,
    checksum,
    preview: {
      schema: payload.backup.schema,
      version: payload.backup.version,
      total: payload.backup.leads.length,
      valid: normalizedLeads.length,
      invalid,
      duplicateFile,
      duplicateTarget: mode === 'replace' ? 0 : duplicateTarget,
      targetMatches: duplicateTarget,
      finalCount,
      sourceOwners: [...sourceOwners].sort((a, b) => a.localeCompare(b, 'id')),
      checksum,
      canCommit,
      errors
    }
  };
};

const replaceLeadStatement = (database, lead, ownerUserId, user, now) => database.prepare(`
  INSERT INTO leads (
    id, lead_date, source, company, pic_name, pic_role, decision_maker_status,
    contact, city, owner_user_id, brand_status, needs, estimated_quantity,
    potential_value, target_launch, pipeline, last_contact, next_action,
    next_action_date, compliance_status, blocker, lost_reason, notes,
    fit_score, readiness_score, urgency_score, value_score, version,
    created_by, updated_by, created_at, updated_at, deleted_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, 1, ?, ?, ?, ?, NULL
  )
  ON CONFLICT(id) DO UPDATE SET
    lead_date = excluded.lead_date, source = excluded.source, company = excluded.company,
    pic_name = excluded.pic_name, pic_role = excluded.pic_role,
    decision_maker_status = excluded.decision_maker_status, contact = excluded.contact,
    city = excluded.city, owner_user_id = excluded.owner_user_id,
    brand_status = excluded.brand_status, needs = excluded.needs,
    estimated_quantity = excluded.estimated_quantity, potential_value = excluded.potential_value,
    target_launch = excluded.target_launch, pipeline = excluded.pipeline,
    last_contact = excluded.last_contact, next_action = excluded.next_action,
    next_action_date = excluded.next_action_date, compliance_status = excluded.compliance_status,
    blocker = excluded.blocker, lost_reason = excluded.lost_reason, notes = excluded.notes,
    fit_score = excluded.fit_score, readiness_score = excluded.readiness_score,
    urgency_score = excluded.urgency_score, value_score = excluded.value_score,
    version = leads.version + 1, updated_by = excluded.updated_by,
    updated_at = excluded.updated_at, deleted_at = NULL
`).bind(
  lead.id, lead.leadDate, lead.source, lead.company, lead.picName, lead.picRole,
  lead.decisionMakerStatus, lead.contact, lead.city, ownerUserId, lead.brandStatus,
  lead.needs, lead.estimatedQuantity, lead.potentialValue, lead.targetLaunch,
  lead.pipeline, lead.lastContact, lead.nextAction, lead.nextActionDate,
  lead.complianceStatus, lead.blocker, lead.lostReason, lead.notes,
  lead.scores.fit, lead.scores.readiness, lead.scores.urgency, lead.scores.value,
  user.id, user.id, now, now
);

const commitStatements = (database, analysis, user, requestId, dependencies) => {
  const now = isoNow(dependencies);
  const jobId = newIdentifier(dependencies);
  const statements = [];
  if (analysis.mode === 'replace') {
    statements.push(database.prepare(`
      UPDATE leads
      SET deleted_at = ?, updated_at = ?, updated_by = ?, version = version + 1
      WHERE deleted_at IS NULL
    `).bind(now, now, user.id));
  }
  for (const { lead, ownerUserId } of analysis.normalizedLeads) {
    statements.push(analysis.mode === 'replace'
      ? replaceLeadStatement(database, lead, ownerUserId, user, now)
      : insertLeadStatement(database, lead, ownerUserId, user, now));
  }
  statements.push(database.prepare(`
    INSERT INTO import_jobs (
      id, actor_user_id, mode, source_schema, source_version, checksum,
      row_count, status, created_at, committed_at, error_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'committed', ?, ?, NULL)
  `).bind(
    jobId, user.id, analysis.mode, CRM_SCHEMA, CRM_SCHEMA_VERSION,
    analysis.checksum, analysis.normalizedLeads.length, now, now
  ));
  statements.push(database.prepare(`
    INSERT INTO audit_logs (
      id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json, created_at
    ) VALUES (?, ?, 'import.commit', 'import', ?, ?, ?, ?)
  `).bind(
    newIdentifier(dependencies), user.id, jobId, requestId,
    JSON.stringify({
      mode: analysis.mode,
      rowCount: analysis.normalizedLeads.length,
      checksum: analysis.checksum
    }),
    now
  ));
  return { jobId, now, statements };
};

const validateImport = async (request, user, database, dependencies) => {
  if (request.method !== 'POST') throw methodNotAllowed('POST');
  requireAdmin(user);
  const payload = await readBody(request);
  const analysis = await analyzeImport(payload, database, dependencies);
  return { status: 200, data: analysis.preview };
};

const committedJob = (database, checksum) => database.prepare(`
  SELECT id, mode, row_count, committed_at
  FROM import_jobs WHERE checksum = ? AND status = 'committed' LIMIT 1
`).bind(checksum).first();

const commitImport = async (request, user, database, dependencies) => {
  if (request.method !== 'POST') throw methodNotAllowed('POST');
  requireAdmin(user);
  const requestId = requestIdFor(request);
  const payload = await readBody(request);
  if (payload.confirm !== true) {
    throw new CrmApiError('IMPORT_CONFIRMATION_REQUIRED', 422, 'Konfirmasi eksplisit diperlukan sebelum impor.');
  }
  if (!/^[0-9a-f]{64}$/.test(payload.checksum || '')) {
    throw new CrmApiError('INVALID_CHECKSUM', 422, 'Checksum validasi tidak valid.');
  }

  const analysis = await analyzeImport(payload, database, dependencies);
  if (analysis.checksum !== payload.checksum) {
    throw new CrmApiError('IMPORT_CHANGED', 409, 'Isi atau pemetaan impor berubah setelah validasi. Validasi ulang diperlukan.');
  }
  const prior = await committedJob(database, analysis.checksum);
  if (prior) {
    return {
      status: 200,
      requestId,
      data: {
        jobId: prior.id,
        mode: prior.mode,
        rowCount: prior.row_count,
        committedAt: prior.committed_at,
        idempotent: true
      }
    };
  }
  if (!analysis.preview.canCommit) {
    throw new CrmApiError('IMPORT_NOT_READY', 422, 'Backup gagal validasi dan tidak dapat diimpor.');
  }

  const transaction = commitStatements(database, analysis, user, requestId, dependencies);
  try {
    await database.batch(transaction.statements);
  } catch (error) {
    const raced = await committedJob(database, analysis.checksum);
    if (raced) {
      return {
        status: 200,
        requestId,
        data: {
          jobId: raced.id,
          mode: raced.mode,
          rowCount: raced.row_count,
          committedAt: raced.committed_at,
          idempotent: true
        }
      };
    }
    throw databaseFailure(error);
  }

  return {
    status: 201,
    requestId,
    data: {
      jobId: transaction.jobId,
      mode: analysis.mode,
      rowCount: analysis.normalizedLeads.length,
      committedAt: transaction.now,
      idempotent: false
    }
  };
};

export const routeImportApi = async (request, url, user, env, dependencies = {}) => {
  const isValidate = url.pathname === `${API_PREFIX}/imports/validate`;
  const isCommit = url.pathname === `${API_PREFIX}/imports/commit`;
  if (!isValidate && !isCommit) return null;
  if (url.search) throw new CrmApiError('UNKNOWN_QUERY_PARAMETER', 422, 'Endpoint impor tidak menerima parameter query.');
  if (isValidate) {
    return validateImport(request, user, env.CRM_DB, dependencies);
  }
  return commitImport(request, user, env.CRM_DB, dependencies);
};
