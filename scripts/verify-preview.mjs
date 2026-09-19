const previewUrl = process.env.PREVIEW_URL;
const expectedSha = process.env.EXPECTED_SHA;
const attempts = Number.parseInt(process.env.PREVIEW_RETRY_ATTEMPTS || '30', 10);
const delayMs = Number.parseInt(process.env.PREVIEW_RETRY_DELAY_MS || '5000', 10);

if (!previewUrl) throw new Error('PREVIEW_URL is required');
if (!expectedSha) throw new Error('EXPECTED_SHA is required');
if (!Number.isInteger(attempts) || attempts < 1 || attempts > 60) {
  throw new Error('PREVIEW_RETRY_ATTEMPTS must be an integer between 1 and 60');
}
if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 30000) {
  throw new Error('PREVIEW_RETRY_DELAY_MS must be an integer between 0 and 30000');
}

const baseUrl = new URL(previewUrl.endsWith('/') ? previewUrl : `${previewUrl}/`);
const cacheBust = encodeURIComponent(`${expectedSha}-${process.env.GITHUB_RUN_ATTEMPT || 'local'}`);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function describeError(error) {
  const cause = error?.cause;
  if (!cause) return error?.message || String(error);
  const causeDetails = [cause.code, cause.message].filter(Boolean).join(': ');
  return `${error?.message || String(error)}${causeDetails ? ` (${causeDetails})` : ''}`;
}

async function fetchText(pathname) {
  const url = new URL(pathname, baseUrl);
  url.searchParams.set('verify', cacheBust);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'user-agent': 'samson-preview-verification/1.0'
    },
    signal: AbortSignal.timeout(20000)
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${pathname} returned HTTP ${response.status} at ${response.url}: ${body.slice(0, 300)}`);
  }
  return { body, finalUrl: response.url, status: response.status };
}

async function verifyPreview() {
  const versionResponse = await fetchText('/version.json');
  let version;
  try {
    version = JSON.parse(versionResponse.body);
  } catch {
    throw new Error(`version.json is not valid JSON: ${versionResponse.body.slice(0, 300)}`);
  }

  if (version.commit !== expectedSha) {
    throw new Error(`version SHA mismatch: expected ${expectedSha}, received ${version.commit || 'missing'}`);
  }

  const rootResponse = await fetchText('/');
  if (!rootResponse.body.includes('id="root"') || !rootResponse.body.includes('/src/main.js')) {
    throw new Error('root application markers are missing');
  }

  const gameResponse = await fetchText('/src/games/meja-it/');
  if (!gameResponse.body.includes('PIXEL OFFICE')) {
    throw new Error('MEJA-IT preview marker is missing');
  }

  return {
    versionUrl: versionResponse.finalUrl,
    rootUrl: rootResponse.finalUrl,
    gameUrl: gameResponse.finalUrl
  };
}

let lastError;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const result = await verifyPreview();
    console.log(`PREVIEW VERIFICATION: PASS (${attempt}/${attempts})`);
    console.log(`Revision: ${expectedSha}`);
    console.log(`Version URL: ${result.versionUrl}`);
    console.log(`Root URL: ${result.rootUrl}`);
    console.log(`MEJA-IT URL: ${result.gameUrl}`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`Preview pending (${attempt}/${attempts}): ${describeError(error)}`);
    if (attempt < attempts && delayMs > 0) await sleep(delayMs);
  }
}

throw new Error(`PREVIEW VERIFICATION: FAIL — ${describeError(lastError || new Error('unknown error'))}`);
