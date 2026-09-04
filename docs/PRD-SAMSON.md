# PRD — SAMSON

| Metadata | Nilai |
|---|---|
| Produk | SAMSON |
| Domain | `samson.web.id` |
| Repository | `traderalwaysprofit/prompt` |
| Dokumen | Canonical Product Requirements Document |
| Status | Active / evolving |
| Baseline | September 2026 |
| Arsitektur | Static-first frontend + Cloudflare Worker API/runtime |
| Development model | AI-assisted / supervised vibe coding |

## 1. Product statement

SAMSON adalah **AI Cheatcodes for Real Work**: AI work system yang membantu operator mengubah tujuan kerja menjadi prompt, guided workflow, practical tools, executable function contracts, evidence, quality gates, dan artifact yang dapat diverifikasi.

Produk tidak diposisikan sebagai katalog prompt semata. Arah arsitekturnya adalah:

```text
Intent
  ↓
Prompt / Workflow
  ↓
Context + Evidence
  ↓
AI / Deterministic Tool
  ↓
Validation + Quality Gate
  ↓
Human Approval
  ↓
Artifact / Operational Action
```

## 2. Current production baseline

| Komponen | Baseline |
|---|---:|
| Prompt / command | 201 |
| Example | 201 |
| Category | 19 |
| Core guided workflow | 6 |
| Trading workflow | 3 |
| WordPress workflow | 3 |
| Total guided workflow | 12 |
| Practical Tools | 2 |
| Core executable system tools | 3 |
| UI personality | 4 |
| Headless visual pipeline | 1 |
| Observability cron | 5 menit; disabled by default |

Practical Tools:

1. **Google Contacts Ready** — XLSX/XLS/CSV → review/normalize/dedupe → Google Contacts CSV, diproses lokal di browser.
2. **B2B Prospecting V1** — prospect discovery, enrichment evidence, candidate review, local lead storage, route planning, dan briefing WhatsApp; provider network berjalan server-side melalui Cloudflare Worker.

Executable system tools:

- `sanitize_contact_numbers`
- `resolve_marketing_route`
- `audit_domain_dns`

## 3. Target users

Fokus utama SAMSON adalah **Digital Operators**:

- freelancer / independent operator;
- digital marketer;
- web builder / developer;
- SEO/content operator;
- designer yang menggunakan AI;
- researcher;
- WordPress/WooCommerce operator;
- small agency / small team.

Trading tetap diposisikan sebagai educational analysis / structured decision support, bukan layanan sinyal atau jaminan profit.

## 4. Product principles

### 4.1 Outcome over prompt count
Jumlah prompt bukan moat utama. Prompt harus terhubung ke kebutuhan nyata, workflow, example, validation, dan outcome.

### 4.2 Workflow over one-shot generation
Pekerjaan kompleks harus mempunyai urutan input → process → output → validation → approval.

### 4.3 Deterministic logic where possible
Normalisasi, sanitasi, routing plan, schema validation, DNS comparison, dan artifact rendering harus dijalankan oleh code deterministik bila logic-nya dapat didefinisikan dengan jelas.

### 4.4 Evidence before confidence
Research, B2B enrichment, SEO, audit, dan technical recommendation harus membedakan evidence, assumption, dan model interpretation.

### 4.5 Human approval remains explicit
Publish, deploy, external mutation, deletion, transaction, route mutation, dan high-impact action tidak boleh menjadi side effect diam-diam.

### 4.6 Static-first until backend value is proven
Frontend tetap sederhana. Secret/network capability hanya masuk Worker ketika dibutuhkan oleh produk.

### 4.7 Quality is a product feature
CI, type checks, schema validation, Browser E2E, CodeQL, production verification, accessibility, dan regression guard adalah bagian dari product contract.

## 5. Architecture baseline

```text
Browser
├─ Prompt Library
├─ Guided Workflows
├─ Work Assistant
├─ Tools Hub
├─ Vanilla JavaScript/CSS
├─ JSON runtime data
└─ localStorage
      │
      ▼
Static build: dist/
      │
      ▼
Cloudflare Worker: prompt-v5
├─ static assets
├─ B2B API gateway
├─ protected system-tool API
├─ server-side provider adapters
├─ scheduled observability engine
└─ Cloudflare preview / production runtime
```

