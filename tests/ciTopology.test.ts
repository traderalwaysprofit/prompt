import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('canonical CI topology', () => {
  it('keeps general verification in Validate instead of a duplicate CI workflow', () => {
    const validate = readFileSync('.github/workflows/validate.yml', 'utf8');

    expect(existsSync('.github/workflows/ci.yml')).toBe(false);
    expect(validate).toContain('run: npm run test:coverage');
    expect(validate).toContain('run: npm run test:tools:core');
  });

  it('keeps Worker dry-runs out of the browser-only workflow', () => {
    const browser = readFileSync('.github/workflows/browser-e2e.yml', 'utf8');

    expect(browser).toContain('run: npm run validate:security-headers:core');
    expect(browser).not.toContain('run: npm run validate:security-headers\n');
    expect(browser).not.toContain('npm run verify:worker');
    expect(browser).not.toContain('npm run verify:masumi-crm-worker');
  });
});
