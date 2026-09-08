import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'apps', 'masumi-crm');
const dist = path.join(root, 'dist-crm');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ['index.html', 'app.css', 'app.js', 'crm-client.js', '_headers']) {
  await cp(path.join(source, file), path.join(dist, file));
}
await cp(path.join(root, 'src', 'tools', 'masumi-crm-core.js'), path.join(dist, 'crm-core.js'));
await cp(path.join(root, 'favicon.svg'), path.join(dist, 'favicon.svg'));

const commit = process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || 'local';
await writeFile(path.join(dist, 'version.json'), `${JSON.stringify({ commit, application: 'masumi-crm' }, null, 2)}\n`);

console.log('MASUMI CRM cloud application created in dist-crm/');