### 5.1 Runtime data

```text
data/commands.json              189
data/commands-extra.json         12
                                 ───
                                 201 commands

data/cheatcodes.json              6
data/workflows-trading.json        3
data/workflows-wordpress.json      3
                                 ───
                                  12 workflows
```

Personal UI/workflow state tetap disimpan lokal melalui `localStorage` selama belum ada product requirement yang membenarkan account/database layer.

### 5.2 Server-side provider model

B2B Prospecting menggunakan:

- **Serper** untuk prospect discovery / web evidence;
- **Gemini** untuk relevance review / normalization terhadap bounded evidence;
- provider secret hanya di Worker environment.

Frontend tidak menerima API key.

General-purpose autonomous agent loop belum menjadi production baseline. Core Tool Engine menyediakan contract dan deterministic executor yang dapat dipakai model/function-calling adapter secara terkontrol.

## 6. Functional requirements

### FR-1 — Prompt Library

- search dan category filter;
- responsive pagination;
- prompt detail;
- template + example;
- favorites dan recently used;
- runtime statistics dari data aktual.

### FR-2 — Guided Workflows

- 12 workflow berdasarkan outcome/domain;
- ordered steps;
- prompt reference harus valid;
- progress local persistence;
- Trading dan WordPress domain workflows memakai shared workflow engine.

### FR-3 — Work Assistant

- outcome-first navigation untuk WhatsApp, Email, Social Content, SEO, Website, Customer Support, dan custom work problem;
- tidak boleh mengaburkan Guided Workflow mode;
- deep link dan back/forward behavior konsisten.

### FR-4 — Adaptive UI

Empat personality:

- Samson Default;
- Developer;
- Swiss;
- Pixel.

Theme layer tidak boleh mengubah data/behavior inti dan harus tetap usable di mobile/desktop.

### FR-5 — Practical Tools Hub

- Tools Hub modular dengan registry;
- setiap tool mempunyai route/deep link sendiri;
- Google Contacts mempertahankan local-first privacy contract;
- B2B Prospecting memakai same-origin Worker API untuk provider traffic;
- untrusted import/provider data harus dirender secara aman;
- candidate tidak auto-save tanpa review.

### FR-6 — B2B URL / request security

- HTTP request contract divalidasi dengan Zod;
- prospect target dinormalisasi dengan WHATWG `URL` API;
- non-HTTP(S), localhost, private/link-local/metadata literal ditolak;
- credentials/hash dihapus sebelum processing;
- provider-returned URLs melalui sanitizer sebelum disimpan/dipakai.

### FR-7 — Core Tool Engine

- registry hanya memuat allowlisted tools;
- payload Zod-validated sebelum dispatch;
- unknown tool ditolak;
- execution endpoint fail-closed bila execution token tidak tersedia;
- tidak ada arbitrary shell/deploy/publish/transaction/network-write executor;
- provider schema adapter tersedia untuk OpenAI/Gemini function calling formats.

### FR-8 — Observability

- Cloudflare Scheduled event setiap 5 menit;
- engine default disabled sampai config direview;
- monitoring hanya public HTTPS target;
- timeout bounded;
- unsafe/private target ditolak;
- telemetry/alert tidak boleh membocorkan signed query/token;
- webhook harus HTTPS dan redirect-protected;
- primary failure dapat memicu fallback verification;
- V1 tidak melakukan silent external route mutation.

### FR-9 — Headless Visual Generator

- input divalidasi sebelum render;
- SVG 1080×1920;
- PNG 1080×1920 melalui `@resvg/resvg-js`;
- dark retro terminal / 8-bit visual direction;
- attribution selalu `by belajarforexmalang`;
- tidak ada logo;
- tidak ada remote font/image dependency;
- dynamic XML escaped;
- accent color dibatasi `#RRGGBB`;
- artifact dapat dihasilkan secara repeatable dari CLI/CI.

## 7. Non-functional requirements

### NFR-1 — Reproducibility
`npm ci` + locked dependencies harus dapat membangun source yang sama secara konsisten.

### NFR-2 — Security
- secret tidak boleh masuk browser/repo/log;
- CSP/security headers divalidasi;
- CodeQL menjadi protected-branch gate;
- SSRF-sensitive URL handling fail-closed;
- internal exception detail tidak dikirim ke caller.

