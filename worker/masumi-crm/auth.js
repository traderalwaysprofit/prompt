import { CrmApiError } from './errors.js';

const ACCESS_TOKEN_HEADER = 'Cf-Access-Jwt-Assertion';
const ACCESS_CERTS_PATH = '/cdn-cgi/access/certs';
const ACCESS_KEY_CACHE_MS = 5 * 60 * 1000;
const CLOCK_TOLERANCE_SECONDS = 30;
const MAX_CERT_RESPONSE_BYTES = 256 * 1024;
const MAX_CERT_KEYS = 20;
const MAX_ACCESS_TOKEN_LENGTH = 16 * 1024;
const keyCache = new Map();

const authenticationRequired = () => new CrmApiError(
  'AUTHENTICATION_REQUIRED',
  401,
  'Sesi tidak valid atau sudah berakhir.'
);

const serviceNotConfigured = () => new CrmApiError(
  'SERVICE_NOT_CONFIGURED',
  503,
  'Layanan CRM belum dikonfigurasi.'
);

const decodeBase64Url = (value) => {
  if (typeof value !== 'string' || !value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw authenticationRequired();
  }

  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw authenticationRequired();
  }
};

const parseJsonSegment = (value) => {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JWT segment');
    return parsed;
  } catch (error) {
    if (error instanceof CrmApiError) throw error;
    throw authenticationRequired();
  }
};

const normalizeIssuer = (value) => {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.cloudflareaccess.com') ||
      (url.pathname !== '/' && url.pathname !== '') ||
      url.search ||
      url.hash
    ) {
      throw new Error('Invalid issuer');
    }
    return url.origin;
  } catch {
    throw serviceNotConfigured();
  }
};

const currentTimeMs = (now) => {
  const value = typeof now === 'function' ? now() : new Date();
  const timestamp = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
};

const fetchAccessKeys = async ({ issuer, fetcher, now }) => {
  const nowMs = currentTimeMs(now);
  const cached = keyCache.get(issuer);
  if (cached && cached.expiresAt > nowMs) return cached.keys;

  let response;
  try {
    response = await fetcher(`${issuer}${ACCESS_CERTS_PATH}`, {
      headers: { Accept: 'application/json' }
    });
  } catch {
    throw authenticationRequired();
  }

  if (!response?.ok) throw authenticationRequired();
  const contentLength = Number(response.headers?.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_CERT_RESPONSE_BYTES) {
    throw authenticationRequired();
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_CERT_RESPONSE_BYTES) {
    throw authenticationRequired();
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw authenticationRequired();
  }

  if (!Array.isArray(payload?.keys) || payload.keys.length < 1 || payload.keys.length > MAX_CERT_KEYS) {
    throw authenticationRequired();
  }

  const keys = payload.keys.filter((key) => (
    key &&
    typeof key === 'object' &&
    key.kty === 'RSA' &&
    typeof key.kid === 'string' &&
    key.kid
  ));
  if (!keys.length) throw authenticationRequired();

  keyCache.set(issuer, { expiresAt: nowMs + ACCESS_KEY_CACHE_MS, keys });
  return keys;
};

const audienceMatches = (claim, expected) => (
  claim === expected || (Array.isArray(claim) && claim.includes(expected))
);

export const verifyCloudflareAccessJwt = async (token, options = {}) => {
  const audience = typeof options.audience === 'string' ? options.audience.trim() : '';
  if (!audience) throw serviceNotConfigured();
  const issuer = normalizeIssuer(options.issuer);
  if (typeof token !== 'string' || token.length > MAX_ACCESS_TOKEN_LENGTH) throw authenticationRequired();
  const segments = token.split('.');
  if (segments.length !== 3) throw authenticationRequired();

  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  const header = parseJsonSegment(encodedHeader);
  const payload = parseJsonSegment(encodedPayload);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid || header.kid.length > 160) {
    throw authenticationRequired();
  }

  const fetcher = options.fetcher || globalThis.fetch;
  if (typeof fetcher !== 'function') throw serviceNotConfigured();
  const keys = await fetchAccessKeys({ issuer, fetcher, now: options.now });
  const jwk = keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw authenticationRequired();

  let verified = false;
  try {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );
  } catch (error) {
    if (error instanceof CrmApiError) throw error;
    throw authenticationRequired();
  }
  if (!verified) throw authenticationRequired();

  const nowSeconds = Math.floor(currentTimeMs(options.now) / 1000);
  if (
    payload.iss !== issuer ||
    !audienceMatches(payload.aud, audience) ||
    !Number.isFinite(payload.exp) ||
    payload.exp <= nowSeconds - CLOCK_TOLERANCE_SECONDS ||
    (Number.isFinite(payload.nbf) && payload.nbf > nowSeconds + CLOCK_TOLERANCE_SECONDS)
  ) {
    throw authenticationRequired();
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || email.length > 320 || !email.includes('@')) throw authenticationRequired();

  return {
    email,
    subject: typeof payload.sub === 'string' ? payload.sub.slice(0, 160) : ''
  };
};

const resolveVerifiedIdentity = async (request, env, dependencies) => {
  if (typeof dependencies.resolveIdentity === 'function') {
    return dependencies.resolveIdentity(request, env);
  }

  const token = request.headers.get(ACCESS_TOKEN_HEADER);
  if (!token) throw authenticationRequired();
  return verifyCloudflareAccessJwt(token, {
    issuer: env.CRM_ACCESS_ISSUER,
    audience: env.CRM_ACCESS_AUD,
    fetcher: dependencies.fetcher,
    now: dependencies.now
  });
};

export const authenticateAppUser = async (request, env, dependencies = {}) => {
  if (!env.CRM_DB?.prepare) throw serviceNotConfigured();
  const identity = await resolveVerifiedIdentity(request, env, dependencies);
  const email = typeof identity?.email === 'string' ? identity.email.trim().toLowerCase() : '';
  if (!email || email.length > 320 || !email.includes('@')) throw authenticationRequired();

  const user = await env.CRM_DB.prepare(`
    SELECT id, email, display_name, role, active
    FROM app_users
    WHERE email = ? COLLATE NOCASE
    LIMIT 1
  `).bind(email).first();

  if (!user || user.active !== 1) {
    throw new CrmApiError('USER_NOT_AUTHORIZED', 403, 'Pengguna tidak diizinkan mengakses CRM.');
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role
  };
};
