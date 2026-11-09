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

Database lokal menyertakan snapshot tetap 879 formasi arsip Aesen CASN 2024 untuk kode prodi D-III Manajemen Informatika. Sinkronisasi Aesen dinonaktifkan secara default (`AUTO_SYNC_AESEN=false`). Data ini bukan formasi resmi CPNS 2026.

## Pengembangan

```bash
npm run dev
```

Frontend Vite berjalan di `http://localhost:5173`, backend Express di `http://localhost:4000`, dan Vite meneruskan `/api` ke backend.

## Snapshot data

Halaman **Data Management** menunjukkan jumlah record dan provenance snapshot. Aplikasi tidak menghubungi SSCASN atau Aesen untuk memperbarui data. Untuk mengubah data, buat snapshot baru secara lokal lalu deploy ulang aplikasi.

Vercel membundel `prisma/offline.sqlite` di dalam API Function. SQLite tersebut disalin ke direktori sementara per instance dan dipakai sebagai snapshot baca-saja secara aplikasi. Ikuti [panduan Deploy ke Vercel](DEPLOYMENT.md).

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

Build Vite menghasilkan `dist/`; backend TypeScript menghasilkan `dist-server/`. Saat menjalankan server lokal, gunakan `npm start` setelah `npm run db:deploy`.

## Data lokal

File kerja SQLite lokal berada di `prisma/dev.db` dan diabaikan Git. Snapshot production yang ikut Git berada di `prisma/offline.sqlite`. Favorit, shortlist, dan catatan tanpa autentikasi disimpan di local storage browser pada perangkat yang sama. Jangan impor data sensitif.
