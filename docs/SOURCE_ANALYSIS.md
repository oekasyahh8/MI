# Analisis Sumber Data Aesen CASN 2024

Pemeriksaan: 9 November 2026 (Asia/Jakarta)

## Hasil verifikasi

Halaman publik [Formasi Aesen CASN 2024](https://aesen.vercel.app/casn/2024/formasi) memuat data melalui Fetch/XHR JSON. Endpoint yang digunakan halaman adalah `GET https://aesen.vercel.app/api/casn/2024/formasi`. Parameter pendidikan menerima kode program studi, termasuk `4480237` untuk `D-III MANAJEMEN INFORMATIKA`. Query dengan kode tersebut melaporkan 879 record, 9 halaman, maksimum 100 record per halaman. Nilai ini adalah hasil pengamatan pada tanggal pemeriksaan; sumber dapat berubah.

Contoh request yang diverifikasi:

```text
GET /api/casn/2024/formasi?page=1&limit=100&instansi_kode=&jabatan_kode=&pendidikan_kode=4480237&sort_by=&sort_order=desc&search=
```

Respons sukses memuat `status`, `data[]`, dan `pagination`. Field yang dipakai adapter:

| Field Aesen | Field aplikasi | Catatan |
| --- | --- | --- |
| `formasi_id` | `sourceId` | ID stabil untuk upsert per dataset |
| `ins_nm` | `agencyName` | Nama instansi |
| `jabatan_nm` | `positionName` | Nama jabatan |
| `lokasi_nm` | `unitWorkName` | Disimpan sebagai teks lokasi/unit; tidak dipecah menjadi provinsi/kabupaten |
| `pendidikan_nm` | `requiredEducationRaw` | Teks asli dipertahankan |
| `jumlah_formasi` | `quota` | Jumlah formasi |
| `jumlah_ms` | `applicantCount` | Jumlah pelamar |
| `gaji_min`, `gaji_max` | `salaryMin`, `salaryMax` | Tampilan sumber memakai satuan juta IDR; adapter mengalikan satu juta |

`next_page_url` dalam respons dapat berisi host `undefined`, maka adapter menyusun permintaan tiap halaman dari endpoint dan parameter yang sudah diamati. Sinkronisasi memeriksa konsistensi total halaman/record, ID unik, ukuran respons, dan format sebelum mengganti data di SQLite. Proses menunggu singkat di antara halaman, mencoba ulang gangguan sementara, dan menyimpan semua perubahan dalam transaksi.

## Perilaku aplikasi

- Saat backend mulai, aplikasi otomatis memuat dataset D3 Manajemen Informatika jika data lokal belum ada atau sudah lebih dari 24 jam.
- Sinkronisasi manual tersedia di Data Management. Atur `AUTO_SYNC_AESEN=false` untuk mematikan pemuatan otomatis.
- Record Aesen di-upsert berdasarkan kombinasi `datasetId` dan `sourceId`; record yang sudah tidak ada dari sumber dihapus pada sinkronisasi berikutnya.
- Impor file CSV, XLSX, atau JSON masih tersedia untuk dataset tambahan dan sebagai alternatif ketika sumber Aesen tidak dapat dijangkau.
- Data yang ditemukan adalah arsip CASN **2024**, bukan jaminan formasi CPNS 2026. Verifikasi syarat dan formasi aktif di SSCASN atau pengumuman instansi.

## Batas data dan interpretasi

- Kode prodi memfilter hasil sumber untuk D-III Manajemen Informatika; teks persyaratan asli tetap ditampilkan untuk membantu pemeriksaan kualifikasi setiap formasi.
- Aesen tidak menyediakan provinsi dan kabupaten/kota terpisah dalam respons yang dipakai. Aplikasi tidak menebak keduanya; teks lokasi disimpan utuh.
- Gaji dikonversi dari juta IDR ke rupiah untuk penyimpanan dan analisis.
- Aesen menjelaskan bahwa datanya bersumber dari SSCASN, tetapi Aesen sendiri bukan portal resmi BKN. Periksa ketentuan final melalui [SSCASN](https://sscasn.bkn.go.id/) dan pengumuman instansi.
