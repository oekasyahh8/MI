# Deploy ke GitHub dan Vercel

## Gambaran

- GitHub menyimpan kode dan menjadi sumber deployment.
- Vercel membangun frontend Vite dan menjalankan Express sebagai Function.
- PostgreSQL menyimpan dataset, bukan file SQLite lokal. Skema production berada di `prisma/postgresql/` agar pengembangan lokal tetap menggunakan SQLite.
- Build production menerapkan migration dan mengisi dataset Aesen D3 Manajemen Informatika bila data belum ada atau sudah lebih dari 24 jam.
- Vercel Cron memeriksa data sekali sehari melalui endpoint yang memerlukan `CRON_SECRET`.

## Siapkan repository GitHub

1. Buat repository **private** di GitHub.
2. Dari folder proyek, inisialisasi Git bila belum ada, commit perubahan, lalu push branch `main`.
3. Pastikan `.env`, database `.db`, dan `.vercel/` tidak masuk commit. Semuanya sudah dicakup `.gitignore`.

## Siapkan PostgreSQL di Vercel

1. Buat project Vercel dengan mengimpor repository GitHub tersebut.
2. Tambahkan integrasi PostgreSQL dari Vercel Marketplace, misalnya Neon atau Supabase.
3. Atur environment variables untuk **Production**:

   - `DATABASE_URL`: URL PostgreSQL pooled untuk aplikasi.
   - `DIRECT_URL`: URL PostgreSQL langsung/unpooled untuk Prisma migration.
   - `CRON_SECRET`: rahasia acak panjang untuk autentikasi Cron.
   - `AUTO_SYNC_AESEN`: `true`.

   Pastikan Vercel Function dan database berada di region yang berdekatan. Jangan commit URL database atau nilai `CRON_SECRET` ke GitHub.

4. Biarkan project menggunakan konfigurasi di `vercel.json`. Perintah build-nya adalah `npm run build:vercel`, output frontend adalah `dist`, dan API menggunakan Express catch-all di `api/[...path].ts`.
5. Deploy branch production. Build production menjalankan `prisma migrate deploy`, lalu sinkron awal ke PostgreSQL. Pastikan build log menunjukkan `Dataset Aesen production siap`.
6. Buka URL production dan periksa **Data Management**. Status sumber seharusnya menunjukkan 879 formasi pada hasil pemeriksaan awal; jumlah tersebut dapat berubah mengikuti sumber Aesen.

## Preview deployment

Vercel Preview perlu database terpisah agar pengujian tidak membaca atau mengubah data production. Buat database preview lalu tambahkan `DATABASE_URL`, `DIRECT_URL`, dan `CRON_SECRET` pada environment **Preview**. Jika memakai database preview, migration dan sinkron awal dapat dijalankan manual dengan `npm run db:deploy:postgres` dan `node scripts/sync-aesen-production.mjs` setelah Prisma Client PostgreSQL dan backend dibangun.

## Catatan operasi

- Pengaturan Cron ada di `vercel.json` dan dijalankan sekali sehari.
- Tombol **Perbarui data** memanggil endpoint sinkron manual.
- Data yang tersedia adalah arsip CASN 2024; verifikasi formasi aktif di SSCASN dan pengumuman instansi.
