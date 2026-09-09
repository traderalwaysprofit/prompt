# Supervised Vibecoding System V1

Status: CANONICAL DEVELOPMENT WORKFLOW

This document defines the software-development sibling architecture for SAMSON. It does not replace or merge with Universal Design Production. UI/UX work continues to route to the existing design production architecture and its specialist dependencies.

## Operating model

SAMSON uses AI-heavy execution with explicit human gates. AI performs repository inspection, planning, implementation, diagnosis, testing, documentation, and evidence collection. The operator retains authority over scope, high-impact architecture, destructive changes, security-critical decisions, production data, merge, and production release.

| Stage | Vibecoding | Semi-manual | Default contract |
| --- | ---: | ---: | --- |
| DEV-01 Requirements / xRD | 90% | 10% | AI drafts requirements; operator approves scope |
| DEV-02 Architecture | 80% | 20% | AI proposes architecture; operator approves material decisions |
| UI/UX | 90% | 10% | Route to Universal Design Production; operator approves direction when material |
| DEV-03 Implementation | 90–95% | 5–10% | Coding agent dominates within approved scope |
| DEV-04 Debug | 90% | 10% | Diagnose first; human confirmation when evidence or access is required |
| DEV-05 Testing | 90% | 10% | AI writes/runs unit, integration, E2E, and regression coverage |
| DEV-06 Refactor | 80% | 20% | Audit first; approval before destructive or broad refactor |
| EXT-SEC01 Security | 70% | 30% | AI audits/proposes; human approves critical changes |
| DEV-07 Git / Release | 80% | 20% | AI prepares commits/PR/CI evidence; merge/deploy remains gated |
| DEV-08 Operations | 60–75% | 25–40% | Monitoring can automate; incidents and risky remediation stay supervised |
| META-SKILL01 Task → Skill | 90% | 10% | AI extracts reusable skill; operator approves graduation |

## Canonical lifecycle

```text
INTENT / ISSUE
    ↓
DEV-01 REQUIREMENTS / xRD
    ↓
HUMAN GATE — scope
    ↓
DEV-02 ARCHITECTURE
    ↓
HUMAN GATE — material architecture decision
    ↓
UI/UX when applicable
    ↓
Universal Design Production
    ↓
DEV-03 IMPLEMENTATION
    ↕
DEV-04 DIAGNOSTIC DEBUG LOOP
    ↓
DEV-05 VERIFICATION & QA
    ↓
DEV-06 CODE QUALITY / REFACTOR GATE
    ↓
EXT-SEC01 APPLICATION SECURITY GATE
    ↓
DEV-07 GIT / RELEASE ENGINEERING
    ↓
CI + PREVIEW / STAGING
    ↓
HUMAN GATE — merge / production release
    ↓
DEV-08 OPERATIONS
    ↓
OPTIONAL META-SKILL01 GRADUATION
```

Debug is a recovery loop, not a linear phase. A failed verification returns to the smallest relevant implementation/debug loop and must be reverified before progressing.

## DEV-01 — Requirements / xRD

Use the minimum requirements package that makes implementation unambiguous. Small changes can use PRD-lite + acceptance criteria. Material product work can expand to BRD, PRD, FRD, DRD, TSD, ADR, or other xRD artifacts as required.

Required outputs:
- problem and target user;
- goals and non-goals;
- MVP scope and explicit exclusions;
- functional and non-functional requirements;
- user stories or journeys when applicable;
- acceptance criteria;
- edge cases and failure states;
- open questions and assumptions.

No implementation starts while a material ambiguity can change scope, data, authorization, or architecture.

## DEV-02 — Architecture

Produce a decision-ready technical design before implementation when the change affects boundaries, persistence, authentication, authorization, APIs, deployment, or dependencies.

Review:
- component and service boundaries;
- data model and migrations;
- API contracts;
- authentication and authorization;
- environment/configuration;
- failure handling and rollback;
- observability;
- dependency additions;
- deployment topology.

High-impact changes require explicit operator approval before coding.

## UI/UX routing

UI/UX is not duplicated as a software-only top-level skill. Route visual/product-interface work to Universal Design Production and its existing orchestration. The software pipeline consumes the approved UI specification as an implementation input.

Recommended route when relevant:

```text
DEV-01 Requirements
   ↓
Universal Design Production / Master Orchestrator
   ↓
Create → Optimize → Brand → Audit
   ↓
optional EXT-AS01 Anti-Slop specialist
   ↓
approved UI specification
   ↓
DEV-03 Implementation
```

## DEV-03 — Implementation

Implementation must stay inside the approved requirement and architecture boundary.

