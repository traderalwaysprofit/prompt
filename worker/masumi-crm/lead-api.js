import {
  cleanCrmText,
  CrmValidationError,
  normalizeLead,
  PIPELINE_STAGES
} from '../../src/tools/masumi-crm-core.js';
import { CrmApiError, methodNotAllowed } from './errors.js';

const MAX_JSON_BYTES = 64 * 1024;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const MAX_LIST_OFFSET = 2000;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,159}$/;
const PIPELINES = new Set(PIPELINE_STAGES);
const COLLECTION_QUERY_FIELDS = new Set([
  'search', 'pipeline', 'ownerUserId', 'includeDeleted', 'limit', 'offset'
]);
const ITEM_QUERY_FIELDS = new Set(['includeDeleted']);
const NO_QUERY_FIELDS = new Set();
const LEAD_WRITE_FIELDS = new Set([
  'leadDate', 'source', 'company', 'picName', 'picRole', 'decisionMakerStatus',
  'contact', 'city', 'ownerUserId', 'brandStatus', 'needs', 'estimatedQuantity',
  'potentialValue', 'targetLaunch', 'pipeline', 'lastContact', 'nextAction',
  'nextActionDate', 'complianceStatus', 'blocker', 'lostReason', 'notes', 'scores'
]);
const TEXT_LIMITS = Object.freeze({
  leadDate: 10,
  source: 120,
  company: 180,
  picName: 140,
  picRole: 120,
  decisionMakerStatus: 40,
  contact: 80,
  city: 120,
  ownerUserId: 120,
  brandStatus: 40,
  needs: 500,
  targetLaunch: 80,
  pipeline: 40,
  lastContact: 10,
  nextAction: 500,
  nextActionDate: 10,
  complianceStatus: 40,
  blocker: 500,
  lostReason: 500,
  notes: 3000
});

const rejectUnknownFields = (input, allowed) => {
  for (const field of Object.keys(input)) {
    if (!allowed.has(field)) {
      throw new CrmApiError('UNKNOWN_FIELD', 422, 'Terdapat field yang tidak dikenal.');
    }
  }
};

const validateRawFieldTypes = (payload) => {
  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    const value = payload[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string' || value.length > limit) {
      throw new CrmApiError('INVALID_LEAD', 422, `${field} harus berupa teks dengan panjang maksimal ${limit}.`);
    }
  }

  if (
    payload.estimatedQuantity !== undefined &&
    (!Number.isInteger(payload.estimatedQuantity) || payload.estimatedQuantity < 0)
  ) {
    throw new CrmApiError('INVALID_LEAD', 422, 'estimatedQuantity harus berupa integer positif.');
  }
  if (
    payload.potentialValue !== undefined &&
    (typeof payload.potentialValue !== 'number' || !Number.isFinite(payload.potentialValue))
  ) {
    throw new CrmApiError('INVALID_LEAD', 422, 'potentialValue harus berupa angka.');
  }
};

const validateScoresObject = (scores) => {
  if (scores === undefined) return;
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    throw new CrmApiError('INVALID_LEAD', 422, 'Scores harus berupa object.');
  }
  rejectUnknownFields(scores, new Set(['fit', 'readiness', 'urgency', 'value']));
  for (const value of Object.values(scores)) {
    if (!Number.isInteger(value)) {
      throw new CrmApiError('INVALID_LEAD', 422, 'Nilai score harus berupa integer.');
    }
  }
};

const readBoundedBody = async (request) => {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new CrmApiError('PAYLOAD_TOO_LARGE', 413, 'Payload lead terlalu besar.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
};

const parseJsonObject = async (request) => {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new CrmApiError('UNSUPPORTED_MEDIA_TYPE', 415, 'Content-Type harus application/json.');
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new CrmApiError('PAYLOAD_TOO_LARGE', 413, 'Payload lead terlalu besar.');
  }

  const buffer = await readBoundedBody(request);

  let payload;
  try {
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  } catch {
    throw new CrmApiError('INVALID_JSON', 400, 'Body JSON tidak valid.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new CrmApiError('INVALID_JSON_OBJECT', 400, 'Body harus berupa JSON object.');
  }
  return payload;
};

export const validIdentifier = (value, label) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!IDENTIFIER_PATTERN.test(normalized)) {
    throw new CrmApiError('INVALID_IDENTIFIER', 422, `${label} tidak valid.`);
  }
  return normalized;
};

