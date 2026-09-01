import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await cp(path.join(root, 'index.html'), path.join(dist, 'index.html'));
await cp(path.join(root, 'favicon.svg'), path.join(dist, 'favicon.svg'));
await cp(path.join(root, '_headers'), path.join(dist, '_headers'));
await cp(path.join(root, 'src'), path.join(dist, 'src'), { recursive: true });
await cp(path.join(root, 'data'), path.join(dist, 'data'), { recursive: true });
await cp(path.join(root, 'vendor'), path.join(dist, 'vendor'), { recursive: true });
await cp(path.join(root, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'), path.join(dist, 'vendor', 'xlsx.full.min.js'));
await cp(path.join(root, 'node_modules', 'xlsx', 'LICENSE'), path.join(dist, 'vendor', 'LICENSE.sheetjs.txt'));

const commit = process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || 'local';
await writeFile(path.join(dist, 'version.json'), `${JSON.stringify({ commit }, null, 2)}\n`);

console.log('Static production output created in dist/');
console.log('Included: index.html, favicon.svg, _headers, version.json, src/, data/, vendor/');
