import { describe, expect, it } from 'vitest';
import { loadObservabilityTargets, validateObservabilityTargets } from '../scripts/lib/observability-config.mjs';

type ReviewedTarget = {
  name: string;
  url: string;
  type: 'REDIRECTOR' | 'VPS_DASHBOARD' | 'API';
  fallbackUrl?: string;
};

describe('observability production config', () => {
  it('loads only currently active production targets', async () => {
    const targets = await loadObservabilityTargets() as ReviewedTarget[];
    expect(targets).toHaveLength(1);
    expect(targets.map((target) => target.name)).toEqual([
      'SAMSON B2B API Health',
    ]);
    expect(targets.every((target) => target.url.startsWith('https://'))).toBe(true);
  });

  it('rejects non-HTTPS and private targets', () => {
    expect(() => validateObservabilityTargets([
      { name: 'Unsafe HTTP', url: 'http://example.com', type: 'API' },
    ])).toThrow(/HTTPS/);

    expect(() => validateObservabilityTargets([
      { name: 'Private', url: 'https://192.168.1.10/health', type: 'API' },
    ])).toThrow(/public-target policy/);
  });

  it('rejects credentials, fragments and duplicate targets', () => {
    expect(() => validateObservabilityTargets([
      { name: 'Credentials', url: 'https://user:pass@example.com/health', type: 'API' },
    ])).toThrow(/credentials/);

    expect(() => validateObservabilityTargets([
      { name: 'Fragment', url: 'https://example.com/health#token', type: 'API' },
    ])).toThrow(/fragment/);

    expect(() => validateObservabilityTargets([
      { name: 'One', url: 'https://example.com/health', type: 'API' },
      { name: 'Two', url: 'https://example.com/health', type: 'API' },
    ])).toThrow(/Duplicate observability target URL/);
  });

  it('rejects a fallback identical to the primary target', () => {
    expect(() => validateObservabilityTargets([
      {
        name: 'Redirector',
        url: 'https://example.com/health',
        fallbackUrl: 'https://example.com/health',
        type: 'REDIRECTOR',
      },
    ])).toThrow(/fallbackUrl must differ/);
  });
});
