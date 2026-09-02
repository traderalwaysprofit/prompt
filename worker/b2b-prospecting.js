import { AIProviderError, enrichWithGemini, searchWithGemini } from './ai-provider.js';
import {
  RequestValidationError,
  errorResponse,
  jsonResponse,
  readJsonBody,
  requirePost,
  validateEnrichInput,
  validateSearchInput
} from './validation.js';

const FALLBACK_RATE_LIMIT = 20;
const FALLBACK_RATE_WINDOW_MS = 60_000;
const fallbackRateBuckets = new Map();

const enforceSameOrigin = (request) => {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (origin && origin !== url.origin) throw new RequestValidationError('Cross-origin request ditolak.', { status: 403, code: 'CROSS_ORIGIN_BLOCKED' });
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) {
    throw new RequestValidationError('Cross-site request ditolak.', { status: 403, code: 'CROSS_SITE_BLOCKED' });
  }
};

const enforceFallbackRateLimit = (key) => {
  const now = Date.now();
  const bucket = fallbackRateBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    fallbackRateBuckets.set(key, { count: 1, resetAt: now + FALLBACK_RATE_WINDOW_MS });
    return;
  }

  bucket.count += 1;
  if (bucket.count > FALLBACK_RATE_LIMIT) {
    throw new RequestValidationError('Terlalu banyak permintaan. Coba lagi dalam satu menit.', { status: 429, code: 'RATE_LIMITED' });
  }

  if (fallbackRateBuckets.size > 500) {
    for (const [bucketKey, value] of fallbackRateBuckets) {
      if (now >= value.resetAt) fallbackRateBuckets.delete(bucketKey);
      if (fallbackRateBuckets.size <= 400) break;
    }
  }
};

const enforceRateLimit = async (request, env) => {
  const url = new URL(request.url);
  const actor = request.headers.get('cf-connecting-ip') || 'anonymous';
  const key = `${actor}:${url.pathname}`;

  if (env.B2B_RATE_LIMITER?.limit) {
    const { success } = await env.B2B_RATE_LIMITER.limit({ key });
    if (!success) throw new RequestValidationError('Terlalu banyak permintaan. Coba lagi dalam satu menit.', { status: 429, code: 'RATE_LIMITED' });
    return;
  }

  enforceFallbackRateLimit(key);
};

const health = (env) => jsonResponse({
  status: 'ready',
  configured: Boolean(env.GEMINI_API_KEY),
  provider: 'gemini',
  rateLimit: env.B2B_RATE_LIMITER?.limit ? 'cloudflare-binding' : 'worker-fallback',
  schemaVersion: 1
});

export const handleB2BRequest = async (request, env) => {
  const url = new URL(request.url);
  try {
    // Health is read-only and intentionally public so it can be opened directly
    // from Cloudflare/GitHub preview links or a browser address bar.
    if (url.pathname === '/api/tools/b2b/health') {
      if (request.method !== 'GET') throw new RequestValidationError('Method tidak diizinkan.', { status: 405, code: 'METHOD_NOT_ALLOWED' });
      return health(env);
    }

    // Credential-consuming AI endpoints remain protected against cross-site calls.
    enforceSameOrigin(request);
    await enforceRateLimit(request, env);

    if (url.pathname === '/api/tools/b2b/search') {
      requirePost(request);
      const input = validateSearchInput(await readJsonBody(request, { maxBytes: 16 * 1024 }));
      const result = await searchWithGemini(input, env);
      return jsonResponse({ schemaVersion: 1, requestId: crypto.randomUUID(), ...result });
    }

    if (url.pathname === '/api/tools/b2b/enrich') {
      requirePost(request);
      const input = validateEnrichInput(await readJsonBody(request, { maxBytes: 32 * 1024 }));
      const result = await enrichWithGemini(input, env);
      return jsonResponse({ schemaVersion: 1, requestId: crypto.randomUUID(), ...result });
    }

    throw new RequestValidationError('API route tidak ditemukan.', { status: 404, code: 'NOT_FOUND' });
  } catch (error) {
    if (!(error instanceof RequestValidationError) && !(error instanceof AIProviderError)) console.error('B2B API error', error);
    return errorResponse(error);
  }
};
