# TBT Daily v3: sesi, meja, peringkat

## Yang baru

- Setiap meja punya **dua link**: link **host** (bisa input skor) dan link **pemain** (hanya lihat).
- Scoreboard punya tab baru **Standings**: peringkat meja itu, per ronde (東南西北) dan keseluruhan.
  Ada tombol "Make story image" langsung dari situ.
- Pemain membuka link pemain, melihat skor live, dan bisa generate gambar story sendiri.
- Halaman publik `index.html`: **Total** (semua sesi, filter minggu ini / bulan ini / semua waktu)
  dan **Sessions** (tiap sesi, tiap meja, leaderboard sesi).
- Perbaikan keamanan: kode host tidak pernah tampil di halaman publik lagi.

## Halaman

| Halaman | Untuk siapa |
|---|---|
| `index.html` | Publik: leaderboard total dan sesi |
| `scoreboard.html?view=KODE` | Pemain: lihat meja, standings, story image |
| `scoreboard.html?code=KODE` | Host: input skor |
| `scoreboard.html` (tanpa kode) | Scoreboard biasa, lokal di HP itu saja |
| `admin-daily.html` | Admin (password): buat sesi dan meja, salin link |

## Upgrade dari versi sebelumnya (database sudah ada)

1. Buka database D1 > tab **Console**. Jalankan tiga perintah ini **satu per satu**
   (paste satu, Execute, lalu paste berikutnya):

   ```
   ALTER TABLE tables ADD COLUMN view_code TEXT;
   ```
   ```
   ALTER TABLE tables ADD COLUMN stats TEXT;
   ```
   ```
   CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_view_code ON tables(view_code);
   ```
2. Buka repo GitHub, tab **Code**, **Add file > Upload files**. Drag **isi** folder `tbt-daily`
   dari File Explorer (bukan pakai "choose your files"). Commit.
3. Di repo, hapus file lama `leaderboard-day.html` (sudah digantikan `index.html`).
4. Tunggu deploy Cloudflare selesai. Binding `DB` dan `ADMIN_PASSWORD` tidak perlu diubah.
5. Buka `admin-daily.html`. Meja lama otomatis dapat link pemain begitu sesinya dibuka.

## Instalasi baru (kalau mulai dari database kosong)

Jalankan tiga baris di `schema-daily.sql` satu per satu di Console D1, lalu pasang binding
`DB` dan `ADMIN_PASSWORD` seperti sebelumnya.

## Cara pakai hari-H

1. **Admin**: buat sesi, lalu tambah meja (nama meja + 4 pemain). Nama pemain muncul sebagai saran
   dari nama yang pernah dipakai, supaya ejaan konsisten. Tiap meja dapat dua kode dan tombol
   **Salin link**. Kirim link host ke host, link pemain ke pemain (atau tempel di grup WhatsApp).
2. **Host**: buka link host, input skor di tab Play seperti biasa.
3. **Pemain**: buka link pemain. Halaman terbuka di Standings dan memperbarui diri sendiri
   tiap beberapa detik. Tab Story membuat gambar untuk dibagikan.
4. **Layar venue**: buka `index.html`. Halaman memperbarui diri tiap 30 detik.

## Hal yang perlu diketahui

- **Nama**: leaderboard total menggabungkan nama tanpa peduli huruf besar/kecil dan spasi ganda
  ("Hiu", "hiu", "HIU" satu orang). "Hiu S" dianggap orang lain. Pakai saran otomatis di admin.
- **Cara hitung**: *Net points* = jumlah poin bersih dari semua meja. *League score* = rata-rata
  per meja. Meja tanpa hand tidak dihitung, meja yang belum selesai dihitung apa adanya.
- **Tidak ada halaman profil pemain.** Riwayat pemain hanya lewat link meja yang dia mainkan.
- **Privasi**: link pemain terlihat di halaman publik, jadi siapa pun bisa melihat meja mana pun
  (hanya melihat). Kode host tidak pernah tampil di halaman publik.
- **Sinyal putus**: kalau HP host tidak bisa terhubung saat membuka halaman, layar terkunci dan
  mencoba lagi otomatis. Kalau sinyal putus setelah halaman terbuka, skor tetap bisa diinput dan
  dikirim ulang otomatis. Kalau tab ditutup sebelum terkirim, hand disimpan di HP dan dikirim
  saat halaman dibuka lagi di HP yang sama.
