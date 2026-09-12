import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildPreviewConfig } from './configure-masumi-crm-preview.mjs';

const source = JSON.parse(await readFile(new URL('../wrangler.crm.jsonc', import.meta.url), 'utf8'));
const sourceSnapshot = structuredClone(source);
const databaseId = '11111111-1111-4111-8111-111111111111';
const generated = buildPreviewConfig(source, databaseId);

assert.deepEqual(source, sourceSnapshot, 'Generating preview config must not mutate the source config.');
assert.deepEqual(generated.env.preview.d1_databases, [{
  binding: 'CRM_DB',
  database_name: 'masumi-crm-preview',
  database_id: databaseId,
  migrations_dir: 'migrations/masumi-crm'
}]);
assert.equal(Object.hasOwn(source.env.preview, 'd1_databases'), false);
assert.equal(Object.hasOwn(generated.env.production, 'd1_databases'), false);
assert.equal(generated.env.production.routes[0].pattern, 'crm.samson.web.id');

const staging = buildPreviewConfig(source, databaseId, {
  hostname: 'crm-preview.samson.web.id',
  accessAud: 'preview-aud',
  accessIssuer: 'https://samson-preview.cloudflareaccess.com'
});
assert.deepEqual(staging.env.preview.routes, [{
  pattern: 'crm-preview.samson.web.id',
  custom_domain: true
}]);
assert.equal(staging.env.preview.workers_dev, false);
assert.equal(staging.env.preview.vars.CRM_ENVIRONMENT, 'preview');
assert.equal(staging.env.preview.vars.CRM_ACCESS_AUD, 'preview-aud');
assert.equal(staging.env.preview.vars.CRM_ACCESS_ISSUER, 'https://samson-preview.cloudflareaccess.com');
assert.equal(staging.env.production.routes[0].pattern, 'crm.samson.web.id');

assert.throws(
  () => buildPreviewConfig(source, 'not-a-database-id'),
  /valid UUID/
);
assert.throws(
  () => buildPreviewConfig(source, databaseId, {
    hostname: 'crm.samson.web.id',
    accessAud: 'preview-aud',
    accessIssuer: 'https://samson-preview.cloudflareaccess.com'
  }),
  /preview hostname/
);
assert.throws(
  () => buildPreviewConfig(source, databaseId, {
    hostname: 'crm-preview.samson.web.id',
    accessAud: 'preview-aud',
    accessIssuer: 'https://example.com'
  }),
  /Cloudflare Access HTTPS origin/
);

console.log('MASUMI CRM preview config tests passed.');
