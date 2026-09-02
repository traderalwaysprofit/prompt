export class B2BApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR' } = {}) {
    super(message);
    this.name = 'B2BApiError';
    this.status = status;
    this.code = code;
  }
}

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    throw new B2BApiError('Respons server tidak valid.', { status: response.status, code: 'INVALID_RESPONSE' });
  }
};

const requestJson = async (path, { method = 'GET', body, timeout = 25000, signal } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeout);
  const abortFromParent = () => controller.abort(signal?.reason || 'cancelled');
  if (signal) {
    if (signal.aborted) abortFromParent();
    else signal.addEventListener('abort', abortFromParent, { once: true });
  }

  try {
    const response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'Accept': 'application/json' } : { 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new B2BApiError(data?.error?.message || 'Permintaan gagal diproses.', {
        status: response.status,
        code: data?.error?.code || `HTTP_${response.status}`
      });
    }
    return data;
  } catch (error) {
    if (error instanceof B2BApiError) throw error;
    if (controller.signal.aborted) {
      throw new B2BApiError('Permintaan AI terlalu lama atau dibatalkan. Coba lagi.', { code: 'TIMEOUT' });
    }
    throw new B2BApiError('Tidak dapat terhubung ke layanan AI.', { code: 'NETWORK_ERROR' });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', abortFromParent);
  }
};

export const checkB2BHealth = ({ signal } = {}) => requestJson('/api/tools/b2b/health', { timeout: 8000, signal });

export const searchProspects = (input, { signal } = {}) => requestJson('/api/tools/b2b/search', {
  method: 'POST',
  body: input,
  timeout: 30000,
  signal
});

export const enrichProspects = (input, { signal } = {}) => requestJson('/api/tools/b2b/enrich', {
  method: 'POST',
  body: input,
  timeout: 30000,
  signal
});
