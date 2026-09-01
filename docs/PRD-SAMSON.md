# PRD — SAMSON

| Metadata | Nilai |
|---|---|
| Produk | SAMSON |
| Domain | `samson.web.id` |
| Repository | `traderalwaysprofit/prompt` |
| Dokumen | Canonical Product Requirements Document |
| Status | Active / evolving |
| Baseline | 30 Agustus 2026 |
| Arsitektur saat ini | Static-first, Vanilla JS/CSS, JSON runtime, Cloudflare Workers |
| Metode development | AI-assisted / supervised vibe coding |

## 1. Product statement

SAMSON adalah **AI Cheatcodes for Real Work**: prompt library dan guided workflow yang membantu pengguna mengubah tujuan kerja menjadi instruksi AI yang terstruktur, dapat digunakan ulang, dan semakin diarahkan menuju outcome yang dapat diverifikasi.

SAMSON tidak ditujukan menjadi sekadar katalog prompt. Arah produknya adalah **AI Work System** yang menghubungkan prompt, workflow, context, quality gate, evidence, approval, dan artifact output.

## 2. Kondisi produk saat ini

Baseline runtime saat dokumen ini diperbarui:

| Komponen | Kondisi |
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

Enam core workflow melayani outcome umum seperti website, SaaS, marketing, SEO/content, research, dan automation. Domain catalog kemudian diperluas dengan tiga workflow Trading dan tiga workflow WordPress.

UI personality yang aktif:

- Samson Default — baseline product UI;
- Developer — technical/developer-oriented presentation;
- Swiss — editorial/minimal presentation;
- Pixel — retro wire/editorial presentation.

## 3. Masalah yang diselesaikan

Penggunaan AI untuk pekerjaan nyata sering mengalami beberapa masalah:

1. pengguna mengetahui tujuan tetapi tidak mengetahui prompt yang tepat;
2. prompt tunggal tidak cukup untuk pekerjaan multi-step;
3. context harus diulang pada banyak prompt;
4. hasil AI sulit dinilai secara konsisten;
5. evidence dan asumsi sering tercampur;
6. hasil berhenti sebagai chat dan belum menjadi deliverable;
7. proses AI sulit dijadikan workflow atau SOP yang dapat digunakan ulang.

SAMSON memecahkan masalah ini secara bertahap, dimulai dari prompt discovery dan guided workflows, lalu berkembang menuju verified work systems.

## 4. Target pengguna

Fokus utama SAMSON adalah **Digital Operators** yang menggunakan AI sebagai bagian dari pekerjaan sehari-hari, khususnya:

- freelancer dan independent operator;
- web builder dan developer;
- digital marketer;
- SEO/content operator;
- designer yang menggunakan AI;
- researcher;
- WordPress/WooCommerce operator;
- small agency dan small team.

Domain khusus seperti Trading diposisikan sebagai **educational analysis / decision support**, bukan layanan sinyal atau janji profit.

## 5. Prinsip produk

### 5.1 Outcome over prompt count

Jumlah prompt bukan moat utama. Prompt harus terhubung ke kebutuhan nyata, contoh, workflow, dan outcome.

### 5.2 Workflow over one-shot generation

Pekerjaan kompleks harus dipecah menjadi langkah, input, output, validation, dan checkpoint yang jelas.

### 5.3 Evidence before confidence

Untuk research, audit, SEO, technical recommendation, dan domain faktual lain, evidence harus dapat dibedakan dari asumsi.

### 5.4 Human approval remains explicit

Automation tidak boleh menghapus human review pada perubahan produk, deployment, atau output berisiko tinggi.

### 5.5 Static-first until backend value is proven

SAMSON tidak menambah backend, account system, database, atau AI provider API hanya karena tersedia. Infrastruktur baru ditambahkan ketika capability tersebut diperlukan oleh produk dan sudah memiliki acceptance criteria.

### 5.6 Quality is a product feature

Validation, regression testing, accessibility, security, evidence, dan quality scoring diperlakukan sebagai bagian dari produk, bukan tahap kosmetik terakhir.

## 6. Arsitektur baseline

SAMSON saat ini berjalan tanpa frontend framework dan tanpa backend aplikasi.

```text
Browser
  ├─ index.html
  ├─ src/*.js
  ├─ src/*.css
  ├─ data/*.json
  ├─ vendor/xlsx.full.min.js
  └─ localStorage
        ↓
Static build: dist/
        ↓
Cloudflare Workers
        ↓
samson.web.id
```

Runtime command berasal dari gabungan:

```text
data/commands.json          189 base commands
data/commands-extra.json     12 extra commands
                             ──
                             201 runtime commands
```

Workflow berasal dari:

```text
data/cheatcodes.json             6 core workflows
data/workflows-trading.json      3 trading workflows
data/workflows-wordpress.json    3 WordPress workflows
                                 ──
                                12 total workflows
```