export const requestIdFor = (request) => {
  const requestId = request.headers.get('x-request-id')?.trim() || '';
  if (!REQUEST_ID_PATTERN.test(requestId)) {
    throw new CrmApiError('REQUEST_ID_REQUIRED', 400, 'X-Request-ID yang valid wajib dikirim.');
  }
  return requestId;
};

export const isoNow = (dependencies) => {
  const value = typeof dependencies.now === 'function' ? dependencies.now() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new CrmApiError('SERVER_TIME_INVALID', 500, 'Waktu server tidak valid.');
  return date.toISOString();
};

export const newIdentifier = (dependencies) => {
  const value = typeof dependencies.createId === 'function'
    ? dependencies.createId()
    : crypto.randomUUID();
  return validIdentifier(value, 'ID');
};

const normalizeWritePayload = (payload, { id, now, withVersion = false }) => {
  const allowed = withVersion ? new Set([...LEAD_WRITE_FIELDS, 'version']) : LEAD_WRITE_FIELDS;
  rejectUnknownFields(payload, allowed);
  validateRawFieldTypes(payload);
  validateScoresObject(payload.scores);

  let normalized;
  try {
    normalized = normalizeLead({ ...payload, id }, { now, idFactory: () => id });
  } catch (error) {
    if (error instanceof CrmValidationError) {
      throw new CrmApiError(error.code || 'INVALID_LEAD', 422, error.message);
    }
    throw error;
  }

  let version;
  if (withVersion) {
    version = payload.version;
    if (!Number.isInteger(version) || version < 1) {
      throw new CrmApiError('VERSION_REQUIRED', 422, 'Version lead wajib berupa integer positif.');
    }
  }

  const ownerUserId = payload.ownerUserId === undefined || payload.ownerUserId === ''
    ? ''
    : validIdentifier(payload.ownerUserId, 'Owner');
  return { normalized, ownerUserId, version };
};

const ownerForWrite = (requestedOwnerId, user) => {
  if (user.role === 'sales') {
    if (requestedOwnerId && requestedOwnerId !== user.id) {
      throw new CrmApiError('OWNER_SCOPE_FORBIDDEN', 403, 'Sales hanya dapat memilih dirinya sebagai owner.');
    }
    return user.id;
  }
  return requestedOwnerId || user.id;
};

const requireActiveOwner = async (database, ownerUserId) => {
  const owner = await database.prepare(`
    SELECT id FROM app_users WHERE id = ? AND active = 1 LIMIT 1
  `).bind(ownerUserId).first();
  if (!owner) throw new CrmApiError('INVALID_OWNER', 422, 'Owner tidak ditemukan atau tidak aktif.');
};

export const mapLeadRow = (row) => ({
  id: row.id,
  leadDate: row.lead_date,
  source: row.source,
  company: row.company,
  picName: row.pic_name,
  picRole: row.pic_role,
  decisionMakerStatus: row.decision_maker_status,
  contact: row.contact,
  city: row.city,
  ownerUserId: row.owner_user_id,
  brandStatus: row.brand_status,
  needs: row.needs,
  estimatedQuantity: row.estimated_quantity,
  potentialValue: row.potential_value,
  targetLaunch: row.target_launch,
  pipeline: row.pipeline,
  lastContact: row.last_contact,
  nextAction: row.next_action,
  nextActionDate: row.next_action_date,
  complianceStatus: row.compliance_status,
  blocker: row.blocker,
  lostReason: row.lost_reason,
  notes: row.notes,
  scores: {
    fit: row.fit_score,
    readiness: row.readiness_score,
    urgency: row.urgency_score,
    value: row.value_score
  },
  version: row.version,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at
});