Rules:
- inspect the repository before editing;
- preserve public contracts unless change is approved;
- prefer the smallest coherent implementation;
- do not add a dependency without a concrete reason;
- do not perform unrelated refactors;
- do not invent product requirements;
- add/update tests with the change;
- generated code is not definition of done.

## DEV-04 — Diagnostic Debug Loop

Use evidence-first debugging:

```text
OBSERVE → RESTATE → RANK HYPOTHESES → TEST → CONFIRM ROOT CAUSE
        → MINIMAL FIX → VERIFY → REGRESSION
```

Do not shotgun-edit multiple unrelated areas. Do not refactor while diagnosing unless the refactor itself is proven necessary to the fix.

## DEV-05 — Verification & QA

Verification is risk-based, not E2E-only.

Expected layers where applicable:
- lint/static validation;
- typecheck;
- unit tests;
- integration/API tests;
- Playwright/browser E2E for critical user journeys;
- accessibility checks;
- regression tests;
- build and platform dry-run checks.

E2E selectors should prefer semantic roles or stable `data-testid` attributes. Tests must cover realistic failure states for critical journeys and remain repeatable through fixtures, seeding, and cleanup where state exists.

## DEV-06 — Code Quality & Refactor Gate

Refactor starts with an audit. Report dead code, unused dependencies, duplication, oversized files, architecture violations, and cleanup candidates with confidence and impact.

Default safety rule:
- confidence >= 90%: may propose deletion/refactor;
- confidence < 90%: HOLD and request evidence/review;
- destructive or broad changes: explicit approval before execution.

Behavior must remain equivalent unless changed behavior is an approved requirement. Re-run regression after refactor.

## EXT-SEC01 — Application Security Specialist

Security is a cross-cutting specialist and release gate, not a one-time post-build scan.

Review where applicable:
- authentication/session handling;
- authorization, object-level access, IDOR;
- secrets and client-side exposure;
- injection: SQL/NoSQL/command/XSS;
- input validation/sanitization;
- API exposure and rate limiting;
- CSRF/CORS/security headers/cookie flags;
- dependency vulnerabilities;
- sensitive logging/error responses;
- production data access and migration risk.

Findings use P0 Critical, P1 High, P2 Medium, P3 Low. The audit must provide evidence, exploitability reasoning, affected location, and a proposed remediation. P0/P1 block release until resolved or explicitly excepted by an authorized operator.

## DEV-07 — Git & Release Engineering

Use atomic commits and Conventional Commits. Commit history should explain what changed and why. AI may prepare commits, push a feature branch, open a PR, collect CI evidence, and prepare a release candidate.

Release boundary:

```text
feature branch
  ↓
validation + test + security evidence
  ↓
PR / preview
  ↓
HUMAN REVIEW
  ↓
merge
  ↓
production deployment
  ↓
production verification
```

Merge to protected `main`, production deployment, and production database mutation are never inferred from approval to implement.

## DEV-08 — Operations

A release is not complete when deployment succeeds. Define:
- health/smoke checks;
- logging and observability;
- alerting route;
- backup/restore where state exists;
- migration verification;
- rollback path;
- incident triage and ownership;
- post-release verification.

Automated monitoring may detect and report incidents. Destructive remediation, route mutation, production data repair, or rollback with material user impact remains an explicit operator action unless a separately approved runbook authorizes it.

## META-SKILL01 — Skill Foundry

A successful task does not automatically become a skill. Graduate only when the task is:
- reusable;
- repeatable;
- sufficiently domain-independent;
- clear about inputs and outputs;
- testable;
- proven across at least 2–3 real executions or otherwise supported by equivalent regression evidence.

A candidate skill must include:
1. short action-oriented name;
2. precise trigger and non-trigger conditions;
3. required inputs and context;
4. numbered procedure;
5. constraints and approval gates;
6. exact output contract/template;
7. complete input→output example;
8. 3–5 common failure modes and mitigations;
9. regression cases;
10. dependency/routing metadata.

Graduation path:

```text
successful task
  ↓
reusability check
  ↓
DRAFT SKILL
  ↓
regression
  ↓
HUMAN APPROVAL
  ↓
REGISTER / ACTIVE
```

## Non-negotiable human gates

Explicit approval is required before:
- material scope change;
- high-impact architecture/provider migration;
- destructive deletion or broad refactor;
- secret/credential creation or exposure;
- security-critical behavior change when impact is material;
- destructive production database migration;
- merge to protected `main`;
- production deployment or external publish;
- irreversible production mutation.

## Definition of done

A development task is complete only when the requested behavior is implemented, acceptance criteria are satisfied, required tests and security checks pass, regression evidence is available, documentation is synchronized when needed, rollback/operations implications are known, and the final human release gate has been respected.