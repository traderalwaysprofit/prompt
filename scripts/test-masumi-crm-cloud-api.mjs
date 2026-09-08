import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  CRM_SCHEMA,
  CRM_SCHEMA_VERSION,
  parseCrmBackup
} from '../src/tools/masumi-crm-core.js';
import { handleMasumiCrmRequest } from '../worker/masumi-crm/index.js';
import { createSqliteD1 } from './helpers/sqlite-d1.mjs';

const migrationSql = await readFile(
  new URL('../migrations/masumi-crm/0001_initial.sql', import.meta.url),
  'utf8'
);
const { database, close } = createSqliteD1();
const now = new Date('2026-09-08T13:00:00.000Z');
const issuer = 'https://test-team.cloudflareaccess.com';
const audience = 'test-audience';
const jwtHeaderName = 'Cf-Access-Jwt-Assertion';
let idSequence = 0;
let certificateFetches = 0;

const encodeJson = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const keyPair = await webcrypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
  },
  true,
  ['sign', 'verify']
);
const publicJwk = {
  ...await webcrypto.subtle.exportKey('jwk', keyPair.publicKey),
  kid: 'test-key',
  alg: 'RS256',
  use: 'sig'
};

const signToken = async (overrides = {}) => {
  const header = encodeJson({ alg: 'RS256', typ: 'JWT', kid: publicJwk.kid });
  const payload = encodeJson({
    iss: issuer,
    aud: audience,
    sub: 'test-subject',
    email: 'admin@example.invalid',
    iat: Math.floor(now.getTime() / 1000) - 60,
    exp: Math.floor(now.getTime() / 1000) + 300,
    ...overrides
  });
  const unsigned = `${header}.${payload}`;
  const signature = await webcrypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyPair.privateKey,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${Buffer.from(signature).toString('base64url')}`;
};

const fetcher = async (url) => {
  certificateFetches += 1;
  assert.equal(url, `${issuer}/cdn-cgi/access/certs`);
  return new Response(JSON.stringify({ keys: [publicJwk] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

const dependencies = {
  now: () => now,
  fetcher,
  createId: () => `test-id-${String(++idSequence).padStart(4, '0')}`
};

const env = {
  CRM_DB: database,
  CRM_ENVIRONMENT: 'local',
  CRM_ACCESS_ISSUER: issuer,
  CRM_ACCESS_AUD: audience
};

const callRaw = async (path, options = {}) => {
  const headers = new Headers(options.headers);
  if (options.token !== null) headers.set(jwtHeaderName, options.token || adminToken);
  let body = options.body;
  if (body !== undefined && typeof body !== 'string') {
    body = JSON.stringify(body);
    if (!headers.has('content-type')) headers.set('Content-Type', 'application/json');
  }
  const request = new Request(`https://crm.samson.web.id${path}`, {
    method: options.method || 'GET',
    headers,
    body
  });
  const response = await handleMasumiCrmRequest(
    request,
    options.env || env,
    options.dependencies || dependencies
  );
  return response;
};

const callApi = async (path, options = {}) => {
  const response = await callRaw(path, options);
  const payload = await response.json();
  return { response, payload };
};

