import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DATABASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREVIEW_DATABASE_NAME = 'masumi-crm-preview';

const normalizeStagingOptions = (options = {}) => {
  const hostname = String(options.hostname || '').trim().toLowerCase();
  const accessAud = String(options.accessAud || '').trim();
  const accessIssuer = String(options.accessIssuer || '').trim();

  if (!hostname && !accessAud && !accessIssuer) return null;
  if (!hostname.endsWith('.samson.web.id') || !hostname.includes('preview') || hostname === 'crm.samson.web.id') {
    throw new Error('CRM staging hostname must be a preview hostname under samson.web.id.');
  }
  if (!accessAud || accessAud.length > 160) {
    throw new Error('CRM preview Access audience is required.');
  }

  let issuer;
  try {
    const parsed = new URL(accessIssuer);
    if (
      parsed.protocol !== 'https:' ||
      !parsed.hostname.endsWith('.cloudflareaccess.com') ||
      (parsed.pathname !== '/' && parsed.pathname !== '') ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error('invalid issuer');
    }
    issuer = parsed.origin;
  } catch {
    throw new Error('CRM preview Access issuer must be a Cloudflare Access HTTPS origin.');
  }

  return { hostname, accessAud, accessIssuer: issuer };
};

export const buildPreviewConfig = (sourceConfig, databaseId, options = {}) => {
  if (!DATABASE_ID_PATTERN.test(databaseId)) {
    throw new Error('CRM preview database ID must be a valid UUID.');
  }

  const config = structuredClone(sourceConfig);
  if (!config.env?.preview) {
    throw new Error('The Wrangler preview environment is missing.');
  }

  config.env.preview.d1_databases = [{
    binding: 'CRM_DB',
    database_name: PREVIEW_DATABASE_NAME,
    database_id: databaseId,
    migrations_dir: 'migrations/masumi-crm'
  }];

  const staging = normalizeStagingOptions(options);
  if (staging) {
    config.env.preview.routes = [{
      pattern: staging.hostname,
      custom_domain: true
    }];
    config.env.preview.workers_dev = false;
    config.env.preview.vars = {
      ...(config.env.preview.vars || {}),
      CRM_ACCESS_AUD: staging.accessAud,
      CRM_ACCESS_ISSUER: staging.accessIssuer
    };
  }

  return config;
};

export const writePreviewConfig = async ({
  databaseId,
  hostname,
  accessAud,
  accessIssuer,
  sourcePath = 'wrangler.crm.jsonc',
  outputPath = 'wrangler.crm.preview.generated.jsonc'
}) => {
  const sourceConfig = JSON.parse(await readFile(sourcePath, 'utf8'));
  const previewConfig = buildPreviewConfig(sourceConfig, databaseId, {
    hostname,
    accessAud,
    accessIssuer
  });
  await writeFile(outputPath, `${JSON.stringify(previewConfig, null, 2)}\n`, { mode: 0o600 });
  return outputPath;
};

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  const databaseId = process.argv[2] || '';
  writePreviewConfig({
    databaseId,
    hostname: process.env.CRM_STAGING_HOSTNAME,
    accessAud: process.env.CRM_ACCESS_AUD,
    accessIssuer: process.env.CRM_ACCESS_ISSUER
  })
    .then((outputPath) => console.log(`Generated ${outputPath}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
