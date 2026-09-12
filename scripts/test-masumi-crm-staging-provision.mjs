import assert from 'node:assert/strict';
import {
  normalizePreviewHostname,
  normalizeEmail,
  provisionMasumiCrmStaging
} from './provision-masumi-crm-staging.mjs';

const accountId = 'a'.repeat(32);
const token = 'test-token';
const hostname = 'crm-preview.samson.web.id';
const adminEmail = 'admin-preview@example.com';

const response = (result, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => ({ success: status >= 200 && status < 300, result, errors: [] })
});

const createdCalls = [];
const createdFetcher = async (url, options = {}) => {
  const method = options.method || 'GET';
  createdCalls.push({ url, method, body: options.body ? JSON.parse(options.body) : null });

  if (url.endsWith('/access/apps?per_page=100') && method === 'GET') return response([]);
  if (url.endsWith('/access/apps') && method === 'POST') {
    return response({
      id: '11111111-1111-4111-8111-111111111111',
      aud: 'preview-audience-tag',
      name: 'MASUMI CRM Preview',
      type: 'self_hosted',
      domain: hostname,
      destinations: [{ type: 'public', uri: hostname }]
    });
  }
  if (url.endsWith('/access/apps/11111111-1111-4111-8111-111111111111/policies?per_page=100')) {
    return response([]);
  }
  if (url.endsWith('/access/apps/11111111-1111-4111-8111-111111111111/policies') && method === 'POST') {
    return response({ id: 'policy-1', name: 'MASUMI CRM Preview Allow' });
  }
  if (url.endsWith('/access/organizations')) {
    return response({ auth_domain: 'samson-preview.cloudflareaccess.com' });
  }
  throw new Error(`Unexpected request: ${method} ${url}`);
};

const created = await provisionMasumiCrmStaging({
  accountId,
  token,
  hostname,
  adminEmail,
  fetcher: createdFetcher
});

assert.equal(created.hostname, hostname);
assert.equal(created.applicationAction, 'created');
assert.equal(created.policyAction, 'created');
assert.equal(created.audience, 'preview-audience-tag');
assert.equal(created.issuer, 'https://samson-preview.cloudflareaccess.com');

const createAppCall = createdCalls.find((call) => call.method === 'POST' && call.url.endsWith('/access/apps'));
assert.equal(createAppCall.body.domain, hostname);
assert.equal(createAppCall.body.type, 'self_hosted');
assert.deepEqual(createAppCall.body.destinations, [{ type: 'public', uri: hostname }]);

const createPolicyCall = createdCalls.find((call) => call.method === 'POST' && call.url.endsWith('/policies'));
assert.equal(createPolicyCall.body.decision, 'allow');
assert.deepEqual(createPolicyCall.body.include, [{ email: { email: adminEmail } }]);

const reusedCalls = [];
const existingApp = {
  id: '22222222-2222-4222-8222-222222222222',
  aud: 'existing-audience',
  name: 'MASUMI CRM Preview',
  type: 'self_hosted',
  domain: hostname
};
const existingPolicy = {
  id: 'policy-2',
  name: 'MASUMI CRM Preview Allow',
  decision: 'allow',
  include: [{ email: { email: adminEmail } }]
};
const reusedFetcher = async (url, options = {}) => {
  const method = options.method || 'GET';
  reusedCalls.push({ url, method });
  if (url.endsWith('/access/apps?per_page=100')) return response([existingApp]);
  if (url.endsWith('/access/apps/22222222-2222-4222-8222-222222222222/policies?per_page=100')) {
    return response([existingPolicy]);
  }
  if (url.endsWith('/access/organizations')) {
    return response({ auth_domain: 'samson-preview.cloudflareaccess.com' });
  }
  throw new Error(`Unexpected request: ${method} ${url}`);
};

const reused = await provisionMasumiCrmStaging({
  accountId,
  token,
  hostname,
  adminEmail,
  fetcher: reusedFetcher
});
assert.equal(reused.applicationAction, 'reused');
assert.equal(reused.policyAction, 'reused');
assert.equal(reusedCalls.some((call) => call.method === 'POST' || call.method === 'PUT'), false);

assert.equal(normalizePreviewHostname('CRM-PREVIEW.SAMSON.WEB.ID'), hostname);
assert.equal(normalizeEmail(' Admin@Example.COM '), 'admin@example.com');
assert.throws(() => normalizePreviewHostname('crm.samson.web.id'), /preview hostname|Production hostname/);
assert.throws(() => normalizePreviewHostname('preview.example.com'), /samson\.web\.id/);
assert.throws(() => normalizeEmail('invalid-email'), /valid email/);

console.log('MASUMI CRM staging provision tests passed.');