const insertUser = (id, email, role, active = 1) => database.prepare(`
  INSERT INTO app_users (id, email, display_name, role, active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).bind(id, email, `TEST-${id}`, role, active, now.toISOString(), now.toISOString()).run();

await database.exec(migrationSql);
await insertUser('user-admin', 'admin@example.invalid', 'admin');
await insertUser('user-sales-a', 'sales-a@example.invalid', 'sales');
await insertUser('user-sales-b', 'sales-b@example.invalid', 'sales');
await insertUser('user-inactive', 'inactive@example.invalid', 'sales', 0);

const adminToken = await signToken({ email: 'ADMIN@example.invalid' });
const salesAToken = await signToken({ email: 'sales-a@example.invalid', sub: 'sales-a' });
const salesBToken = await signToken({ email: 'sales-b@example.invalid', sub: 'sales-b' });
const inactiveToken = await signToken({ email: 'inactive@example.invalid', sub: 'inactive' });

try {
  const health = await callApi('/api/crm/v1/health', { token: null });
  assert.equal(health.response.status, 200);
  assert.equal(health.payload.data, undefined);
  assert.equal(health.payload.status, 'api-ready');
  assert.equal(health.payload.databaseConfigured, true);
  assert.equal(health.payload.accessConfigured, true);

  const unauthenticated = await callApi('/api/crm/v1/session', { token: null });
  assert.equal(unauthenticated.response.status, 401);
  assert.equal(unauthenticated.payload.code, 'AUTHENTICATION_REQUIRED');

  const malformedBeforeBody = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    token: null,
    body: '{',
    headers: { 'Content-Type': 'application/json' }
  });
  assert.equal(malformedBeforeBody.response.status, 401);

  const wrongAudience = await callApi('/api/crm/v1/session', {
    token: await signToken({ aud: 'wrong-audience' })
  });
  assert.equal(wrongAudience.response.status, 401);

  const expired = await callApi('/api/crm/v1/session', {
    token: await signToken({ exp: Math.floor(now.getTime() / 1000) - 60 })
  });
  assert.equal(expired.response.status, 401);

  const tokenParts = adminToken.split('.');
  const replacement = tokenParts[2][0] === 'A' ? 'B' : 'A';
  const tamperedSignature = `${tokenParts[0]}.${tokenParts[1]}.${replacement}${tokenParts[2].slice(1)}`;
  const tampered = await callApi('/api/crm/v1/session', { token: tamperedSignature });
  assert.equal(tampered.response.status, 401);

  const inactive = await callApi('/api/crm/v1/session', { token: inactiveToken });
  assert.equal(inactive.response.status, 403);
  assert.equal(inactive.payload.code, 'USER_NOT_AUTHORIZED');

  const missingAccessConfig = await callApi('/api/crm/v1/session', {
    token: adminToken,
    env: { CRM_DB: database }
  });
  assert.equal(missingAccessConfig.response.status, 503);
  assert.equal(missingAccessConfig.payload.code, 'SERVICE_NOT_CONFIGURED');

  const session = await callApi('/api/crm/v1/session');
  assert.equal(session.response.status, 200);
  assert.deepEqual(session.payload.data, {
    id: 'user-admin',
    email: 'admin@example.invalid',
    displayName: 'TEST-user-admin',
    role: 'admin'
  });

  const adminUsers = await callApi('/api/crm/v1/users');
  assert.equal(adminUsers.response.status, 200);
  assert.deepEqual(adminUsers.payload.data, [
    { id: 'user-admin', displayName: 'TEST-user-admin', role: 'admin' },
    { id: 'user-sales-a', displayName: 'TEST-user-sales-a', role: 'sales' },
    { id: 'user-sales-b', displayName: 'TEST-user-sales-b', role: 'sales' }
  ]);
  assert.equal(Object.hasOwn(adminUsers.payload.data[0], 'email'), false);

  const salesUsers = await callApi('/api/crm/v1/users', { token: salesAToken });
  assert.deepEqual(salesUsers.payload.data, [
    { id: 'user-sales-a', displayName: 'TEST-user-sales-a', role: 'sales' }
  ]);

  const usersWithQuery = await callApi('/api/crm/v1/users?active=1');
  assert.equal(usersWithQuery.response.status, 422);
  assert.equal(usersWithQuery.payload.code, 'UNKNOWN_QUERY_PARAMETER');

  const wrongUsersMethod = await callApi('/api/crm/v1/users', { method: 'POST' });
  assert.equal(wrongUsersMethod.response.status, 405);
  assert.equal(wrongUsersMethod.response.headers.get('allow'), 'GET');

  const missingRequestId = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    body: { company: 'TEST-COMPANY', picName: 'TEST-PIC' }
  });
  assert.equal(missingRequestId.response.status, 400);
  assert.equal(missingRequestId.payload.code, 'REQUEST_ID_REQUIRED');

  const unsupportedMedia = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-media-001', 'Content-Type': 'text/plain' },
    body: '{}'
  });
  assert.equal(unsupportedMedia.response.status, 415);
  assert.equal(unsupportedMedia.payload.code, 'UNSUPPORTED_MEDIA_TYPE');

  const invalidJson = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-json-0001', 'Content-Type': 'application/json' },
    body: '{'
  });
  assert.equal(invalidJson.response.status, 400);
  assert.equal(invalidJson.payload.code, 'INVALID_JSON');

  const oversized = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-size-0001', 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'x'.repeat(70 * 1024) })
  });
  assert.equal(oversized.response.status, 413);
  assert.equal(oversized.payload.code, 'PAYLOAD_TOO_LARGE');

  const unauthorizedOwner = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-owner-01' },
    body: {
      company: 'TEST-COMPANY-OWNER',
      picName: 'TEST-PIC-OWNER',
      ownerUserId: 'user-sales-b'
    }
  });
  assert.equal(unauthorizedOwner.response.status, 403);
  assert.equal(unauthorizedOwner.payload.code, 'OWNER_SCOPE_FORBIDDEN');

  const lostWithoutReason = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-lost-0001' },
    body: { company: 'TEST-COMPANY-LOST', picName: 'TEST-PIC-LOST', pipeline: 'Lost' }
  });
  assert.equal(lostWithoutReason.response.status, 422);
  assert.equal(lostWithoutReason.payload.code, 'LOST_REASON_REQUIRED');

  const unknownField = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-field-001' },
    body: { company: 'TEST-COMPANY-FIELD', picName: 'TEST-PIC-FIELD', secretField: true }
  });
  assert.equal(unknownField.response.status, 422);
  assert.equal(unknownField.payload.code, 'UNKNOWN_FIELD');

  const salesCreate = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-create-a1' },
    body: {
      company: 'TEST-COMPANY-ALPHA',
      picName: 'TEST-PIC-ALPHA',
      pipeline: 'Qualified',
      potentialValue: 1000000,
      scores: { fit: 5, readiness: 4, urgency: 3, value: 5 }
    }
  });
  assert.equal(salesCreate.response.status, 201);
  assert.equal(salesCreate.response.headers.get('x-request-id'), 'request-create-a1');
  assert.equal(salesCreate.payload.data.ownerUserId, 'user-sales-a');
  assert.equal(salesCreate.payload.data.version, 1);
  assert.equal(Object.hasOwn(salesCreate.payload.data, 'owner'), false);
  const salesLeadId = salesCreate.payload.data.id;

  const adminCreate = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-create-b1' },
    body: {
      company: 'TEST-COMPANY-BETA',
      picName: 'TEST-PIC-BETA',
      ownerUserId: 'user-sales-b',
      pipeline: 'Contacted'
    }
  });
  assert.equal(adminCreate.response.status, 201);
  assert.equal(adminCreate.payload.data.ownerUserId, 'user-sales-b');
  const adminLeadId = adminCreate.payload.data.id;

  const salesAList = await callApi('/api/crm/v1/leads', { token: salesAToken });
  assert.equal(salesAList.response.status, 200);
  assert.equal(salesAList.payload.meta.total, 1);
  assert.deepEqual(salesAList.payload.data.map(({ id }) => id), [salesLeadId]);

  const salesBList = await callApi('/api/crm/v1/leads', { token: salesBToken });
  assert.equal(salesBList.payload.meta.total, 1);
  assert.deepEqual(salesBList.payload.data.map(({ id }) => id), [adminLeadId]);

  const adminList = await callApi('/api/crm/v1/leads?limit=1&offset=0');
  assert.equal(adminList.payload.meta.total, 2);
  assert.equal(adminList.payload.data.length, 1);
  assert.equal(adminList.payload.meta.limit, 1);

  const filtered = await callApi('/api/crm/v1/leads?pipeline=Qualified');
  assert.equal(filtered.payload.meta.total, 1);
  assert.equal(filtered.payload.data[0].id, salesLeadId);

  const injectionSearch = await callApi("/api/crm/v1/leads?search=%25'%20OR%201%3D1%20--");
  assert.equal(injectionSearch.response.status, 200);
  assert.equal(injectionSearch.payload.meta.total, 0);

  const crossOwnerRead = await callApi(`/api/crm/v1/leads/${adminLeadId}`, { token: salesAToken });
  assert.equal(crossOwnerRead.response.status, 404);
  assert.equal(crossOwnerRead.payload.code, 'LEAD_NOT_FOUND');

  const crossOwnerFilter = await callApi('/api/crm/v1/leads?ownerUserId=user-sales-b', {
    token: salesAToken
  });
  assert.equal(crossOwnerFilter.response.status, 403);

  const updateBody = {
    version: 1,
    company: 'TEST-COMPANY-ALPHA-UPDATED',
    picName: 'TEST-PIC-ALPHA',
    ownerUserId: 'user-sales-a',
    pipeline: 'Negotiation',
    potentialValue: 1250000,
    scores: { fit: 5, readiness: 5, urgency: 4, value: 5 }
  };
  const updated = await callApi(`/api/crm/v1/leads/${salesLeadId}`, {
    method: 'PUT',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-update-a1' },
    body: updateBody
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.payload.data.version, 2);
  assert.equal(updated.payload.data.pipeline, 'Negotiation');

  const staleUpdate = await callApi(`/api/crm/v1/leads/${salesLeadId}`, {
    method: 'PUT',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-update-a2' },
    body: updateBody
  });
  assert.equal(staleUpdate.response.status, 409);
  assert.equal(staleUpdate.payload.code, 'VERSION_CONFLICT');

  const crossOwnerDelete = await callApi(`/api/crm/v1/leads/${adminLeadId}`, {
    method: 'DELETE',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-delete-x1', 'If-Match': '1' }
  });
  assert.equal(crossOwnerDelete.response.status, 404);

  const missingIfMatch = await callApi(`/api/crm/v1/leads/${salesLeadId}`, {
    method: 'DELETE',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-delete-a0' }
  });
  assert.equal(missingIfMatch.response.status, 428);

  const staleDelete = await callApi(`/api/crm/v1/leads/${salesLeadId}`, {
    method: 'DELETE',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-delete-a1', 'If-Match': '1' }
  });
  assert.equal(staleDelete.response.status, 409);

  const deleted = await callApi(`/api/crm/v1/leads/${salesLeadId}`, {
    method: 'DELETE',
    token: salesAToken,
    headers: { 'X-Request-ID': 'request-delete-a2', 'If-Match': '"2"' }
  });
  assert.equal(deleted.response.status, 200);
  assert.equal(deleted.payload.data.version, 3);
  assert.equal(deleted.payload.data.deletedAt, now.toISOString());

  const salesAfterDelete = await callApi('/api/crm/v1/leads', { token: salesAToken });
  assert.equal(salesAfterDelete.payload.meta.total, 0);

  const adminWithDeleted = await callApi('/api/crm/v1/leads?includeDeleted=1');
  assert.equal(adminWithDeleted.payload.meta.total, 2);
  assert.ok(adminWithDeleted.payload.data.some(({ id, deletedAt }) => id === salesLeadId && deletedAt));

  const salesWithDeleted = await callApi('/api/crm/v1/leads?includeDeleted=1', {
    token: salesAToken
  });
  assert.equal(salesWithDeleted.response.status, 403);

  const overdueCreate = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-create-overdue-01' },
    body: {
      company: '=TEST-COMPANY-FORMULA',
      picName: 'TEST-PIC-FOLLOW-UP',
      ownerUserId: 'user-sales-a',
      pipeline: 'Qualified',
      potentialValue: 1000000,
      nextAction: 'TEST-FOLLOW-UP-ACTION',
      nextActionDate: '2026-09-07',
      scores: { fit: 5, readiness: 4, urgency: 4, value: 4 }
    }
  });
  assert.equal(overdueCreate.response.status, 201);
  const overdueLeadId = overdueCreate.payload.data.id;

  const wonCreate = await callApi('/api/crm/v1/leads', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-create-won-0001' },
    body: {
      company: 'TEST-COMPANY-WON',
      picName: 'TEST-PIC-WON',
      ownerUserId: 'user-sales-a',
      pipeline: 'Won',
      potentialValue: 100000000,
      nextAction: 'TEST-SHOULD-NOT-APPEAR',
      nextActionDate: '2026-09-01'
    }
  });
  assert.equal(wonCreate.response.status, 201);

  const dashboard = await callApi('/api/crm/v1/dashboard');
  assert.equal(dashboard.response.status, 200);
  assert.equal(dashboard.payload.data.kpis.activeLeads, 2);
  assert.ok(Math.abs(dashboard.payload.data.kpis.qualifiedRate - (2 / 3 * 100)) < 0.001);
  assert.equal(dashboard.payload.data.kpis.overdueFollowUps, 1);
  assert.equal(dashboard.payload.data.kpis.weightedForecast, 300000);
  assert.deepEqual(dashboard.payload.data.followUps.map(({ id }) => id), [overdueLeadId]);
  assert.equal(dashboard.payload.data.followUps[0].overdue, true);

  const salesDashboard = await callApi('/api/crm/v1/dashboard', { token: salesAToken });
  assert.equal(salesDashboard.payload.data.kpis.activeLeads, 1);
  assert.equal(salesDashboard.payload.data.kpis.qualifiedRate, 100);
  assert.equal(salesDashboard.payload.data.kpis.weightedForecast, 300000);
  assert.deepEqual(salesDashboard.payload.data.followUps.map(({ id }) => id), [overdueLeadId]);

  const backupResponse = await callRaw('/api/crm/v1/exports/backup.json');
  assert.equal(backupResponse.status, 200);
  assert.match(backupResponse.headers.get('content-disposition'), /masumi-crm-backup\.json/);
  assert.equal(backupResponse.headers.get('cache-control'), 'no-store');
  const backupText = await backupResponse.text();
  assert.equal(parseCrmBackup(backupText).length, 3);

  const csvResponse = await callRaw('/api/crm/v1/exports/leads.csv');
  assert.equal(csvResponse.status, 200);
  assert.match(csvResponse.headers.get('content-type'), /^text\/csv/);
  const csvBytes = new Uint8Array(await csvResponse.arrayBuffer());
  assert.deepEqual([...csvBytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
  const csvText = new TextDecoder().decode(csvBytes);
  assert.match(csvText, /"'=TEST-COMPANY-FORMULA"/);
  assert.doesNotMatch(csvText, /"=TEST-COMPANY-FORMULA"/);

  const salesExport = await callRaw('/api/crm/v1/exports/backup.json', { token: salesAToken });
  assert.equal(salesExport.status, 403);

  const ownerMappings = [{ sourceOwner: 'TEST-LEGACY-OWNER', ownerUserId: 'user-sales-b' }];
  const importBackup = {
    schema: CRM_SCHEMA,
    version: CRM_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    leads: [{
      id: 'import-lead-1',
      company: '@TEST-IMPORTED-COMPANY',
      picName: 'TEST-IMPORTED-PIC',
      owner: 'TEST-LEGACY-OWNER',
      pipeline: 'Needs Discovery',
      potentialValue: 2000000,
      nextAction: 'TEST-IMPORTED-FOLLOW-UP',
      nextActionDate: '2026-09-09',
      scores: { fit: 5, readiness: 5, urgency: 5, value: 5 }
    }]
  };

  const salesValidate = await callApi('/api/crm/v1/imports/validate', {
    method: 'POST', token: salesAToken, body: { backup: importBackup, mode: 'append', ownerMappings }
  });
  assert.equal(salesValidate.response.status, 403);
  assert.equal(salesValidate.payload.code, 'ADMIN_REQUIRED');

  const invalidPreview = await callApi('/api/crm/v1/imports/validate', {
    method: 'POST',
    body: {
      backup: {
        ...importBackup,
        leads: [{ ...importBackup.leads[0], id: 'invalid-pipeline-1', pipeline: 'Unknown Stage' }]
      },
      mode: 'append',
      ownerMappings
    }
  });
  assert.equal(invalidPreview.response.status, 200);
  assert.equal(invalidPreview.payload.data.invalid, 1);
  assert.equal(invalidPreview.payload.data.canCommit, false);
  assert.equal(invalidPreview.payload.data.checksum, '');

  const duplicateFilePreview = await callApi('/api/crm/v1/imports/validate', {
    method: 'POST',
    body: {
      backup: { ...importBackup, leads: [importBackup.leads[0], importBackup.leads[0]] },
      mode: 'append',
      ownerMappings
    }
  });
  assert.equal(duplicateFilePreview.response.status, 200);
  assert.equal(duplicateFilePreview.payload.data.duplicateFile, 1);
  assert.equal(duplicateFilePreview.payload.data.canCommit, false);

  const oversizedImport = await callApi('/api/crm/v1/imports/validate', {
    method: 'POST',
    body: {
      backup: {
        ...importBackup,
        leads: [{ ...importBackup.leads[0], notes: 'x'.repeat((5 * 1024 * 1024) + 1) }]
      },
      mode: 'append',
      ownerMappings
    }
  });
  assert.equal(oversizedImport.response.status, 413);
  assert.equal(oversizedImport.payload.code, 'PAYLOAD_TOO_LARGE');

  const appendPreview = await callApi('/api/crm/v1/imports/validate', {
    method: 'POST', body: { backup: importBackup, mode: 'append', ownerMappings }
  });
  assert.equal(appendPreview.response.status, 200);
  assert.equal(appendPreview.payload.data.valid, 1);
  assert.equal(appendPreview.payload.data.invalid, 0);
  assert.equal(appendPreview.payload.data.duplicateTarget, 0);
  assert.equal(appendPreview.payload.data.canCommit, true);
  assert.match(appendPreview.payload.data.checksum, /^[0-9a-f]{64}$/);

  const missingConfirmation = await callApi('/api/crm/v1/imports/commit', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-import-confirm-01' },
    body: {
      backup: importBackup,
      mode: 'append',
      ownerMappings,
      checksum: appendPreview.payload.data.checksum
    }
  });
  assert.equal(missingConfirmation.response.status, 422);
  assert.equal(missingConfirmation.payload.code, 'IMPORT_CONFIRMATION_REQUIRED');

  const changedImport = await callApi('/api/crm/v1/imports/commit', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-import-changed-01' },
    body: {
      backup: importBackup,
      mode: 'append',
      ownerMappings,
      checksum: '0'.repeat(64),
      confirm: true
    }
  });
  assert.equal(changedImport.response.status, 409);
  assert.equal(changedImport.payload.code, 'IMPORT_CHANGED');

  const appendCommitBody = {
    backup: importBackup,
    mode: 'append',
    ownerMappings,
    checksum: appendPreview.payload.data.checksum,
    confirm: true
  };
  const appendCommit = await callApi('/api/crm/v1/imports/commit', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-import-append-01' },
    body: appendCommitBody
  });
  assert.equal(appendCommit.response.status, 201);
  assert.equal(appendCommit.payload.data.rowCount, 1);
  assert.equal(appendCommit.payload.data.idempotent, false);

  const appendRetry = await callApi('/api/crm/v1/imports/commit', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-import-append-02' },
    body: appendCommitBody
  });
  assert.equal(appendRetry.response.status, 200);
  assert.equal(appendRetry.payload.data.idempotent, true);
  assert.equal(appendRetry.payload.data.jobId, appendCommit.payload.data.jobId);

  const targetDuplicate = await callApi('/api/crm/v1/imports/validate', {
    method: 'POST', body: { backup: importBackup, mode: 'append', ownerMappings }
  });
  assert.equal(targetDuplicate.payload.data.duplicateTarget, 1);
  assert.equal(targetDuplicate.payload.data.canCommit, false);

  const replaceMappings = [
    { sourceOwner: 'TEST-REPLACE-A', ownerUserId: 'user-sales-a' },
    { sourceOwner: 'TEST-REPLACE-B', ownerUserId: 'user-sales-b' }
  ];
  const replaceBackup = {
    schema: CRM_SCHEMA,
    version: CRM_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    leads: [
      {
        id: adminLeadId,
        company: 'TEST-REPLACED-EXISTING',
        picName: 'TEST-REPLACE-PIC-A',
        owner: 'TEST-REPLACE-A',
        pipeline: 'Negotiation',
        potentialValue: 3000000
      },
      {
        id: 'replace-fail',
        company: 'TEST-REPLACE-NEW',
        picName: 'TEST-REPLACE-PIC-B',
        owner: 'TEST-REPLACE-B',
        pipeline: 'New'
      }
    ]
  };
  const replacePreview = await callApi('/api/crm/v1/imports/validate', {
    method: 'POST', body: { backup: replaceBackup, mode: 'replace', ownerMappings: replaceMappings }
  });
  assert.equal(replacePreview.payload.data.canCommit, true);
  assert.equal(replacePreview.payload.data.targetMatches, 1);
  assert.equal(replacePreview.payload.data.duplicateTarget, 0);
  assert.equal(replacePreview.payload.data.finalCount, 2);

  const beforeFailedReplace = await database.prepare(
    'SELECT id FROM leads WHERE deleted_at IS NULL ORDER BY id'
  ).all();
  await database.exec(`
    CREATE TRIGGER test_import_failure
    BEFORE INSERT ON leads WHEN NEW.id = 'replace-fail'
    BEGIN SELECT RAISE(ABORT, 'TEST_IMPORT_ABORT'); END;
  `);
  const failedReplace = await callApi('/api/crm/v1/imports/commit', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-import-rollback-1' },
    body: {
      backup: replaceBackup,
      mode: 'replace',
      ownerMappings: replaceMappings,
      checksum: replacePreview.payload.data.checksum,
      confirm: true
    }
  });
  assert.equal(failedReplace.response.status, 500);
  await database.exec('DROP TRIGGER test_import_failure');
  const afterFailedReplace = await database.prepare(
    'SELECT id FROM leads WHERE deleted_at IS NULL ORDER BY id'
  ).all();
  assert.deepEqual(afterFailedReplace.results, beforeFailedReplace.results);
  const failedInsertCount = await database.prepare(
    "SELECT count(*) AS total FROM leads WHERE id = 'replace-fail'"
  ).first();
  assert.equal(failedInsertCount.total, 0);

  const replaceCommit = await callApi('/api/crm/v1/imports/commit', {
    method: 'POST',
    headers: { 'X-Request-ID': 'request-import-replace-01' },
    body: {
      backup: replaceBackup,
      mode: 'replace',
      ownerMappings: replaceMappings,
      checksum: replacePreview.payload.data.checksum,
      confirm: true
    }
  });
  assert.equal(replaceCommit.response.status, 201);
  assert.equal(replaceCommit.payload.data.rowCount, 2);
  const activeAfterReplace = await database.prepare(
    'SELECT id FROM leads WHERE deleted_at IS NULL ORDER BY id'
  ).all();
  assert.deepEqual(activeAfterReplace.results.map(({ id }) => id), [adminLeadId, 'replace-fail'].sort());

  const importJobs = await database.prepare('SELECT count(*) AS total FROM import_jobs').first();
  assert.equal(importJobs.total, 2);

  const unknownEndpoint = await callApi('/api/crm/v1/unknown');
  assert.equal(unknownEndpoint.response.status, 404);
  assert.equal(unknownEndpoint.payload.code, 'API_NOT_FOUND');

  const wrongMethod = await callApi('/api/crm/v1/leads', { method: 'PATCH' });
  assert.equal(wrongMethod.response.status, 405);
  assert.equal(wrongMethod.response.headers.get('allow'), 'GET, POST');

  const auditCounts = await database.prepare(`
    SELECT action, count(*) AS total FROM audit_logs GROUP BY action ORDER BY action
  `).all();
  assert.deepEqual(auditCounts.results.map(({ action, total }) => ({ action, total })), [
    { action: 'import.commit', total: 2 },
    { action: 'lead.create', total: 4 },
    { action: 'lead.delete', total: 1 },
    { action: 'lead.update', total: 1 }
  ]);
  const auditMetadata = await database.prepare('SELECT metadata_json FROM audit_logs').all();
  for (const { metadata_json: metadataJson } of auditMetadata.results) {
    assert.ok(['version', 'mode'].includes(Object.keys(JSON.parse(metadataJson))[0]));
    assert.doesNotMatch(metadataJson, /TEST-COMPANY|TEST-PIC|contact|notes/i);
  }
  assert.equal(certificateFetches, 1);

  console.log('MASUMI CRM CLOUD API TESTS: PASS');
} finally {
  close();
}