Favorites, recently used, theme preference, dan progress workflow yang bersifat personal disimpan di browser melalui `localStorage`.

## 7. Development model

SAMSON dibangun menggunakan **AI-assisted / supervised vibe coding**. User mengarahkan intent, requirement, acceptance criteria, dan keputusan produk; AI membantu inspeksi repository, implementasi, testing, debugging, dan dokumentasi.

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

Perubahan tidak boleh langsung dianggap selesai hanya karena code berhasil digenerate.

## 8. Existing functional requirements

### FR-1 — Prompt Library

- pencarian command;
- category filter;
- responsive pagination;
- prompt detail;
- template siap salin;
- example satu banding satu;
- favorites dan recently used;
- runtime statistics dari data aktual.

### FR-2 — Guided Workflow

- user dapat memilih workflow berdasarkan outcome/domain;
- setiap workflow memiliki langkah yang terurut;
- setiap langkah mempunyai description, expected output, dan satu atau lebih prompt reference;
- progress dapat disimpan lokal;
- seluruh prompt reference harus valid terhadap runtime command catalog.

### FR-3 — Adaptive UI

- empat UI personality tersedia;
- Samson Default tetap menjadi baseline/reset;
- mutation visual tidak boleh mengubah data atau behavior inti;
- layout harus tetap usable pada desktop dan mobile.

### FR-4 — Data integrity

- command ID unik;
- setiap command memiliki satu example;
- `categoryId` valid;
- workflow tidak boleh mereferensikan command yang tidak ada;
- retired ID `47`, `48`, `50`, dan `52` tidak boleh digunakan kembali.

### FR-5 — Safe prompt intake

Penambahan prompt harus dilakukan melalui workflow terkontrol dan pull request, bukan edit langsung ke `main`.

### FR-6 — Practical Tools

- menu Tools tersedia di More pada desktop dan menu kerja pada mobile;
- tool Excel → Google Contacts menerima `.xlsx`, `.xls`, dan `.csv` dengan urutan kolom Nama, Brand/Perusahaan, dan WhatsApp;
- data kontak diproses lokal di browser dan tidak dikirim ke backend;
- nomor Indonesia dinormalisasi ke format `+62`, nomor duplikat atau tidak valid ditandai, dan hanya baris yang dapat diekspor yang masuk ke CSV;
- output memakai header template Google Contacts yang berlaku dan membatasi satu proses hingga 3.000 kontak;
- tampilan dan behavior tetap usable pada keempat UI personality.

## 9. Non-functional requirements

- static build harus reproducible;
- runtime tidak boleh membutuhkan secret di browser;
- security headers wajib tervalidasi;
- accessibility dan responsive behavior harus diuji;
- perubahan UI tidak boleh menurunkan readability atau menyebabkan horizontal overflow;
- data regression harus terdeteksi sebelum merge;
- deployment harus dapat diverifikasi terhadap commit yang dirilis;
- API key AI tidak boleh ditempatkan di JavaScript frontend.

## 10. CI/CD dan release gates

Repository menggunakan tiga workflow utama:

1. **Validate** — data contract, regression, build, release/security validation;
2. **Browser E2E** — Playwright terhadap build source saat ini;
3. **Production Verify** — verifikasi deployment production terhadap release/commit yang benar.

Cloudflare build/preview menjadi gate tambahan untuk perubahan yang akan dirilis.

Minimum validation contract:

```bash
npm ci
npm run validate:data
npm run validate:regression
npm run build
npm run validate:security-headers
npm run test:e2e
```

Merge dilakukan setelah perubahan dapat direview dan gate yang relevan berhasil.

## 11. Product roadmap

### Phase V1 — Foundation — implemented

- Prompt Library;
- guided workflows;
- runtime JSON contract;
- favorites/recently used;
- automated prompt intake;
- adaptive UI personalities;
- CI, Browser E2E, Cloudflare deployment verification.

### Phase V1.2 — Workflow Engine V2 — next priority