const LEAD_SELECT = `
  SELECT
    id, lead_date, source, company, pic_name, pic_role, decision_maker_status,
    contact, city, owner_user_id, brand_status, needs, estimated_quantity,
    potential_value, target_launch, pipeline, last_contact, next_action,
    next_action_date, compliance_status, blocker, lost_reason, notes,
    fit_score, readiness_score, urgency_score, value_score, version,
    created_by, updated_by, created_at, updated_at, deleted_at
  FROM leads
`;

export const insertLeadStatement = (database, lead, ownerUserId, user, now) => database.prepare(`
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
`).bind(
  lead.id, lead.leadDate, lead.source, lead.company, lead.picName, lead.picRole,
  lead.decisionMakerStatus, lead.contact, lead.city, ownerUserId, lead.brandStatus,
  lead.needs, lead.estimatedQuantity, lead.potentialValue, lead.targetLaunch,
  lead.pipeline, lead.lastContact, lead.nextAction, lead.nextActionDate,
  lead.complianceStatus, lead.blocker, lead.lostReason, lead.notes,
  lead.scores.fit, lead.scores.readiness, lead.scores.urgency, lead.scores.value,
  user.id, user.id, now, now
);

const auditStatement = (database, { id, userId, action, entityId, requestId, metadata, now, conditional }) => {
  const valuesClause = conditional
    ? "SELECT ?, ?, ?, 'lead', ?, ?, ?, ? WHERE changes() > 0"
    : "VALUES (?, ?, ?, 'lead', ?, ?, ?, ?)";
  return database.prepare(`
    INSERT INTO audit_logs (
      id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json, created_at
    ) ${valuesClause}
  `).bind(id, userId, action, entityId, requestId, JSON.stringify(metadata), now);
};

export const databaseFailure = (error) => {
  const diagnostic = [error?.message, error?.cause?.message, error?.cause]
    .filter(Boolean)
    .join(' ');
  if (/LEAD_LIMIT/i.test(diagnostic)) {
    return new CrmApiError('LEAD_LIMIT', 409, 'Maksimum 2.000 lead aktif telah tercapai.');
  }
  if (/UNIQUE constraint failed/i.test(diagnostic)) {
    return new CrmApiError('DUPLICATE_ID', 409, 'ID lead sudah digunakan.');
  }
  if (/FOREIGN KEY constraint failed/i.test(diagnostic)) {
    return new CrmApiError('INVALID_OWNER', 422, 'Referensi pengguna tidak valid.');
  }
  if (/CHECK constraint failed/i.test(diagnostic)) {
    return new CrmApiError('INVALID_LEAD', 422, 'Data lead melanggar aturan database.');
  }
  return new CrmApiError('DATABASE_ERROR', 500, 'Operasi database gagal.');
};

