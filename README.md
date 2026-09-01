# SAMSON

**AI Cheatcodes for Real Work** — prompt library dan guided workflow berbasis web untuk membantu pengguna mengubah tujuan kerja menjadi instruksi AI yang terstruktur, reusable, dan semakin diarahkan menuju outcome yang dapat diverifikasi.

**Live:** [samson.web.id](https://samson.web.id)

## Ringkasan

SAMSON adalah aplikasi **static-first** tanpa backend aplikasi dan tanpa frontend framework. Runtime berjalan dengan Vanilla JavaScript/CSS, file JSON, `localStorage`, build statis, GitHub CI, dan Cloudflare Workers.

SAMSON saat ini berfungsi sebagai **Prompt Library + Guided Workflow + Practical Tools**, tetapi arah produknya adalah **AI Work System**:

```text
Prompt
  ↓
Workflow
  ↓
Context
  ↓
Quality / Evidence
  ↓
Approval
  ↓
Artifact
```

Baseline runtime saat ini:

| Komponen | Jumlah |
|---|---:|
| Prompt / command | 201 |
| Contoh penggunaan | 201 |
| Kategori | 19 |
| Core workflow | 6 |
| Trading workflow | 3 |
| WordPress workflow | 3 |
| Total guided workflow | 12 |
| Practical tool | 1 |
| UI personality | 4 |

## Fitur utama

- Prompt Library dengan pencarian, category filter, dan pagination responsif.
- 12 Guided Workflow untuk core productivity, Trading educational analysis, dan WordPress/WooCommerce.
- Detail prompt dengan description, example, template siap salin, dan favorites.
- Favorites, recently used, theme preference, dan workflow progress disimpan melalui `localStorage`.
- Runtime statistics berasal dari data aktual, bukan angka statis di UI.
- Automated prompt intake melalui GitHub workflow dan pull request.
- Adaptive UI dengan empat personality: **Samson Default, Developer, Swiss, Pixel**.
- Practical Tools Hub modular dengan katalog `#tools`; Google Contacts Ready memakai template Excel A–C dan memproses data secara lokal di browser.
- Data validation, regression protection, security-header validation, Browser E2E, dan production verification.
- Cloudflare preview/build sebelum perubahan masuk production.

## Development model

SAMSON dibangun menggunakan **AI-assisted / supervised vibe coding**.

User mengarahkan intent, requirement, acceptance criteria, dan keputusan produk. AI membantu repository inspection, implementasi, debugging, testing, dan dokumentasi. Code generation bukan definition of done.

Workflow development yang digunakan:

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
VALIDATION + REGRESSION
    ↓
BROWSER E2E
    ↓
SECURITY / CODE SCANNING
    ↓
CLOUDFLARE PREVIEW
    ↓
HUMAN REVIEW
    ↓
MERGE
    ↓
PRODUCTION VERIFY
```

Untuk pekerjaan repository, perubahan dibuat di feature branch dan pull request. `main` tidak digunakan sebagai tempat eksperimen langsung.

## Menjalankan secara lokal

Persyaratan: Node.js 20+ dan npm.

```bash
npm ci
npm run validate:data
npm run build
```

Hasil build tersedia di `dist/`. Untuk Browser E2E pertama kali:

```bash
npx playwright install chromium
npm run test:e2e
```

## Perintah proyek

| Perintah | Fungsi |
|---|---|
| `npm run build` | Membangun aset statis ke `dist/` |
| `npm run validate:data` | Memvalidasi command, example, category, workflow, dan referensinya |
| `npm run validate:regression` | Mendeteksi penghapusan/perubahan data yang tidak disetujui |
| `npm run validate:security-headers` | Memastikan security-header contract tersedia |
| `npm run test:tools` | Menguji normalisasi, deduplikasi, limit, dan ekspor Practical Tools |
| `npm run report:prompt-coverage` | Melaporkan penggunaan prompt di guided workflow |
| `npm run add:prompt` | Menambahkan prompt melalui tooling terkontrol |
| `npm run test:e2e` | Menjalankan Playwright Browser E2E |

## Struktur repositori

```text
.
├── .github/workflows/     # Validate, Browser E2E, Production Verify
├── assets/templates/      # Template input Excel yang dapat diunduh dari Tools
├── data/                  # Commands, examples, categories, workflows
├── docs/                  # PRD dan dokumentasi teknis
├── scripts/               # Build, validation, regression, tooling
├── src/                   # Vanilla JavaScript dan CSS
├── tests/e2e/             # Playwright browser tests
├── vendor/                # Metadata dependensi browser yang dipublikasikan saat build
├── index.html             # Entry point
├── _headers               # Security-header policy
└── wrangler.jsonc         # Cloudflare Workers config
```

## Kontrak data runtime

Command catalog:

- `data/commands.json` — **189 base commands**;
- `data/commands-extra.json` — **12 extra commands**;
- total — **201 runtime commands**.

Examples:

- `data/examples.json`;
- `data/examples-extra.json`;
- contract: **tepat satu example untuk setiap command**.

Workflow catalog:

- `data/cheatcodes.json` — **6 core workflows**;
- `data/workflows-trading.json` — **3 Trading workflows**;
- `data/workflows-wordpress.json` — **3 WordPress workflows**;
- total — **12 workflows**.

Categories:

- `data/categories.json` — **19 categories**.

Validator memastikan seluruh `promptIds` workflow menunjuk ke command aktif dan seluruh command menunjuk ke category yang valid.

Setiap command minimum memiliki struktur:

```json
{
  "id": 184,
  "name": "/poster",
  "categoryId": "design",
  "description": "Konsep poster event/promosi",
  "template": "Create a structured konsep poster event/promosi."
}
```

Command ID harus unik. ID `47`, `48`, `50`, dan `52` telah dipensiunkan dan tidak boleh digunakan kembali.

## Command tambahan strategis

Ekstensi runtime saat ini mencakup capability seperti:

- `/vibecode` — production-oriented AI-assisted coding;
- `/multimodel` — multi-model orchestration;
- `/cloudflare` — Cloudflare deployment/optimization;
- `/github` — GitHub code workflow;
- `/aiaudit` — independent AI audit;
- `/autopilot` — end-to-end AI production orchestration;
- `/sourceradar` — source-first research;
- `/antislopui` — UI quality / anti-slop review;
- `/wordpress`, `/woocommerce`, `/wpaudit` — WordPress production domain.

## Menambahkan prompt

Gunakan workflow yang dilindungi; jangan menulis data prompt langsung ke `main`.

1. Buka **Actions → Validate → Run workflow**.
2. Isi alias, category ID, description, template, dan example.
3. Pilih workflow tujuan jika prompt memang menjadi bagian dari perjalanan terpandu; jika tidak, gunakan `none`.
4. Jalankan workflow dan review pull request dari `github-actions[bot]`.
5. Merge hanya setelah gate yang relevan berhasil.

Panduan lengkap: [Adding Prompts Safely](docs/ADDING-PROMPTS.md).

## Quality gates

Tiga workflow CI utama:

### Validate

Memeriksa data contract, regression, build, security/release contract, dan prompt-workflow coverage.

### Browser E2E

Menjalankan Playwright terhadap source build untuk mengunci behavior penting di desktop/mobile dan mencegah regression UI.

### Production Verify

Memastikan deployment yang live sesuai commit/release yang dituju dan mengecek contract production yang relevan.

Minimum local validation:

```bash
npm run validate:data
npm run validate:regression
npm run build
npm run validate:security-headers
npm run test:e2e
```

Cloudflare build/preview dan human review tetap menjadi bagian dari release workflow.

## Deployment

Build menghasilkan static assets pada `dist/` dan dideploy melalui Cloudflare Workers sesuai `wrangler.jsonc`.

`_headers` menerapkan kebijakan seperti CSP, HSTS, clickjacking protection, MIME-sniffing protection, referrer policy, permissions policy, dan cross-origin controls.

SAMSON saat ini **belum menggunakan AI provider API pada runtime**. Tidak ada OpenAI, Anthropic, atau Gemini API key yang seharusnya berada di JavaScript frontend.

## Roadmap

Prioritas pengembangan saat ini:

```text
CURRENT
Prompt Library + 12 Guided Workflows
        ↓
1. Workflow Engine V2
        ↓
2. Context Capsule
        ↓
3. Quality Engine
        ↓
4. Proof Mode
        ↓
5. Artifact Output
        ↓
6. Premium Workflow Packs
        ↓
7. Account / Projects
        ↓
8. SAMSON API Layer
        ↓
9. AI Execution
        ↓
10. Multi-Model Evaluator
        ↓
11. Team Workspace
        ↓
12. Workflow → SOP
        ↓
13. Marketplace
```

Workflow Engine V2 akan menggunakan contract utama:

```text
INPUT → CONTEXT → PROCESS → AI/TOOL → EXPECTED OUTPUT
→ EVIDENCE → VALIDATE → SCORE → HUMAN APPROVAL → EXPORT
```

**Personal AI Radar tidak termasuk roadmap aktif** dan tidak pernah masuk `main`/production.

## Monetization direction

SAMSON tidak perlu menunggu full SaaS untuk mulai diuji secara komersial. Tahap monetisasi pertama yang direncanakan adalah **Verified Workflow Packs**, kemudian SAMSON Pro, Team/SOP, dan marketplace setelah product value terbukti.

Kandidat pack awal:

- WordPress Audit / Production;
- SEO & AI Search;
- Website Builder;
- Marketing Launch;
- Anti-Slop Design.

## Dokumentasi

- [PRD — SAMSON](docs/PRD-SAMSON.md) — **canonical product PRD**
- [Frontend Architecture V1](docs/FRONTEND-ARCHITECTURE-V1.md)
- [Adaptive UI](docs/ADAPTIVE-UI.md)
- [Adding Prompts Safely](docs/ADDING-PROMPTS.md)
- [Historical PRD — Merge Kreatif & Design](docs/PRD-MERGE-KREATIF-DESIGN.md)

## Alur kontribusi

1. Mulai dari `main` terbaru.
2. Buat feature branch dengan scope kecil dan jelas.
3. Inspect code/data sebelum mengubah behavior.
4. Implementasikan perubahan dan test yang relevan.
5. Jalankan validation, build, regression, security, dan Browser E2E.
6. Buat pull request dengan ringkasan, risiko, dan bukti validasi.
7. Review Cloudflare preview/checks.
8. Merge hanya setelah human approval dan gate yang relevan berhasil.
9. Verifikasi production setelah merge.
