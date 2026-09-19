# SAMSON Repository Governance

This document defines how changes are proposed, reviewed, approved, released, and recovered. The protected branch ruleset remains the enforcement source of truth if a check name or platform setting changes.

## Authority and roles

- **Repository owner / maintainer:** `@traderalwaysprofit` owns product direction, production access, data decisions, releases, and incident decisions.
- **Contributors:** may propose code, documentation, tests, and operational changes through pull requests.
- **AI assistants and automation:** may inspect, draft, implement, and test changes, but cannot supply the human approval required for merge, deployment, production-data mutation, secret rotation, or destructive action.

## Change classes

| Class | Examples | Minimum gate |
|---|---|---|
| Low risk | Documentation, comments, non-runtime metadata | Pull request, applicable required checks, human review |
| Standard | Runtime code, tests, UI, dependencies | Pull request, full required checks, regression evidence, human review |
| High risk | Authentication, authorization, Worker config, DNS, secrets, D1 migrations, production data | Standard gate plus explicit owner approval, rollback plan, and production verification |

Scope expansion discovered during implementation must be documented in the pull request. A change that becomes high risk must use the high-risk gate even if it started as a smaller task.

## Protected change workflow

1. Start from current `main` and create a focused branch.
2. State the outcome, scope, acceptance criteria, risk, and rollback path.
3. Keep unrelated changes out of the pull request.
4. Run the local checks described in `CONTRIBUTING.md`.
5. Open a pull request and resolve every review conversation.
6. Wait for the branch ruleset checks. Current required gates include `validate`, `browser-e2e`, `Workers Builds: prompt-v5`, and `preview-verification`.
7. Obtain human approval before merge. Passing automation is necessary but is not approval.
8. Verify production after merge when runtime behavior, infrastructure, or dependencies changed.

Direct pushes to `main`, bypassing checks, force-pushing protected history, and merging with unresolved conversations are not normal operating procedures.

## Production and data controls

Explicit owner approval is required before:

- deploying or rolling back production;
- changing Cloudflare Workers, routes, DNS, Access, D1, rate limits, or GitHub rulesets;
- adding, rotating, or exposing credentials;
- importing, replacing, deleting, or exporting production CRM data;
- publishing content or triggering an external side effect.

Secrets, OTPs, API keys, Access assertions, real lead data, and other personal data must not appear in source control, fixtures, CI logs, screenshots, issues, or pull-request comments.

## Releases and rollback

Every runtime pull request must identify the verification signal and rollback method. Prefer reversible changes, backward-compatible migrations, and isolated preview resources. Do not delete the last known-good branch, artifact, backup, or migration evidence until production verification succeeds.

## Reliability evidence

The `Reliability Metrics` workflow measures a rolling 30-day CI reliability rate, deployment success rate, and recovery time from repository workflow history. It runs every Sunday at 19:00 WIB and can be dispatched manually. Reports are informational until the owner approves explicit service objectives; a metric workflow must not deploy, roll back, mutate data, or conceal an unrecovered incident. Definitions and known limitations are maintained in `RELIABILITY.md`.

## Emergency changes

For an active incident, prefer reverting the offending change or using a focused hotfix pull request. Record the incident, impact, mitigation, verification, and follow-up controls after service is stable. Emergency pressure does not authorize disclosing secrets or production data.

## Governance changes

Changes to this file, `SECURITY.md`, `CODEOWNERS`, required checks, coverage thresholds, or approval policy are governance changes. They require an explicit pull-request explanation and owner review.
