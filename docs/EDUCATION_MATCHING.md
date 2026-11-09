# Education Matching

## Kategori

- `EXACT_MATCH`: kolom persyaratan pendidikan memuat program Manajemen Informatika dan token jenjang D-III secara eksplisit.
- `RELATED_MATCH`: persyaratan menyebut D-III Sistem Informasi, Teknik Informatika, Ilmu Komputer, Teknologi Informasi, Teknik Komputer, atau Rekayasa Perangkat Lunak. Relevansi bidang tidak menjamin diterima instansi.
- `MANUAL_REVIEW`: pendidikan kosong; Manajemen Informatika disebut tanpa jenjang; atau program/jenjang terlihat relevan tetapi ambigu.
- `NO_MATCH`: tidak ditemukan nama program yang menjadi kriteria atau salah satu program serumpun di atas.

Klasifikasi hanya membaca `requiredEducationRaw`. Nama jabatan tidak digunakan untuk menyimpulkan kelayakan. Misalnya jabatan “Pranata Komputer” tanpa syarat pendidikan yang cocok tidak akan menjadi exact match hanya karena nama jabatan berhubungan dengan komputer.

## Teks yang dipertahankan

Penyimpanan membedakan `requiredEducationRaw` (teks sumber) dan `requiredEducationNormalized` (teks yang dinormalisasi). Detail formasi menampilkan teks sumber serta alasan kategori. Ketentuan resmi instansi tetap menjadi acuan.

## Batas klasifikasi otomatis

Pola pendidikan yang kompleks seperti daftar prodi dengan tanda kurung, kode program, akreditasi, kualifikasi gabungan lintas jenjang, singkatan lokal, atau syarat pendidikan tambahan perlu ditinjau. Kategori ini alat penyaring awal dan bukan penetapan hukum/penerimaan pelamar.
