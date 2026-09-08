import { authenticateAppUser } from './auth.js';
import { CrmApiError, methodNotAllowed } from './errors.js';
import { routeImportApi } from './import-api.js';
import { routeLeadApi } from './lead-api.js';
import { routeReportingApi } from './reporting-api.js';
import { listAssignableUsers } from './user-api.js';

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
    status: 'api-ready',
    schemaVersion: 1,
    environment: environmentLabel(env.CRM_ENVIRONMENT),
    databaseConfigured: Boolean(env.CRM_DB),
    accessConfigured: Boolean(env.CRM_ACCESS_AUD && env.CRM_ACCESS_ISSUER)
  });
};

const apiResponse = (result) => jsonResponse({
  success: true,
  data: result.data,
  ...(result.meta ? { meta: result.meta } : {})
}, result.status, result.requestId ? { 'X-Request-ID': result.requestId } : {});

const finalizeResponse = (result) => result instanceof Response ? result : apiResponse(result);

const errorResponse = (error) => {
  if (error instanceof CrmApiError) {
    return jsonResponse({ success: false, code: error.code, message: error.message }, error.status, error.headers);
  }
  return jsonResponse({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Terjadi kesalahan internal.'
  }, 500);
};

const handleSession = (request, user) => {
  if (request.method !== 'GET') throw methodNotAllowed('GET');
  return {
    status: 200,
    data: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    }
  };
};

export const handleMasumiCrmRequest = async (request, env = {}, dependencies = {}) => {
  const url = new URL(request.url);

  if (url.pathname === `${API_PREFIX}/health`) return handleHealth(request, env);

  if (url.pathname.startsWith(API_PREFIX)) {
    try {
      const user = await authenticateAppUser(request, env, dependencies);
      if (url.pathname === `${API_PREFIX}/session`) return apiResponse(handleSession(request, user));
      if (url.pathname === `${API_PREFIX}/users`) {
        return apiResponse(await listAssignableUsers(request, user, env.CRM_DB));
      }
      const reportingResult = await routeReportingApi(request, url, user, env, dependencies);
      if (reportingResult) return finalizeResponse(reportingResult);
      const importResult = await routeImportApi(request, url, user, env, dependencies);
      if (importResult) return finalizeResponse(importResult);
      if (url.pathname === `${API_PREFIX}/leads` || url.pathname.startsWith(`${API_PREFIX}/leads/`)) {
        return apiResponse(await routeLeadApi(request, url, user, env, dependencies));
      }
      throw new CrmApiError('API_NOT_FOUND', 404, 'Endpoint API tidak ditemukan.');
    } catch (error) {
      return errorResponse(error);
    }
  }

  if (env.CRM_ASSETS?.fetch) return env.CRM_ASSETS.fetch(request);
  return new Response('Not Found', { status: 404 });
};

export default {
  fetch(request, env) {
    return handleMasumiCrmRequest(request, env);
  }
};