const queryInteger = (value, fallback, minimum, maximum, code) => {
  if (value === null || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw new CrmApiError(code, 422, 'Parameter angka tidak valid.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new CrmApiError(code, 422, 'Parameter angka di luar batas.');
  }
  return number;
};

const includeDeletedFor = (url, user) => {
  const value = url.searchParams.get('includeDeleted');
  if (value === null || value === '0' || value === 'false') return false;
  if (value !== '1' && value !== 'true') {
    throw new CrmApiError('INVALID_INCLUDE_DELETED', 422, 'includeDeleted harus bernilai 0 atau 1.');
  }
  if (user.role !== 'admin') {
    throw new CrmApiError('OWNER_SCOPE_FORBIDDEN', 403, 'Hanya Admin yang dapat melihat lead terhapus.');
  }
  return true;
};

const rejectUnknownQuery = (url, allowed) => {
  for (const field of url.searchParams.keys()) {
    if (!allowed.has(field)) {
      throw new CrmApiError('UNKNOWN_QUERY_PARAMETER', 422, 'Terdapat parameter query yang tidak dikenal.');
    }
    if (url.searchParams.getAll(field).length > 1) {
      throw new CrmApiError('DUPLICATE_QUERY_PARAMETER', 422, 'Parameter query tidak boleh berulang.');
    }
  }
};

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

const listLeads = async (url, user, database) => {
  rejectUnknownQuery(url, COLLECTION_QUERY_FIELDS);
  const includeDeleted = includeDeletedFor(url, user);
  const clauses = [];
  const parameters = [];
  if (!includeDeleted) clauses.push('deleted_at IS NULL');

  const requestedOwner = url.searchParams.get('ownerUserId');
  if (user.role === 'sales') {
    if (requestedOwner && requestedOwner !== user.id) {
      throw new CrmApiError('OWNER_SCOPE_FORBIDDEN', 403, 'Sales hanya dapat melihat lead miliknya.');
    }
    clauses.push('owner_user_id = ?');
    parameters.push(user.id);
  } else if (requestedOwner) {
    clauses.push('owner_user_id = ?');
    parameters.push(validIdentifier(requestedOwner, 'Owner'));
  }

  const pipeline = url.searchParams.get('pipeline');
  if (pipeline) {
    if (!PIPELINES.has(pipeline)) throw new CrmApiError('INVALID_PIPELINE', 422, 'Pipeline tidak dikenal.');
    clauses.push('pipeline = ?');
    parameters.push(pipeline);
  }

  const search = cleanCrmText(url.searchParams.get('search'), 121);
  if (search.length > 120) throw new CrmApiError('SEARCH_TOO_LONG', 422, 'Pencarian maksimal 120 karakter.');
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    clauses.push("(company LIKE ? ESCAPE '\\' COLLATE NOCASE OR pic_name LIKE ? ESCAPE '\\' COLLATE NOCASE)");
    parameters.push(pattern, pattern);
  }

  const limit = queryInteger(url.searchParams.get('limit'), DEFAULT_LIST_LIMIT, 1, MAX_LIST_LIMIT, 'INVALID_LIMIT');
  const offset = queryInteger(url.searchParams.get('offset'), 0, 0, MAX_LIST_OFFSET, 'INVALID_OFFSET');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const count = await database.prepare(`SELECT count(*) AS total FROM leads ${where}`)
    .bind(...parameters)
    .first();
  const result = await database.prepare(`
    ${LEAD_SELECT}
    ${where}
    ORDER BY updated_at DESC, id ASC
    LIMIT ? OFFSET ?
  `).bind(...parameters, limit, offset).all();

  return {
    status: 200,
    data: result.results.map(mapLeadRow),
    meta: { total: Number(count?.total || 0), limit, offset }
  };
};

const itemScope = (user, includeDeleted) => {
  const clauses = ['id = ?'];
  if (!includeDeleted) clauses.push('deleted_at IS NULL');
  if (user.role === 'sales') clauses.push('owner_user_id = ?');
  return clauses;
};

const findLead = async (database, id, user, includeDeleted = false) => {
  const clauses = itemScope(user, includeDeleted);
  const parameters = user.role === 'sales' ? [id, user.id] : [id];
  return database.prepare(`${LEAD_SELECT} WHERE ${clauses.join(' AND ')} LIMIT 1`)
    .bind(...parameters)
    .first();
};

const getLead = async (url, id, user, database) => {
  rejectUnknownQuery(url, ITEM_QUERY_FIELDS);
  const includeDeleted = includeDeletedFor(url, user);
  const row = await findLead(database, id, user, includeDeleted);
  if (!row) throw new CrmApiError('LEAD_NOT_FOUND', 404, 'Lead tidak ditemukan.');
  return { status: 200, data: mapLeadRow(row) };
};

