# Instalasi dan Menjalankan Aplikasi

## Prasyarat

- Node.js 22 atau lebih baru (disarankan Node 24).
- npm 10 atau lebih baru.
- Windows, macOS, atau Linux.

## Setup

```bash
npm install
```

Salin `.env.example` menjadi `.env`. `DATABASE_URL` default menggunakan SQLite lokal di `prisma/dev.db`.

```bash
npm run db:generate
npm run db:deploy
```

`db:deploy` menerapkan migration yang ada. Untuk merancang migration lokal berikutnya, gunakan `npm run db:migrate`.

Secara default, backend otomatis mengambil formasi D-III Manajemen Informatika dari Aesen CASN 2024 saat server mulai, lalu memeriksa pembaruan paling lama setiap 24 jam. Set `AUTO_SYNC_AESEN=false` di `.env` bila pemuatan otomatis perlu dimatikan. Data berasal dari arsip historis 2024, bukan data formasi CPNS 2026.

## Pengembangan

```bash
npm run dev
```

Frontend Vite berjalan di `http://localhost:5173`, backend Express di `http://localhost:4000`, dan Vite meneruskan `/api` ke backend.

## Data otomatis dan import tambahan

Pemuatan otomatis tidak memerlukan file. Status jumlah record, waktu sinkronisasi, dan tombol **Perbarui data** ada di halaman **Data Management**. Sumber yang dipakai adalah Aesen dengan filter kode program studi `4480237` (D-III Manajemen Informatika). Rincian endpoint dan keterbatasan field dijelaskan di [Analisis Sumber Data](SOURCE_ANALYSIS.md).

Untuk deployment production, gunakan PostgreSQL; SQLite hanya untuk pengembangan lokal. Ikuti [panduan Deploy ke Vercel](DEPLOYMENT.md).

Jika ingin menambah dataset lain atau sumber otomatis sedang tidak tersedia:

1. Buka **Data Management**.
2. Pilih CSV, XLSX, atau JSON.
3. Tentukan tahun, nama dataset, sumber, dan catatan.
4. Periksa pratinjau serta mapping otomatis; petakan kolom wajib `Jabatan`, `Instansi`, dan `Jumlah Formasi/Kuota`.
5. Tekan **Validasi dan impor**. Ringkasan baris berhasil/gagal/duplikat dan kualitas data tersedia sesudah commit.

CSV/XLSX harus memiliki header pada baris pertama. XLSX membaca sheet pertama. JSON menerima array objek atau objek dengan properti array `data`. Batas upload default 25 MB, maksimum 250.000 baris dan 1.000 kolom. Ubah `UPLOAD_MAX_MB` bila konfigurasi mesin memadai.

## Perintah

```bash
npm run dev          # frontend dan backend dalam mode watch
npm run build        # typecheck/build frontend dan backend
npm run lint         # lint source
npm test             # unit dan integration test
npx playwright install chromium
npm run test:e2e      # alur browser penuh; dapat memakai Edge yang sudah terpasang
npm run db:studio    # Prisma Studio
```

E2E membuat ulang database khusus `prisma/e2e.db` dan mengimpor fixture sintetis dari `tests/fixtures/`; database aplikasi `prisma/dev.db` tidak digunakan oleh tes tersebut. Playwright mengunduh Chromium satu kali melalui `npx playwright install chromium`. Bila Microsoft Edge sudah tersedia, set `PLAYWRIGHT_CHANNEL=msedge` sebelum menjalankan E2E untuk memakai browser itu.

Build Vite menghasilkan `dist/`; backend TypeScript menghasilkan `dist-server/`. Jalankan API produksi setelah `npm run db:deploy` dengan `npm start`. Sajikan direktori `dist/` melalui static host/reverse proxy yang meneruskan `/api` ke Express.

## Data lokal

File SQLite berada di `prisma/dev.db` dan diabaikan Git. Favorit, shortlist, dan catatan tanpa autentikasi disimpan di local storage browser pada perangkat yang sama. Jangan impor data sensitif.
