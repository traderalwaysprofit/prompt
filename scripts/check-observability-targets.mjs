import { loadObservabilityTargets } from './lib/observability-config.mjs';

const configPath = process.argv[2] || 'config/observability-targets.production.json';
const timeoutMs = Math.min(10000, Math.max(1000, Number(process.env.OBSERVABILITY_TIMEOUT_MS || 4000)));

const targets = await loadObservabilityTargets(configPath);
let failed = 0;

for (const target of targets) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(target.url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SAMSON-Observability-Smoke/1.0',
        Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
      },
    });
    const durationMs = Date.now() - startedAt;
    const healthy = response.status >= 200 && response.status < 400;
    console.log(`${healthy ? 'PASS' : 'FAIL'} ${target.name} HTTP ${response.status} ${durationMs}ms`);
    if (!healthy) failed += 1;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const reason = error instanceof Error && error.name === 'AbortError' ? `timeout>${timeoutMs}ms` : 'network/dns error';
    console.log(`FAIL ${target.name} ${reason} ${durationMs}ms`);
    failed += 1;
  } finally {
    clearTimeout(timer);
  }
}

if (failed > 0) {
  console.error(`OBSERVABILITY SMOKE: FAIL (${failed}/${targets.length} unhealthy)`);
  process.exitCode = 1;
} else {
  console.log(`OBSERVABILITY SMOKE: PASS (${targets.length}/${targets.length} healthy)`);
}
