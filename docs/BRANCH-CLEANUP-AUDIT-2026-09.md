# Branch Cleanup Audit — September 2026

Repository: `traderalwaysprofit/prompt`

Audit baseline: `main` at `334bb971d96e799b6274b7534fa94e9612db7c8b` before this consolidation branch.

## Policy

Branch deletion is treated as a destructive repository operation. This audit **does not delete branches**.

Classification rules:

- **KEEP** — active work or branch tied to an open PR/dependency review.
- **SAFE-DELETE CANDIDATE** — ancestry check proves the tip has `ahead_by = 0` against `main`; no unique commit would be lost by deleting the branch ref.
- **NEEDS REVIEW** — not certified safe in this pass. It may be obsolete, but it has not met the deletion criterion yet.

Deletion should only happen after explicit operator approval.

## Summary

| Classification | Count |
|---|---:|
| KEEP | 2 |
| SAFE-DELETE CANDIDATE | 21 |
| NEEDS REVIEW | 20 |
| **Total non-main branches audited** | **43** |

## KEEP

1. `chore/repo-consolidation-sep2026` — active consolidation branch created for README/PRD sync, branch audit, and operations hardening.
2. `dependabot/github_actions/github-actions-7ba8d3e2e3` — tied to open Dependabot PR #14; review/update decision should happen through the PR rather than deleting the branch directly.

## SAFE-DELETE CANDIDATES — 21

The branches below currently point to commit `5408d379764a2992b5d42869a67b3dfb162050e8`.

An ancestry comparison against the pre-consolidation `main` returned:

```text
status: behind
ahead_by: 0
behind_by: 154
```

Therefore these refs contain no unique commit relative to `main` and can be considered deletion candidates after explicit approval:

1. `ci/command-data-v2-regression`
2. `ci/command-data-v2-regression-test`
3. `ci/command-data-v2-regression-test-2`
4. `ci/command-data-v2-regression-v2`
5. `ci/regression-final`
6. `ci/regression-final-v2`
7. `ci/regression-final-v3`
8. `ci/regression-final-v4`
9. `ci/regression-final-v5`
10. `ci/regression-gate`
11. `ci/regression-gate-20260824`
12. `ci/regression-gate-final`
13. `ci/regression-gate-final-v2`
14. `ci/regression-gate-live`
15. `ci/regression-gate-main`
16. `ci/regression-gate-main-v2`
17. `ci/regression-gate-production`
18. `ci/regression-gate-v3`
19. `ci/regression-gate-v4`
20. `ci/regression-gate-v5`
21. `ci/regression-workflow`

## NEEDS REVIEW — 20

These branches are intentionally **not** certified for deletion in this pass.

### Chore / deployment history

1. `chore/lockfile-npm-ci`
2. `chore/native-cloudflare-workers-deploy`

`chore/native-cloudflare-workers-deploy` was sampled and is diverged from current `main`, so automatic deletion based on branch age/name alone is unsafe.

### CI history

3. `ci/consolidate-workflows`

This branch points to a different tip from the 21 fully-behind CI refs and needs its own history decision.

### Codex/UI experiments

4. `codex/accessibility-contrast-touch-20260826`
5. `codex/black-cloudflare-favicon-20260826`
6. `codex/ci-frontend-cleanup-20260826`
7. `codex/elegant-prompt-cards-20260826`

At least one sampled Codex branch is diverged and contains unique commits. These should be inspected for already-superseded work before deletion.

### Feature history

8. `feat/accessible-smart-pagination`
9. `feat/b2b-serper-migration`
10. `feat/b2b-serper-migration-final`
11. `feat/b2b-serper-migration-impl`
12. `feat/b2b-serper-migration-work`
13. `feat/step4-observability-engine`

Several names correspond to capabilities that now exist in `main`, but branch names are not sufficient proof that every branch tip was merged unchanged. Review commit ancestry before deletion.

### UI fix history

14. `fix/card-control-positioning`
15. `fix/proportional-prompt-cards`
16. `fix/refresh-card-css-cache`

### Security history

17. `security/extraction-via-pr`
18. `security/http-response-headers`
19. `security/pin-actions-sha`
20. `security/weekly-dependabot-updates`

Security branches should receive explicit history review before deletion even when equivalent controls appear to exist in `main`.

## Recommended cleanup sequence

### Batch A — low risk

After operator approval, delete only the 21 `SAFE-DELETE CANDIDATE` refs.

### Batch B — review open dependency PR

Review Dependabot PR #14. If accepted, merge through normal protected-main flow. If rejected, close the PR first; delete its branch only if GitHub/Dependabot does not clean it automatically.

### Batch C — ancestry review

For each `NEEDS REVIEW` branch:

1. compare `main...branch`;
2. if `ahead_by = 0`, move it to the next safe-delete batch;
3. if `ahead_by > 0`, inspect unique commits;
4. classify unique commits as superseded, cherry-pick candidate, or active work;
5. delete only after the decision is documented.

## Target hygiene policy after cleanup

Recommended steady state:

- `main` protected;
- only active feature/fix/security branches remain;
- merged branches deleted after release verification;
- bot branches live only while their PR is open;
- stale experiments older than the agreed retention window require a decision: archive via tag/documentation, or delete branch ref.

Suggested operational rule: keep non-main branch count below **10 active/reviewable refs** whenever possible.
