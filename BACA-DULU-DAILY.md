# TBT Daily Multi-Table System — Panduan Deploy 

Ini nambahin fitur baru: buat "hari" main, tambah beberapa meja, tiap meja
dapat kode buat input skor dari HP masing-masing, dan leaderboard gabungan
buat hari itu. Pakai database yang sama (`tbt-leaderboard`) dengan
fitur-fitur sebelumnya.

## Sebelum mulai

Kamu butuh akun GitHub — ini tidak bisa dihindari karena sistem ini pakai
Pages Functions (folder `functions/`), dan Cloudflare tidak mendukung
Functions lewat upload langsung dari dashboard. Kalau belum punya, buat
dulu di github.com (gratis).

## 1. Tambah tabel ke database

Buka database D1 `tbt-leaderboard` > tab **Console**. Copy-paste isi
`schema-daily.sql`, klik **Execute**. Ini nambah 2 tabel baru: `days` dan
`tables`, tidak mengganggu tabel lain yang sudah ada.

## 2. Upload ke GitHub

1. Buat repository baru di GitHub, misal `tbt-daily`.
2. **Add file > Upload files**, upload semua isi folder ini: `admin-daily.html`,
   `table.html`, `leaderboard-day.html`, `schema-daily.sql`, dan folder
   `functions`. Commit.

## 3. Sambungkan ke Cloudflare Pages

1. Dashboard Cloudflare > **Compute** > **Workers & Pages** > **Create**
   > **Pages** > **Connect to Git**.
2. Pilih repo `tbt-daily`. Build settings dikosongkan semua (Framework
   preset: None, Build command: kosong, Build output directory: `/`).
   **Save and Deploy**.

## 4. Sambungkan database D1

**Settings** > **Functions** > **D1 database bindings** > **Add binding**.
Variable name: `DB` (persis). D1 database: pilih `tbt-leaderboard`.

## 5. Set password admin

**Settings** > **Environment variables** (atau **Variables and Secrets**).
Tambah `ADMIN_PASSWORD` dengan password pilihanmu. Kalau kamu sudah pernah
set ini untuk project booking sebelumnya, boleh pakai password yang sama.

## 6. Redeploy

Buka tab **Deployments**, pastikan deployment terbaru sudah pakai binding
dan environment variable di atas (kalau ditambah setelah deploy pertama,
trigger deployment baru dulu).

## Cara pakai di hari-H

1. Buka `<project-kamu>.pages.dev/admin-daily.html`, login.
2. Buat hari baru (misal "TBT Open Table" + tanggal).
3. Tambah meja satu-satu: isi nama meja + 4 pemain, klik **Buat meja +
   generate kode**. Kamu dapat kode 5 huruf/angka dan link langsung.
4. Bagikan link `<project-kamu>.pages.dev/table.html?code=XXXXX` ke tiap
   meja (lewat WhatsApp, atau kamu sendiri yang buka bergantian di 1 HP,
   dua-duanya bisa).
5. Host tiap meja input hand demi hand seperti biasa — otomatis tersimpan
   ke server tiap ada perubahan (ada tulisan kecil "Tersimpan ✓").
6. Buka `<project-kamu>.pages.dev/leaderboard-day.html?day=<id-hari>`
   (link ini juga muncul kalau kamu pilih hari itu di halaman admin) untuk
   layar leaderboard gabungan — bisa ditoggle Total Poin Bersih atau TBT
   League Score. Cocok dipajang di TV/laptop venue, auto-refresh manual
   pakai tombol Refresh.

## Kalau ada masalah

- **Kode meja "tidak ditemukan"**: pastikan schema-daily.sql sudah
  dijalankan dan binding `DB` sudah benar.
- **Admin tidak bisa login**: cek `ADMIN_PASSWORD` di Environment
  variables.
- **Perubahan skor tidak muncul di leaderboard**: klik tombol Refresh di
  halaman leaderboard — halaman itu tidak auto-refresh sendiri, sengaja
  biar hemat, tinggal refresh manual tiap mau lihat update terbaru.
