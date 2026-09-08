import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createCrmClient, CrmApiClientError } from '../apps/masumi-crm/crm-client.js';
import { TOOLS } from '../src/tools-registry.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const [html, css, appScript, clientScript, buildScript] = await Promise.all([
  readFile(new URL('../apps/masumi-crm/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../apps/masumi-crm/app.css', import.meta.url), 'utf8'),
  readFile(new URL('../apps/masumi-crm/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../apps/masumi-crm/crm-client.js', import.meta.url), 'utf8'),
  readFile(new URL('./build-masumi-crm-cloud.mjs', import.meta.url), 'utf8')
]);

assert.match(html, /<h1 id="page-title">Lead Register<\/h1>/);
assert.equal((html.match(/<option value="(?:default|developer|swiss|pixel)">/g) || []).length, 4);
for (const name of [
  'leadDate', 'source', 'company', 'picName', 'picRole', 'decisionMakerStatus',
  'contact', 'city', 'ownerUserId', 'brandStatus', 'needs', 'estimatedQuantity',
  'potentialValue', 'targetLaunch', 'pipeline', 'lastContact', 'nextAction',
  'nextActionDate', 'complianceStatus', 'blocker', 'lostReason', 'notes'
]) {
  assert.match(html, new RegExp(`name="${name}"`));
}
assert.match(html, /id="reload-conflict"/);
assert.match(html, /Data contoh tidak digunakan/);
assert.match(css, /@media\(max-width:760px\)/);
assert.match(css, /overflow-x:hidden/);
assert.match(css, /min-height:44px/);
assert.doesNotMatch(appScript, /innerHTML|insertAdjacentHTML/);
assert.doesNotMatch(clientScript, /innerHTML|insertAdjacentHTML/);
assert.doesNotMatch(appScript, /samsonMasumiCrmV1/);
assert.match(appScript, /window\.confirm/);
assert.match(appScript, /VERSION_CONFLICT/);
assert.match(buildScript, /crm-client\.js/);
assert.match(buildScript, /crm-core\.js/);

const crmTool = TOOLS.find(({ id }) => id === 'masumi-sales-crm');
assert.equal(crmTool.cloudUrl, 'https://crm.samson.web.id/');

const listCalls = [];
const listClient = createCrmClient({
  fetchImpl: async (url, options) => {
    listCalls.push({ url, options });
    return Response.json({
      success: true,
      data: [],
      meta: { total: 0, limit: 50, offset: 0 }
    });
  }
});
const listed = await listClient.listLeads({
  search: "Brand & PIC",
  pipeline: 'Needs Discovery',
  limit: 50,
  offset: 0
});
assert.deepEqual(listed, { leads: [], meta: { total: 0, limit: 50, offset: 0 } });
assert.equal(
  listCalls[0].url,
  '/api/crm/v1/leads?search=Brand+%26+PIC&pipeline=Needs+Discovery&limit=50&offset=0'
);
assert.equal(listCalls[0].options.credentials, 'same-origin');

const mutationCalls = [];
const mutationClient = createCrmClient({
  fetchImpl: async (url, options) => {
    mutationCalls.push({ url, options });
    return Response.json({ success: true, data: { id: 'lead-1', version: 2 } });
  }
});
await mutationClient.updateLead('lead/unsafe', {
  version: 1,
  company: 'TEST',
  picName: 'PIC'
});
assert.equal(mutationCalls[0].url, '/api/crm/v1/leads/lead%2Funsafe');
assert.equal(mutationCalls[0].options.method, 'PUT');
assert.equal(mutationCalls[0].options.headers['Content-Type'], 'application/json');
assert.match(mutationCalls[0].options.headers['X-Request-ID'], /^[0-9a-f-]{36}$/i);

await mutationClient.deleteLead('lead-1', 2);
assert.equal(mutationCalls[1].options.method, 'DELETE');
assert.equal(mutationCalls[1].options.headers['If-Match'], '2');
assert.equal(mutationCalls[1].options.body, undefined);

const errorClient = createCrmClient({
  fetchImpl: async () => Response.json(
    { success: false, code: 'VERSION_CONFLICT', message: 'Lead telah berubah.' },
    { status: 409, headers: { 'X-Request-ID': 'request-conflict-1' } }
  )
});
await assert.rejects(
  () => errorClient.getLead('lead-1'),
  (error) => error instanceof CrmApiClientError &&
    error.status === 409 &&
    error.code === 'VERSION_CONFLICT' &&
    error.requestId === 'request-conflict-1'
);

console.log('MASUMI CRM CLOUD UI TESTS: PASS');
