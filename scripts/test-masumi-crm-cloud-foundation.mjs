import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleMasumiCrmRequest } from '../worker/masumi-crm/index.js';

const request = (path, options) => new Request(`https://crm.samson.web.id${path}`, options);

const health = await handleMasumiCrmRequest(request('/api/crm/v1/health'), { CRM_ENVIRONMENT: 'preview' });
const healthPayload = await health.json();
assert.equal(health.status, 200);
assert.equal(healthPayload.service, 'masumi-crm');
assert.equal(healthPayload.status, 'api-ready');
assert.equal(healthPayload.environment, 'preview');
assert.equal(healthPayload.databaseConfigured, false);
assert.equal(healthPayload.accessConfigured, false);
assert.equal(health.headers.get('cache-control'), 'no-store');

const configured = await handleMasumiCrmRequest(request('/api/crm/v1/health'), {
  CRM_ENVIRONMENT: 'production',
  CRM_DB: {},
  CRM_ACCESS_AUD: 'configured',
  CRM_ACCESS_ISSUER: 'https://configured.cloudflareaccess.com'
});
const configuredPayload = await configured.json();
assert.equal(configuredPayload.databaseConfigured, true);
assert.equal(configuredPayload.accessConfigured, true);

const wrongMethod = await handleMasumiCrmRequest(request('/api/crm/v1/health', { method: 'POST' }), {});
assert.equal(wrongMethod.status, 405);
assert.equal(wrongMethod.headers.get('allow'), 'GET');

const unconfiguredEndpoint = await handleMasumiCrmRequest(request('/api/crm/v1/leads'), {});
assert.equal(unconfiguredEndpoint.status, 503);
assert.equal((await unconfiguredEndpoint.json()).code, 'SERVICE_NOT_CONFIGURED');

const assetResponse = await handleMasumiCrmRequest(request('/'), {
  CRM_ASSETS: { fetch: () => new Response('CRM shell', { status: 200 }) }
});
assert.equal(assetResponse.status, 200);
assert.equal(await assetResponse.text(), 'CRM shell');

const [html, css, appScript, headerFile, wranglerText] = await Promise.all([
  readFile(new URL('../apps/masumi-crm/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../apps/masumi-crm/app.css', import.meta.url), 'utf8'),
  readFile(new URL('../apps/masumi-crm/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../apps/masumi-crm/_headers', import.meta.url), 'utf8'),
  readFile(new URL('../wrangler.crm.jsonc', import.meta.url), 'utf8')
]);

assert.match(html, /<html lang="id" data-theme="default">/);
assert.equal((html.match(/<option value=/g) || []).length, 4);
assert.doesNotMatch(html, /data prospek contoh|contoh prospek/i);
assert.match(css, /@media\(max-width:520px\)/);
assert.match(css, /min-width:320px/);
assert.doesNotMatch(appScript, /innerHTML|insertAdjacentHTML/);
assert.match(headerFile, /Content-Security-Policy:/);
assert.match(headerFile, /frame-ancestors 'none'/);

const wranglerConfig = JSON.parse(wranglerText);
assert.equal(wranglerConfig.main, 'worker/masumi-crm/index.js');
assert.equal(wranglerConfig.assets.directory, './dist-crm');
assert.equal(wranglerConfig.d1_databases[0].binding, 'CRM_DB');
assert.equal(wranglerConfig.d1_databases[0].database_name, 'masumi-crm-local');
assert.equal(wranglerConfig.d1_databases[0].database_id, '00000000-0000-0000-0000-000000000000');
assert.equal(Object.hasOwn(wranglerConfig.env.preview, 'd1_databases'), false);
assert.equal(Object.hasOwn(wranglerConfig.env.production, 'd1_databases'), false);
assert.equal(wranglerConfig.env.preview.vars.CRM_ENVIRONMENT, 'preview');
assert.equal(wranglerConfig.env.production.routes[0].pattern, 'crm.samson.web.id');

console.log('MASUMI CRM CLOUD FOUNDATION TESTS: PASS');