- **Bahasa**: halaman pemain dan scoreboard berbahasa Inggris (mengikuti scoreboard yang ada),
  admin berbahasa Indonesia.

## Update terbaru (v3)

- **Nama pemain sekarang opsional** saat admin bikin meja. Kalau dikosongin,
  otomatis dikasih nama sementara ("Player 1", dst) sampai host isi nama
  aslinya langsung dari scoreboard (tab Play > bagian nama pemain).
- **Mode permainan baru** di tab Play: Casual (bebas), Default (minimal 2
  poin buat menang), Tournament (dealer nggak pernah nyangkut, opsional
  rotasi kursi ala-MCR), dan Custom (atur sendiri poin minimum, batas
  dealer nyangkut, dan deadwall). Semua ini dihitung sama persis di server,
  jadi leaderboard selalu sinkron sama yang dilihat host.
- **Favicon** (ikon kecil di tab browser) sekarang seragam di ketiga
  halaman, ikut logo yang kamu pasang. Kalau bikin brand baru lewat
  `build.py` dan cuma kasih 1 file logo, favicon kotak dibikin otomatis
  dari logo itu (ditempel di tengah kanvas persegi).

## Update terbaru (v4): halaman "masuk pakai kode"

- **Halaman baru `masuk.html`** - satu halaman buat host maupun pemain.
  Tinggal buka `<domainmu>/masuk.html`, ketik kode 5 karakter yang dikasih
  admin, otomatis diarahkan ke scoreboard yang benar (mode edit kalau kode
  host, mode lihat kalau kode pemain). Nggak perlu kirim link lengkap lagi,
  cukup kode-nya doang (misal lewat chat/WhatsApp singkat).
- Link lengkap (`scoreboard.html?code=...`) di admin tetap ada sebagai
  opsi kalau lebih suka kirim link langsung.
- Endpoint baru `functions/api/resolve/[code].js` yang nentuin jenis
  kode. Ini publik (nggak perlu password), tapi cuma bilang "host" atau
  "view", nggak pernah balikin data meja itu sendiri.


## Update terbaru (v5)

**Tidak ada migrasi database kali ini.** Cukup ganti file.

- **Tombol "Save game"** di tab Play (host). Ada peringatan: setelah disimpan, game tidak bisa
  diedit lagi. Kalau game belum selesai (belum sampai angin North), peringatannya menyebutkan itu.
  Setelah disimpan: form input dan tombol Edit/Delete hilang, ada tulisan "Saved as final", dan
  server menolak semua perubahan. Admin bisa membuka kunci lewat tombol **Buka kunci** di kartu
  meja (kalau host salah tekan Save).
- **Tombol "New game" disembunyikan** untuk host yang masuk lewat kode meja, karena tombol itu
  menghapus semua hand di meja. Game baru = meja baru dari admin. Scoreboard tanpa kode tetap
  punya tombolnya.
- **Cek versi**: kalau meja diubah dari HP lain, HP yang datanya sudah basi tidak menimpa diam-diam.
  Muncul pilihan: muat versi terbaru, atau tetap pakai versi HP ini dan timpa.
- **Saran nama untuk host**: kolom nama pemain memunculkan nama yang sudah pernah dipakai di meja
  lain (yang paling sering dipakai di atas). Nama sementara "Player 1-4" tidak ikut disarankan dan
  tidak lagi muncul sebagai "pemain" di leaderboard total.
- **Lencana mode dan filter mode** di leaderboard publik (muncul kalau sudah ada lebih dari satu
  mode yang dimainkan). Meja yang sudah disimpan diberi tanda "Final".
- **League Score disembunyikan** sampai rumusnya disepakati. Perhitungannya tetap tersimpan di
  server. Untuk menampilkannya lagi: ubah `SHOW_RATING` di `index.html` (nama tampilan ada di
  `RATING_LABEL`).
- Tab Standings sekarang menghitung "hands won" hanya dari hu, zimo, dan double/triple hu. Draw,
  invalid win, dan false win tidak dihitung menang.

File yang berubah dari versi sebelumnya: `scoreboard.html`, `index.html`, `admin-daily.html`,
`functions/_tables.js`, `functions/api/tables/[code].js`, `functions/api/overview.js`,
`functions/api/days/[id].js`, dan file BARU `functions/api/lock/[code].js`.

