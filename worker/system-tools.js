import { runAutonomousTask } from '../src/core/agent.ts';
import { SYSTEM_TOOL_DEFINITIONS } from '../src/core/tools/schema.ts';
import { toGeminiFunctionDeclarations, toOpenAITools } from '../src/core/tools/providers.ts';

const MAX_EXECUTION_BODY_BYTES = 32 * 1024;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function getBearerToken(request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim();
}

function catalogResponse(provider) {
  if (provider === 'openai') {
    return {
      provider: 'openai',
      tools: toOpenAITools(),
    };
  }

  if (provider === 'gemini') {
    return {
      provider: 'gemini',
      tools: [{ functionDeclarations: toGeminiFunctionDeclarations() }],
    };
  }

  return {
    provider: 'internal',
    tools: SYSTEM_TOOL_DEFINITIONS,
  };
}

export async function handleSystemToolsRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/core/tools' && request.method === 'GET') {
    const provider = url.searchParams.get('provider') || 'internal';
    if (!['internal', 'openai', 'gemini'].includes(provider)) {
      return jsonResponse({ error: 'Provider tool schema tidak didukung.' }, 400);
    }
    return jsonResponse(catalogResponse(provider));
  }

  if (url.pathname === '/api/core/tools/execute' && request.method === 'POST') {
    if (!env.TOOL_EXECUTION_TOKEN) {
      return jsonResponse({ error: 'System tool execution belum diaktifkan.' }, 503);
    }

    const token = getBearerToken(request);
    if (!token || token !== env.TOOL_EXECUTION_TOKEN) {
      return jsonResponse({ error: 'Unauthorized.' }, 401);
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_EXECUTION_BODY_BYTES) {
      return jsonResponse({ error: 'Payload terlalu besar.' }, 413);
    }

    let body;
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_EXECUTION_BODY_BYTES) {
        return jsonResponse({ error: 'Payload terlalu besar.' }, 413);
      }
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Payload JSON tidak valid.' }, 400);
    }

    if (!body || typeof body !== 'object' || typeof body.tool !== 'string') {
      return jsonResponse({ error: 'Field tool wajib berupa string.' }, 400);
    }

    const result = await runAutonomousTask({
      tool: body.tool,
      payload: body.payload,
    });

    const status = result.status === 'SUCCESS' ? 200 : result.status === 'EXECUTION_ERROR' ? 502 : 400;
    return jsonResponse(result, status);
  }

  if (url.pathname.startsWith('/api/core/tools')) {
    return jsonResponse({ error: 'Method atau route tidak didukung.' }, 405);
  }

  return jsonResponse({ error: 'Not Found.' }, 404);
}
