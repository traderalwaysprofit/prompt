import assert from 'node:assert/strict';
import {
  PROSPECT_HEADERS,
  buildMapsRoute,
  buildProspectsCsv,
  buildWhatsAppBrief,
  calculateLeadScore,
  findDuplicate,
  mapProspectRows,
  normalizeInstagram,
  normalizeLead,
  normalizePhone,
  normalizeWebsite
} from '../src/tools/b2b-prospecting-core.js';
import {
  B2B_LEGACY_STORAGE_KEY,
  B2B_STORAGE_KEY,
  addLeads,
  loadLeads,
  saveLeads
} from '../src/tools/b2b-prospecting-storage.js';
import { handleB2BRequest } from '../worker/b2b-prospecting.js';
import { getToolByRoute, TOOLS } from '../src/tools-registry.js';

assert.equal(TOOLS.length, 2);
assert.equal(TOOLS[1].id, 'b2b-prospecting');
assert.equal(getToolByRoute('#tools/b2b-prospecting'), TOOLS[1]);
const b2bModule = await TOOLS[1].load();
assert.equal(typeof b2bModule.mountTool, 'function');

assert.equal(normalizePhone('0812-3456-7890'), '+6281234567890');
assert.equal(normalizePhone('1234'), '');
assert.equal(normalizeInstagram('https://instagram.com/masumi.beauty/'), 'masumi.beauty');
assert.equal(normalizeInstagram('<img onerror=alert(1)>'), '');
assert.match(normalizeWebsite('masumi.co.id'), /^https:\/\/masumi\.co\.id\/?$/);
assert.equal(normalizeWebsite('javascript:alert(1)'), '');

const lead = normalizeLead({
  brand: 'Klinik A', company: 'PT A', category: 'aesthetic-clinic', region: 'Mojokerto',
  website: 'klinika.example', ig: '@klinika', phone: '081234567890',
  sources: [{ type: 'web', label: 'Official', url: 'https://klinika.example/' }]
}, { preserveId: false });
assert.ok(lead.id);
assert.equal(lead.phone, '+6281234567890');
assert.equal(calculateLeadScore(lead).score, 90);
assert.equal(calculateLeadScore(lead).band, 'hot');
assert.equal(findDuplicate({ brand: 'Other', phone: '081234567890' }, [lead]).type, 'exact');
assert.equal(findDuplicate({ brand: 'Klinik A', region: 'Mojokerto' }, [lead]).type, 'possible');

const mapped = mapProspectRows([
  PROSPECT_HEADERS,
  ['Klinik B', 'PT B', 'aesthetic-clinic', 'Surabaya', 'Jl A', 'https://b.example', '@bclinic', '081234567891', 'qualified', 'Prioritas'],
  ['Klinik C', '', '', 'Gresik', '', 'javascript:bad', '', 'salah', '', '']
]);
assert.equal(mapped.rows.length, 2);
assert.equal(mapped.validRows.length, 1);
assert.equal(mapped.issueRows.length, 1);
assert.equal(mapped.rows[1].lead.website, '');
assert.equal(mapped.rows[1].lead.phone, '');

const csv = buildProspectsCsv([lead]);
assert.equal(csv.charCodeAt(0), 0xfeff);
assert.match(csv, /"Klinik A"/);
const route = buildMapsRoute([lead, { brand: 'Klinik B', region: 'Surabaya' }]);
assert.match(route, /^https:\/\/www\.google\.com\/maps\/dir/);
const brief = buildWhatsAppBrief([lead], { salesLabel: 'Sales B', date: new Date('2026-09-02T00:00:00+07:00') });
assert.match(brief, /Klinik A/);
assert.match(brief, /Sales B/);

const storeMap = new Map();
const storage = { getItem: (key) => storeMap.get(key) ?? null, setItem: (key, value) => storeMap.set(key, value), removeItem: (key) => storeMap.delete(key) };
storage.setItem(B2B_LEGACY_STORAGE_KEY, JSON.stringify([{ brand: 'Legacy', company: 'PT L', region: 'Malang', ig: '@legacy', phone: '081234567892' }]));
const loaded = loadLeads({ storage });
assert.equal(loaded.migrated, true);
assert.equal(loaded.leads[0].instagram, 'legacy');
assert.ok(storage.getItem(B2B_STORAGE_KEY));
const added = addLeads(loaded.leads, [{ brand: 'Duplicate Phone', phone: '081234567892' }, { brand: 'New', phone: '081234567893' }]);
assert.equal(added.added.length, 1);
assert.equal(added.skipped.length, 1);
saveLeads(added.leads, { storage });
assert.equal(loadLeads({ storage }).leads.length, 2);

