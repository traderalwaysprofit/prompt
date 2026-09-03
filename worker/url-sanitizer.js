// Edge-runtime-safe URL validation for B2B prospecting.
// Uses the platform URL API only; no Node.js dependencies.

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127(?:\.[0-9]+){3}$/,
  /^10(?:\.[0-9]+){3}$/,
  /^172\.(?:1[6-9]|2[0-9]|3[0-1])(?:\.[0-9]+){2}$/,
  /^192\.168(?:\.[0-9]+){2}$/,
  /^169\.254(?:\.[0-9]+){2}$/,
  /^0\.0\.0\.0$/,
  /^\[::1\]$/i,
  /^\[fe[89ab][0-9a-f]:/i,
  /^\[f[cd][0-9a-f]{2}:/i
];

const BLOCKED_HOSTNAMES = new Set([
  'metadata.google.internal',
  'metadata.google.internal.',
  'instance-data'
]);

const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Normalize and validate a prospect URL before any downstream processing.
 * Safe for Cloudflare Workers / V8 edge runtime.
 *
 * @param {unknown} rawInput
 * @returns {{isValid: boolean, sanitizedUrl: string|null, hostname: string|null, error?: string}}
 */
export function sanitizeProspectUrl(rawInput) {
  if (typeof rawInput !== 'string') {
    return { isValid: false, sanitizedUrl: null, hostname: null, error: 'Input must be a string' };
  }

  let trimmed = rawInput.trim();
  if (!trimmed) {
    return { isValid: false, sanitizedUrl: null, hostname: null, error: 'Empty input' };
  }

  if (EXPLICIT_SCHEME.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return { isValid: false, sanitizedUrl: null, hostname: null, error: 'Unsupported protocol' };
  }

  if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, sanitizedUrl: null, hostname: null, error: 'Malformed URL' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { isValid: false, sanitizedUrl: null, hostname: null, error: 'Unsupported protocol' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isBlocked = BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  if (isBlocked) {
    return { isValid: false, sanitizedUrl: null, hostname: null, error: 'SSRF risk: Private/Internal host blocked' };
  }

  // Prospecting targets must be public hostnames or public IPv4 literals.
  // Dotless hostnames and trailing-dot aliases are rejected deliberately.
  if (!hostname.includes('.') || hostname.endsWith('.')) {
    return { isValid: false, sanitizedUrl: null, hostname: null, error: 'Invalid domain structure' };
  }

  parsed.hash = '';
  parsed.username = '';
  parsed.password = '';

  return {
    isValid: true,
    sanitizedUrl: parsed.toString(),
    hostname
  };
}
