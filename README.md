# MI CASN Analytics

Dashboard analisis formasi CASN historis untuk lulusan D3 Manajemen Informatika. UI berbahasa Indonesia. Aplikasi memakai snapshot tetap 879 formasi arsip CASN 2024 untuk kode prodi D-III Manajemen Informatika. Tidak ada sinkronisasi live ke SSCASN atau Aesen.

## Fitur

- Dashboard KPI, grafik interaktif, dan filter global berbasis query URL.
- Katalog formasi dengan server-side search, filter, pagination, sorting, kolom, detail, dan ekspor CSV/XLSX/JSON.
- Dataset snapshot D-III Manajemen Informatika yang dibundel bersama aplikasi; Vercel tidak memerlukan database eksternal.
- Analisis pendidikan, instansi, jabatan, wilayah, persaingan, dan skor prioritas historis berbobot.
- Favorit, catatan personal, target wilayah/jabatan, status persiapan, dan perbandingan 2–5 formasi.
- Backend Express, TypeScript, Prisma, rate limit, Helmet, CORS, dan Zod; SQLite lokal dan snapshot SQLite terbundel di Vercel.
- Favorit, rencana, dan catatan belajar disimpan di local storage browser pada perangkat yang sama.

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

Buka `http://localhost:5173`. Dataset snapshot tersedia langsung; sinkronisasi Aesen dinonaktifkan secara default. Panduan lengkap ada di [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Dokumentasi

- [Analisis sumber Aesen](docs/SOURCE_ANALYSIS.md): provenance snapshot historis, endpoint saat pengambilan, dan batas data.
- [Kamus data](docs/DATA_DICTIONARY.md): field, tipe, normalisasi, dan arti null.
- [Education matching](docs/EDUCATION_MATCHING.md): aturan klasifikasi dan keterbatasan.
- [Instalasi](docs/INSTALLATION.md): prasyarat, snapshot data, pengembangan lokal, build, dan perintah.
- [Deploy ke Vercel](docs/DEPLOYMENT.md): impor GitHub dan deploy tanpa database eksternal.

## Endpoint utama

- `GET /api/health`
- `GET /api/dashboard/overview`
- `GET /api/formations` dan `/api/formations/:id`
- `GET /api/formations/export?format=csv|xlsx|json`
- `GET /api/analytics/education|agencies|positions|regions|competition|recommendations|summary`
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
