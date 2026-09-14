import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertNoClientSecrets, findClientSecretLeaks } from './client-secret-scan.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'samson-secret-scan-'));

try {
  const safeFile = path.join(root, 'safe.js');
  await writeFile(safeFile, 'export const status = "safe";\n');
  await assertNoClientSecrets(root, { env: {} });

  const googleKey = `AIza${'A'.repeat(35)}`;
  await writeFile(path.join(root, 'google.js'), `const leaked = "${googleKey}";\n`);
  let findings = await findClientSecretLeaks(root, { env: {} });
  assert(findings.some((finding) => finding.detector === 'google-api-key'));

  await rm(path.join(root, 'google.js'));

  const envSecret = 'serper-test-secret-1234567890';
  await writeFile(path.join(root, 'env.js'), `window.__LEAK__ = "${envSecret}";\n`);
  findings = await findClientSecretLeaks(root, { env: { SERPER_API_KEY: envSecret } });
  assert(findings.some((finding) => finding.detector === 'runtime-env:SERPER_API_KEY'));

  console.log('Client secret scan tests passed.');
} finally {
  await rm(root, { recursive: true, force: true });
}
