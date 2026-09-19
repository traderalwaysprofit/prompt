# SAMSON

**AI Cheatcodes for Real Work** — AI work system berbasis web untuk mengubah tujuan kerja menjadi prompt, guided workflow, practical tools, executable tool contracts, dan artifact yang dapat diverifikasi.

**Production:**

- SAMSON: https://samson.web.id
- MASUMI Sales CRM: https://crm.samson.web.id

## Status — September 2026

SAMSON berawal sebagai Prompt Library static-first dan sekarang berkembang menjadi **AI-assisted operator platform**. Frontend tetap Vanilla JavaScript/CSS + JSON, sementara capability yang membutuhkan secret/network berjalan melalui Cloudflare Worker.

Baseline runtime:

| Komponen | Kondisi |
|---|---:|
| Prompt / command | 201 |
| Example | 201 |
| Category | 19 |
| Guided workflow | 12 |
| Practical Tools | 3 |
| Core executable system tools | 3 |
| UI personality | 4 |
| Headless visual renderer | 1 pipeline |
| Observability cron | setiap 5 menit, aktif untuk health endpoint B2B |

Practical Tools saat ini:

1. **Google Contacts Ready** — import XLSX/XLS/CSV, normalisasi nomor Indonesia, dedupe, review, dan export Google Contacts CSV secara lokal di browser.
2. **B2B Prospecting V1** — discovery, enrichment evidence, candidate review, lead database lokal, routing kunjungan, dan briefing WhatsApp. Search provider menggunakan Serper server-side dan Gemini digunakan untuk review/normalisasi evidence melalui Worker.
3. **MASUMI Sales CRM** — aplikasi production terautentikasi di `crm.samson.web.id` dengan lead register, pipeline, priority scoring, KPI, follow-up, backup JSON, dan laporan CSV. Cloudflare Worker menjadi API/trust boundary, Cloudflare D1 menjadi system of record, dan Cloudflare Access melindungi sesi pengguna. Modul `localStorage` V1 dipertahankan hanya sebagai migration fallback.

Core executable tool registry saat ini:

- `sanitize_contact_numbers`
- `resolve_marketing_route`
- `audit_domain_dns`

Tool registry memiliki Zod runtime contracts serta adapter schema untuk OpenAI/Gemini function calling. Ini adalah **deterministic execution layer**, bukan klaim bahwa seluruh 201 prompt sudah dimigrasikan menjadi autonomous functions.

## Product direction

```text
Prompt Library
    ↓
Guided Workflow
    ↓
Context / Evidence
    ↓
Practical Tool / Function Call
    ↓
Validation / Quality Gate
    ↓
Human Approval
    ↓
Artifact / Operational Action
```

Prinsip utama:

- outcome > jumlah prompt;
- workflow > one-shot generation;
- evidence before confidence;
- deterministic code untuk logic yang bisa dibuat deterministik;
- human approval tetap eksplisit untuk publish, deploy, external mutation, dan action berisiko;
- static-first sampai backend capability benar-benar mempunyai nilai produk.

## Architecture

```text
Browser
├─ samson.web.id
│  ├─ Prompt Library + Guided Workflows
│  ├─ Work Assistant + Tools Hub
│  ├─ Vanilla JS/CSS + JSON runtime data
│  └─ localStorage untuk tool local-first
│        │
│        ▼
│  Cloudflare Worker: prompt-v5
│  ├─ static assets: dist/
│  ├─ /api/tools/b2b/*
│  ├─ /api/core/tools/*
│  ├─ native B2B rate limiter
│  └─ scheduled observability engine
│
└─ crm.samson.web.id
   ├─ authenticated CRM application
   └─ same-origin /api/crm/v1/*
         │
         ▼
   Cloudflare Worker: samson-masumi-crm
   ├─ static assets: dist-crm/
   ├─ Cloudflare Access assertion verification
   ├─ role and ownership enforcement
   └─ Cloudflare D1: CRM_DB
```

Server-side secrets tidak boleh masuk frontend atau repository.

### Production deployment map

| Boundary | Canonical config | Runtime / route |
|---|---|---|
| SAMSON public platform | `wrangler.jsonc` | Worker `prompt-v5` at `samson.web.id` |
| MASUMI CRM production | `wrangler.crm.jsonc` → `env.production` | Worker `samson-masumi-crm`, custom domain `crm.samson.web.id`, `CRM_ENVIRONMENT=production` |
| MASUMI CRM preview | `wrangler.crm.jsonc` → `env.preview` + generated preview config | Worker `samson-masumi-crm-preview`, D1 `masumi-crm-preview`, label-gated or manual GitHub workflow |

