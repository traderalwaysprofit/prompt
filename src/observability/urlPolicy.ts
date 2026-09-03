export interface SafeExternalUrlResult {
  isValid: boolean;
  sanitizedUrl: string | null;
  publicUrl: string | null;
  error?: string;
}

const PRIVATE_IPV4_PATTERNS = [
  /^127(?:\.[0-9]+){3}$/,
  /^10(?:\.[0-9]+){3}$/,
  /^172\.(?:1[6-9]|2[0-9]|3[0-1])(?:\.[0-9]+){2}$/,
  /^192\.168(?:\.[0-9]+){2}$/,
  /^169\.254(?:\.[0-9]+){2}$/,
  /^0\.0\.0\.0$/,
];

const PRIVATE_IPV6_PATTERNS = [
  /^\[::1\]$/i,
  /^\[fe[89ab][0-9a-f]:/i,
  /^\[f[cd][0-9a-f]{2}:/i,
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
]);

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(normalized) || normalized.endsWith(".localhost")) return true;
  return [...PRIVATE_IPV4_PATTERNS, ...PRIVATE_IPV6_PATTERNS].some((pattern) => pattern.test(normalized));
}

/**
 * Validates externally configured observability URLs. The fetch URL may keep a
 * query string for signed health endpoints, while the public telemetry form
 * intentionally drops query/hash data to avoid leaking tokens into logs/alerts.
 */
export function sanitizeExternalHttpsUrl(rawInput: unknown): SafeExternalUrlResult {
  if (typeof rawInput !== "string" || !rawInput.trim()) {
    return { isValid: false, sanitizedUrl: null, publicUrl: null, error: "URL must be a non-empty string" };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawInput.trim());
  } catch {
    return { isValid: false, sanitizedUrl: null, publicUrl: null, error: "Malformed URL" };
  }

  if (parsed.protocol !== "https:") {
    return { isValid: false, sanitizedUrl: null, publicUrl: null, error: "HTTPS is required" };
  }

  if (parsed.username || parsed.password) {
    return { isValid: false, sanitizedUrl: null, publicUrl: null, error: "URL credentials are not allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedHostname(hostname)) {
    return { isValid: false, sanitizedUrl: null, publicUrl: null, error: "Private/Internal host blocked" };
  }

  const isIpv6Literal = hostname.startsWith("[") && hostname.endsWith("]");
  if (!isIpv6Literal && (!hostname.includes(".") || hostname.endsWith("."))) {
    return { isValid: false, sanitizedUrl: null, publicUrl: null, error: "Invalid public hostname" };
  }

  parsed.hash = "";
  const publicUrl = new URL(parsed.toString());
  publicUrl.search = "";
  publicUrl.hash = "";

  return {
    isValid: true,
    sanitizedUrl: parsed.toString(),
    publicUrl: publicUrl.toString(),
  };
}
