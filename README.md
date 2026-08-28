# SAMSON Prompt

Prompt library dan guided workflow berbasis web untuk membantu pengguna memilih, memahami, dan menyalin prompt AI dengan cepat.

**Live:** [samson.web.id](https://samson.web.id)

## Ringkasan

SAMSON Prompt adalah aplikasi static-first tanpa backend dan tanpa frontend framework. Seluruh katalog dimuat dari file JSON saat runtime, lalu pencarian, filter, favorit, riwayat penggunaan, pagination, serta detail prompt dijalankan langsung di browser.

Kondisi runtime saat ini:

| Komponen | Jumlah |
|---|---:|
| Prompt | 197 |
| Contoh penggunaan | 197 |
| Kategori | 19 |
| Guided workflow | 6 |

## Fitur utama

- Prompt Library dengan pencarian, filter kategori, dan pagination responsif.
- Guided Workflow untuk website, SaaS, marketing campaign, SEO content, research project, dan task automation.
- Detail prompt berisi deskripsi, contoh penggunaan, template siap salin, dan kontrol favorit.
- Favorites dan recently used disimpan secara lokal melalui `localStorage`.
- Runtime statistics berasal dari data aktual, bukan angka statis di antarmuka.
- Error state eksplisit ketika pipeline data tidak dapat dimuat.
- CI untuk validasi data, build, security headers, regression, dan browser E2E.

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
| `npm run validate:data` | Memvalidasi schema, ID, kategori, contoh, dan referensi workflow |
| `npm run validate:regression` | Mendeteksi penghapusan atau perubahan data yang tidak disetujui |
| `npm run validate:security-headers` | Memastikan header keamanan wajib tersedia |
| `npm run report:prompt-coverage` | Melaporkan cakupan prompt pada guided workflow |
| `npm run add:prompt` | Menambahkan prompt melalui skrip terkontrol |
| `npm run test:e2e` | Menjalankan pengujian Playwright |

## Struktur repositori

```text
.
├── .github/workflows/     # CI, browser E2E, dan verifikasi produksi
├── data/                  # Commands, examples, categories, dan workflows
├── docs/                  # Dokumentasi produk dan teknis
├── scripts/               # Build, validasi, coverage, dan tooling data
├── src/                   # JavaScript dan CSS aplikasi
├── tests/e2e/             # Pengujian browser
├── index.html             # Entry point aplikasi
├── _headers               # Security headers untuk static assets
└── wrangler.jsonc         # Konfigurasi Cloudflare Workers
```

## Kontrak data

Browser menggabungkan lima sumber utama:

- `data/commands.json` — 189 prompt dasar;
- `data/commands-extra.json` — 8 prompt tambahan;
- `data/examples.json` dan `data/examples-extra.json` — satu contoh untuk setiap prompt;
- `data/categories.json` — 19 kategori;
- `data/cheatcodes.json` — 6 guided workflow.

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