The all-zero D1 ID in the base CRM configuration is a local-development placeholder. Production D1 identifiers, Cloudflare Access audience/issuer, approved user identities, API tokens, and other secrets are runtime-managed and intentionally excluded from source control. Preview and production use separate Worker/database resources; production lead data must never enter preview, fixtures, CI logs, screenshots, issues, or PR comments.

## Current capability layers

### Prompt & workflow layer

- 201 runtime commands dengan satu example per command.
- 19 categories.
- 12 guided workflows:
  - 6 core workflows;
  - 3 Trading educational analysis workflows;
  - 3 WordPress/WooCommerce workflows.
- Work Assistant menu untuk outcome kerja seperti WhatsApp Broadcast, Email, Social Content, SEO, Website, Customer Support, dan custom work problem.

### Practical Tools layer

Tools Hub modular menggunakan registry dan deep-link routing. Google Contacts tetap local-first. MASUMI Sales CRM production berjalan sebagai aplikasi cloud terpisah dengan API same-origin, D1, Cloudflare Access, serta role Admin/Sales; CRM lokal V1 hanya menjadi migration fallback. B2B Prospecting menggunakan Worker gateway agar API key dan provider traffic tidak masuk browser.

### Tool Calling Engine

`src/core/tools/` menyediakan:

- allowlisted tool definitions;
- Zod payload contracts;
- deterministic executors;
- OpenAI/Gemini schema adapters;
- authorized Worker execution boundary.

`POST /api/core/tools/execute` tetap fail-closed bila execution token belum dikonfigurasi. Tidak ada shell, arbitrary deploy, publish, transaction, atau arbitrary network-write tool di registry.

### Observability Engine

Cloudflare Cron dijadwalkan setiap 5 menit. Engine dapat memonitor HTTPS endpoint publik, mendeteksi timeout/network/status failure, memverifikasi fallback, dan mengirim incident alert melalui operator-configured webhook.

Production config saat ini:

```text
OBSERVABILITY_ENABLED=true
OBSERVABILITY_TIMEOUT_MS=4000
OBSERVABILITY_TARGETS_JSON=[{"name":"SAMSON B2B API Health","url":"https://samson.web.id/api/tools/b2b/health","type":"API"}]
```

Cron berjalan setiap 5 menit dan memeriksa health endpoint B2B yang telah direview. V1 melakukan **fallback verification**, bukan silent route mutation. Secret `ALERT_WEBHOOK_URL`, bila digunakan, tetap dikelola di runtime dan tidak disimpan dalam repository.

### Headless Visual Generator

Pipeline visual deterministic menghasilkan poster edukasi 9:16 untuk Belajar Forex Malang:

```text
JSON payload
   ↓
Zod validation
   ↓
SVG 1080×1920
   ↓
@resvg/resvg-js
   ↓
PNG 1080×1920
```

Contract visual:

- dark retro terminal / 8-bit inspired;
- high contrast;
- attribution selalu `by belajarforexmalang`;
- tanpa logo;
- tanpa remote font/image dependency dalam SVG.

Generate lokal:

```bash
npm run visual:generate
npm run visual:generate -- --input examples/visuals/forex-rule-card.json --name forex-risk-card
```

## Repository quality gates

Development contract:

```text
IDEA / ISSUE
    ↓
REQUIREMENT
    ↓
REPOSITORY INSPECTION
    ↓
FEATURE BRANCH
    ↓
IMPLEMENTATION
    ↓
LINT + TYPECHECK + UNIT/SECURITY TEST
    ↓
BUILD + WRANGLER DRY RUN
    ↓
BROWSER E2E
    ↓
CODEQL / SECURITY
    ↓
CLOUDFLARE PREVIEW
    ↓
HUMAN REVIEW
    ↓
MERGE
    ↓
PRODUCTION VERIFY
```

Protected `main` requires pull request review, resolved conversations, required status checks, Cloudflare build, dan CodeQL policy.

Main verification commands:

```bash
npm ci
npm run validate:data
npm run validate:regression
npm run test:tools
npm run build
npm run validate:security-headers
npm run test:e2e
```

Additional commands:

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint runtime JavaScript |
| `npm run typecheck` | TypeScript strict `noEmit` |
| `npm run test:run` | Vitest unit/security suite |
| `npm run verify:worker` | Wrangler Worker bundle dry-run untuk `prompt-v5` |
| `npm run build:masumi-crm-cloud` | Build aplikasi cloud CRM ke `dist-crm/` |
| `npm run test:masumi-crm-cloud` | Verifikasi fondasi/config CRM cloud |
| `npm run test:masumi-crm-d1` | Verifikasi schema dan migration D1 CRM |
| `npm run test:masumi-crm-api` | Verifikasi auth, role, ownership, dan API CRM |
| `npm run test:masumi-crm-ui` | Verifikasi kontrak UI/client CRM |
| `npm run test:e2e:masumi-crm` | Browser E2E khusus CRM desktop/mobile |
| `npm run verify:masumi-crm-worker` | Build dan Wrangler dry-run Worker CRM preview |
| `npm run visual:generate` | SVG + PNG headless visual artifact |
| `npm run observability:validate` | Validate monitored-target production config |
| `npm run observability:smoke` | Operator-triggered target smoke check |
| `npm run report:prompt-coverage` | Prompt/workflow coverage report |
| `npm run add:prompt` | Controlled prompt intake tooling |

