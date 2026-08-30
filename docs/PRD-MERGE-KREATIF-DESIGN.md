> **Historical feature PRD.** Dokumen ini merekam kondisi setelah PR #21 dan angka runtime di dalamnya bersifat historis. Untuk kondisi produk dan roadmap SAMSON terbaru, gunakan [`docs/PRD-SAMSON.md`](PRD-SAMSON.md) sebagai PRD kanonis.

# PRD — Konsolidasi Kategori `kreatif` dan `design`

| Metadata | Nilai |
|---|---|
| Produk | SAMSON Prompt |
| Repository | `traderalwaysprofit/prompt` |
| Status | Implemented |
| Tanggal selesai | 28 Agustus 2026 |
| Pull request | [#21 — Merge duplicate kreatif/design categories](https://github.com/traderalwaysprofit/prompt/pull/21) |
| Canonical category | `design` — Design & Kreatif Visual |

## 1. Ringkasan

Katalog memiliki dua kategori dengan arti yang tumpang tindih, yaitu `kreatif` dan `design`. Kondisi tersebut menghasilkan command duplikat atau nyaris duplikat, membuat hasil pencarian ambigu, dan menambah beban pemeliharaan data.

Perubahan ini menggabungkan seluruh command yang masih relevan ke kategori `design`, menghapus empat command redundan beserta contohnya, memensiunkan ID lama, dan memperbarui seluruh kontrak runtime serta pengujian dari 201 menjadi 197 command dan dari 20 menjadi 19 kategori.

## 2. Masalah pengguna

- Pencarian `/poster` dan `/thumbnail` mengembalikan dua command bernama sama.
- `/cover` dan `/coverdesign` memiliki tujuan sangat mirip tanpa pembeda produk yang cukup.
- `/socialvisual` dan `/socialdesign` tumpang tindih, tetapi versi `design` lebih spesifik.
- Dua kategori desain membuat pengguna ragu memilih filter yang tepat.
- Duplikasi meningkatkan risiko perubahan hanya dilakukan pada salah satu versi command.

## 3. Tujuan

1. Menyediakan satu kategori visual-design yang kanonis.
2. Menghilangkan collision nama dan overlap tematik yang sudah diputuskan.
3. Menjaga hubungan command–example tetap satu banding satu.
4. Menjaga seluruh workflow bebas dari referensi ke ID yang dipensiunkan.
5. Memastikan runtime, build, keamanan, regression test, dan browser E2E tetap valid.

## 4. Di luar scope

- Perubahan kategori selain `kreatif` dan `design`.
- Perubahan perilaku branding `enhanceBrand()` pada `src/cheatcodes.js` atau `src/main.js`.
- Penamaan ulang command lain yang tidak termasuk keputusan deduplikasi.
- Penambahan command atau fitur frontend baru.

## 5. Keputusan produk

### 5.1 Command yang dipensiunkan

| ID | Alias lama | Pengganti kanonis | Alasan |
|---:|---|---|---|
| 47 | `/poster` | ID 184 — `/poster` | Deskripsi ID 184 lebih spesifik untuk event/promosi |
| 48 | `/cover` | ID 190 — `/coverdesign` | Mencakup buku, majalah, dan ebook |
| 50 | `/thumbnail` | ID 191 — `/thumbnail` | Mencakup YouTube dan podcast serta tujuan clickable |
| 52 | `/socialvisual` | ID 192 — `/socialdesign` | Menyebut platform target secara jelas |

ID `47`, `48`, `50`, dan `52` bersifat retired/reserved dan tidak boleh dinomori ulang atau digunakan kembali.

### 5.2 Command yang dimigrasikan

Enam command berikut berpindah dari `categoryId: "kreatif"` ke `categoryId: "design"` tanpa perubahan ID, nama, deskripsi, template, atau contoh:

| ID | Command |
|---:|---|
| 45 | `/storyboard` |
| 46 | `/comic` |
| 49 | `/adcreative` |
| 51 | `/carousel` |
| 53 | `/quotevisual` |
| 54 | `/pitch` |

Kategori `kreatif` kemudian dihapus. `design` menjadi satu-satunya kategori kanonis untuk kelompok tersebut.

## 6. Kebutuhan fungsional

### FR-1 — Deduplikasi command

- Sistem hanya boleh memiliki satu command `/poster` dan satu `/thumbnail`.
- `/coverdesign` dan `/socialdesign` dipertahankan sebagai versi kanonis.
- Object command dan object example untuk ID yang dipensiunkan harus dihapus bersama.

### FR-2 — Konsolidasi kategori

- Seluruh command aktif dengan `categoryId: "kreatif"` harus dimigrasikan ke `design`.
- Object kategori `kreatif` harus dihapus dari `data/categories.json`.
- Tidak boleh tersisa referensi `categoryId: "kreatif"` di dalam `data/`.

### FR-3 — Referential integrity

- Setiap command harus memiliki tepat satu example dengan ID yang sama.
- `data/cheatcodes.json` tidak boleh memiliki `promptIds` yang mengarah ke ID `47`, `48`, `50`, atau `52`.
- Seluruh `categoryId` command harus ditemukan di `data/categories.json`.

### FR-4 — Perlindungan ID

- Validator harus menolak penggunaan kembali ID `47`, `48`, `50`, atau `52`.
- Regression validator hanya mengizinkan penghapusan command, example, dan kategori yang secara eksplisit dipensiunkan dalam perubahan ini.

### FR-5 — Sinkronisasi runtime

- Runtime minimum diperbarui menjadi 197 command.
- Minimum kategori diperbarui menjadi 19.
- Expected base command diperbarui menjadi 189.
- Antarmuka harus tetap mengambil statistik katalog dari data runtime.

## 7. Kebutuhan nonfungsional

- Perubahan tidak boleh menambah dependency runtime.
- Aplikasi tetap static-first dan dapat dibangun ke `dist/`.
- Security headers yang sudah diwajibkan tetap lulus validasi.
- Pencarian, filter, modal, favorites, copy, pagination, dan guided workflows tidak boleh mengalami regression.
- Build preview Cloudflare harus berhasil sebelum merge.

## 8. Acceptance criteria

- [x] Kategori `kreatif` tidak lagi tersedia.
- [x] Kategori `design` tetap tersedia sebagai kategori kanonis.
- [x] ID `47`, `48`, `50`, dan `52` tidak ditemukan pada command maupun example aktif.
- [x] ID tersebut tercatat sebagai retired dan ditolak jika digunakan kembali.
- [x] Command `45`, `46`, `49`, `51`, `53`, dan `54` menggunakan `categoryId: "design"`.
- [x] Tidak ada workflow `promptIds` yang mereferensikan ID yang dipensiunkan.
- [x] Runtime berisi 197 command, 197 example, dan 19 kategori.
- [x] Duplicate-alias warning untuk `/poster` dan `/thumbnail` hilang.
- [x] Data validation, build, regression validation, security-header validation, dan browser E2E berhasil.
- [x] Cloudflare preview berhasil dan perubahan mendapat human approval sebelum merge.

## 9. Dampak data

| Metrik | Sebelum | Sesudah | Perubahan |
|---|---:|---:|---:|
| Runtime command | 201 | 197 | -4 |
| Example | 201 | 197 | -4 |
| Kategori | 20 | 19 | -1 |
| Exact alias collision terkait scope | 2 | 0 | -2 |

Tidak ada migrasi penyimpanan pengguna karena favorites dan recently used tersimpan di browser. Jika browser lama masih menyimpan salah satu ID yang dipensiunkan, command tersebut tidak lagi dirender karena tidak ada pada katalog aktif.

## 10. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Workflow menunjuk ke command yang dihapus | Audit seluruh `promptIds` dan validasi referensial |
| Example menjadi orphan | Hapus command dan example dengan ID yang sama dalam satu perubahan |
| Hardcoded count membuat aplikasi atau E2E gagal | Sinkronkan runtime guard, validator, dokumentasi, dan test expectation |
| ID lama digunakan kembali | Tambahkan retired-ID guard pada validator |
| Category filter rusak setelah penghapusan | Migrasikan seluruh command aktif sebelum kategori dihapus dan uji melalui browser E2E |

## 11. Validasi dan release gate

Perubahan dinyatakan siap rilis ketika seluruh perintah berikut berhasil:

```bash
npm ci
npm run validate:data
npm run build
npm run validate:security-headers
npm run validate:regression
npm run test:e2e
```

Selain validasi lokal/CI, preview deployment harus dapat dimuat dan pull request harus mendapat approval manusia.

## 12. Rollback

Jika regression kritis ditemukan setelah rilis, rollback dilakukan dengan revert pull request, bukan menggunakan kembali ID yang telah dipensiunkan secara manual. Setelah rollback, jalankan seluruh release gate dan pastikan kontrak command, example, kategori, serta workflow kembali konsisten.

## 13. Hasil implementasi

Perubahan telah di-merge melalui PR [#21](https://github.com/traderalwaysprofit/prompt/pull/21) pada 28 Agustus 2026. Commit hasil merge adalah [`f9de2cc`](https://github.com/traderalwaysprofit/prompt/commit/f9de2cc4ec8f9c6b0ab99b1ae3e4193a007f6ff8). Kondisi `main` saat dokumen dibuat memenuhi kontrak 197 command, 197 example, dan 19 kategori.
