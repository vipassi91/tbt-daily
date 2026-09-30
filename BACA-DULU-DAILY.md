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

- **Halaman baru `masuk.html`** — satu halaman buat host maupun pemain.
  Tinggal buka `<domainmu>/masuk.html`, ketik kode 5 karakter yang dikasih
  admin, otomatis diarahkan ke scoreboard yang benar (mode edit kalau kode
  host, mode lihat kalau kode pemain). Nggak perlu kirim link lengkap lagi,
  cukup kode-nya doang (misal lewat chat/WhatsApp singkat).
- Link lengkap (`scoreboard.html?code=...`) di admin tetap ada sebagai
  opsi kalau lebih suka kirim link langsung.
- Endpoint baru `functions/api/resolve/[code].js` yang nentuin jenis
  kode. Ini publik (nggak perlu password), tapi cuma bilang "host" atau
  "view", nggak pernah balikin data meja itu sendiri.