const makeRequest = (path, { method = 'GET', body, headers = {} } = {}) => new Request(`https://samson.web.id${path}`, {
  method,
  headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
  body: body ? JSON.stringify(body) : undefined
});
const env = { GEMINI_API_KEY: 'test-key', AI_MODEL: 'gemini-2.5-flash', B2B_RATE_LIMITER: { limit: async () => ({ success: true }) } };
let response = await handleB2BRequest(makeRequest('/api/tools/b2b/health'), env);
assert.equal(response.status, 200);
assert.equal((await response.json()).configured, true);
response = await handleB2BRequest(makeRequest('/api/tools/b2b/health', { headers: { 'sec-fetch-site': 'cross-site' } }), env);
assert.equal(response.status, 200);
assert.equal((await response.json()).configured, true);
response = await handleB2BRequest(makeRequest('/api/tools/b2b/search', {
  method: 'POST',
  body: { category: 'aesthetic-clinic', region: 'Mojokerto', limit: 5 },
  headers: { 'sec-fetch-site': 'cross-site' }
}), env);
assert.equal(response.status, 403);
assert.equal((await response.json()).error.code, 'CROSS_SITE_BLOCKED');
response = await handleB2BRequest(makeRequest('/api/tools/b2b/search', { method: 'POST', body: { category: 'bad', region: 'Mojokerto', limit: 5 } }), env);
assert.equal(response.status, 400);
assert.equal((await response.json()).error.code, 'INVALID_CATEGORY');

const originalFetch = globalThis.fetch;
let providerCalls = 0;
globalThis.fetch = async (url, options) => {
  providerCalls += 1;
  assert.match(String(url), /generativelanguage\.googleapis\.com/);
  assert.match(String(url), /gemini-2\.5-flash/);
  assert.equal(options.headers['x-goog-api-key'], 'test-key');
  const payload = JSON.parse(options.body);

  if (providerCalls === 1) {
    assert.deepEqual(payload.tools, [{ google_search: {} }]);
    assert.equal(payload.generationConfig.responseSchema, undefined);
    return new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: 'Klinik Test di Mojokerto. Website https://test.example dan nomor 6281234567890.' }] },
        groundingMetadata: { groundingChunks: [{ web: { uri: 'https://source.example/a', title: 'Source A' } }] }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  assert.equal(payload.tools, undefined);
  assert.equal(payload.generationConfig.responseMimeType, 'application/json');
  assert.ok(payload.generationConfig.responseSchema);
  return new Response(JSON.stringify({
    candidates: [{
      content: { parts: [{ text: JSON.stringify([{
        brand: 'Klinik Test', company: 'PT Test', category: 'aesthetic-clinic', region: 'Mojokerto', address: 'Jl Test', website: 'https://test.example', instagram: 'klinictest', phone: '6281234567890', confidence: 0.9, sourceUrls: ['https://source.example/a']
      }]) }] }
    }]
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
try {
  response = await handleB2BRequest(makeRequest('/api/tools/b2b/search', { method: 'POST', body: { category: 'aesthetic-clinic', region: 'Mojokerto', limit: 5 } }), env);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(providerCalls, 2);
  assert.equal(data.pipeline, 'ground-search-then-structure');
  assert.equal(data.candidates.length, 1);
  assert.equal(data.candidates[0].sources[0].url, 'https://source.example/a');
} finally {
  globalThis.fetch = originalFetch;
}
const limitedEnv = { ...env, B2B_RATE_LIMITER: { limit: async () => ({ success: false }) } };
response = await handleB2BRequest(makeRequest('/api/tools/b2b/search', { method: 'POST', body: { category: 'aesthetic-clinic', region: 'Mojokerto', limit: 5 } }), limitedEnv);
assert.equal(response.status, 429);
assert.equal((await response.json()).error.code, 'RATE_LIMITED');

console.log('B2B TOOLS TESTS: PASS');
