const CATEGORY_LABELS = Object.freeze({
  'aesthetic-clinic': 'Klinik Kecantikan (Aesthetic Clinic)',
  'salon-spa': 'Salon & Spa skala menengah-atas',
  'cosmetics-distributor': 'Distributor atau agen kosmetik',
  'skincare-brand': 'Brand skincare lokal'
});

export class RequestValidationError extends Error {
  constructor(message, { status = 400, code = 'INVALID_REQUEST' } = {}) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = status;
    this.code = code;
  }
}

export const jsonResponse = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  }
});

export const errorResponse = (error) => {
  const status = Number(error?.status) || 500;
  const safeStatus = status >= 400 && status <= 599 ? status : 500;
  return jsonResponse({
    error: {
      code: error?.code || (safeStatus === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      message: safeStatus === 500 ? 'Layanan gagal memproses permintaan.' : String(error?.message || 'Permintaan tidak valid.')
    }
  }, safeStatus);
};

const clean = (value, max) => String(value ?? '')
  .replace(/[\u0000-\u001f\u007f]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

export const readJsonBody = async (request, { maxBytes = 64 * 1024 } = {}) => {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) {
    throw new RequestValidationError('Content-Type harus application/json.', { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' });
  }
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new RequestValidationError('Payload terlalu besar.', { status: 413, code: 'PAYLOAD_TOO_LARGE' });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new RequestValidationError('Payload terlalu besar.', { status: 413, code: 'PAYLOAD_TOO_LARGE' });
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new RequestValidationError('JSON tidak valid.', { code: 'INVALID_JSON' });
  }
};

export const validateSearchInput = (input) => {
  const category = clean(input?.category, 80);
  const region = clean(input?.region, 80);
  const limit = Number(input?.limit);
  if (!CATEGORY_LABELS[category]) throw new RequestValidationError('Kategori prospect tidak didukung.', { code: 'INVALID_CATEGORY' });
  if (!/^[\p{L}\p{N} .,'()/-]{2,80}$/u.test(region)) throw new RequestValidationError('Wilayah tidak valid.', { code: 'INVALID_REGION' });
  if (![5, 10].includes(limit)) throw new RequestValidationError('Jumlah prospect harus 5 atau 10.', { code: 'INVALID_LIMIT' });
  return { category, categoryLabel: CATEGORY_LABELS[category], region, limit };
};

export const validateEnrichInput = (input) => {
  const mode = clean(input?.mode, 32).toLowerCase();
  const raw = String(input?.input ?? '').replace(/\u0000/g, '').trim();
  if (mode !== 'bpom') throw new RequestValidationError('Mode enrichment tidak didukung.', { code: 'INVALID_MODE' });
  if (raw.length < 3) throw new RequestValidationError('Data enrichment terlalu pendek.', { code: 'INPUT_REQUIRED' });
  if (raw.length > 12000) throw new RequestValidationError('Data enrichment terlalu panjang.', { status: 413, code: 'INPUT_TOO_LARGE' });
  return { mode, input: raw };
};

export const requirePost = (request) => {
  if (request.method !== 'POST') throw new RequestValidationError('Method tidak diizinkan.', { status: 405, code: 'METHOD_NOT_ALLOWED' });
};
