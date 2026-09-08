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
assert.throws(
  () => buildPreviewConfig(source, 'not-a-database-id'),
  /valid UUID/
);

console.log('MASUMI CRM preview config tests passed.');
