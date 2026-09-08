import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DATABASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREVIEW_DATABASE_NAME = 'masumi-crm-preview';

export const buildPreviewConfig = (sourceConfig, databaseId) => {
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

  return config;
};

export const writePreviewConfig = async ({
  databaseId,
  sourcePath = 'wrangler.crm.jsonc',
  outputPath = 'wrangler.crm.preview.generated.jsonc'
}) => {
  const sourceConfig = JSON.parse(await readFile(sourcePath, 'utf8'));
  const previewConfig = buildPreviewConfig(sourceConfig, databaseId);
  await writeFile(outputPath, `${JSON.stringify(previewConfig, null, 2)}\n`, { mode: 0o600 });
  return outputPath;
};

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  const databaseId = process.argv[2] || '';
  writePreviewConfig({ databaseId })
    .then((outputPath) => console.log(`Generated ${outputPath}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
