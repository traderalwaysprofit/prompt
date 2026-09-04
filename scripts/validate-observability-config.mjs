import { loadObservabilityTargets } from './lib/observability-config.mjs';

const args = process.argv.slice(2);
const configPath = args.find((arg) => !arg.startsWith('--')) || 'config/observability-targets.production.json';
const printEnv = args.includes('--print-env');

try {
  const targets = await loadObservabilityTargets(configPath);
  console.log(`OBSERVABILITY CONFIG: PASS (${targets.length} targets)`);
  if (printEnv) {
    console.log(JSON.stringify(targets));
  }
} catch (error) {
  console.error('OBSERVABILITY CONFIG: FAIL');
  console.error(error instanceof Error ? error.message : 'Unknown validation error');
  process.exitCode = 1;
}
