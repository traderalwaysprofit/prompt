const API_BASE = '/api/crm/v1';

export class CrmApiClientError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', requestId = '' } = {}) {
    super(message);
    this.name = 'CrmApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const readPayload = async (response) => {
  try {
    return await response.json();
  } catch {
    throw new CrmApiClientError('Server mengirim respons yang tidak dapat dibaca.', {
      status: response.status,
      code: 'INVALID_RESPONSE',
      requestId: response.headers.get('x-request-id') || ''
    });
  }
};

const requestId = () => crypto.randomUUID();

export const createCrmClient = ({ fetchImpl = fetch } = {}) => {
  const request = async (path, options = {}) => {
    let response;
    try {
      response = await fetchImpl(`${API_BASE}${path}`, {
        credentials: 'same-origin',
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {})
        }
      });
    } catch {
      throw new CrmApiClientError('CRM tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.');
    }

    const payload = await readPayload(response);
    if (!response.ok || payload?.success !== true) {
      throw new CrmApiClientError(payload?.message || 'Permintaan CRM gagal.', {
        status: response.status,
        code: payload?.code || 'REQUEST_FAILED',
        requestId: response.headers.get('x-request-id') || ''
      });
    }
    return payload;
  };

  const mutation = (method, path, body, headers = {}) => request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId(),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return Object.freeze({
    session: () => request('/session').then(({ data }) => data),
    users: () => request('/users').then(({ data }) => data),
    listLeads: (filters = {}) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
      }
      const suffix = query.size ? `?${query}` : '';
      return request(`/leads${suffix}`).then(({ data, meta }) => ({ leads: data, meta }));
    },
    getLead: (id) => request(`/leads/${encodeURIComponent(id)}`).then(({ data }) => data),
    createLead: (lead) => mutation('POST', '/leads', lead).then(({ data }) => data),
    updateLead: (id, lead) => mutation('PUT', `/leads/${encodeURIComponent(id)}`, lead).then(({ data }) => data),
    deleteLead: (id, version) => mutation(
      'DELETE',
      `/leads/${encodeURIComponent(id)}`,
      undefined,
      { 'If-Match': String(version) }
    ).then(({ data }) => data)
  });
};