## Update terbaru (v6): perbaikan mode

- **Data lama yang tercatat "Casual"**: meja yang terakhir disimpan sebelum versi ini belum punya
  catatan mode di hasilnya, jadi leaderboard dan admin menganggapnya Casual. Sekarang hasil lama
  dihitung ulang dari game yang tersimpan saat dibaca pertama kali (otomatis, sekali saja, tanpa
  mengubah waktu simpan). Tidak perlu migrasi database.
- **Mode Custom**: mengetik angka di kolom Minimum points / Max streak dulu membuat server menolak
  SEMUA simpanan berikutnya untuk meja itu (termasuk hand baru). Sekarang diterima, dan angka yang
  di luar batas dirapikan oleh mesin skor.
- **Simpanan yang ditolak server** sekarang kelihatan jelas ("NOT saved, last change refused" plus
  satu peringatan) dan tidak diulang terus-menerus. Edit berikutnya mencoba lagi.
- Mengganti mode di tengah game memang diperbolehkan, tetapi **seluruh hand yang sudah ada dihitung
  ulang dengan aturan mode yang baru** (skor, dealer, dan batas dealer nyangkut ikut berubah).

File yang berubah dari v5: `scoreboard.html`, `functions/_tables.js`, `functions/api/overview.js`,
`functions/api/days/[id].js`.

## Update terbaru (v7): aturan main selalu terlihat

- **Kartu "Game rules"** (hanya baca) di tab Play dan tab Standings: mode, minimum poin untuk menang,
  batas dealer nyangkut, rotasi kursi, deadwall, skor awal, dan bankrupt. Tampil untuk host maupun
  pemain, baik game masih berjalan maupun sudah di-Save.
- **Leaderboard publik dan admin** menampilkan satu baris aturan di tiap meja
  (contoh: "Default - 2+ pts to win - streak 4 - start 200 - bankrupt").
- Setelah "Save game" meja bersifat final; kalau ada yang perlu dikoreksi, admin menekan "Buka kunci"
  di kartu meja.
- Catatan: memilih mode otomatis mengisi skor awal sesuai preset (Casual/Default 200,
  Tournament 240, Custom tidak diubah). Skor awal masih bisa diedit selama belum ada hand.
- Hasil lama dihitung ulang otomatis saat dibaca pertama kali (tanpa migrasi).

File yang berubah dari v6: `scoreboard.html`, `index.html`, `admin-daily.html`,
`functions/_tables.js`, `functions/api/overview.js`, `functions/api/days/[id].js`.


## Update terbaru (v8): pemain dan aturan terkunci setelah hand pertama

- **Pemain (nama) dan semua pengaturan aturan** (mode, rotasi kursi, opsi Custom, skor awal,
  bankrupt) hanya bisa diubah **sebelum hand pertama dicatat**. Setelah itu kolomnya nonaktif,
  panel "Players and options" menutup sendiri, dan ada keterangannya. Judul dan tanggal masih
  bisa diedit. Berlaku untuk host dan untuk scoreboard tanpa kode meja.
- **Server ikut menolak** perubahan itu (kode 422), jadi halaman yang basi atau browser yang
  dimodifikasi pun tidak bisa menembusnya. Halaman akan kembali ke versi server dan memberi tahu.
- Kalau ada salah ketik nama atau salah pilih mode: hapus semua hand di meja itu (dua kali tap
  "Delete" per hand). Game kembali ke "belum ada hand", dan panel pengaturan terbuka lagi.
- Leaderboard tetap memakai **net points**. League Score / TBT Rating tetap disembunyikan sampai
  ada database pemain.
- Tidak ada migrasi database.

File yang berubah dari v7: `scoreboard.html`, `functions/_tables.js`,
`functions/api/tables/[code].js`, `functions/api/lock/[code].js`.

## Update terbaru (v9): Pong Of Dragon di Pattern Picker

- **Pong Of Dragon sekarang bisa dipilih 2x**, seperti Kong dan Flower In Season. Tap pertama
  = 1x, tap kedua = (x2) dan dihitung +2, tap ketiga = mati. Pola lain tetap 1x.
- Tidak ada migrasi database. File yang berubah dari v8: `scoreboard.html`.
