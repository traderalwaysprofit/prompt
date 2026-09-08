export class CrmApiError extends Error {
  constructor(code, status, message, headers = {}) {
    super(message);
    this.name = 'CrmApiError';
    this.code = code;
    this.status = status;
    this.headers = headers;
  }
}

export const methodNotAllowed = (allow) => new CrmApiError(
  'METHOD_NOT_ALLOWED',
  405,
  'Metode request tidak didukung.',
  { Allow: allow }
);
