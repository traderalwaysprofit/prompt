import { describe, expect, it } from 'vitest';
import {
  calculateCiReliability,
  calculateDeploymentMetrics,
  formatDuration,
  renderReliabilityMarkdown,
} from '../scripts/lib/reliability-metrics.mjs';

const run = (
  id: number,
  conclusion: string,
  completedAt: string,
  runAttempt = 1,
) => ({
  id,
  conclusion,
  completed_at: completedAt,
  run_attempt: runAttempt,
});

describe('reliability metrics', () => {
  it('calculates canonical CI reliability while excluding cancelled runs', () => {
    const metrics = calculateCiReliability({
      Validate: [
        run(1, 'success', '2026-09-01T10:00:00Z'),
        run(2, 'failure', '2026-09-02T10:00:00Z'),
        run(3, 'cancelled', '2026-09-03T10:00:00Z'),
      ],
      'Browser E2E': [run(4, 'success', '2026-09-04T10:00:00Z')],
      'Preview Verification': [run(5, 'success', '2026-09-05T10:00:00Z', 2)],
    });

    expect(metrics).toMatchObject({
      observedRuns: 4,
      successfulRuns: 3,
      failedRuns: 1,
      excludedRuns: 1,
      successRate: 75,
      firstPassSuccessRate: 50,
    });
    expect(metrics.byWorkflow.Validate.successRate).toBe(50);
  });

  it('groups consecutive deployment failures into one recovered incident', () => {
    const metrics = calculateDeploymentMetrics([
      run(10, 'success', '2026-09-01T09:00:00Z'),
      run(11, 'failure', '2026-09-01T10:00:00Z'),
      run(12, 'timed_out', '2026-09-01T10:10:00Z'),
      run(13, 'success', '2026-09-01T10:40:00Z'),
      run(14, 'failure', '2026-09-01T11:00:00Z'),
      run(15, 'cancelled', '2026-09-01T11:10:00Z'),
    ]);

    expect(metrics).toMatchObject({
      observedRuns: 5,
      successfulRuns: 2,
      failedRuns: 3,
      excludedRuns: 1,
      deploymentSuccessRate: 40,
      incidentCount: 2,
      recoveredIncidentCount: 1,
      unrecoveredIncidentCount: 1,
      meanRecoveryMinutes: 40,
      medianRecoveryMinutes: 40,
      p90RecoveryMinutes: 40,
      unrecoveredSince: '2026-09-01T11:00:00.000Z',
    });
  });

  it('renders no-data recovery values without inventing an MTTR', () => {
    const report = {
      generatedAt: '2026-09-19T12:00:00.000Z',
      windowStart: '2026-08-20T12:00:00.000Z',
      windowEnd: '2026-09-19T12:00:00.000Z',
      windowDays: 30,
      ci: calculateCiReliability({ Validate: [] }),
      deployment: calculateDeploymentMetrics([]),
    };
    const markdown = renderReliabilityMarkdown(report);

    expect(formatDuration(null)).toContain('no recovered incident');
    expect(markdown).toContain('| CI reliability | N/A | 0/0 canonical PR workflow runs |');
    expect(markdown).not.toContain('NaN');
  });
});