## Runtime data contract

```text
data/commands.json              189 base commands
data/commands-extra.json         12 extra commands
                                 ───
                                 201 commands

data/cheatcodes.json              6 core workflows
data/workflows-trading.json        3 trading workflows
data/workflows-wordpress.json      3 WordPress workflows
                                 ───
                                  12 workflows
```

Validator memastikan:

- command ID unik;
- satu example per command;
- category reference valid;
- workflow prompt references valid;
- retired IDs `47`, `48`, `50`, `52` tidak digunakan kembali.

## Repository structure

```text
.
├── .github/workflows/       # CI, previews, Browser E2E, Production Verify, ops workflows
├── apps/masumi-crm/         # authenticated CRM frontend
├── assets/
├── config/                  # reviewed operational config artifacts
├── data/                    # commands, examples, categories, workflows
├── docs/                    # PRD, architecture, runbooks, audits
├── examples/                # reusable visual/tool payload examples
├── migrations/masumi-crm/  # D1 schema migrations
├── scripts/                 # build, validation, testing, operational CLI
├── src/                     # SAMSON frontend + shared TypeScript modules
├── tests/                   # Vitest/security + Playwright E2E
├── worker/
│  ├── index.js              # prompt-v5 runtime
│  └── masumi-crm/           # isolated CRM API/auth/data boundary
├── package.json
├── wrangler.jsonc           # SAMSON production config
└── wrangler.crm.jsonc       # CRM local/preview/production boundaries
```

## Security model

- API keys/secrets hanya server-side.
- MASUMI CRM production memverifikasi Cloudflare Access assertion dan user aktif pada setiap endpoint selain health.
- Role Admin/Sales dan ownership lead ditegakkan server-side; request lintas owner tidak bergantung pada filter UI.
- D1 preview dan production terisolasi; `localStorage` bukan system of record untuk aplikasi CRM cloud.
- Mutasi CRM menggunakan request ID, optimistic concurrency, soft delete, bound query, dan audit event.
- B2B target URL menggunakan anti-SSRF sanitizer.
- Runtime request contracts menggunakan Zod.
- security headers dan CSP divalidasi sebelum merge.
- CodeQL menjadi protected-branch policy.
- tool execution menggunakan allowlist + authorization boundary.
- observability target/webhook dibatasi ke public HTTPS targets.
- visual renderer menghindari remote image/font fetch.

## Development model

SAMSON dikembangkan dengan **AI-assisted / supervised vibe coding**. User menentukan intent, requirement, acceptance criteria, dan keputusan produk. AI membantu inspection, implementation, debugging, testing, documentation, dan review. Generated code bukan definition of done.

## Roadmap status

### Foundation — implemented

- Prompt Library + 12 Guided Workflows;
- Adaptive UI + four personalities;
- Work Assistant;
- modular Tools Hub;
- Google Contacts tool;
- B2B Prospecting V1;
- MASUMI Sales CRM V1 + authenticated cloud production at `crm.samson.web.id`.

### Hardening / automation roadmap — implemented

1. URL Sanitizer & Anti-SSRF ✅
2. CI/CD Guard + Zod + Vitest + Wrangler verification ✅
3. Deterministic Function Calling Engine ✅
4. Observability / fallback verification / alerting engine ✅
5. Headless Visual Generator SVG/PNG ✅

### Current consolidation priority

1. keep README, PRD, dan runbook synchronized with production architecture;
2. remove stale branches only after ancestry audit and explicit approval;
3. maintain B2B production monitoring and verify alert delivery/recovery drills;
4. make visual generation available as repeatable CI artifact workflow;
5. continue toward Workflow Engine V2 / Context / Quality / Evidence / Artifact orchestration.

## Important scope boundary

SAMSON sudah memiliki server-side AI provider integration untuk B2B evidence review, tetapi **belum merupakan fully autonomous general-purpose agent**. Tool Engine V1 menjalankan allowlisted deterministic tools; full model→tool→result→model iterative orchestration harus ditambahkan dengan explicit policy, iteration limits, audit trail, idempotency, dan side-effect approval gates.
