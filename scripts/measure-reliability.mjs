#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  calculateCiReliability,
  calculateDeploymentMetrics,
  renderReliabilityMarkdown,
} from './lib/reliability-metrics.mjs';

const CI_WORKFLOWS = {
  'Validate': 'validate.yml',
  'Browser E2E': 'browser-e2e.yml',
  'Preview Verification': 'samson-pr-preview.yml',
};
const PRODUCTION_WORKFLOW = 'production-verify.yml';
const TERMINAL_PAGE_LIMIT = 20;

function readArgument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function requireOutputPath(path) {
  if (!path || path.startsWith('-')) throw new Error('Output path is missing.');
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

function parseWindowDays(value) {
  const days = Number.parseInt(value, 10);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error('window-days must be an integer between 1 and 365.');
  }
  return days;
}

function isWithinWindow(run, windowStart, windowEnd) {
  const createdAt = Date.parse(run?.created_at);
  return Number.isFinite(createdAt) && createdAt >= windowStart.getTime() && createdAt <= windowEnd.getTime();
}

async function githubRequest(path, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'samson-reliability-metrics/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com${path}`, {
    headers,
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`GitHub API ${response.status} for ${path}: ${body}`);
  }

  return response.json();
}

async function fetchWorkflowRuns(repository, workflow, cutoffDate, token) {
  const runs = [];

  for (let page = 1; page <= TERMINAL_PAGE_LIMIT; page += 1) {
    const parameters = new URLSearchParams({
      per_page: '100',
      page: String(page),
      created: `>=${cutoffDate}`,
    });
    const path = `/repos/${repository}/actions/workflows/${encodeURIComponent(workflow)}/runs?${parameters}`;
    const payload = await githubRequest(path, token);
    const pageRuns = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
    runs.push(...pageRuns);

    if (pageRuns.length < 100) return runs;
  }

  throw new Error(`Workflow ${workflow} exceeded ${TERMINAL_PAGE_LIMIT * 100} runs in the selected window.`);
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!repository || !repository.includes('/')) throw new Error('GITHUB_REPOSITORY must use owner/name format.');
  if (!token) console.warn('GITHUB_TOKEN is not set; using the lower public API rate limit.');

  const windowDays = parseWindowDays(readArgument('--window-days', '30'));
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowDays * 86_400_000);
  const cutoffDate = windowStart.toISOString().slice(0, 10);

  const ciEntries = await Promise.all(
    Object.entries(CI_WORKFLOWS).map(async ([label, workflow]) => {
      const runs = await fetchWorkflowRuns(repository, workflow, cutoffDate, token);
      return [label, runs.filter(
        (run) => run.event === 'pull_request' && isWithinWindow(run, windowStart, windowEnd),
      )];
    }),
  );
  const productionRuns = await fetchWorkflowRuns(repository, PRODUCTION_WORKFLOW, cutoffDate, token);
  const productionPushRuns = productionRuns.filter(
    (run) => run.event === 'push'
      && run.head_branch === 'main'
      && isWithinWindow(run, windowStart, windowEnd),
  );

  const report = {
    schemaVersion: 1,
    repository,
    generatedAt: windowEnd.toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    windowDays,
    ci: calculateCiReliability(Object.fromEntries(ciEntries)),
    deployment: calculateDeploymentMetrics(productionPushRuns),
  };
  const markdown = renderReliabilityMarkdown(report);
  const jsonOutput = requireOutputPath(readArgument('--json-out', 'reliability-metrics/reliability.json'));
  const markdownOutput = requireOutputPath(readArgument('--markdown-out', 'reliability-metrics/reliability.md'));

  writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownOutput, markdown);
  process.stdout.write(markdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
