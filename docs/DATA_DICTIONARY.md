# Kamus Data

Setiap dataset impor dicatat bersama tahun, sumber, waktu, file asal, nama batch, jumlah record, jumlah gagal, duplikat, dan catatan. `Formation` mempertahankan nilai pendidikan asli dan data turunan secara terpisah.

| Field database | Tipe | Arti | Nilai kosong |
| --- | --- | --- | --- |
| `sourceId` | teks opsional | ID baris asal jika file menyediakannya | Tidak tersedia |
| `datasetYear` | integer | Tahun dataset CASN | Wajib saat impor |
| `procurementType` | teks opsional | Jenis pengadaan, mis. CPNS/PPPK | Tidak tersedia |
| `formationType` | teks opsional | Jenis/kategori formasi | Tidak tersedia |
| `positionName` | teks | Nama jabatan resmi dari file | Wajib |
| `agencyName` | teks | Nama instansi dari file | Wajib |
| `unitWorkName` | teks opsional | Unit kerja | Tidak tersedia |
| `placementName` | teks opsional | Lokasi/unit penempatan | Tidak tersedia |
| `province`, `regency` | teks opsional | Provinsi dan kabupaten/kota eksplisit | Tidak ditebak |
| `educationLevel` | teks opsional | Jenjang pendidikan | Tidak tersedia |
| `requiredEducationRaw` | teks opsional | Teks syarat pendidikan seperti di sumber | Tidak tersedia |
| `requiredEducationNormalized` | teks opsional | Versi huruf besar/whitespace dan jenjang ternormalisasi | Tidak tersedia |
| `quota` | integer | Jumlah formasi | Wajib, bilangan bulat ≥ 0 |
| `applicantCount` | integer/real nullable | Jumlah pelamar sebagaimana file | Tidak tersedia, bukan nol |
| `applicantPerSeat` | real nullable | `applicantCount / quota` saat data valid dan kuota > 0 | Tidak tersedia |
| `salaryMin`, `salaryMax` | real nullable | Nilai gaji minimum/maksimum dalam satuan angka file | Tidak tersedia |
| `salaryCurrency` | teks | Mata uang, default IDR | IDR |
| `matchingCategory` | enum teks | `EXACT_MATCH`, `RELATED_MATCH`, `MANUAL_REVIEW`, `NO_MATCH` | Dihitung dari teks pendidikan |
| `matchingReason` | teks | Alasan klasifikasi pendidikan | Dihitung, dapat ditinjau |
| `dataSource` | teks opsional | Sumber pada level record jika ada | Tidak tersedia |
| `importBatchId`, `datasetId` | integer | Relasi provenance impor | Diisi backend |
| `createdAt`, `updatedAt` | datetime | Waktu tulis database | Diisi backend |

## Aturan normalisasi

- Nama jabatan/instansi dan teks persyaratan asli mempertahankan kapitalisasi sumber, dengan whitespace luar/berulang dirapikan. Normalisasi pendidikan menggunakan huruf besar pada kolom turunan.
- Bentuk `D3`, `D-III`, `Diploma III`, `Diploma 3`, dan `Ahli Madya` dinormalisasi menjadi token `D-III` pada kolom pendidikan ternormalisasi.
- Teks persyaratan asli tetap ada di `requiredEducationRaw` dan ditampilkan pada detail.
- Angka dengan pemisah Indonesia dan internasional diproses dengan heuristik angka; verifikasi satuan terhadap file sumber diperlukan.
- Instansi dan jabatan tidak digabung berdasarkan kemiripan nama.
