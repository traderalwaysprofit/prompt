import { handleB2BRequest } from './b2b-prospecting.js';
import { handleSystemToolsRequest } from './system-tools.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/tools/b2b/')) return handleB2BRequest(request, env);
    if (url.pathname.startsWith('/api/core/tools')) return handleSystemToolsRequest(request, env);
    if (env.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response('Not Found', { status: 404 });
  }
};