Target contract:

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
EXPORT
```

Tujuan: mengubah guided workflow dari daftar langkah menjadi executable work specification yang mempunyai input, output, quality gate, dan artifact contract.

### Phase V2.1 — Context Capsule

Context reusable per project:

- organization/company;
- project;
- audience;
- brand/tone;
- products/services;
- preferred tools/model;
- technology stack;
- constraints.

Context Capsule harus dapat dipakai ulang oleh beberapa workflow tanpa copy-paste berulang.

### Phase V2.2 — Quality Engine

Output dinilai pada dimensi yang relevan seperti:

- completeness;
- accuracy/consistency;
- evidence;
- actionability;
- accessibility;
- anti-slop quality;
- risk.

Baseline product rule yang akan diuji: **PASS >= 85; REFINE < 85**.

### Phase V2.3 — Proof Mode

Untuk workflow faktual/teknis:

- source requirement;
- claim verification;
- explicit assumptions;
- confidence;
- unresolved findings;
- evidence trail.

### Phase V2.4 — Artifact Output

Workflow harus dapat menghasilkan deliverable seperti Markdown, JSON, report, checklist, implementation plan, audit finding, atau project file sesuai use case.

### Phase V2.5 — Premium Workflow Packs

Monetisasi awal tidak membutuhkan full SaaS. Kandidat pack:

- WordPress Audit / Production;
- SEO & AI Search;
- Website Builder;
- Marketing Launch;
- Anti-Slop Design.

WordPress Audit menjadi kandidat pilot pertama karena domain prompt dan workflow terkait sudah tersedia.

### Phase V3 — SAMSON Pro

Baru setelah penggunaan dan willingness-to-pay tervalidasi:

- account;
- projects;
- private context;
- workflow history;
- saved/private workflows.

### Phase V3.1 — SAMSON API Layer

Backend abstraction untuk capability server-side:

```text
SAMSON Frontend
      ↓
SAMSON API
      ↓
Model / Tool Adapter
```

Frontend tidak boleh bergantung langsung pada provider tertentu.

### Phase V3.2 — AI Execution

Workflow dapat dieksekusi langsung melalui SAMSON tanpa copy-paste manual ke provider AI.

### Phase V3.3 — Multi-Model Evaluator

Beberapa model dapat menghasilkan candidate output dan SAMSON memilih hasil berdasarkan acceptance criteria/quality evaluation, bukan hanya menampilkan jawaban berdampingan.

### Phase V3.4 — Team Workspace

- shared context;
- shared workflow;
- roles/permissions;
- approval;
- versioning;
- audit log.

### Phase V3.5 — Workflow to SOP

Workflow dapat dikonversi menjadi SOP operasional dengan owner, inputs, procedure, AI instructions, human checkpoints, quality control, failure handling, dan expected output.

### Phase V4 — Marketplace

Marketplace hanya dibuka setelah SAMSON membuktikan bahwa verified workflow buatan internal memiliki value dan dapat dijual. Unit marketplace adalah workflow/SOP/playbook yang tervalidasi, bukan sekadar prompt mentah.

## 12. Explicitly out of current roadmap

**Personal AI Radar / AI news feed tidak termasuk roadmap aktif.** Eksperimen tersebut pernah dibuat pada feature branch tetapi ditutup tanpa merge dan tidak menjadi bagian dari `main` atau production.

SAMSON juga belum menggunakan AI provider API pada runtime. Tidak ada OpenAI/Anthropic/Gemini key yang boleh ditambahkan ke frontend pada phase saat ini.

## 13. Monetization hypothesis

Urutan monetisasi yang diuji:

```text
Free core product
   ↓
Verified Workflow Packs
   ↓
SAMSON Pro
   ↓
Team / SOP
   ↓
Marketplace
```

Hipotesis harga awal untuk validation, bukan harga final:

| Pack | Candidate price |
|---|---:|
| Anti-Slop Design | Rp79k |
| WordPress Production / Audit | Rp99k |
| SEO & AI Search | Rp99k |
| Marketing Launch | Rp99k |
| Website Builder | Rp129k |
| Bundle | Rp249k–299k |

Pricing harus divalidasi melalui penggunaan dan conversion, bukan dianggap keputusan permanen PRD.

## 14. Success metrics

### Product quality

- data validation pass rate;
- Browser E2E pass rate;
- production verification pass rate;
- regression escape rate;
- accessibility/mobile regressions;
- workflow completion rate.

### User value

- prompt-to-workflow adoption;
- workflow completion;
- repeat workflow usage;
- artifact completion;
- percentage output yang lolos quality gate tanpa manual rewrite besar.

### Business

- workflow pack conversion;
- repeat purchase / upgrade;
- Pro activation;
- team adoption;
- willingness-to-pay per outcome/domain.

## 15. Definition of Done

Sebuah feature SAMSON dianggap selesai hanya jika:

1. requirement dan scope jelas;
2. data/behavior contract tetap valid;
3. responsive dan accessibility tidak mengalami regression;
4. test yang relevan tersedia dan pass;
5. security/release checks pass;
6. Cloudflare preview/deployment sesuai commit;
7. perubahan direview manusia sebelum merge;
8. dokumentasi diperbarui jika behavior, architecture, runtime totals, atau roadmap berubah.

## 16. Dokumen terkait

- `README.md` — operator/developer overview;
- `docs/FRONTEND-ARCHITECTURE-V1.md` — baseline frontend architecture;
- `docs/ADAPTIVE-UI.md` — UI personality contract;
- `docs/ADDING-PROMPTS.md` — safe prompt intake;
- `docs/PRD-MERGE-KREATIF-DESIGN.md` — historical feature PRD untuk deduplikasi kategori design.