const createLead = async (request, user, database, dependencies) => {
  const requestId = requestIdFor(request);
  const payload = await parseJsonObject(request);
  const now = isoNow(dependencies);
  const id = newIdentifier(dependencies);
  const { normalized, ownerUserId: requestedOwnerId } = normalizeWritePayload(payload, { id, now });
  const ownerUserId = ownerForWrite(requestedOwnerId, user);
  await requireActiveOwner(database, ownerUserId);
  const auditId = newIdentifier(dependencies);

  try {
    await database.batch([
      insertLeadStatement(database, normalized, ownerUserId, user, now),
      auditStatement(database, {
        id: auditId,
        userId: user.id,
        action: 'lead.create',
        entityId: id,
        requestId,
        metadata: { version: 1 },
        now,
        conditional: false
      })
    ]);
  } catch (error) {
    throw databaseFailure(error);
  }

  const created = await findLead(database, id, user);
  if (!created) throw new CrmApiError('DATABASE_ERROR', 500, 'Lead yang dibuat tidak dapat dibaca kembali.');

  return {
    status: 201,
    requestId,
    data: mapLeadRow(created)
  };
};

const updateLead = async (request, id, user, database, dependencies) => {
  const requestId = requestIdFor(request);
  const current = await findLead(database, id, user);
  if (!current) throw new CrmApiError('LEAD_NOT_FOUND', 404, 'Lead tidak ditemukan.');
  const payload = await parseJsonObject(request);
  const now = isoNow(dependencies);
  const { normalized, ownerUserId: requestedOwnerId, version } = normalizeWritePayload(
    payload,
    { id, now, withVersion: true }
  );
  if (version !== current.version) {
    throw new CrmApiError('VERSION_CONFLICT', 409, 'Lead telah berubah. Muat ulang data terbaru.');
  }

  const ownerUserId = ownerForWrite(requestedOwnerId || current.owner_user_id, user);
  await requireActiveOwner(database, ownerUserId);
  const auditId = newIdentifier(dependencies);
  const ownershipPredicate = user.role === 'sales' ? ' AND owner_user_id = ?' : '';
  const ownershipParameter = user.role === 'sales' ? [user.id] : [];
  const update = database.prepare(`
    UPDATE leads SET
      lead_date = ?, source = ?, company = ?, pic_name = ?, pic_role = ?,
      decision_maker_status = ?, contact = ?, city = ?, owner_user_id = ?,
      brand_status = ?, needs = ?, estimated_quantity = ?, potential_value = ?,
      target_launch = ?, pipeline = ?, last_contact = ?, next_action = ?,
      next_action_date = ?, compliance_status = ?, blocker = ?, lost_reason = ?,
      notes = ?, fit_score = ?, readiness_score = ?, urgency_score = ?,
      value_score = ?, version = version + 1, updated_by = ?, updated_at = ?
    WHERE id = ? AND version = ? AND deleted_at IS NULL${ownershipPredicate}
  `).bind(
    normalized.leadDate, normalized.source, normalized.company, normalized.picName,
    normalized.picRole, normalized.decisionMakerStatus, normalized.contact,
    normalized.city, ownerUserId, normalized.brandStatus, normalized.needs,
    normalized.estimatedQuantity, normalized.potentialValue, normalized.targetLaunch,
    normalized.pipeline, normalized.lastContact, normalized.nextAction,
    normalized.nextActionDate, normalized.complianceStatus, normalized.blocker,
    normalized.lostReason, normalized.notes, normalized.scores.fit,
    normalized.scores.readiness, normalized.scores.urgency, normalized.scores.value,
    user.id, now, id, version, ...ownershipParameter
  );

  let results;
  try {
    results = await database.batch([
      update,
      auditStatement(database, {
        id: auditId,
        userId: user.id,
        action: 'lead.update',
        entityId: id,
        requestId,
        metadata: { version: version + 1 },
        now,
        conditional: true
      })
    ]);
  } catch (error) {
    throw databaseFailure(error);
  }
  if (Number(results[0]?.meta?.changes || 0) !== 1) {
    throw new CrmApiError('VERSION_CONFLICT', 409, 'Lead telah berubah. Muat ulang data terbaru.');
  }
  const updated = await findLead(database, id, user);
  if (!updated) throw new CrmApiError('DATABASE_ERROR', 500, 'Lead yang diperbarui tidak dapat dibaca kembali.');

  return {
    status: 200,
    requestId,
    data: mapLeadRow(updated)
  };
};

