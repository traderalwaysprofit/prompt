import { sanitizeProspectUrl } from './url-sanitizer.js';

const SERPER_BASE = 'https://google.serper.dev';

export class SearchProviderError extends Error {
  constructor(message, { status = 502, code = 'SEARCH_PROVIDER_ERROR' } = {}) {
    super(message);
    this.name = 'SearchProviderError';
    this.status = status;
    this.code = code;
  }
}

const validHttpsUrl = (value) => {
  const sanitized = sanitizeProspectUrl(value);
  if (!sanitized.isValid || !sanitized.sanitizedUrl) return '';
  try {
    const parsed = new URL(sanitized.sanitizedUrl);
    return parsed.protocol === 'https:' ? sanitized.sanitizedUrl : '';
  } catch {
    return '';
  }
};

const readError = async (response) => {
  const text = await response.text().catch(() => '');
  let payload = null;
  try { payload = JSON.parse(text); } catch { /* non-JSON upstream response */ }
  return { text, message: payload?.message || payload?.error || '' };
};

const throwSearchError = async (response) => {
  const details = await readError(response);
  const combined = `${details.message} ${details.text}`.toLowerCase();
  if (response.status === 401 || response.status === 403) {
    throw new SearchProviderError('SERPER_API_KEY ditolak. Periksa secret Serper di Cloudflare.', { status: 401, code: 'SEARCH_AUTH_FAILED' });
  }
  if (response.status === 429 || combined.includes('credit') || combined.includes('quota')) {
    throw new SearchProviderError('Kuota/credit Serper tidak tersedia atau sudah habis.', { status: 429, code: 'SEARCH_QUOTA_EXHAUSTED' });
  }
  if (response.status >= 500) {
    throw new SearchProviderError('Layanan pencarian Serper sedang bermasalah.', { status: 502, code: 'SEARCH_UPSTREAM_UNAVAILABLE' });
  }
  throw new SearchProviderError('Serper menolak permintaan pencarian.', { status: 502, code: 'SEARCH_INVALID_REQUEST' });
};

const postSerper = async (endpoint, body, env) => {
  if (!env.SERPER_API_KEY) {
    throw new SearchProviderError('Search provider belum dikonfigurasi.', { status: 503, code: 'SEARCH_NOT_CONFIGURED' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), 12000);
  let response;
  try {
    response = await fetch(`${SERPER_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': env.SERPER_API_KEY
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch {
    if (controller.signal.aborted) {
      throw new SearchProviderError('Search provider timeout.', { status: 504, code: 'SEARCH_TIMEOUT' });
    }
    throw new SearchProviderError('Tidak dapat terhubung ke search provider.', { status: 502, code: 'SEARCH_NETWORK_ERROR' });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) await throwSearchError(response);
  return response.json();
};

const mapsUrlForCid = (cid) => {
  const value = String(cid || '').replace(/\D/g, '');
  return value ? `https://www.google.com/maps?cid=${value}` : '';
};

const candidateSources = (place) => {
  const sources = [];
  const website = validHttpsUrl(place?.website);
  if (website) sources.push({ type: 'official', label: 'Website', url: website, confidence: null });
  const mapsUrl = mapsUrlForCid(place?.cid);
  if (mapsUrl) sources.push({ type: 'serper-place', label: 'Google Maps', url: mapsUrl, confidence: null });
  return sources;
};

const placeConfidence = (place) => {
  let score = 0.45;
  if (place?.address) score += 0.1;
  if (place?.phoneNumber) score += 0.12;
  if (place?.website) score += 0.12;
  if (place?.ratingCount) score += 0.08;
  if (place?.cid) score += 0.08;
  return Math.min(0.95, Number(score.toFixed(2)));
};

export const searchLocalBusinesses = async ({ categoryLabel, category, region, limit }, env) => {
  const data = await postSerper('places', {
    q: `${categoryLabel} ${region}`,
    gl: 'id',
    hl: 'id',
    num: limit
  }, env);

  const places = Array.isArray(data?.places) ? data.places.slice(0, limit) : [];
  const candidates = places.map((place) => ({
    brand: String(place?.title || '').slice(0, 160),
    company: '',
    category,
    region,
    address: String(place?.address || '').slice(0, 300),
    website: validHttpsUrl(place?.website),
    instagram: '',
    phone: String(place?.phoneNumber || '').slice(0, 64),
    confidence: placeConfidence(place),
    sources: candidateSources(place),
    evidence: {
      type: String(place?.type || place?.category || '').slice(0, 120),
      rating: Number.isFinite(Number(place?.rating)) ? Number(place.rating) : null,
      ratingCount: Number.isFinite(Number(place?.ratingCount)) ? Number(place.ratingCount) : null,
      latitude: Number.isFinite(Number(place?.latitude)) ? Number(place.latitude) : null,
      longitude: Number.isFinite(Number(place?.longitude)) ? Number(place.longitude) : null
    }
  }));

  return {
    provider: 'serper',
    query: `${categoryLabel} ${region}`,
    candidates
  };
};

export const searchEnrichmentEvidence = async ({ input }, env) => {
  const lines = String(input || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  const queries = lines.length ? lines : [String(input || '').slice(0, 500)];
  const results = [];

  for (const line of queries) {
    const data = await postSerper('search', {
      q: `${line} official website Instagram WhatsApp Indonesia`,
      gl: 'id',
      hl: 'id',
      num: 6
    }, env);
    for (const item of Array.isArray(data?.organic) ? data.organic.slice(0, 6) : []) {
      const url = validHttpsUrl(item?.link);
      if (!url) continue;
      results.push({
        title: String(item?.title || '').slice(0, 180),
        snippet: String(item?.snippet || '').slice(0, 700),
        url
      });
    }
  }

  const unique = new Map();
  for (const item of results) if (!unique.has(item.url)) unique.set(item.url, item);
  return { provider: 'serper', results: [...unique.values()].slice(0, 18) };
};

export const getSerperHealth = (env) => ({
  provider: 'serper',
  configured: Boolean(env.SERPER_API_KEY),
  secretPresent: Boolean(env.SERPER_API_KEY)
});
