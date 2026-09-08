# MASUMI Sales CRM V1

## Purpose

MASUMI Sales CRM is a local-only Practical Tools Hub module at `#tools/masumi-sales-crm`. It supports day-to-day lead registration, qualification, prioritization, forecasting, and follow-up without introducing accounts, a backend database, or frontend secrets.

## Runtime contract

- Registry entry: `/src/tools-registry.js`
- UI/controller: `/src/tools/masumi-crm.js`
- Deterministic rules: `/src/tools/masumi-crm-core.js`
- Adaptive styles: `/src/tools/masumi-crm.css`
- Storage key: `samsonMasumiCrmV1`
- Maximum records: 2,000 leads
- Backup format: schema `samson.masumi-crm.backup`, version `1`
- Import format: `.json`, maximum 5 MB
- Network behavior: none

The module follows the generic `mountTool(root, context)` lifecycle and returns a `destroy()` controller. Its JavaScript and CSS are loaded only after the route is opened.

## Pipeline and forecast

Canonical stages and open-lead forecast probabilities:

| Stage | Probability |
|---|---:|
| New | 5% |
| Contacted | 15% |
| Qualified | 30% |
| Needs Discovery | 45% |
| Proposal Sent | 65% |
| Negotiation | 80% |
| Nurture | 10% |
| Won | Excluded |
| Lost | Excluded |

`Weighted Forecast = Σ(Potential Value × Stage Probability)` for open leads only.

A Lost lead must include a loss reason. Won and Lost leads are excluded from active follow-up.

## Priority and KPI definitions

Priority combines four integer scores from 0–5: Fit, Readiness, Urgency, and Value.

| Total | Priority |
|---:|---|
| 16–20 | Hot |
| 11–15 | Warm |
| 6–10 | Develop |
| 0–5 | Low |

Dashboard definitions:

- Active Leads: every stage except Won and Lost.
- Qualified Rate: Qualified through Won divided by all non-Lost leads.
- Overdue Follow-up: an open lead with a next action and a schedule earlier than the user's current local date.
- Weighted Forecast: the open-stage calculation above.

## Import, export, and security

- Dynamic lead data is rendered through DOM `textContent`; it is never interpolated into `innerHTML`.
- Imported backup schema, version, record collection, IDs, dates, score ranges, known option values, and canonical pipeline stages are validated.
- Duplicate imported lead IDs are rejected.
- A valid import still requires user confirmation before replacing existing local data.
- CSV fields beginning with `=`, `+`, `-`, or `@` are prefixed with an apostrophe to prevent spreadsheet formula execution.
- Lead deletion requires confirmation.
- Storage failures preserve the last successfully stored in-memory collection and show an error state.

## Verification

Core rules are exercised by `npm run test:masumi-crm`. Browser coverage validates lazy loading, empty state, CRUD, persistence after reload, search/filtering, Lost reason enforcement, overdue follow-up, XSS resistance, backup/restore, CSV injection defense, import limits, four themes, and mobile overflow.

## Rollback

Remove the registry entry and the three MASUMI CRM source files, then revert the related tests/documentation. A code rollback does not delete existing `samsonMasumiCrmV1` data from user devices, allowing the module to be restored without losing locally stored records.
