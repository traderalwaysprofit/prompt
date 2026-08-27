import { readFile } from 'node:fs/promises';

const source = await readFile('_headers', 'utf8');
const built = await readFile('dist/_headers', 'utf8');

if (source !== built) {
  throw new Error('dist/_headers does not match the source policy');
}

const requiredHeaders = [
  'Content-Security-Policy:',
  'Strict-Transport-Security:',
  'X-Content-Type-Options: nosniff',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Permissions-Policy:',
  'X-Frame-Options: DENY',
  'Cross-Origin-Opener-Policy: same-origin',
  'Cross-Origin-Resource-Policy: same-origin'
];

const requiredCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests'
];

for (const header of requiredHeaders) {
  if (!source.includes(header)) throw new Error(`Missing security header: ${header}`);
}

for (const directive of requiredCsp) {
  if (!source.includes(directive)) throw new Error(`Missing CSP directive: ${directive}`);
}

for (const unsafeToken of ["'unsafe-inline'", "'unsafe-eval'"]) {
  if (source.includes(unsafeToken)) throw new Error(`Unsafe CSP token found: ${unsafeToken}`);
}

const policyLine = source.split('\n').find((line) => line.includes('Content-Security-Policy:')) || '';
if (policyLine.length > 2000) throw new Error('CSP line exceeds Cloudflare _headers limit');

console.log('SECURITY HEADERS VALIDATION: PASS');
