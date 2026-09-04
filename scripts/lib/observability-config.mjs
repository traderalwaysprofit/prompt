import fs from 'node:fs/promises';
import path from 'node:path';
import { sanitizeProspectUrl } from '../../worker/url-sanitizer.js';

const ALLOWED_TYPES = new Set(['REDIRECTOR', 'VPS_DASHBOARD', 'API']);
const MAX_TARGETS = 20;

function validatePublicHttpsUrl(rawValue, label) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  let parsed;
  try {
    parsed = new URL(rawValue.trim());
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${label} must use HTTPS.`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${label} must not contain URL credentials.`);
  }
  if (parsed.hash) {
    throw new Error(`${label} must not contain a URL fragment.`);
  }

  const sanitized = sanitizeProspectUrl(parsed.toString());
  if (!sanitized.isValid || !sanitized.sanitizedUrl) {
    throw new Error(`${label} rejected by public-target policy: ${sanitized.error || 'invalid target'}.`);
  }

  const normalized = new URL(sanitized.sanitizedUrl);
  if (normalized.protocol !== 'https:') {
    throw new Error(`${label} must remain HTTPS after normalization.`);
  }

  return normalized.toString();
}

export function validateObservabilityTargets(rawTargets) {
  if (!Array.isArray(rawTargets)) {
    throw new Error('Observability target config must be a JSON array.');
  }
  if (rawTargets.length < 1) {
    throw new Error('Observability target config must contain at least one target.');
  }
  if (rawTargets.length > MAX_TARGETS) {
    throw new Error(`Observability target config may contain at most ${MAX_TARGETS} targets.`);
  }

  const names = new Set();
  const urls = new Set();

  return rawTargets.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Target #${index + 1} must be an object.`);
    }

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name || name.length > 120) {
      throw new Error(`Target #${index + 1} name must be 1-120 characters.`);
    }
    if (names.has(name.toLowerCase())) {
      throw new Error(`Duplicate observability target name: ${name}`);
    }
    names.add(name.toLowerCase());

    if (!ALLOWED_TYPES.has(item.type)) {
      throw new Error(`Target ${name} has unsupported type: ${String(item.type)}.`);
    }

    const url = validatePublicHttpsUrl(item.url, `${name} url`);
    if (urls.has(url)) {
      throw new Error(`Duplicate observability target URL: ${url}`);
    }
    urls.add(url);

    const normalized = {
      name,
      url,
      type: item.type,
    };

    if (item.fallbackUrl !== undefined) {
      const fallbackUrl = validatePublicHttpsUrl(item.fallbackUrl, `${name} fallbackUrl`);
      if (fallbackUrl === url) {
        throw new Error(`Target ${name} fallbackUrl must differ from the primary URL.`);
      }
      normalized.fallbackUrl = fallbackUrl;
    }

    return normalized;
  });
}

export async function loadObservabilityTargets(configPath = 'config/observability-targets.production.json') {
  const absolutePath = path.resolve(process.cwd(), configPath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Observability config is not valid JSON: ${configPath}`);
  }
  return validateObservabilityTargets(parsed);
}