const parseIfMatch = (request) => {
  const value = request.headers.get('if-match')?.trim() || '';
  const match = value.match(/^"?([1-9]\d*)"?$/);
  if (!match) {
    throw new CrmApiError('PRECONDITION_REQUIRED', 428, 'If-Match dengan version lead wajib dikirim.');
  }
  const version = Number(match[1]);
  if (!Number.isSafeInteger(version)) {
    throw new CrmApiError('PRECONDITION_REQUIRED', 428, 'If-Match tidak valid.');
  }
  return version;
};

const deleteLead = async (request, id, user, database, dependencies) => {
  const requestId = requestIdFor(request);
  const version = parseIfMatch(request);
  const current = await findLead(database, id, user);
  if (!current) throw new CrmApiError('LEAD_NOT_FOUND', 404, 'Lead tidak ditemukan.');
  if (version !== current.version) {
    throw new CrmApiError('VERSION_CONFLICT', 409, 'Lead telah berubah. Muat ulang data terbaru.');
  }

  const now = isoNow(dependencies);
  const auditId = newIdentifier(dependencies);
  const ownershipPredicate = user.role === 'sales' ? ' AND owner_user_id = ?' : '';
  const ownershipParameter = user.role === 'sales' ? [user.id] : [];
  const softDelete = database.prepare(`
    UPDATE leads
    SET deleted_at = ?, updated_at = ?, updated_by = ?, version = version + 1
    WHERE id = ? AND version = ? AND deleted_at IS NULL${ownershipPredicate}
  `).bind(now, now, user.id, id, version, ...ownershipParameter);

  let results;
  try {
    results = await database.batch([
      softDelete,
      auditStatement(database, {
        id: auditId,
        userId: user.id,
        action: 'lead.delete',
        entityId: id,
        requestId,
        metadata: { version: version + 1 },
        now,
        conditional: true
      })
    ]);
  } catch (error) {
    throw databaseFailure(error);
  }
  if (Number(results[0]?.meta?.changes || 0) !== 1) {
    throw new CrmApiError('VERSION_CONFLICT', 409, 'Lead telah berubah. Muat ulang data terbaru.');
  }

  return {
    status: 200,
    requestId,
    data: { id, version: version + 1, deletedAt: now }
  };
};

const decodeLeadId = (value) => {
  try {
    return validIdentifier(decodeURIComponent(value), 'ID lead');
  } catch (error) {
    if (error instanceof CrmApiError) throw error;
    throw new CrmApiError('INVALID_IDENTIFIER', 422, 'ID lead tidak valid.');
  }
};

export const routeLeadApi = async (request, url, user, env, dependencies = {}) => {
  const database = env.CRM_DB;
  if (url.pathname === '/api/crm/v1/leads') {
    if (request.method === 'GET') return listLeads(url, user, database);
    if (request.method === 'POST') {
      rejectUnknownQuery(url, NO_QUERY_FIELDS);
      return createLead(request, user, database, dependencies);
    }
    throw methodNotAllowed('GET, POST');
  }

  const match = url.pathname.match(/^\/api\/crm\/v1\/leads\/([^/]+)$/);
  if (!match) throw new CrmApiError('API_NOT_FOUND', 404, 'Endpoint API tidak ditemukan.');
  const id = decodeLeadId(match[1]);
  if (request.method === 'GET') return getLead(url, id, user, database);
  if (request.method === 'PUT') {
    rejectUnknownQuery(url, NO_QUERY_FIELDS);
    return updateLead(request, id, user, database, dependencies);
  }
  if (request.method === 'DELETE') {
    rejectUnknownQuery(url, NO_QUERY_FIELDS);
    return deleteLead(request, id, user, database, dependencies);
  }
  throw methodNotAllowed('GET, PUT, DELETE');
};
