const SUCCESS_CONCLUSION = 'success';
const FAILURE_CONCLUSIONS = new Set([
  'action_required',
  'failure',
  'stale',
  'startup_failure',
  'timed_out',
]);

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentage(numerator, denominator) {
  return denominator === 0 ? null : round((numerator / denominator) * 100);
}

function terminalConclusion(run) {
  if (run?.conclusion === SUCCESS_CONCLUSION) return 'success';
  if (FAILURE_CONCLUSIONS.has(run?.conclusion)) return 'failure';
  return null;
}

function completedAtMs(run) {
  const value = run?.completed_at || run?.updated_at;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nearestRank(values, percentile) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1);
  return sorted[index];
}

export function calculateRunReliability(runs) {
  const terminalRuns = runs.filter((run) => terminalConclusion(run));
  const successes = terminalRuns.filter((run) => terminalConclusion(run) === 'success');
  const failures = terminalRuns.length - successes.length;
  const firstPassSuccesses = successes.filter((run) => Number(run.run_attempt || 1) === 1).length;

  return {
    observedRuns: terminalRuns.length,
    successfulRuns: successes.length,
    failedRuns: failures,
    excludedRuns: runs.length - terminalRuns.length,
    successRate: percentage(successes.length, terminalRuns.length),
    firstPassSuccessRate: percentage(firstPassSuccesses, terminalRuns.length),
  };
}

export function calculateCiReliability(workflows) {
  const byWorkflow = Object.fromEntries(
    Object.entries(workflows).map(([name, runs]) => [name, calculateRunReliability(runs)]),
  );
  const allRuns = Object.values(workflows).flat();

  return {
    ...calculateRunReliability(allRuns),
    byWorkflow,
  };
}

export function calculateDeploymentMetrics(runs) {
  const reliability = calculateRunReliability(runs);
  const chronological = runs
    .map((run) => ({ run, outcome: terminalConclusion(run), completedAt: completedAtMs(run) }))
    .filter((entry) => entry.outcome && entry.completedAt !== null)
    .sort((left, right) => left.completedAt - right.completedAt);

  const recoveries = [];
  let openIncident = null;

  for (const entry of chronological) {
    if (entry.outcome === 'failure' && openIncident === null) {
      openIncident = {
        startedAt: entry.completedAt,
        failedRunId: entry.run.id ?? null,
      };
      continue;
    }

    if (entry.outcome === 'success' && openIncident !== null) {
      recoveries.push({
        failedRunId: openIncident.failedRunId,
        recoveredRunId: entry.run.id ?? null,
        startedAt: new Date(openIncident.startedAt).toISOString(),
        recoveredAt: new Date(entry.completedAt).toISOString(),
        recoveryMinutes: round((entry.completedAt - openIncident.startedAt) / 60_000),
      });
      openIncident = null;
    }
  }

  const recoveryMinutes = recoveries.map((recovery) => recovery.recoveryMinutes);
  const meanRecoveryMinutes = recoveryMinutes.length === 0
    ? null
    : round(recoveryMinutes.reduce((sum, value) => sum + value, 0) / recoveryMinutes.length);

  return {
    ...reliability,
    deploymentSuccessRate: reliability.successRate,
    incidentCount: recoveries.length + (openIncident ? 1 : 0),
    recoveredIncidentCount: recoveries.length,
    unrecoveredIncidentCount: openIncident ? 1 : 0,
    meanRecoveryMinutes,
    medianRecoveryMinutes: nearestRank(recoveryMinutes, 50),
    p90RecoveryMinutes: nearestRank(recoveryMinutes, 90),
    unrecoveredSince: openIncident ? new Date(openIncident.startedAt).toISOString() : null,
    recoveries,
  };
}

function formatPercent(value) {
  return value === null ? 'N/A' : `${value.toFixed(2)}%`;
}

export function formatDuration(minutes) {
  if (minutes === null) return 'N/A (no recovered incident in window)';
  if (minutes < 60) return `${minutes.toFixed(2)} min`;
  return `${(minutes / 60).toFixed(2)} h`;
}

export function renderReliabilityMarkdown(report) {
  const ci = report.ci;
  const deployment = report.deployment;
  const rows = Object.entries(ci.byWorkflow)
    .map(([name, metrics]) => `| ${name} | ${metrics.successfulRuns}/${metrics.observedRuns} | ${formatPercent(metrics.successRate)} | ${formatPercent(metrics.firstPassSuccessRate)} |`)
    .join('\n');

  return `# Reliability Metrics

- Window: ${report.windowStart} to ${report.windowEnd} (${report.windowDays} days)
- Generated: ${report.generatedAt}
- Cancelled, skipped, and neutral runs are excluded from rate denominators.

## Operational summary

| Metric | Result | Sample |
|---|---:|---:|
| CI reliability | ${formatPercent(ci.successRate)} | ${ci.successfulRuns}/${ci.observedRuns} canonical PR workflow runs |
| CI first-pass reliability | ${formatPercent(ci.firstPassSuccessRate)} | attempt 1 successes / canonical terminal runs |
| Production deployment success rate | ${formatPercent(deployment.deploymentSuccessRate)} | ${deployment.successfulRuns}/${deployment.observedRuns} Production Verify runs |
| Mean recovery time | ${formatDuration(deployment.meanRecoveryMinutes)} | ${deployment.recoveredIncidentCount} recovered incidents |
| Median recovery time | ${formatDuration(deployment.medianRecoveryMinutes)} | ${deployment.recoveredIncidentCount} recovered incidents |
| P90 recovery time | ${formatDuration(deployment.p90RecoveryMinutes)} | ${deployment.recoveredIncidentCount} recovered incidents |
| Unrecovered incidents | ${deployment.unrecoveredIncidentCount} | consecutive failures are one incident |

## CI workflow detail

| Workflow | Successful / observed | Reliability | First-pass |
|---|---:|---:|---:|
${rows || '| No completed canonical workflow runs | 0/0 | N/A | N/A |'}

## Measurement contract

- CI source: pull-request runs from Validate, Browser E2E, and SAMSON Preview Verification.
- Deployment source: main-branch push runs from Production Verify after the native Cloudflare build.
- Recovery starts when a Production Verify run fails and ends when the next Production Verify run succeeds.
- Consecutive failed production verifications are treated as one incident.
- This report is informational and never deploys, rolls back, or mutates production.
`;
}
