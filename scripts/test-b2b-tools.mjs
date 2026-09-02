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

const env = {
  GEMINI_API_KEY: 'gemini-test-key',
  SERPER_API_KEY: 'serper-test-key',
  AI_MODEL: 'gemini-3.6-flash',
  B2B_RATE_LIMITER: { limit: async () => ({ success: true }) }
};

const originalFetch = globalThis.fetch;
let geminiGenerationCalls = 0;
let serperPlacesCalls = 0;
let serperSearchCalls = 0;

globalThis.fetch = async (url, options = {}) => {
  const target = String(url);

  if (target.includes('generativelanguage.googleapis.com')) {
    assert.match(target, /gemini-3\.6-flash/);
    assert.equal(options.headers['x-goog-api-key'], 'gemini-test-key');

    if ((options.method || 'GET') === 'GET') {
      return new Response(JSON.stringify({ name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    geminiGenerationCalls += 1;
    const payload = JSON.parse(options.body);
    assert.equal(payload.tools, undefined);
    assert.equal(payload.generationConfig.responseMimeType, 'application/json');

    if (geminiGenerationCalls === 1) {
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify([
          { evidenceIndex: 0, keep: true, confidence: 0.91 },
          { evidenceIndex: 1, keep: false, confidence: 0.2 }
        ]) }] } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify([{
        brand: 'Klinik Test', company: 'PT Test', category: 'aesthetic-clinic', region: 'Mojokerto', address: 'Jl Test', website: 'https://test.example/', instagram: 'klinictest', phone: '6281234567890', confidence: 0.9, sourceUrls: ['https://test.example/']
      }]) }] } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (target === 'https://google.serper.dev/places') {
    serperPlacesCalls += 1;
    assert.equal(options.headers['X-API-KEY'], 'serper-test-key');
    const payload = JSON.parse(options.body);
    assert.equal(payload.gl, 'id');
    assert.equal(payload.hl, 'id');
    assert.equal(payload.num, 5);
    return new Response(JSON.stringify({
      places: [
        { title: 'Klinik Test', address: 'Jl Test, Mojokerto', website: 'https://test.example/', phoneNumber: '081234567890', rating: 4.8, ratingCount: 120, type: 'Klinik kecantikan', cid: '123456789' },
        { title: 'Toko Umum', address: 'Mojokerto', website: 'https://unrelated.example/', rating: 4.1, ratingCount: 10, type: 'Toko', cid: '999999999' }
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (target === 'https://google.serper.dev/search') {
    serperSearchCalls += 1;
    assert.equal(options.headers['X-API-KEY'], 'serper-test-key');
    return new Response(JSON.stringify({
      organic: [
        { title: 'Klinik Test Official', link: 'https://test.example/', snippet: 'Klinik Test PT Test Mojokerto WhatsApp 081234567890.' },
        { title: 'Unrelated', link: 'https://unrelated.example/', snippet: 'Tidak terkait.' }
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  throw new Error(`Unexpected fetch: ${target}`);
};

try {
  let response = await handleB2BRequest(makeRequest('/api/tools/b2b/health'), env);
  assert.equal(response.status, 200);
  let health = await response.json();
  assert.equal(health.configured, true);
  assert.equal(health.searchConfigured, true);
  assert.equal(health.providerReady, true);
  assert.equal(health.model, 'gemini-3.6-flash');
  assert.equal(health.pipeline, 'serper-places-then-gemini-review');

  response = await handleB2BRequest(makeRequest('/api/tools/b2b/health', { headers: { 'sec-fetch-site': 'cross-site' } }), env);
  assert.equal(response.status, 200);

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

  response = await handleB2BRequest(makeRequest('/api/tools/b2b/search', { method: 'POST', body: { category: 'aesthetic-clinic', region: 'Mojokerto', limit: 5 } }), env);
  assert.equal(response.status, 200);
  const searchData = await response.json();
  assert.equal(serperPlacesCalls, 1);
  assert.equal(searchData.pipeline, 'serper-places-then-gemini-review');
  assert.equal(searchData.candidates.length, 1);
  assert.equal(searchData.candidates[0].brand, 'Klinik Test');
  assert.ok(searchData.candidates[0].sources.some((source) => source.url === 'https://test.example/'));
  assert.equal(searchData.candidates[0].sources.some((source) => source.url === 'https://unrelated.example/'), false);

  response = await handleB2BRequest(makeRequest('/api/tools/b2b/enrich', { method: 'POST', body: { mode: 'bpom', input: 'Klinik Test - PT Test' } }), env);
  assert.equal(response.status, 200);
  const enrichData = await response.json();
  assert.equal(serperSearchCalls, 1);
  assert.equal(enrichData.pipeline, 'serper-search-then-gemini-json');
  assert.equal(enrichData.candidates.length, 1);
  assert.equal(enrichData.candidates[0].sources.length, 1);
  assert.equal(enrichData.candidates[0].sources[0].url, 'https://test.example/');
} finally {
  globalThis.fetch = originalFetch;
}

const missingSerperEnv = { ...env, SERPER_API_KEY: '' };
let response = await handleB2BRequest(makeRequest('/api/tools/b2b/health'), missingSerperEnv);
let health = await response.json();
assert.equal(health.configured, false);
assert.equal(health.providerErrorCode, 'SEARCH_NOT_CONFIGURED');

const limitedEnv = { ...env, B2B_RATE_LIMITER: { limit: async () => ({ success: false }) } };
response = await handleB2BRequest(makeRequest('/api/tools/b2b/search', { method: 'POST', body: { category: 'aesthetic-clinic', region: 'Mojokerto', limit: 5 } }), limitedEnv);
assert.equal(response.status, 429);
assert.equal((await response.json()).error.code, 'RATE_LIMITED');

console.log('B2B TOOLS TESTS: PASS');
