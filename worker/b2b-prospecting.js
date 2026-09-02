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

const enforceSameOrigin = (request) => {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (origin && origin !== url.origin) throw new RequestValidationError('Cross-origin request ditolak.', { status: 403, code: 'CROSS_ORIGIN_BLOCKED' });
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    throw new RequestValidationError('Cross-site request ditolak.', { status: 403, code: 'CROSS_SITE_BLOCKED' });
  }
};

const enforceRateLimit = async (request, env) => {
  if (!env.B2B_RATE_LIMITER?.limit) return;
  const url = new URL(request.url);
  const actor = request.headers.get('cf-connecting-ip') || 'anonymous';
  const { success } = await env.B2B_RATE_LIMITER.limit({ key: `${actor}:${url.pathname}` });
  if (!success) throw new RequestValidationError('Terlalu banyak permintaan. Coba lagi dalam satu menit.', { status: 429, code: 'RATE_LIMITED' });
};

const health = (env) => jsonResponse({
  status: 'ready',
  configured: Boolean(env.GEMINI_API_KEY),
  provider: 'gemini',
  schemaVersion: 1
});

export const handleB2BRequest = async (request, env) => {
  const url = new URL(request.url);
  try {
    enforceSameOrigin(request);

    if (url.pathname === '/api/tools/b2b/health') {
      if (request.method !== 'GET') throw new RequestValidationError('Method tidak diizinkan.', { status: 405, code: 'METHOD_NOT_ALLOWED' });
      return health(env);
    }

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
