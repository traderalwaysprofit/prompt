import { describe, expect, it } from 'vitest';
import { ProspectingRequestSchema } from '../src/schemas/prospectingSchema';
import { sanitizeProspectUrl } from '../worker/url-sanitizer.js';
import { handleB2BRequest } from '../worker/b2b-prospecting.js';

describe('sanitizeProspectUrl edge security suite', () => {
  it('normalizes valid raw domains to https', () => {
    const res = sanitizeProspectUrl('masumi.co.id');
    expect(res.isValid).toBe(true);
    expect(res.sanitizedUrl).toBe('https://masumi.co.id/');
  });

  it('blocks loopback, private and cloud metadata targets', () => {
    expect(sanitizeProspectUrl('http://localhost:8080/admin').isValid).toBe(false);
    expect(sanitizeProspectUrl('http://127.0.0.1/sensitive').isValid).toBe(false);
    expect(sanitizeProspectUrl('http://10.0.0.1/').isValid).toBe(false);
    expect(sanitizeProspectUrl('http://192.168.1.1/').isValid).toBe(false);
    const metadata = sanitizeProspectUrl('http://169.254.169.254/latest/meta-data/');
    expect(metadata.isValid).toBe(false);
    expect(metadata.error).toContain('SSRF risk');
  });

  it('strips credentials and fragments', () => {
    const res = sanitizeProspectUrl('https://admin:pass@targetcompany.com/path#secret');
    expect(res.isValid).toBe(true);
    expect(res.sanitizedUrl).toBe('https://targetcompany.com/path');
  });

  it('rejects unsupported schemes', () => {
    const res = sanitizeProspectUrl('ftp://targetcompany.com/file');
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Unsupported protocol');
  });
});

describe('ProspectingRequestSchema runtime contract', () => {
  it('applies manual as the default source', () => {
    const parsed = ProspectingRequestSchema.parse({ targetUrl: 'masumi.co.id' });
    expect(parsed.source).toBe('manual');
  });

  it('accepts supported source values and metadata', () => {
    const parsed = ProspectingRequestSchema.safeParse({
      targetUrl: 'https://example.com',
      source: 'batch_csv',
      metadata: { campaign: 'sep-2026', score: 90 },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects empty and oversized URLs', () => {
    expect(ProspectingRequestSchema.safeParse({ targetUrl: '' }).success).toBe(false);
    expect(ProspectingRequestSchema.safeParse({ targetUrl: 'a'.repeat(2049) }).success).toBe(false);
  });

  it('rejects unsupported source values', () => {
    const parsed = ProspectingRequestSchema.safeParse({ targetUrl: 'example.com', source: 'unknown' });
    expect(parsed.success).toBe(false);
  });
});

describe('B2B prospect route schema guard', () => {
  const env = {
    B2B_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };

  const request = (body: unknown) => new Request('https://samson.web.id/api/tools/b2b/prospect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('accepts valid payload after schema and URL validation', async () => {
    const response = await handleB2BRequest(request({ targetUrl: 'masumi.co.id', source: 'hub_integration' }), env);
    expect(response.status).toBe(200);
    const payload = await response.json() as Record<string, unknown>;
    expect(payload.success).toBe(true);
    expect(payload.target).toBe('https://masumi.co.id/');
    expect(payload.source).toBe('hub_integration');
  });

  it('rejects schema-invalid payload before business logic', async () => {
    const response = await handleB2BRequest(request({ targetUrl: '', source: 'manual' }), env);
    expect(response.status).toBe(422);
    const payload = await response.json() as { error: { code: string } };
    expect(payload.error.code).toBe('INVALID_PROSPECT_PAYLOAD');
  });

  it('rejects SSRF targets after schema validation', async () => {
    const response = await handleB2BRequest(request({ targetUrl: 'http://169.254.169.254/latest/meta-data/' }), env);
    expect(response.status).toBe(422);
    const payload = await response.json() as { error: { code: string } };
    expect(payload.error.code).toBe('INVALID_TARGET_URL');
  });
});
