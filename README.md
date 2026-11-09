# MI CASN Analytics

Dashboard analisis formasi CASN historis untuk lulusan D3 Manajemen Informatika. UI berbahasa Indonesia. Dataset Aesen CASN 2024 dimuat otomatis untuk kode prodi D-III Manajemen Informatika; aplikasi tidak menampilkan dataset palsu.

## Fitur

- Dashboard KPI, grafik interaktif, dan filter global berbasis query URL.
- Katalog formasi dengan server-side search, filter, pagination, sorting, kolom, detail, dan ekspor CSV/XLSX/JSON.
- Otomatis memuat formasi yang disaring untuk D-III Manajemen Informatika dari sumber Aesen CASN 2024, dengan impor CSV/XLSX/JSON sebagai pilihan tambahan.
- Analisis pendidikan, instansi, jabatan, wilayah, persaingan, dan skor prioritas historis berbobot.
- Favorit, catatan personal, target wilayah/jabatan, status persiapan, dan perbandingan 2–5 formasi.
- Import CSV/XLSX/JSON dengan preview, mapping kolom, validasi, deduplikasi, data-quality report, dan provenance batch.
- Backend Express, TypeScript, Prisma, rate limit, Helmet, CORS, Zod, upload limits; SQLite for local development and PostgreSQL for production.
- Siap deploy ke Vercel dengan PostgreSQL dan sinkronisasi Aesen terjadwal.

## Mulai cepat

```bash
npm install
```

Salin `.env.example` menjadi `.env`, lalu siapkan DB dan jalankan aplikasi:

```bash
npm run db:generate
npm run db:deploy
npm run dev
```

Buka `http://localhost:5173` lalu masuk ke **Data Management** untuk mengimpor dataset. Panduan lengkap ada di [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Dokumentasi

- [Analisis sumber Aesen](docs/SOURCE_ANALYSIS.md): halaman yang diperiksa, endpoint yang terverifikasi, dan batas investigasi.
- [Kamus data](docs/DATA_DICTIONARY.md): field, tipe, normalisasi, dan arti null.
- [Education matching](docs/EDUCATION_MATCHING.md): aturan klasifikasi dan keterbatasan.
- [Instalasi](docs/INSTALLATION.md): prasyarat, migrasi, sinkron otomatis, import tambahan, build, dan perintah.
- [Deploy ke Vercel](docs/DEPLOYMENT.md): GitHub, PostgreSQL, konfigurasi production, dan sinkronisasi terjadwal.

## Endpoint utama

- `GET /api/health`
- `GET /api/dashboard/overview`
- `GET /api/formations` dan `/api/formations/:id`
- `GET /api/formations/export?format=csv|xlsx|json`
- `GET /api/analytics/education|agencies|positions|regions|competition|recommendations|summary`
- `POST /api/import/preview` (multipart form)
- `POST /api/import/commit`
- `GET /api/datasets`, `GET /api/data-quality`
- `GET/POST/DELETE /api/favorites`

Format respons sukses `{ "success": true, "data": ..., "meta": ... }`; error memakai `success: false` dan pesan yang dapat dibaca.

## Uji dan build

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E menggunakan database SQLite khusus `prisma/e2e.db` dan dataset fixture sintetis kecil; basis data tersebut direset saat tes dimulai. Di Windows dengan Microsoft Edge terpasang, tes juga dapat dijalankan dengan `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:e2e`.

Rasio pelamar per kuota dan skor rekomendasi adalah indikator analisis historis, bukan probabilitas kelulusan. Periksa persyaratan resmi di [SSCASN](https://sscasn.bkn.go.id/) dan pengumuman instansi. MI CASN Analytics bukan bagian dari BKN/SSCASN.
