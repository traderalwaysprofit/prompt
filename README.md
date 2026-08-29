# SAMSON Prompt

AI cheatcodes, guided workflows, dan personal intelligence berbasis web untuk membantu pengguna mengubah kebutuhan kerja menjadi prompt, workflow, dan tindakan yang dapat digunakan kembali.

**Live:** [samson.web.id](https://samson.web.id)

## Ringkasan

SAMSON adalah aplikasi static-first tanpa backend dan tanpa frontend framework. Katalog utama dimuat dari file JSON saat runtime, sedangkan pencarian, filter, favorit, riwayat penggunaan, workflow progress, dan state Personal AI Radar dijalankan langsung di browser.

Kondisi runtime saat ini:

| Komponen | Jumlah |
|---|---:|
| Prompt | 201 |
| Contoh penggunaan | 201 |
| Kategori | 19 |
| Guided workflow | 12 |
| Personal AI Radar | Personal Beta |

## Fitur utama

- Prompt Library dengan pencarian, filter kategori, pagination responsif, favorites, dan recently used.
- 12 Guided Workflows: 6 core, 3 Trading educational-analysis, dan 3 WordPress.
- Personal AI Radar dengan pola `Know → Decide → Apply`: trusted source, topic, relevance/impact/actionability/confidence/novelty score, Save, Testing, Applied, dan Create Action.
- Radar personal state disimpan melalui `localStorage`; source signal tetap berasal dari data terkurasi dan tidak menyimpan preferensi personal di repository.
- Adaptive UI dengan empat personality: Samson Default, Developer, Swiss, dan Pixel.
- Anti-Slop quality layer untuk menjaga consistency dan distinctiveness UI.
- Runtime statistics berasal dari data aktual, bukan angka statis di antarmuka.
- Error state eksplisit ketika pipeline data tidak dapat dimuat.
- CI untuk validasi data, Radar contract, build, security headers, regression, dan browser E2E.

## Menjalankan secara lokal

Persyaratan: Node.js 20+ dan npm.

```bash
npm ci
npm run validate:data
npm run build
```

Hasil build tersedia di `dist/`. Untuk menjalankan browser E2E pertama kali:

```bash
npx playwright install chromium
npm run test:e2e
```

## Perintah proyek

| Perintah | Fungsi |
|---|---|
| `npm run build` | Membangun aset statis ke `dist/` |
| `npm run validate:data` | Memvalidasi prompt/workflow data sekaligus Personal AI Radar contract |
| `npm run validate:regression` | Mendeteksi penghapusan atau perubahan data yang tidak disetujui |
| `npm run validate:security-headers` | Memastikan header keamanan wajib tersedia |
| `npm run report:prompt-coverage` | Melaporkan cakupan prompt pada guided workflow |
| `npm run add:prompt` | Menambahkan prompt melalui skrip terkontrol |
| `npm run test:e2e` | Menjalankan pengujian Playwright |

## Struktur repositori

```text
.
├── .github/workflows/     # CI, browser E2E, dan verifikasi produksi
├── data/                  # Commands, examples, categories, workflows, radar signals
├── docs/                  # Dokumentasi produk dan teknis
├── scripts/               # Build, validasi, coverage, dan tooling data
├── src/                   # JavaScript dan CSS aplikasi
├── tests/e2e/             # Pengujian browser
├── index.html             # Entry point aplikasi
├── _headers               # Security headers untuk static assets
└── wrangler.jsonc         # Konfigurasi Cloudflare Workers
```

## Kontrak data

Browser memuat data utama berikut:

- `data/commands.json` — 189 prompt dasar;
- `data/commands-extra.json` — prompt tambahan yang terus berkembang;
- `data/examples.json` dan `data/examples-extra.json` — satu contoh untuk setiap prompt;
- `data/categories.json` — kategori canonical;
- `data/cheatcodes.json` — 6 core guided workflows;
- `data/workflows-trading.json` — 3 Trading workflows;
- `data/workflows-wordpress.json` — 3 WordPress workflows;
- `data/radar-items.json` — trusted-source Personal AI Radar signals.

Setiap command wajib memiliki struktur berikut:

```json
{
  "id": 184,
  "name": "/poster",
  "categoryId": "design",
  "description": "Konsep poster event/promosi",
  "template": "Create a structured konsep poster event/promosi."
}
```

ID command harus unik dan tidak boleh digunakan ulang. ID `47`, `48`, `50`, dan `52` telah dipensiunkan secara permanen setelah deduplikasi kategori desain.

## Personal AI Radar R1

Radar mengikuti SAMSON Intelligence Loop:

```text
OBSERVE → UNDERSTAND → DECIDE → ACT → VERIFY → LEARN
```

R1 sengaja tidak memiliki account, database, AI API, cron ingestion, atau public SEO layer. Signal terkurasi berada di `data/radar-items.json`; state `Read`, `Save`, `Testing`, `Applied`, dan action queue hanya disimpan pada browser pengguna. Data Radar divalidasi untuk source provenance, HTTPS source URL, score 0–100, weighted Radar score, related prompt references, dan related workflow references.

## Menambahkan prompt

Gunakan workflow yang sudah dilindungi; jangan menulis langsung ke `main`.

1. Buka **Actions → Validate → Run workflow**.
2. Isi alias, category ID, description, template, dan example.
3. Pilih workflow tujuan jika prompt memang menjadi bagian dari perjalanan terpandu; jika tidak, gunakan `none`.
4. Jalankan workflow dan review pull request dari `github-actions[bot]`.
5. Merge hanya setelah seluruh required checks berhasil.

Panduan lengkap: [Adding Prompts Safely](docs/ADDING-PROMPTS.md).

## Quality gate

Sebelum pull request di-merge, perubahan harus melewati:

```bash
npm run validate:data
npm run build
npm run validate:security-headers
npm run validate:regression
npm run test:e2e
```

Branch `main` menggunakan protected pull-request workflow. Force push dan deletion diblokir, sedangkan required checks harus berhasil sebelum merge.

## Deployment

Build menghasilkan static assets pada `dist/` dan dideploy ke Cloudflare Workers sesuai `wrangler.jsonc`. `_headers` menerapkan CSP, HSTS, clickjacking protection, MIME sniffing protection, referrer policy, permissions policy, serta kebijakan cross-origin.

## Dokumentasi

- [Frontend Architecture V1](docs/FRONTEND-ARCHITECTURE-V1.md)
- [Adding Prompts Safely](docs/ADDING-PROMPTS.md)
- [PRD — Merge Kreatif & Design](docs/PRD-MERGE-KREATIF-DESIGN.md)

## Alur kontribusi

1. Buat branch dari `main`.
2. Lakukan perubahan dengan scope kecil dan jelas.
3. Jalankan quality gate yang relevan.
4. Buat pull request dengan ringkasan perubahan dan bukti validasi.
5. Minta review, tunggu required checks, lalu squash-merge.
