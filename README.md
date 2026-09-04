# SAMSON

**AI Cheatcodes for Real Work** — AI work system berbasis web untuk mengubah tujuan kerja menjadi prompt, guided workflow, practical tools, executable tool contracts, dan artifact yang dapat diverifikasi.

**Live:** https://samson.web.id

## Status — September 2026

SAMSON berawal sebagai Prompt Library static-first dan sekarang berkembang menjadi **AI-assisted operator platform**. Frontend tetap Vanilla JavaScript/CSS + JSON, sementara capability yang membutuhkan secret/network berjalan melalui Cloudflare Worker.

Baseline runtime:

| Komponen | Kondisi |
|---|---:|
| Prompt / command | 201 |
| Example | 201 |
| Category | 19 |
| Guided workflow | 12 |
| Practical Tools | 2 |
| Core executable system tools | 3 |
| UI personality | 4 |
| Headless visual renderer | 1 pipeline |
| Observability cron | setiap 5 menit, disabled by default |

Practical Tools saat ini:

1. **Google Contacts Ready** — import XLSX/XLS/CSV, normalisasi nomor Indonesia, dedupe, review, dan export Google Contacts CSV secara lokal di browser.
2. **B2B Prospecting V1** — discovery, enrichment evidence, candidate review, lead database lokal, routing kunjungan, dan briefing WhatsApp. Search provider menggunakan Serper server-side dan Gemini digunakan untuk review/normalisasi evidence melalui Worker.

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
├─ Prompt Library
├─ Guided Workflows
├─ Work Assistant
├─ Tools Hub
├─ Vanilla JS/CSS
├─ JSON runtime data
└─ localStorage
       │
       ▼
Static build: dist/
       │
       ▼
Cloudflare Worker: prompt-v5
├─ static assets
├─ /api/tools/b2b/*
├─ /api/core/tools/*
├─ server-side provider adapters
├─ scheduled observability engine
└─ production deployment / preview
```

Server-side secrets tidak boleh masuk frontend atau repository.

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

Tools Hub modular menggunakan registry dan deep-link routing. Google Contacts tetap local-first. B2B Prospecting menggunakan Worker gateway agar API key dan provider traffic tidak masuk browser.

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

Default production config sengaja aman:

```text
OBSERVABILITY_ENABLED=false
OBSERVABILITY_TIMEOUT_MS=4000
OBSERVABILITY_TARGETS_JSON=[]
```

V1 melakukan **fallback verification**, bukan silent route mutation. Aktivasi production memerlukan review target serta secret `ALERT_WEBHOOK_URL`.

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
| `npm run verify:worker` | Wrangler Worker bundle dry-run |
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
├── .github/workflows/       # CI, Validate, Browser E2E, Production Verify, ops workflows
├── assets/
├── config/                  # reviewed operational config artifacts
├── data/                    # commands, examples, categories, workflows
├── docs/                    # PRD, architecture, runbooks, audits
├── examples/                # reusable visual/tool payload examples
├── scripts/                 # build, validation, testing, operational CLI
├── src/                     # frontend + TypeScript core/visual modules
├── tests/                   # Vitest/security + Playwright E2E
├── worker/                  # Cloudflare Worker runtime
├── package.json
└── wrangler.jsonc
```

## Security model

- API keys/secrets hanya server-side.
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
- B2B Prospecting V1.

### Hardening / automation roadmap — implemented

1. URL Sanitizer & Anti-SSRF ✅
2. CI/CD Guard + Zod + Vitest + Wrangler verification ✅
3. Deterministic Function Calling Engine ✅
4. Observability / fallback verification / alerting engine ✅
5. Headless Visual Generator SVG/PNG ✅

### Current consolidation priority

1. keep README/PRD synchronized with production architecture;
2. remove stale branches only after ancestry audit and explicit approval;
3. operationalize observability through reviewed targets + secret configuration;
4. make visual generation available as repeatable CI artifact workflow;
5. continue toward Workflow Engine V2 / Context / Quality / Evidence / Artifact orchestration.

## Important scope boundary

SAMSON sudah memiliki server-side AI provider integration untuk B2B evidence review, tetapi **belum merupakan fully autonomous general-purpose agent**. Tool Engine V1 menjalankan allowlisted deterministic tools; full model→tool→result→model iterative orchestration harus ditambahkan dengan explicit policy, iteration limits, audit trail, idempotency, dan side-effect approval gates.