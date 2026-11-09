# Deploy ke GitHub dan Vercel

## Gambaran

- GitHub menyimpan kode dan snapshot data.
- Vercel meng-host frontend dan API Express.
- Snapshot 879 formasi berada di `prisma/offline.sqlite` dan ikut dibundel dengan API Function.
- Vercel tidak membutuhkan Supabase, PostgreSQL, URL database, atau `CRON_SECRET`.
- Sinkronisasi Aesen dan Cron dinonaktifkan. Data hanya berubah jika snapshot baru di-commit dan aplikasi di-deploy ulang.

## Impor repository

1. Di Vercel pilih **New Project** lalu impor repository `oekasyahh8/MI` branch `main`.
2. Gunakan Root Directory `./` dan Framework Preset **Other**.
3. Biarkan Build Command `npm run build:vercel` dan Output Directory `dist` dari `vercel.json`.
4. Tidak perlu mengisi Environment Variables untuk menampilkan snapshot.
5. Tekan **Deploy**. Vercel membuat Prisma Client SQLite dan menyertakan snapshot ke API Function.

Jika Supabase sudah terhubung, aplikasi tidak memakai variabel Supabase yang terpasang. Resource Supabase boleh diputus dari proyek setelah deployment offline berhasil.

## Memperbarui snapshot di masa depan

Perubahan data bukan sinkron live. Siapkan snapshot SQLite baru pada folder `prisma/offline.sqlite`, commit ke branch `main`, lalu biarkan Vercel membuat deployment baru. Pastikan database baru berisi provenance sumber dan hanya dataset yang memang boleh diterbitkan.

## Batas penggunaan

- Snapshot saat ini adalah arsip CASN 2024, bukan data formasi resmi CPNS 2026.
- API produksi membaca salinan SQLite sementara per instance; perubahan data melalui API tidak disimpan sebagai dataset baru.
- Favorit, catatan, shortlist, dan rencana belajar disimpan di local storage browser pada perangkat yang sama.
- Periksa persyaratan akhir di SSCASN dan pengumuman instansi.