### NFR-3 — Testing
- lint;
- TypeScript strict noEmit;
- Vitest unit/security tests;
- existing regression suites;
- Playwright Browser E2E;
- Wrangler bundle dry-run;
- Cloudflare preview;
- Production Verify setelah merge.

### NFR-4 — Accessibility/responsive
- tidak ada horizontal overflow pada supported mobile layouts;
- actionable mobile controls memenuhi minimum touch target yang ditetapkan UI contract;
- theme tidak menurunkan readability.

### NFR-5 — Operational safety
Automation yang hanya memonitor/menyiapkan artifact boleh berjalan unattended. External mutation tetap memerlukan policy/authorization/approval yang eksplisit.

## 8. CI/CD and release contract

```text
Requirement
   ↓
Feature branch
   ↓
Implementation
   ↓
ESLint
   ↓
TypeScript strict
   ↓
Zod / Vitest / regression
   ↓
Static build
   ↓
Wrangler deploy --dry-run
   ↓
Security headers
   ↓
Browser E2E
   ↓
CodeQL
   ↓
Cloudflare preview
   ↓
Human approval + resolved review threads
   ↓
Merge protected main
   ↓
Cloudflare production build
   ↓
Production Verify
```

Protected `main` requires PR review, strict required checks, Browser E2E, Cloudflare Workers Build, review-thread resolution, dan CodeQL policy.

## 9. Current roadmap status

### Foundation — implemented

- Prompt Library;
- 12 Guided Workflows;
- Work Assistant navigation;
- adaptive UI / four personalities;
- modular Tools Hub;
- Google Contacts;
- B2B Prospecting.

### Hardening and automation — implemented

1. **URL Sanitizer & Anti-SSRF** ✅
2. **CI/CD Guard + Zod + Vitest + Wrangler Verification** ✅
3. **Deterministic Function Calling Engine** ✅
4. **Observability / Alerting / Fallback Verification Engine** ✅
5. **Headless Visual Generator SVG/PNG** ✅

## 10. Current consolidation phase

### P1 — Documentation baseline
README dan PRD harus mengikuti production architecture, bukan baseline sebelum Tools/Worker automation.

### P2 — Repository hygiene
Stale branches diaudit berdasarkan ancestry terhadap `main`. Branch hanya boleh dianggap safe-delete bila tidak mempunyai commit unik (`ahead_by=0`) atau sudah diverifikasi melalui merged PR/commit history. Deletion tetap membutuhkan explicit operator approval.

### P3 — Operationalization

Observability:

- production target config disimpan sebagai reviewed non-secret artifact;
- deterministic config validator masuk CI;
- manual smoke workflow tersedia untuk menguji target;
- production activation tetap memerlukan Cloudflare variable/secret configuration.

Visual pipeline:

- manual GitHub workflow menghasilkan SVG+PNG artifact tanpa publish;
- input berasal dari reviewed JSON payload;
- artifact dapat direview sebelum social scheduling/publishing.

## 11. Next product phase

Setelah consolidation stabil, prioritas produk kembali ke executable work specification:

```text
INPUT
  ↓
CONTEXT
  ↓
PROCESS
  ↓
AI / TOOL
  ↓
EXPECTED OUTPUT
  ↓
EVIDENCE
  ↓
VALIDATE
  ↓
QUALITY SCORE
  ↓
HUMAN APPROVAL
  ↓
EXPORT / ACTION
```

Kandidat evolusi:

1. Workflow Engine V2;
2. reusable Context Capsule;
3. Quality Engine;
4. Proof / Evidence Mode;
5. artifact orchestration;
6. provider/tool policy + audit trail;
7. account/project persistence hanya jika value produk sudah terbukti.

## 12. Definition of done

Feature tidak dianggap selesai hanya karena code berhasil digenerate.

Definition of done minimum:

- requirement/acceptance criteria jelas;
- implementation berada di feature branch;
- relevant automated tests tersedia dan pass;
- regression/security gate pass;
- Cloudflare bundle/preview pass bila runtime terdampak;
- review conversation resolved;
- human approval sebelum merge;
- production verification pass setelah release;
- documentation diperbarui bila architecture/operational contract berubah.
