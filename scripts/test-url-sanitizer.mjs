import assert from 'node:assert/strict';
import { sanitizeProspectUrl } from '../worker/url-sanitizer.js';
import { handleB2BRequest } from '../worker/b2b-prospecting.js';

let res = sanitizeProspectUrl('masumi.co.id');
assert.equal(res.isValid, true);
assert.equal(res.sanitizedUrl, 'https://masumi.co.id/');
assert.equal(res.hostname, 'masumi.co.id');

assert.equal(sanitizeProspectUrl('http://localhost:8080/admin').isValid, false);
assert.equal(sanitizeProspectUrl('http://127.0.0.1/sensitive').isValid, false);
assert.equal(sanitizeProspectUrl('http://10.0.0.1/').isValid, false);
assert.equal(sanitizeProspectUrl('http://172.16.1.2/').isValid, false);
assert.equal(sanitizeProspectUrl('http://192.168.1.1/').isValid, false);

res = sanitizeProspectUrl('http://169.254.169.254/latest/meta-data/');
assert.equal(res.isValid, false);
assert.match(res.error, /SSRF risk/);

assert.equal(sanitizeProspectUrl('http://[::1]/').isValid, false);
assert.equal(sanitizeProspectUrl('http://[fe80::1]/').isValid, false);
assert.equal(sanitizeProspectUrl('http://[fd00::1]/').isValid, false);
assert.equal(sanitizeProspectUrl('http://metadata.google.internal/computeMetadata/v1/').isValid, false);

res = sanitizeProspectUrl('https://admin:pass@targetcompany.com/path#private');
assert.equal(res.isValid, true);
assert.equal(res.sanitizedUrl, 'https://targetcompany.com/path');
assert.equal(res.hostname, 'targetcompany.com');

res = sanitizeProspectUrl('ftp://targetcompany.com/file');
assert.equal(res.isValid, false);
assert.equal(res.error, 'Unsupported protocol');

assert.equal(sanitizeProspectUrl('intranet').isValid, false);
assert.equal(sanitizeProspectUrl('').isValid, false);
assert.equal(sanitizeProspectUrl(null).isValid, false);

const makeRequest = (targetUrl) => new Request('https://samson.web.id/api/tools/b2b/prospect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ targetUrl })
});

const env = {
  B2B_RATE_LIMITER: { limit: async () => ({ success: true }) }
};

let response = await handleB2BRequest(makeRequest('masumi.co.id'), env);
assert.equal(response.status, 200);
let payload = await response.json();
assert.equal(payload.success, true);
assert.equal(payload.target, 'https://masumi.co.id/');
assert.equal(payload.host, 'masumi.co.id');
assert.equal(payload.status, 'QUEUED_FOR_PROSPECTING');

response = await handleB2BRequest(makeRequest('http://169.254.169.254/latest/meta-data/'), env);
assert.equal(response.status, 422);
payload = await response.json();
assert.equal(payload.error.code, 'INVALID_TARGET_URL');
assert.match(payload.error.message, /SSRF risk/);

console.log('B2B URL SANITIZER TESTS: PASS');
