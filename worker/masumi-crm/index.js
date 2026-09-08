const API_PREFIX = '/api/crm/v1';

const apiHeaders = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
});

const jsonResponse = (payload, status = 200, extraHeaders = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...apiHeaders, ...extraHeaders }
});

const environmentLabel = (value) => ['local', 'preview', 'production'].includes(value) ? value : 'unknown';

const handleHealth = (request, env) => {
  if (request.method !== 'GET') {
    return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET' });
  }

  return jsonResponse({
    success: true,
    service: 'masumi-crm',
    status: 'foundation-ready',
    schemaVersion: 1,
    environment: environmentLabel(env.CRM_ENVIRONMENT),
    databaseConfigured: Boolean(env.CRM_DB),
    accessConfigured: Boolean(env.CRM_ACCESS_AUD)
  });
};

export const handleMasumiCrmRequest = async (request, env = {}) => {
  const url = new URL(request.url);

  if (url.pathname === `${API_PREFIX}/health`) return handleHealth(request, env);

  if (url.pathname.startsWith(API_PREFIX)) {
    return jsonResponse({
      success: false,
      code: 'CLOUD_FOUNDATION_ONLY',
      message: 'Endpoint data belum diaktifkan pada tahap fondasi.'
    }, 503);
  }

  if (env.CRM_ASSETS?.fetch) return env.CRM_ASSETS.fetch(request);
  return new Response('Not Found', { status: 404 });
};

export default {
  fetch(request, env) {
    return handleMasumiCrmRequest(request, env);
  }
};
