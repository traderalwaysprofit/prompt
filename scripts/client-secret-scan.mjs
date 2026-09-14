import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.css', '.cjs', '.html', '.js', '.json', '.map', '.md', '.mjs', '.svg', '.txt', '.xml'
]);

const STATIC_SECRET_PATTERNS = [
  {
    id: 'google-api-key',
    pattern: /AIza[0-9A-Za-z_-]{35}/g
  },
  {
    id: 'hardcoded-provider-secret',
    pattern: /\b(?:GEMINI_API_KEY|SERPER_API_KEY)\b\s*[:=]\s*["'][^"'\r\n]{8,}["']/g
  }
];

const SECRET_ENV_NAME = /(?:^|_)(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)$/i;

const listFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
};

const runtimeSecretDetectors = (env) => Object.entries(env)
  .filter(([name, value]) => SECRET_ENV_NAME.test(name) && typeof value === 'string' && value.length >= 8)
  .map(([name, value]) => ({
    id: `runtime-env:${name}`,
    test: (content) => content.includes(value)
  }));

export const findClientSecretLeaks = async (distDir, { env = process.env } = {}) => {
  const files = await listFiles(distDir);
  const envDetectors = runtimeSecretDetectors(env);
  const findings = [];

  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const content = await readFile(file, 'utf8');

    for (const detector of STATIC_SECRET_PATTERNS) {
      detector.pattern.lastIndex = 0;
      if (detector.pattern.test(content)) {
        findings.push({ file, detector: detector.id });
      }
    }

    for (const detector of envDetectors) {
      if (detector.test(content)) {
        findings.push({ file, detector: detector.id });
      }
    }
  }

  return findings;
};

export const assertNoClientSecrets = async (distDir, options) => {
  const findings = await findClientSecretLeaks(distDir, options);
  if (!findings.length) return;

  const relativeFindings = findings
    .map(({ file, detector }) => `- ${path.relative(process.cwd(), file)} [${detector}]`)
    .join('\n');

  throw new Error(
    `Client bundle secret scan failed. Potential secret material found:\n${relativeFindings}\n` +
    'Remove the secret from static assets and keep provider credentials in Cloudflare Worker secrets.'
  );
};
