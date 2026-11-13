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

## Update terbaru (v10): aturan eksklusi garden di Pattern Picker

- **Win By Royal Garden** dan **Win By Imperial Garden** berdiri sendiri: kalau salah satunya dipilih,
  semua pola lain (semua tingkat), bonus bunga/musim lain, dan bonus win condition terkunci.
  Sebaliknya, kalau ada pilihan lain, kedua garden win itu terkunci sampai pilihan lain dilepas.
  Royal dan Imperial juga tidak bisa dipilih bersamaan. Total yang dihitung hanya +3 (Royal)
  atau +4 (Imperial).
- Hand lama yang tersimpan dengan garden win + pola lain: saat dibuka lagi di picker, yang dihitung
  hanya garden win-nya, dan sisanya ditampilkan sebagai "Locked out by the garden win".
- Tidak ada migrasi database. File yang berubah dari v9: `scoreboard.html`.

## Update terbaru (v11): All Types membatasi Pong Of Dragon

- Kalau **All Types** dipilih, **Pong Of Dragon** hanya bisa dipilih **1x** (tap: 1x, mati). Kalau Pong Of
  Dragon sudah di (x2) lalu All Types ditambahkan, Pong Of Dragon otomatis turun jadi 1x. Begitu All
  Types dilepas, batasnya kembali 2x. Kong dan pong lain tidak terpengaruh.
- Hand lama yang tersimpan dengan All Types + Pong Of Dragon (x2) dibuka lagi sebagai 1x.
- Tidak ada migrasi database. File yang berubah dari v10: `scoreboard.html`.

## Update terbaru (v12): Share hand

- **Tombol "Share"** di riwayat hand untuk hand yang menang (hu, zimo, double, triple). Membuka modal
  layar penuh: kartu 1080x1350, pilihan format dan tema, saklar apa yang ditampilkan di kartu,
  pemilih tile dekoratif (tidak dihitung skor), Save image, dan Share. Fitur ini hanya membaca data
  game, tidak mengubah apa pun yang tersimpan.
- **Share tersedia untuk semua**: host, pemain (link lihat), dan game yang sudah di-Save. Tombol
  Edit dan Delete tetap hanya untuk game yang masih terbuka.
- **Save image di modal share** mengikuti Story tab: unduh langsung dulu, kalau diblokir browser HP
  gambar dibuka di tab baru (tekan-tahan untuk menyimpan).
- **Perbaikan font hanzi**: sebelumnya kode memanggil font bernama "TBT Hanzi" yang tidak ada, sehingga
  font LXGW WenKai yang tertanam tidak pernah dipakai di gambar story. Sekarang memakai nama yang
  benar ("LXGW WenKai TC"), plus tiga huruf baru untuk kartu share (胡, 自, 摸).
- **Tema story otomatis**: membuka story dari tab Play atau Standings memilih tema sesuai ronde.
- Ukuran `scoreboard.html` naik dari sekitar 0,6 MB ke sekitar 2,2 MB (gambar tile untuk pemilih tile).
- Tidak ada migrasi database. File yang berubah dari v11: `scoreboard.html`.

## Update terbaru (v13): bonus menumpuk seperti pola, berhenti di 10

- **Bonus bunga/musim dan bonus win condition dijumlahkan dengan cara yang sama seperti pola**: dari
  yang terbesar, ditambahkan selama total berjalan masih di bawah 10. Bonus yang melewati 10 tetap
  dihitung penuh, dan setelah total mencapai 10 atau lebih tidak ada bonus lagi yang ditambah.
  Sebelumnya bonus bisa menumpuk sampai 13.
- Contoh: pola 9 + Set Of Flowers (+2) = 11. Pola 9 + Flower In Season x2 = 10, karena tiap Flower
  In Season dihitung sendiri (+1): yang pertama mencapai 10, yang kedua tidak terhitung. Pola 8 +
  Flower In Season x2 = 10 (keduanya terhitung).
- Urutan bonus: yang bernilai lebih besar dulu, dan kalau sama besar, bunga sebelum win condition.
- Bonus yang tidak terhitung tetap bisa dipilih (tombolnya tidak dikunci) dan dijelaskan di panel
  total ("Not counted, the total already reached 10").
- Pola yang sudah tepat 10: tidak ada bonus yang terhitung. Pola di atas 10: bonus tetap terkunci,
  seperti sebelumnya. Aturan Master/Legendary dan garden win tidak berubah.
- Hand lama tidak berubah sampai dibuka lagi di picker dan totalnya dipakai ulang.
- Tidak ada migrasi database. File yang berubah dari v12: `scoreboard.html`.

## Update terbaru (v14): Share hand disamakan dengan versi terbaru

Bagian share hand (CSS dan skrip) sekarang identik dengan file `index.html` terbaru yang dijadikan patokan.

- **Pemilih tile berbaris**: Row 1 = bunga dan musim (otomatis), Row 2 dan Row 3 = diisi sendiri, maksimal
  10 tile per baris. Kalau baris aktif penuh, tile berikutnya masuk ke baris satunya. Mengetuk tile
  yang sudah dipilih menghapusnya dari barisnya saja.
- **Posisi tile di kartu**: Bottom, Center, atau Top.
- **Tata letak kartu**: story diberi jarak aman 150px di atas dan di bawah; format post diskalakan
  (teks 88%, tile 80%); daftar pola yang panjang dibagi dua kolom; nama pola yang panjang mengecilkan
  ukuran huruf daftar dulu, baru dipotong dengan "...".
- **Save image di modal share**: membuka gambar di tab baru lebih dulu (tekan-tahan untuk menyimpan),
  lalu mencoba unduh langsung, lalu menyerah dengan pesan. Story tab tetap mengunduh langsung dulu.
- Yang tetap versi kita: Share terlihat untuk pemain dan game yang sudah di-Save, serta semua kode
  pattern picker (aturan eksklusi dan batas 10).
- Tidak ada migrasi database. File yang berubah dari v13: `scoreboard.html`.

## Update terbaru (v15): Save langsung ke HP, Share lewat share sheet

- **Save image** (Story tab dan kartu share hand) sekarang satu ketukan, tanpa langkah tambahan:
  - Android dan desktop: unduh langsung. Di Android hasilnya masuk ke album "Download" di galeri.
  - iPhone dan iPad: unduhan biasa hanya masuk ke aplikasi Files, bukan Photos. Jadi Save membuka
    share sheet, dan di sana pilihan "Save Image" memasukkan gambar langsung ke Photos.
  - Tab baru (tekan-tahan gambar) hanya jadi jalan terakhir kalau browser memblokir unduhan.
- **Share** membuka share sheet bawaan HP, tempat Instagram dan WhatsApp muncul kalau terpasang.
  Tombolnya hanya tampil di perangkat yang mendukung berbagi file. Halaman web tidak bisa langsung
  memposting ke Story Instagram tanpa lewat share sheet.
- Pesan lama (misalnya "Could not save...") dibersihkan saat Share diketuk.
- Keputusan yang dicatat: pola tepat 10 poin = chip bonus tetap bisa diketuk tapi tidak terhitung;
  garden win pada hand lama = pilihan lain disimpan dan ditandai "Locked out"; Share terlihat untuk
  pemain dan game final.
- Tidak ada migrasi database. File yang berubah dari v14: `scoreboard.html`.

## Update terbaru (v16): registry pemain

- **Registry pemain** adalah daftar pemain resmi yang diisi admin, tanpa login apa pun. Datanya: nama
  lengkap, nama panggilan, nomor WhatsApp, dan username Instagram. **Hanya nama panggilan yang tampil
  di halaman publik.** Nama lengkap, WhatsApp, dan Instagram hanya terlihat di halaman admin.
- **Aturan guest**: nama yang tertulis di meja dianggap pemain kalau cocok dengan nama panggilan, nama
  lengkap, atau ejaan lain yang ditautkan admin. Selain itu menjadi **guest**: tetap tampil di kartu
  meja dan sesinya (dengan label "guest"), tapi tidak masuk leaderboard (Total, per sesi, dan
  penghitung Players) dan tidak muncul di saran nama untuk host. Nama ganda (memuat "/", "&", "+" atau
  "dan") otomatis guest karena tidak terdaftar.
- **Pengaman**: selama belum ada satu pun pemain terdaftar, aturan guest belum berlaku dan leaderboard
  tidak berubah. Begitu ada satu pemain terdaftar, hanya pemain terdaftar yang masuk leaderboard.
- **Halaman `admin-pemain.html`** (link "Pemain" di bar atas halaman admin):
  - **Aktifkan registry** satu kali (membuat dua tabel baru, aman diulang). Sebelum aktif, halaman ini
    sudah bisa dipakai untuk memeriksa semua nama yang pernah dipakai.
  - **Pilih nama yang mau didaftarkan**: setiap guest punya kotak centang. Centang satu per satu, atau
    pakai "Pilih semua yang tampil" (mengikuti kolom cari), lalu tekan "Daftarkan yang dipilih". Nama
    panggilannya sama dengan ejaan yang tercatat dan bisa diubah lewat Edit. **Yang tidak dicentang tetap
    guest.** Nama ganda tidak bisa dicentang. Nama lengkap, WhatsApp, dan Instagram bisa diisi belakangan
    (pemain yang datanya belum lengkap diberi tanda).
  - **Daftarkan** satu guest (nama panggilan terisi otomatis), **Tambah pemain baru** (yang belum
    pernah main), **Edit**, dan **Hapus**.
  - **Tautkan ke...**: mengaitkan ejaan lain ke pemain yang sudah ada (misalnya salah ketik). Guest
    yang mirip pemain terdaftar diberi saran "Mirip ...". Dua ejaan yang pernah duduk semeja tidak
    bisa ditautkan, karena satu orang tidak mungkin dua kursi.
  - Nomor WhatsApp disimpan dalam bentuk 62812... dan harus unik. Instagram disimpan sebagai username.
- **Game asli tidak pernah diubah.** Semua diterapkan saat data dibaca. Menghapus pemain dari registry
  membuat namanya kembali menjadi guest.
- Keputusan gabung nama dan penanda duo dari versi sebelumnya tidak dibawa, karena modelnya berbeda
  (sekarang daftar eksplisit). Tabel lama (`players`, `player_aliases`) tidak dipakai dan boleh diabaikan.
- Dua tabel baru: `registry` dan `registry_names` (SQL manual ada di `schema-players.sql`, tapi tombol
  di halaman admin sudah cukup).
- File baru: `admin-pemain.html`, `schema-players.sql`, `functions/_players.js`,
  `functions/api/admin/players.js`. File berubah: `index.html`, `scoreboard.html`, `admin-daily.html`,
  `functions/api/overview.js`.

## Update terbaru (v17): pendaftaran lewat link

- Di `admin-pemain.html` ada kartu **"Pendaftaran lewat link"**. Tombolnya: **Buat link pendaftaran**,
  **Salin link**, **Matikan link** / **Aktifkan lagi**, dan **Buat link baru** (link lama langsung tidak
  berlaku). Bagikan link-nya ke pemain, misalnya di grup WhatsApp.
- Pemain membuka link (`daftar.html?t=...`) dan mengisi: nama panggilan (wajib), nama mereka di papan skor
  (dipilih dari nama yang sudah pernah dipakai di meja, boleh kosong), nama lengkap, nomor WhatsApp
  (wajib), Instagram, dan kotak persetujuan.
- Pendaftaran masuk ke daftar **"Menunggu persetujuan"**. **Tidak ada yang tampil di leaderboard sebelum
  kamu setujui.** Tekan **Tinjau dan setujui** (datanya bisa diubah dulu) atau **Tolak** (data langsung
  dihapus). Saat disetujui, nama yang dipilih pemain otomatis tertaut ke game-nya.
- Kenapa harus disetujui: tanpa login, siapa pun yang punya link bisa mengetik nama orang lain. Kartu
  pendaftaran menunjukkan nama guest yang diklaim beserta jumlah game-nya. Cek dulu orangnya (misalnya
  lewat WhatsApp) sebelum menyetujui. Kalau nama yang diklaim sudah terdaftar atas orang lain, kartunya
  diberi tanda merah dan tidak bisa disetujui.
- Pengaman: link berisi kode rahasia yang bisa dimatikan atau diganti kapan saja; satu nomor WhatsApp
  hanya bisa mendaftar sekali; satu perangkat maksimal 5 kiriman per jam; daftar tunggu maksimal 200;
  ada kolom jebakan untuk bot; alamat IP tidak disimpan (hanya hash).
- Data pendaftar hanya disimpan selama menunggu: setelah disetujui pindah ke registry, setelah ditolak
  dihapus.
- Dua tabel baru: `registry_settings` dan `registry_requests`. Kalau registry sudah kamu aktifkan sebelum
  fitur ini, kartunya menawarkan tombol **Aktifkan pendaftaran lewat link** (registry dan datanya tidak
  berubah). Kalau belum, tombol "Aktifkan registry pemain" sudah membuat semuanya.
- File baru: `daftar.html`, `functions/api/signup.js`. File berubah: `admin-pemain.html`,
  `functions/_players.js`, `functions/api/admin/players.js`, `schema-players.sql`.

## Update terbaru (v18): dua orang dengan nama sama (pisah per game)

- Masalah: registry menautkan berdasarkan nama, jadi semua game bernama "Steven" ikut ke satu orang.
  Sekarang tiap game bisa diatur sendiri.
- Di `admin-pemain.html` ada tombol **Pisah per game** pada guest atau pemain terdaftar yang punya dua
  game atau lebih (atau yang punya game hasil pengaturan manual). Daftarnya menampilkan tiap game: sesi,
  meja, tanggal, hasil, teman main, ditulis sebagai apa, dan sekarang dihitung untuk siapa. Pilihannya:
  **Ikuti nama**, **Guest (tidak dihitung)**, atau salah satu pemain terdaftar.
- Contoh dua Steven: daftarkan "Steven A" dari nama Steven, tambah "Steven B" lewat "Tambah pemain
  baru", lalu buka "Pisah per game" di Steven A dan berikan game yang bukan miliknya ke Steven B.
- Aturan: satu orang tidak bisa mengisi dua kursi di satu meja. Memilih orang yang memang sudah sesuai
  nama sama dengan tidak memilih apa-apa. Kalau kursi itu kemudian diganti namanya, pilihan lama berhenti
  berlaku. Menghapus pemain mengubah game yang diatur manual untuk dia menjadi guest, bukan pindah ke
  orang yang senama.
- Pendaftaran lewat link: nama yang sudah dipakai orang lain kini bisa disetujui tanpa menautkan nama
  (kotak "Tautkan nama ..." di form persetujuan), lalu game-nya diatur per game. Form pendaftaran
  menawarkan sebuah nama selama masih ada game dengan nama itu yang belum bertuan.
- **Game asli tidak diubah.** Tabel baru: `registry_seats`. Kalau registry sudah kamu aktifkan sebelum
  versi ini, muncul tombol **Perbarui registry** (data registry tidak berubah).
- File yang berubah dari v17: `admin-pemain.html`, `functions/_players.js`, `functions/_tables.js`,
  `functions/api/admin/players.js`, `functions/api/overview.js`, `functions/api/signup.js`,
  `schema-players.sql`.

## Update terbaru (v19): leaderboard baru dan kartu share top 10

- **Penanda peringkat 1 sampai 4** di halaman utama: juara 1 emas dengan mahkota, juara 2 perak, juara 3
  perunggu, juara 4 hijau giok. Pemain yang seri berbagi peringkat dan penandanya. Berlaku di papan Total
  dan di papan tiap sesi.
- **Tombol "Share top 10"** di atas papan, di tab Total (mengikuti filter periode dan mode yang sedang
  tampil) dan di papan tiap sesi. Membuka jendela dengan pratinjau kartu, pilihan **format** (Story 9:16
  atau Post 4:5), dan lima **gaya** yang sama dengan kartu scoreboard dan share hand (Midnight, Red,
  Forest, Black, Cream).
- **Kartu** memuat 10 teratas, dengan latar empat angin, header berlogo, mahkota untuk juara 1, serta
  footer berisi handle dan tagline. Hanya pemain terdaftar yang ikut, sama seperti papan di halaman.
  Kalau pemainnya kurang dari sepuluh, baris yang ada dipusatkan.
- **Save image** satu ketukan (Android dan desktop mengunduh, iPhone dan iPad lewat share sheet),
  **Share** lewat share sheet HP (Instagram, WhatsApp, dan lain-lain). Perilakunya sama dengan kartu lain.
- **Handle dan tagline** di footer kartu diambil dari pengaturan brand: kunci `handle` dan `tagline` di
  `brands/tbt.json` (kalau kosong, barisnya tidak ditampilkan).
- Tidak ada perubahan database. File yang diunggah dan berubah dari v18: `index.html`
  (sumbernya juga: `build.py` dan `brands/tbt.json`).

## Update terbaru (v20): leaderboard lebih rapi

- **Angka tidak lagi naik-turun.** Sebelumnya nomor peringkat, skor, angka statistik, dan angka di kartu
  meja memakai Playfair, yang angkanya bergaya lama (ada yang kecil, ada yang turun). Sekarang semuanya
  memakai Inter dengan angka sejajar dan selebar sama, jadi kolom skor lurus. Judul tetap Playfair, tapi
  angkanya (misalnya "Table 1" atau "3Frogs") kini sejajar dengan hurufnya.
- **Penanda peringkat 1 sampai 4 dibuat lebih tenang.** Semua baris punya bentuk dan ukuran yang sama.
  Penandanya hanya cincin pada nomor (terisi emas untuk juara 1), garis tipis di tepi kiri, semburat warna
  yang samar, dan mahkota kecil di samping nama juara. Warnanya emas, perak, perunggu, dan hijau brand.
  Tidak ada lagi bingkai, cakram berkilau, atau mahkota yang menimpa lencana.
- **Kartu share top 10** memakai penanda yang sama. Nama pemain di kartu sekarang Inter (judul "Top 10"
  tetap Playfair, seperti kartu lain).
- Tidak ada perubahan database. Satu-satunya file yang diunggah dan berubah dari v19: `index.html`.

## Update terbaru (v21): skor Playfair, navigasi, dan pemeriksaan menyeluruh

- **Skor kembali Playfair, nama tetap Inter.** Skor di papan, angka statistik (Sessions, Tables, Players),
  dan skor di kartu meja memakai Playfair lagi, tapi dengan angka sejajar (semua setinggi huruf kapital),
  jadi tidak ada lagi angka yang tampak mengecil. Nomor urut (lingkaran peringkat) tetap Inter. Kartu
  share top 10 tetap memakai Inter untuk nama dan skor, seperti kartu scoreboard.
- **Tidak ada lagi halaman buntu:**
  - Halaman utama: tautan **Enter table code** (ke `masuk.html`) di kanan atas.
  - Tombol **Back** peramban sekarang berpindah antar-tampilan (Total, daftar sesi, satu sesi) alih-alih
    keluar dari situs. Mengganti filter tidak menambah riwayat.
  - Scoreboard (host dan pemain): logo dan tautan **‹ Leaderboard** di bilah atas. Kalau meja dibuka dari
    halaman sesi, tautannya kembali ke sesi itu. Judul tab memuat nama meja (misalnya "Table 1 · ...").
  - `masuk.html`: tautan ‹ Leaderboard, dan judul tab sendiri. `daftar.html`: tautan Lihat leaderboard
    di halaman "link tidak berlaku" dan setelah berhasil mendaftar.
- **Halaman admin memakai satu bilah navigasi yang sama**: Sesi, Pemain, Leaderboard, dengan halaman
  yang aktif ditandai, plus tombol Keluar. Judul bilahnya sama (TBT ADMIN) di kedua halaman.
- **Area ketuk cukup besar** (minimal sekitar 38 piksel) untuk Edit, Delete, dan Share di riwayat hand,
  filter di halaman utama, tombol kecil di admin, dan tautan di detail sesi. Tampilannya hampir tidak
  berubah, hanya area yang bisa diketuk yang melebar.
- **Halaman 404** (`404.html`) dengan tautan ke leaderboard dan halaman kode. Catatan: dulu alamat yang
  salah menampilkan halaman utama; sekarang menampilkan halaman 404.
- **Alamat pendek untuk admin** lewat berkas `_redirects`: `/admin` membuka halaman sesi, `/pemain`
  membuka halaman pemain. Berkas ini hanya berfungsi kalau berada di folder paling atas yang diunggah
  (sama dengan `index.html`). Kalau tidak berfungsi, tidak ada yang rusak; alamat lengkapnya tetap bisa dipakai.
- Semua halaman mengatur warna bilah peramban HP (terang dan gelap) lewat `theme-color`.
- Tidak ada perubahan database. File baru: `404.html`, `_redirects`. File berubah dari v20:
  `index.html`, `scoreboard.html`, `masuk.html`, `daftar.html`, `admin-daily.html`, `admin-pemain.html`.

## Update terbaru (v22): header halaman utama disederhanakan

- Halaman utama (leaderboard) sekarang memakai **bilah atas tipis yang sama dengan scoreboard**: logo kecil
  dan nama brand di kiri, tautan **Enter table code** di kanan. Logo besar di tengah dan nama brand di bawahnya
  dihapus.
- Judul **Leaderboard** dan jam pembaruan kini rata kiri tepat di bawah bilah. Statistik dan papan peringkat
  naik, jadi peringkat 1 sampai 6 sudah terlihat di layar pertama HP.
- Logo di bilah bisa diketuk untuk kembali ke halaman utama (tab Total). Area ketuknya dibesarkan di halaman
  utama dan di scoreboard.
- Nama brand di bilah diambil dari pengaturan brand (`brand_name`).
- Tidak ada perubahan database. File berubah dari v21: `index.html` dan `scoreboard.html`.

## Update terbaru (v23): perbaikan dari pemeriksaan menyeluruh

Pemeriksaan ini dijalankan di browser sungguhan (perjalanan penuh admin, host, pemain, kartu, kunci game,
leaderboard, registry), plus uji nama berisi kode HTML di semua halaman, pemindaian lebar halaman di layar
390 dan 360 piksel dengan nama panjang, dan pengukuran kontras warna.

- **Nama panjang tidak lagi melebarkan scoreboard.** Kotak skor ronde ("東 Johan 0 / Overall 0") memakai nama
  yang tidak bisa mengecil, jadi nama seperti "Dennis Wijaya Santoso" membuat seluruh halaman lebih lebar dari
  layar HP (di host dan di pemain). Sekarang namanya dipotong dengan "..." di kotak itu, dan nama lengkap
  tetap tampil di tempat lain.
- **Kontras warna**: teks pudar (muted) di tema terang diperkuat (`#587263`), merah di tema gelap sedikit
  dilembutkan terangnya (`#EA8888`), dan angka di lencana juara 1 kini memakai tinta cokelat gelap (dulu krem di
  atas emas, kontras hanya 2,8) di halaman maupun di kartu top 10. Hasil pengukuran: tidak ada lagi teks di
  bawah standar WCAG AA.
- Hasil lain yang baik: nama berisi kode HTML tampil sebagai teks biasa di semua halaman (tidak ada celah
  injeksi), dan semua langkah perjalanan penuh berjalan tanpa error.
- Warna dasar tertanam di semua halaman, jadi semua file HTML berubah sedikit. Tidak ada perubahan database.

## Update terbaru (v24): halaman jauh lebih ringan, cache leaderboard, header keamanan, pratinjau tautan

**PENTING saat mengunggah ke GitHub.** Folder yang diunggah sekarang berisi 83 berkas (ada folder baru
`assets` berisi 54 berkas). GitHub membatasi 100 berkas per unggahan lewat browser, dan halaman baru memanggil
isi folder `assets`, jadi unggah dalam dua langkah:
1. Unggah folder **`assets`** dulu (commit pertama).
2. Baru unggah **semua yang lain** (commit kedua): halaman HTML, folder `functions`, `_headers`, `_redirects`,
   `og-image.jpg`, dan berkas SQL/panduan.

Yang berubah:
- **Font dan gambar dipindah dari dalam halaman ke folder `assets`** (nama berkasnya memuat kode isi
  berkas, jadi aman disimpan browser selama setahun). Halaman kini hanya mengunduh yang dipakainya.
  Hasil ukur (jaringan, kunjungan pertama): leaderboard 189 KB menjadi sekitar 150 KB, **scoreboard 1,6 MB menjadi
  sekitar 400 KB**, halaman kecil 175 KB menjadi sekitar 113 KB. **Kunjungan berikutnya hampir nol unduhan aset**
  (scoreboard 52 KB) dan setiap pembaruan hanya mengunduh halaman yang berubah. Gambar tile di jendela share
  baru diunduh saat saklar tile dinyalakan.
- **Cache leaderboard 30 detik** (`/api/overview`). Berapa pun jumlah penonton, database dibaca satu kali per
  30 detik. Cek di browser (Network, buka `/api/overview` dua kali): kepala `x-cache` berisi `MISS` lalu `HIT`.
  Kalau selalu `MISS`, cache Cloudflare tidak tersedia di alamat ini; situs tetap berjalan seperti biasa,
  hanya penghematannya tidak terjadi. Data baru bisa terlambat sampai 30 detik muncul di leaderboard.
- **`_headers`**: blokir tampilan di dalam situs lain (frame), `nosniff`, kebijakan keamanan konten, dan
  aset disimpan setahun. Halaman scoreboard, pendaftaran, admin, dan kode: `noindex` (tidak masuk mesin
  pencari) dan alamat tidak diteruskan ke situs lain (alamatnya memuat kode). Leaderboard tetap bisa dicari.
  **Kalau setelah deploy ada halaman kosong atau tombol yang tidak jalan**, hapus satu baris
  `Content-Security-Policy: ...` di `_headers`, unggah ulang, dan beri tahu saya.
  Jawaban API kini ditandai `no-store` (tidak disimpan browser) kecuali leaderboard.
- **Pratinjau tautan** untuk leaderboard (WhatsApp, Instagram): judul, deskripsi, dan gambar `og-image.jpg`
  (1200x630, 68 KB). Alamat situs diambil dari `site_url` di `brands/tbt.json` (sekarang
  `https://tilesbytilesleaderboard.pages.dev`). Kalau pindah ke domain sendiri, ubah `site_url` lalu build ulang.
  Gambar pratinjaunya: `brands/tbt.og.jpg`. WhatsApp menyimpan pratinjau lama; untuk mengujinya tambahkan `?v=2` di ujung alamat.
- **Escape** kini menutup jendela share hand dan pemilih pola di scoreboard.
- Tidak ada perubahan database. File berubah dari v23: semua halaman HTML, `functions/_auth.js`,
  `functions/api/overview.js`. File baru: folder `assets`, `_headers`, `og-image.jpg`.

## Update terbaru (v25): nama resmi tampil di scoreboard setelah ditautkan

- Setelah sebuah nama ditautkan ke pemain terdaftar (atau satu kursi diatur per game), **scoreboard menampilkan
  nama resminya**: klasemen, riwayat hand, kotak skor ronde, tab Story, dan semua kartu share. Contoh: yang
  diketik host "Steven" tampil sebagai "Steven Tan". Berlaku untuk host dan pemain.
- **Yang disimpan tetap nama yang diketik host.** Isian nama di "Players and options" juga tetap menampilkan
  yang diketik, dan mencatat hand tidak pernah menimpa nama itu dengan nama resmi. Jadi host boleh mengetik
  nama aslinya dan menautkannya belakangan.
- Guest tetap tampil seperti diketik. Kalau dua orang bernama sama duduk di satu meja, hanya kursi yang
  tertaut yang berganti nama. Kalau host mengubah nama sebelum hand pertama, yang tampil adalah yang baru diketik.
- Kapan nama baru terlihat: halaman pemain memeriksa tiap 12 detik, jadi penautan baru muncul tanpa perlu hand
  baru. Halaman host memperbarui saat menyimpan hand atau saat dimuat ulang. Perubahan oleh admin langsung
  berlaku di server; server menyimpan registry di memori paling lama 15 detik agar database tidak dibaca setiap
  kali halaman meja dibuka.
- Halaman admin (daftar meja dan pemain per sesi) masih menampilkan nama yang diketik.
- Tidak ada perubahan database. File berubah dari v24: `scoreboard.html`, `functions/_players.js`,
  `functions/api/tables/[code].js`, `functions/api/view/[code].js`, `functions/api/admin/players.js`.

## Update terbaru (v26): statistik di halaman Standing dan sub-baris baru di leaderboard sesi

- **Halaman Standing (scoreboard):** sub-baris tiap pemain kini "7 of 23 hands won". **Ketuk baris** untuk
  rincian: Win rate, Avg points / win, Best hand, Self-draws, Deal-ins. Satu baris terbuka sekali; ketukan
  di dalam rincian tidak menutupnya; Enter pada baris juga membuka atau menutupnya. Angka mengikuti tab:
  Overall menghitung seluruh game, East, South, West, North hanya hand di putaran itu.
- **Definisi:**
  - *Hand* = satu hand apa pun hasilnya (hu, zimo, double hu, triple hu, seri, invalid win, false win).
  - *Win rate* = hand yang dimenangkan dibagi seluruh hand. Double dan triple hu dihitung sebagai kemenangan
    untuk tiap pemenangnya.
  - *Avg points / win* = rata-rata **poin hand** (bukan skor) dari hand yang dimenangkan.
  - *Best hand* = kenaikan **skor** terbesar dari satu hand yang dimenangkan. Pada double atau triple hu, tiap
    pemenang memakai kenaikan skornya sendiri (tidak dijumlahkan). Pada zimo, itu yang dibayar tiga lawan.
  - *Self-draws* = jumlah kemenangan zimo. *Deal-ins* = berapa kali buangan pemain dipakai untuk hu (hu biasa,
    double, triple). Hanya angka, tanpa nama. Invalid win dan false win bukan deal-in.
  - Pemain tanpa kemenangan menampilkan "-" untuk Avg points / win dan Best hand.
- **Leaderboard sesi:** sub-baris diganti menjadi "1st in 2/4 rounds · 30% win rate" (first place per putaran
  angin dari jumlah putaran yang sudah punya hand, dan hand menang dibagi seluruh hand). Seri di posisi pertama
  dalam satu putaran dihitung first place untuk semua yang seri. Kartu share Top 10 pada halaman sesi memakai
  kalimat yang sama. **Leaderboard Total (semua waktu) tetap "N games · N first places".**
- **Angka skor di klasemen scoreboard** memakai angka sejajar, seperti di leaderboard.
- **Di server:** versi statistik naik ke 4. Tiap meja menyimpan fakta per pemain berupa jumlah (bukan
  persen): first place per putaran angin, total poin kemenangan, best hand, self-draw, dan deal-in. Hanya yang
  dibutuhkan leaderboard yang dikirim ke publik. Fakta lain disimpan untuk recap dan halaman pemain nanti.
  Meja lama dihitung ulang otomatis dari hand-nya, **dua belas meja per permintaan**, supaya tidak membebani
  server. Selama itu berlangsung (beberapa menit setelah deploy), meja yang belum dihitung ulang memakai
  sub-baris lama. Tidak ada langkah manual dan tidak ada data yang hilang.
- Tidak ada perubahan database dan tidak ada berkas aset baru. File berubah dari v25: `scoreboard.html`,
  `index.html`, `functions/_tables.js`, `functions/_players.js`, `functions/api/overview.js`.

## Update terbaru (v27): atur satu game yang tertaut keliru

- Sebelumnya tombol "Pisah per game" hanya muncul untuk pemain dengan dua game atau lebih, sehingga satu game
  yang tertaut ke orang yang salah (dua orang bernama sama) tidak bisa dipindahkan. Sekarang **setiap pemain
  terdaftar yang punya game** mendapat tombol: "Atur game" bila satu game, "Pisah per game" bila lebih.
- Di panel itu pilih: **Ikuti nama** (tautan awal), **Guest (tidak dihitung)**, atau pemain terdaftar yang
  benar. Game aslinya tidak diubah.
- Cara lain yang selalu bisa dipakai: Edit pemain, hapus ejaan yang salah (tombol x di samping ejaan). Kalau
  ejaan itu sama dengan nama panggilan, ubah dulu nama panggilannya, baru ejaan lamanya bisa dihapus.
- Saat menyetujui pendaftaran lewat link, kotak "Tautkan nama ..." menentukan apakah game dengan nama itu
  ikut tertaut otomatis. Hilangkan centangnya kalau ragu, lalu atur game-nya satu per satu.
- Tidak ada perubahan database. File berubah dari v26: `admin-pemain.html`, `functions/api/admin/players.js`.

## Update terbaru (v28): halaman utama baru (filter periode dan mode, dua kolom di desktop)

- **Pertama dibuka** halaman menampilkan **musim berjalan** (bulan ini, misalnya "October 2026") dan mode **Default**.
  Kalau mode Default belum punya game pada periode itu, halaman membuka "All modes" supaya tidak kosong.
  Kalau hanya satu mode yang pernah dimainkan, tombol mode tidak muncul.
- **Dua dropdown** di bawah judul (di desktop di kanan judul):
  - **Periode:** musim (bulan yang punya data, dan bulan berjalan), Today, This week (Senin sampai Minggu),
    All time, dan **Custom range** (dua tanggal lalu Apply).
  - **Mode:** Default, Casual, Tournament, Custom, All modes, dengan jumlah meja per mode pada periode terpilih.
  - Di layar sempit menu muncul sebagai lembar dari bawah, di layar lebar sebagai menu kecil di bawah tombol.
    Bisa dipakai dengan keyboard (panah, Enter, Escape) dan membaca keadaan lewat pembaca layar.
- **Garis kemajuan musim** (hanya untuk musim yang sedang berjalan): "Day 17 of 31" dan "Ends 31 Oct".
- **Satu baris angka** menggantikan tiga kartu: Wind rounds, Sessions, Tables, Players. Angka Players
  **menyertakan guest**, sedangkan papan hanya memeringkat pemain terdaftar (keterangan ada di atas papan).
- **Tab Total dan Sessions** berupa teks bergaris bawah. Tab Sessions juga mengikuti periode dan mode.
  Sesi yang belum dimulai tetap terdaftar ("Not started") supaya mejanya tetap bisa ditemukan.
- **Desktop:** dua kolom. Papan di kiri, "Latest sessions" yang menempel saat digulir di kanan. Halaman sesi:
  papan di kiri, daftar meja di kanan. Halaman sesi tidak ikut filter mode utama; bila sesinya punya beberapa
  mode, ada menu mode sendiri di halaman itu.
- **Alamat halaman menyimpan filter**, jadi tautan yang dibagikan membuka tampilan yang sama:
  `?p=2026-09` (musim), `?p=today`, `?p=week`, `?p=all`, `?p=2026-10-03_2026-10-10` (custom),
  dan `m=casual`, `m=default`, `m=tournament`, `m=custom`, `m=all`. Tampilan bawaan menjaga alamat tetap bersih.
  Mengubah filter tidak menambah langkah Back.
- Kartu **Share top 10** memakai periode dan mode yang sedang tampil.
- "This month" dibuang dari daftar (sama dengan musim berjalan). **Wawasan** (pemimpin, pendaki, dan sebagainya)
  belum dibuat; menunggu keputusan.
- Tidak ada perubahan database. File berubah dari v27: `index.html`.

## Update terbaru (v29): scoreboard dan halaman admin menyesuaikan layar lebar

Di layar lebar (laptop, tablet besar, layar venue) ruang tambahan dipakai. **Di ponsel dan tablet kecil tidak ada
yang berubah**: aku membandingkan 33 tampilan (ponsel sampai 1099px) antara versi sebelumnya dan versi ini,
semuanya identik piksel demi piksel.

- **Scoreboard** (lebar 1100px ke atas): pencatatan di kiri, **Standings dan riwayat hand di kanan**, tampil
  bersamaan. Tab "Standings" disembunyikan di layar lebar karena isinya sudah terlihat; tab Story tetap terpisah
  dan memakai seluruh layar. Tombol Edit, Delete, dan Share pada hand tetap berfungsi seperti biasa. Tampilan
  pemain (hanya melihat) memakai pola yang sama. Mengubah ukuran jendela menyusun ulang halaman, jadi memperkecil
  jendela mengembalikan susunan ponsel (riwayat hand kembali ke kolom Play).
- **Admin sesi** (1000px ke atas): daftar sesi di kiri, sesi terpilih di kanan. Sesi terbaru terbuka sendiri.
  Tombol "Semua sesi" tidak diperlukan dan tidak ditampilkan di layar lebar. Di bawah 1000px tetap daftar dulu,
  lalu detail dengan tombol kembali.
- **Admin pemain** (1100px ke atas): pencarian dan daftar pemain terdaftar di kiri, alat (registry, tautan
  pendaftaran, antrean persetujuan, guest) di kanan yang menempel saat digulir. Di bawah 1100px tetap satu kolom
  dengan urutan yang sama seperti sebelumnya.
- Pil navigasi admin (Sesi, Pemain, Leaderboard) dibatasi lebarnya di layar lebar supaya tidak melebar penuh.
- Halaman masukkan kode dan formulir daftar tidak berubah (sudah berupa kartu di tengah).
- Tidak ada perubahan database. File berubah dari v28: `scoreboard.html`, `admin-daily.html`, `admin-pemain.html`.

## Update terbaru (v30): rotasi kursi dan huruf angin di papan ronde

- **Seat rotation (Tournament atau Custom dengan kotak "Seat rotation" dicentang; di Tournament bawaannya sudah
  tercentang):** kotak pemain di papan ronde kini **berurutan menurut kursi** pada wind round itu, yaitu East,
  South, West, North berlawanan arah jarum jam. Urutannya mengikuti tabel rotasi MCR: East `1-2-3-4`,
  South `2-1-4-3`, West `3-4-2-1`, North `4-3-1-2` (angka = urutan nama yang diisi di pengaturan). Pemain
  pindah kursi saat wind round baru dimulai (setiap 4 hand); di dalam satu round urutan kotak tetap dan
  lencana Dealer berjalan dari kotak ke kotak.
- **Petunjuk "change seats":** di awal tiap wind round baru (sebelum hand pertama round itu dicatat) muncul
  kotak kecil berisi urutan duduk baru. Di awal game dengan seat rotation muncul "Seating" berisi urutan awal.
- **Pilihan pemain di form pencatatan** (pemenang, pembuang, dan sebagainya) mengikuti urutan yang sama. Saat
  mengedit hand lama, pilihannya mengikuti kursi pada hand itu.
- **Di pengaturan**, bila seat rotation aktif, ada petunjuk: isi nama pemain menurut urutan duduk awal (East
  dulu, lalu berlawanan arah jarum jam).
- **Huruf angin di kotak pemain** sekarang menunjukkan **angin kursi saat ini** (dealer = East, kursi
  berikutnya South, dan seterusnya), dan ikut bergeser bersama dealer. Ini berlaku di semua mode, termasuk
  Casual dan Default; bedanya, di mode tanpa seat rotation kotak tetap di tempatnya (hanya huruf anginnya yang
  bergeser). Sebelumnya huruf angin menempel pada nomor pemain dan tidak berubah.
- Tampilan di ponsel tidak berubah selain baris huruf angin di papan ronde. Halaman lain tidak tersentuh.
- Tidak ada perubahan database. File berubah dari v29: `scoreboard.html`.

## Update terbaru (v31): tombol format, kartu Top 10 lebih lega, keterangan baris di leaderboard utama

- **Tombol format** (Story 9:16 dan Post 4:5) di jendela Share top 10 kembali berbentuk pil dengan pilihan aktif
  berwarna hijau. Sempat tampil putih di v28 karena gaya `.chips` ikut terhapus saat halaman utama ditulis ulang.
  Sekarang ada tes yang memeriksa warna dan kontras tombol itu di tema gelap dan terang, serta audit yang
  memastikan tidak ada kelas di halaman yang kehilangan gayanya.
- **Kartu Top 10 lebih lega:** tiap baris lebih tinggi (sekitar 98px di Story, sebelumnya 91px), huruf nama,
  keterangan, skor, dan nomor peringkat sedikit lebih kecil, dan jarak teks di dalam baris mengikuti tinggi baris.
  Kepala dan kaki kartu Story dirampingkan sedikit untuk memberi ruang, tanpa masuk area aman Instagram.
  Post 4:5 mendapat penyesuaian huruf dan jarak yang sama.
- **Keterangan di bawah nama pada leaderboard utama** (dan di kartu Top 10): kini "**N wind rounds · M first places**",
  yaitu jumlah wind round yang dimainkan pemain dan berapa kali ia first place di wind round itu (bukan
  seluruh game). Wind round dihitung dari putaran yang sudah punya minimal satu hand. Meja yang statistiknya belum
  diperbarui sementara memakai keterangan lama ("N games · N first places") sampai gilirannya tiba. Halaman sesi
  tetap memakai "1st in X/Y rounds · Z% win rate".
- Tidak ada perubahan database. File berubah dari v30: `index.html`.

## Update terbaru (v32): halaman admin kembali satu kolom

- **Admin sesi dan admin pemain kembali satu kolom di semua ukuran layar**, persis seperti sebelum v29 (daftar sesi
  dulu lalu detail dengan tombol "Semua sesi"; kartu pemain bertumpuk ke bawah). Tampilan dua panel dan dua kolom di
  layar lebar dari v29 dicabut untuk kedua halaman itu. Kedua file kini identik byte demi byte dengan versi sebelum
  tampilan dua kolom itu.
- **Scoreboard tetap dua kolom di layar lebar** (1100px ke atas): pencatatan di kiri, Standings dan riwayat hand di kanan.
  Catatan v29 tentang halaman admin di atas tidak berlaku lagi.
- Tidak ada perubahan database. File berubah dari v31: `admin-daily.html` dan `admin-pemain.html`.

## Update terbaru (v33): halaman pemain

**Satu langkah database (sekali saja):** jalankan `migrate-v3.sql` di konsol D1, atau buka halaman admin pemain dan
tekan **"Perbarui registry"** (tombolnya muncul di kartu Registry selama langkah ini belum dilakukan). Langkah itu
menambah satu kolom `hidden` di tabel `registry`. Sebelum itu dilakukan, semua tetap berjalan: halaman pemain
terbuka untuk semua pemain terdaftar, dan tombol sembunyikan memberi tahu bahwa database perlu diperbarui.
Instalasi baru memakai `schema-players.sql` yang sudah memuat kolom itu.

- **Alamat:** `/player/<nama>-<id>`, misalnya `/player/ricky-b316433126`. Server hanya memakai `id` di ujung (10
  karakter, acak, tidak berubah walau nama panggilan diganti). Bagian nama hanya agar mudah dibaca; tautan lama tetap
  bekerja setelah ganti nama, dan halaman merapikan alamatnya sendiri. Satu berkas (`player.html`) melayani semua
  pemain lewat aturan di `_redirects`.
- **Isi:** nama, sejak kapan terdaftar dan terakhir main kapan, filter periode dan mode (bawaan musim berjalan dan
  mode Default; bila mode Default kosong pada periode itu, halaman membuka semua mode), baris ringkas (Games, Wind
  rounds, 1st in wind rounds, Win rate), statistik (Avg points / win, Best hand, Self-draws, Deal-ins, dihitung seperti
  di halaman Standing), dan riwayat game (sesi, meja, mode, peringkat, skor, first place di wind rounds, win rate).
  Kartu game bisa diketuk untuk membuka mejanya. Pilihan filter ikut tersimpan di alamat (`?p=` dan `?m=`).
- **Dari leaderboard:** baris pemain terdaftar yang halamannya terbuka bisa diketuk (juga di halaman sesi).
- **Tanpa kontak:** WhatsApp, Instagram, dan nama lengkap tidak pernah dikirim atau ditampilkan.
- **Privasi:** halaman publik secara bawaan. Di admin pemain tiap pemain punya tombol **"Sembunyikan halaman"** /
  **"Tampilkan halaman"** (dan tautan "Halaman"). Pemain yang disembunyikan tetap tampil di leaderboard dengan
  namanya, tetapi tanpa tautan, dan halamannya tertutup di server. Pesan untuk halaman tersembunyi, ID salah, dan
  alamat yang bukan ID sama persis ("This page is not available"), jadi tidak ketahuan siapa yang menyembunyikan.
  Untuk pemain tersembunyi, data publik leaderboard juga tidak lagi memuat ID mereka (diganti kunci buram yang
  tidak bisa dikembalikan ke ID, sama di semua meja). Perubahan di leaderboard bisa tertunda sampai 30 detik
  karena cache; halaman pemainnya sendiri langsung tertutup.
- **Form pendaftaran:** kalimat persetujuan kini menyebut bahwa nama panggilan, hasil permainan, dan statistik
  ditampilkan di leaderboard dan di halaman pemain (bisa disembunyikan lewat admin).
- **Mesin pencari:** halaman pemain diberi `noindex` (tag dan header). Pratinjau saat tautannya dibagikan di aplikasi
  chat menampilkan pratinjau umum situs, bukan per pemain.
- **Tombol Share** di halaman membuka menu bagikan di ponsel, atau menyalin tautan bila tidak ada.
- **File baru:** `player.html`, `functions/api/player/[id].js`, `migrate-v3.sql` (folder `functions/api/player/` baru).
  **Berubah dari v32:** `index.html`, `admin-pemain.html`, `daftar.html`, `schema-players.sql`, `_redirects`, `_headers`,
  `functions/_players.js`, `functions/api/admin/players.js`. Total 86 file (di bawah batas 100 per unggahan).

## Update terbaru (v34): perbaikan halaman pemain

Dua masalah di v33 diperbaiki:

- **Halaman pemain terbaca "tidak tersedia" untuk semua pemain.** Server dan halaman hanya menerima ID tepat 10
  karakter heksadesimal, padahal ID di registry yang dibuat versi lama bisa berformat lain. Sekarang ID dalam format
  apa pun diterima (huruf besar, garis bawah, strip, panjang berapa pun). Halaman juga tidak lagi menganggap setiap
  jawaban 404 sebagai "disembunyikan": hanya jawaban resmi server ("not available") yang menutup halaman. Bila
  layanan halaman pemain tidak ada atau error, halaman menampilkan "Can't load this page right now" beserta kode
  (misalnya `404-no-service`) dan tombol coba lagi.
- **Baris peringkat 1 sampai 4 di leaderboard tidak bisa diklik.** Aturan gaya baris teratas membuat tautan
  menyusut jadi lebar nol. Sekarang seluruh baris, termasuk peringkat 1 sampai 4, bisa diklik.
- **Alamat baru:** `/player/<id>/<nama>` (ID di depan, nama hanya agar mudah dibaca). Alamat gaya v33
  (`/player/<nama>-<id>`) tetap terbuka, dan halaman merapikan alamatnya sendiri.
- **Pemeriksaan mandiri di admin pemain:** sekali tiap kunjungan, halaman admin mencoba membuka halaman satu pemain.
  Bila server tidak bisa, muncul catatan merah dengan kode dan penyebab yang mungkin (misalnya file
  `functions/api/player/[id].js` belum terunggah). Bila semuanya baik, tidak ada catatan.
- Tidak ada perubahan database dari v33. File berubah dari v33: `player.html`, `functions/api/player/[id].js`,
  `index.html`, `admin-pemain.html`.

## Update terbaru (v35): layanan halaman pemain pindah ke file yang sudah ada

Di v33 dan v34, data halaman pemain dilayani oleh file baru di folder baru (`functions/api/player/[id].js`). Bila
file itu tidak ikut terpasang di deploy, semua halaman pemain gagal. Sekarang tidak ada folder atau file baru yang
dibutuhkan:

- Data satu pemain diminta lewat **`/api/overview?player=<id>`**, dilayani oleh `functions/api/overview.js` dan
  `functions/_players.js`, dua file yang sudah ada di repo. Permintaan itu tidak pernah memakai atau mengisi cache
  leaderboard yang dibagi bersama.
- **Folder `functions/api/player/` dan file `[id].js` tidak dipakai lagi.** Bila sudah terlanjur terunggah ke GitHub,
  hapus saja (tidak berbahaya kalau dibiarkan, hanya tidak terpakai).
- **Unggah keempat file ini sekaligus dalam satu commit:** `functions/_players.js`, `functions/api/overview.js`,
  `player.html`, `admin-pemain.html`. (`overview.js` memakai fungsi baru di `_players.js`, jadi keduanya harus
  berpasangan.)
- **Pemeriksaan mandiri di admin pemain sekarang menyebut penyebabnya.** Admin mengirim kata sandinya, dan server
  menjawab dengan alasan yang hanya diberikan kepada admin: `not_found` (ID tidak ada di registry; ditampilkan
  juga jumlah pemain di registry), `hidden`, `registry_not_ready`, `bad_id`; atau, bila `overview.js` belum
  versi terbaru, kode `old`. Orang lain tetap mendapat jawaban polos yang sama untuk semua kasus, jadi tidak ketahuan
  siapa yang menyembunyikan halamannya.
- Halaman pemain yang gagal dimuat menampilkan kode: `404-no-service` (alamat layanan tidak ditemukan),
  `old-service` (server masih memakai overview lama), atau kode status server.
- Tidak ada perubahan database. File berubah dari v34: `functions/_players.js`, `functions/api/overview.js`,
  `player.html`, `admin-pemain.html`. File yang dihapus dari paket: `functions/api/player/[id].js`.

## Update terbaru (v36): penyebab sebenarnya halaman pemain tertutup

Penyebabnya ditemukan dengan menjalankan situs di emulator resmi Cloudflare Pages (bukan di simulasi): aturan di
`_redirects` yang mengarahkan `/player/*` ke `/player.html` dijawab Cloudflare dengan **pengalihan 308 ke `/player`**
(alamat bersih), dan jalur aslinya (yang memuat ID pemain) hilang. Halaman terbuka tanpa ID, sehingga menampilkan
"This page is not available" tanpa pernah memanggil server. Itu sebabnya semua halaman pemain tertutup padahal
layanan di server sehat.

- **Perbaikan:** `_redirects` kini berisi `/player/* /player 200` (tujuan tanpa `.html`, seperti aturan admin
  `/admin /admin-daily 200` yang sudah berjalan). Hanya file `_redirects` yang berubah dari v35.
- **Aturan umum:** tujuan aturan `200` di `_redirects` tidak boleh berakhiran `.html`. Pemeriksaan paket sekarang
  menolak aturan seperti itu, dan server ujinya meniru perilaku Cloudflare ini.
- Setelah deploy, uji dengan mengetuk nama pemain di leaderboard. Alamatnya harus tetap `/player/<id>/<nama>`
  dan halamannya terbuka.

## Update terbaru (v37): halaman pemain untuk pemain yang "tidak bisa dibuka"

Beberapa penyebab nyata yang membuat halaman seorang pemain tampak tidak bisa dibuka kini ditutup:

- **Pemain tanpa game bulan ini:** halaman tidak lagi terbuka kosong. Bila pemain tidak punya game di bulan berjalan,
  halaman terbuka di "All time". Alamat yang menyebut periode (`?p=...`) tetap dihormati.
- **Tautan dari leaderboard membawa periode dan mode yang sedang dilihat**, jadi halaman pemain terbuka dengan
  tampilan yang sama (tidak ada yang ditambahkan untuk tampilan biasa, dan halaman sesi tidak menambahkan apa pun).
- **Pemain tanpa game sama sekali** punya halaman dengan keterangan "No games yet".
- **Game tanpa tanggal sesi yang sah** tetap tergambar (tanggalnya diganti "no date"), tidak lagi membuat halaman gagal.
- **Satu meja yang datanya rusak tidak lagi menjatuhkan apa pun:** meja itu dilewati di halaman pemain, di leaderboard,
  dan di halaman admin pemain (sebelumnya satu meja rusak membuat seluruh leaderboard dan halaman admin pemain gagal
  dimuat). Hanya admin yang diberi tahu bahwa ada game yang dilewati.
- **Tombol "Cek halaman pemain" di admin pemain** (kartu Registry): memeriksa halaman semua pemain yang tidak
  disembunyikan, lalu melaporkan berapa yang bisa dibuka, pemain mana yang gagal (dengan kode dan alasan), pemain
  yang belum punya game, dan pemain yang gamenya ada yang dilewati.
- Bila halaman gagal tergambar, kodenya `render` (bukan `network`).
- Tidak ada perubahan database. File berubah dari v36: `index.html`, `player.html`, `admin-pemain.html`,
  `functions/_players.js`, `functions/api/overview.js`. Unggah semuanya dalam satu commit (`overview.js` dan
  `_players.js` berpasangan).

## Update terbaru (v38): alamat halaman pemain baru, karena browser menyimpan pengalihan yang salah

Selama v33 sampai v35, alamat halaman pemain dijawab server dengan pengalihan **permanen** (308) yang salah (lihat v36).
Browser menyimpan pengalihan permanen tanpa batas waktu. Akibatnya, di browser yang pernah membuka alamat itu saat bug
(bukan incognito, bukan perangkat lain), alamat yang sama tetap dialihkan ke `/player` tanpa ID dan menampilkan
"This page is not available", bahkan setelah server diperbaiki. Server tidak bisa memperbaiki ini karena permintaannya
tidak pernah sampai ke server.

- **Alamat yang dipakai sekarang: `/players/<id>/<nama>`** (dengan "s"), alamat yang belum pernah ada di cache siapa pun.
  Tautan dari leaderboard, tautan "Halaman" di admin, dan alamat yang ditampilkan halaman memakai bentuk ini, jadi
  muat ulang (F5) juga aman. Alamat lama `/player/...` (kedua gayanya) tetap bisa dibuka dan dirapikan ke alamat baru,
  kecuali di browser yang sudah menyimpan pengalihan yang salah.
- **Bila alamat lama masih terjebak di suatu browser:** bersihkan file cache situs itu (Chrome: Ctrl+Shift+Delete,
  pilih "Cached images and files", Clear data), atau tekan Ctrl+Shift+R pada alamat itu, atau pakai incognito.
  Ini sudah diuji: setelah cache dibersihkan, alamat lama langsung terbuka.
- Hanya `_redirects`, `_headers`, `index.html`, `player.html`, dan `admin-pemain.html` yang berubah dari v37.
  Tidak ada perubahan database.

## Update terbaru (v39): filter waktu Yesterday dan Last week

- Menu periode di halaman utama (dan di halaman pemain, yang memakai menu yang sama) kini punya dua pilihan baru di
  "Quick range": **Yesterday** (kemarin) dan **Last week** (minggu lalu). Urutannya: Today, Yesterday, This week,
  Last week, All time.
- **Last week** adalah Senin sampai Minggu pekan sebelum pekan ini (pekan dimulai hari Senin, sama dengan "This
  week"). Pada hari Senin, Last week adalah pekan yang baru berakhir kemarin; pada hari Minggu, Last week tetap
  pekan sebelum pekan yang sedang berjalan.
- Alamatnya `?p=yesterday` dan `?p=lastweek`. Tautan dari leaderboard ke halaman pemain meneruskan periode itu,
  jadi halaman pemain terbuka dengan periode yang sama.
- Kartu share Top 10 memakai nama periode apa adanya ("Yesterday", "Last week"), seperti "Today" dan "This week".
- Tidak ada perubahan database. File berubah dari v38: `index.html` dan `player.html`.

## Update terbaru (v40): mode MCR-4 dan MCR-8

Dua mode skor baru untuk MCR, berdasarkan "Trick or Tile". Bedanya dengan mode lain: poin hand **diketik**, bukan dipilih
dari tabel 1 sampai 13, dan ada **base** yang melekat pada nama mode (4 untuk MCR-4, 8 untuk MCR-8, tidak bisa diubah).

- **Aturan skor:** Hu: pembuang membayar base + poin, dua pemain lain membayar base masing-masing, jadi pemenang
  menerima 3×base + poin. Zi Mo: tiga pemain lain masing-masing membayar base + poin. Invalid win: pelaku -24, tiga
  pemain lain +8 masing-masing. False win: pelaku -48, tiga pemain lain +16 masing-masing (keduanya tetap, tidak ikut
  base). Draw: tidak ada skor, tanpa tenpai. Dealer tidak pernah mengulang, tanpa bonus dealer. Tidak ada Double atau
  Triple Hu. Tidak ada skor awal dan tidak ada aturan bangkrut.
- **Poin yang diketik:** bilangan bulat 0 sampai 999. Poin di bawah base diberi peringatan (hand itu tidak bisa dihitung
  sebagai kemenangan) dengan tombol untuk mencatatnya sebagai Invalid win, tetapi masih bisa disimpan.
- **Rotasi kursi MCR** tersedia untuk kedua mode, bawaannya mati. Kembali ke Tournament atau Custom mengembalikan
  bawaan mereka (rotasi kursi menyala).
- **Mode terkunci begitu hand pertama tercatat** (aturan lama di server, `setup_locked`, kini berlaku juga untuk mode
  baru; tombol mode di scoreboard dimatikan). Sebelum itu mode bebas diganti.
- **Filter di halaman utama, halaman pemain, dan halaman sesi:** "All modes" tidak memuat meja MCR (skalanya berbeda),
  "MCR" menjumlahkan MCR-4 dan MCR-8, dan MCR-4 serta MCR-8 berdiri sendiri, masing-masing dengan jumlah meja atau game.
  Alamatnya `?m=mcr`, `?m=mcr4`, `?m=mcr8`. Bila di suatu periode hanya ada meja MCR, halaman terbuka di "MCR".
  Bila hanya satu mode yang pernah dimainkan dan itu MCR, filter disembunyikan dan meja MCR tampil.
- **Server menolak** Double dan Triple Hu di mode MCR, poin di luar 0 sampai 999, poin bukan bilangan bulat, kursi di
  luar 0 sampai 3, pembuang yang sama dengan pemenang, dan mode yang tidak dikenal.
- Statistik (menang, poin diketik, best hand, self-draw, deal-in, first place di wind round) bekerja untuk mode ini.
  Versi statistik tidak diubah, jadi meja lama tidak dihitung ulang.
- Tidak ada perubahan database. File berubah dari v39: `scoreboard.html`, `index.html`, `player.html`,
  `admin-daily.html`, `functions/_scoring.js`, dan `functions/_tables.js`. Unggah semuanya dalam satu commit.

## Update terbaru (v41): mode MCR-Custom

Mode ketiga di keluarga MCR, untuk base point yang ditentukan sendiri.

- **Aturan skor sama dengan MCR-4 dan MCR-8** (poin diketik, Hu, Zi Mo, Invalid win -24/+8, False win -48/+16, Draw tanpa
  skor, dealer tidak mengulang, tanpa skor awal). Bedanya, base point-nya diisi sendiri lewat kolom **Base point** yang
  muncul saat MCR-Custom dipilih.
- **Base point: bilangan bulat 0 sampai 99, bawaan 3.** Angka di luar jangkauan dibulatkan ke 0 atau 99 saat kotaknya
  ditinggalkan; kotak kosong dianggap 3. Poin hand minimal sama dengan base (di bawahnya diberi peringatan, seperti
  mode MCR lain). Penalti Invalid win dan False win tetap 24 dan 48, tidak ikut base.
- **Base ikut terkunci begitu hand pertama tercatat**, bersama mode dan rotasi kursi (aturan lama `setup_locked`).
  Menulis base yang sama sebagai teks (misalnya "6" dan 6) tidak dihitung sebagai perubahan.
- **Rotasi kursi MCR** tersedia dan bawaannya mati. Pindah ke mode MCR lain tidak menghapus base yang sudah diketik.
- **Filter:** "MCR-Custom" muncul di grup MCR pada halaman utama, halaman pemain, dan halaman sesi, dengan jumlah meja.
  Filter "MCR" sekarang menjumlahkan **MCR-4, MCR-8, dan MCR-Custom** (apa pun base-nya). "All modes" tetap tidak memuat
  meja MCR apa pun. Alamatnya `?m=mcrc`. Kartu meja menampilkan base yang dipakai, misalnya
  "MCR-Custom · base 6 · min 6 pts · dealer never repeats".
- Tidak ada perubahan database. File berubah dari v40: `scoreboard.html`, `index.html`, `player.html`,
  `admin-daily.html`, `functions/_scoring.js`, dan `functions/_tables.js`. Unggah semuanya dalam satu commit.

## Update terbaru (v42): statistik lengkap di halaman pemain

Dua kartu menggantikan kartu statistik kecil di halaman pemain, dan mengikuti filter periode dan mode seperti sebelumnya.

**Hand statistics**
- Total hands played, total hands won, win rate per hands (menang / hands played).
- Self draws, self draw rate (self draw / hands won). Hu (menang dari buangan, termasuk double dan triple hu) dan Hu rate
  (Hu / hands won).
- Lose by discard dan Lose by self draw (hand yang dimenangkan pemain lain dengan self draw), masing-masing dengan rate
  terhadap hands not won (hands played dikurangi hands won).
- Best hand: skor tertinggi yang didapat dari satu hand yang dimenangkan. **Lowest hand: skor paling rendah yang
  diterima dari satu hand mana pun** (misalnya kena double hu), bukan hand menang yang terendah.
- Average points / win dan average points / deal in: poin hand sebelum dikonversi menjadi skor. Untuk double atau triple
  hu, poin para pemenang dirata-rata, dan satu buangan dihitung satu kali.
- Highest win streak: rangkaian terpanjang hand berturut-turut yang dimenangkan pemain dalam satu game. Seri atau
  kemenangan orang lain memutus rangkaiannya.
- Pattern counter: setiap pola yang dimenangkan beserta jumlahnya, diurutkan dari yang paling sering (sepuluh teratas,
  sisanya lewat tombol "Show all"). **Hanya hand yang dicatat lewat pemilih pola yang punya pola**; hand yang dicatat dengan
  poin saja dan mode MCR (poin diketik) tidak punya.

**Wind round statistics**
- Total wind rounds played (minimal satu hand) dan total wind rounds completed (keempat giliran dealer sudah selesai).
- Total net score memakai semua wind round. Highest net score, lowest net score, dan average placement per wind round
  hanya dari wind round yang completed. Average placement per game memakai peringkat akhir tiap game (seri berbagi peringkat).
- Bila penyebut nol (misalnya pemain belum pernah menang), nilainya tampil "-", bukan 0 atau NaN.

**Data:** fakta baru per pemain di tiap meja (hand terendah, kalah karena self draw, rata-rata poin deal in, pola, streak,
net tertinggi dan terendah per wind round, jumlah peringkat) disimpan di statistik meja. Versi statistik naik dari 4 ke 5,
sehingga meja lama dihitung ulang otomatis dari hand mentahnya (12 meja per permintaan di leaderboard, dan langsung untuk
meja si pemain saat halamannya dibuka). Tidak ada SQL yang perlu dijalankan. Pola hanya bisa dihitung ulang bila memang
tercatat di hand.
- File berubah dari v41: `player.html`, `functions/_tables.js`, `functions/_players.js`. Unggah ketiganya dalam satu commit.

## Update terbaru (v43): statistik halaman pemain diringkas

Isi statistik tetap sama persis (angka dan rumusnya tidak berubah); yang berubah hanya tampilannya, supaya tidak terlalu panjang.

- Angka disusun **berpasangan dalam kotak dua kolom**, dan tiap rate ditulis di bawah angkanya (misalnya "Self draws 3, 21.4% of wins"),
  bukan sebagai baris sendiri. Tujuh belas baris Hand statistics menjadi sebelas kotak, tujuh baris Wind round statistics menjadi tujuh kotak.
- **Pattern counter terlipat** secara bawaan: satu tombol "Pattern counter, N patterns" yang membuka daftarnya (sepuluh teratas, sisanya lewat "Show all").
- Di ponsel kartu statistik turun dari sekitar 1617 menjadi 1000 piksel, dan game pertama muncul sekitar 600 piksel lebih ke atas.
- **Tampilan statistik di Standings pada scoreboard tidak diubah** (`scoreboard.html` tidak berubah dari paket sebelumnya).
- File berubah dari v42: hanya `player.html`.

## Update terbaru (v44): statistik halaman pemain bertab, dengan segmen Penalty

Tampilan statistik di halaman pemain ditata ulang. Rumus dan angkanya sama dengan v42, kecuali satu tambahan: **Penalty**.

- **Satu kartu dengan tiga tab:** Hands, Wind rounds, dan Patterns (judul panel "Pattern collection"). Hanya satu panel terlihat sekaligus,
  dan tab yang dipilih tetap saat filter periode atau mode diganti.
- **Tab Hands:** empat angka utama (win rate, highest win streak, best hand, lowest hand), satu bar yang menunjukkan bagaimana hand berakhir
  dengan legenda, lalu pasangan angka berkelompok: "Of N hands won" (self draw dan hu, masing-masing rate dan jumlahnya),
  "Of M not won" (lost by discard dan lost by self draw), dan "Average points" (per win dan per deal in). Semua sel: satu angka, satu baris label.
- **Bar hasil hand** punya enam segmen yang tidak saling tumpang tindih dan selalu berjumlah total hand: **Hu**, **Self draw**,
  **Lost to discard**, **Lost to self draw**, **Penalty** (invalid win atau false win yang dilakukan pemain itu sendiri), dan **Neutral**
  (seri termasuk tenpai, penalti pemain lain, dan hu dari buangan orang lain). Segmen yang jumlahnya nol tidak digambar.
- **Tab Wind rounds:** total net score, net tertinggi dan terendah dalam satu wind round yang completed, dan rata-rata peringkat per wind round
  serta per game. **Tab Patterns:** daftar pola yang dimenangkan dengan bar kecil (sepuluh teratas, sisanya lewat "Show all").
- **Warna** mengikuti palet A: hijau (token aksen brand) untuk menang, emas (token gold brand) untuk kalah, merah untuk penalty, krem untuk neutral;
  nuansa lebih muda dan lebih tua ditetapkan di bagian `statistics card` pada CSS `player.html` (variabel `--k-sd`, `--k-ls`, `--k-pe`, `--k-nu`).
  Hijau, emas, dan merah mengikuti token brand otomatis; nuansa turunannya diturunkan dari palet TBT.
- **Data:** satu fakta baru per pemain di tiap meja (`penalties`). Versi statistik naik dari 5 ke 6, sehingga semua meja dihitung ulang otomatis dari
  hand mentahnya (12 meja per permintaan di leaderboard, dan langsung untuk meja si pemain saat halamannya dibuka). Tidak ada SQL yang perlu dijalankan.
- File berubah dari v43: `player.html`, `functions/_tables.js`, `functions/_players.js`. Unggah ketiganya dalam satu commit.
  Tampilan statistik di Standings pada scoreboard tidak berubah.

## Update terbaru (v45): sisipkan hand yang ketinggalan

Bila ada hand yang terlupa dicatat dan baru disadari kemudian (misalnya hand ke-4 dari 17), kini tidak perlu mengedit satu per satu.

- **Tombol "Insert before" di setiap hand pada riwayat** (di samping Edit dan Delete), hanya di scoreboard host dan hanya selama game belum
  dikunci. Menekannya membuka form berjudul "Insert before hand N", dengan garis hijau yang menandai tempat hand baru akan masuk.
- Hand baru masuk **di depan hand N**. Hand-hand sesudahnya bergeser satu nomor ke bawah dengan data dan urutannya utuh, dan **dealer, streak,
  wind round, serta skor semua hand sesudahnya dihitung ulang** dari urutan yang baru. Pratinjau skor di form memakai dealer di posisi itu.
- Bekerja di semua mode, termasuk MCR-4, MCR-8, dan MCR-Custom (poin diketik).
- **Cancel** tidak mengubah apa pun. Memilih Edit saat sedang menyisipkan (atau sebaliknya) mengganti mode form, memilih jenis hand
  tidak membatalkan sisipan, dan menghapus hand saat menyisipkan mengembalikan form ke keadaan biasa karena nomornya berubah.
- **Meja yang sudah di-Save (terkunci) dan tampilan pemain tidak punya tombol ini.** Untuk meja terkunci: admin menekan **Buka kunci**
  (halaman admin sesi, pada meja itu), host menyisipkan hand, lalu Save lagi.
- Game yang sudah selesai juga bisa disisipi. Bila koreksi itu membuat hand di ujung jatuh sesudah game berakhir, hand tersebut ditandai
  "(after the game ended)" dan tidak dihitung, sebagai tanda urutannya perlu diperiksa.
- Tidak ada perubahan server atau database. File berubah dari v44: hanya `scoreboard.html`.

## Update terbaru (v46): Pick Tiles, poin dari tile yang dipilih

Pilihan ketiga di langkah poin untuk hand Hu, Zi Mo, Double Hu, dan Triple Hu di mode Casual, Default, Tournament, dan Custom: **Points | Pick Patterns | Pick Tiles**.
Mode MCR tidak berubah (poin tetap diketik).

- **Alur:** tekan Pick Tiles, pilih tile pemenang (dengan meld: Chi, Exposed pong, Exposed kong, Concealed kong), tekan tile yang menang, isi bunga dan musim yang
  dipegang serta kondisi menang bila ada. Jendela langsung mengusulkan poin. **Check patterns** membuka pemilih pola yang sudah ada dengan pola usulan terisi, dan
  host mengonfirmasi atau mengubahnya, lalu **Use total**. Usulan hanyalah usulan: yang menentukan skor tetap pola yang dikonfirmasi host.
- **Terisi otomatis dari permainan:** nama pemenang, cara menang (Zi Mo atau Hu, dari jenis hand yang dipilih), seat wind pemenang (dihitung dari dealer, mengikuti rotasi
  kursi dan hand lama yang diedit atau disisipi), dan prevailing wind (putaran angin hand itu). Host tidak perlu mengisinya.
- **Aturan hitung** diambil kata demi kata dari pemilih pola scoreboard saat pemasangan (mesin tidak punya salinan aturan sendiri yang bisa berbeda). Aturan yang sudah
  dikonfirmasi: concealed kong tetap concealed; pong yang dilengkapi tile buangan yang menang tidak dihitung concealed (Four Concealed Pong hanya sah kalau buangannya
  melengkapi pasangan); Thirteen Orphans, Nine Gates, dan Seven Stars boleh dimenangkan dengan self draw maupun Hu (sejak v57); Split Straight hanya boleh dilengkapi buangan pada set atau pasangannya;
  Half Outside, Half Flush, dan Half Terminals butuh minimal tiga dari lima kelompok; Ruby, Jade, dan Pearl Dragon butuh pure straight satu suit dengan pasangan.
- **Tile disimpan sebagai data, bukan gambar:** tiap hand yang dimenangkan dengan tile menyimpan `tiles` berisi angka saja (tile concealed, meld, tile menang, bunga,
  kondisi), sekitar 80 sampai 120 byte per hand. Kartu **Share hand** otomatis memuat tile itu: bunga di baris sendiri, lalu meld dan tangan, tile menang paling akhir.
  Pada double hu setiap pemenang punya tile sendiri. Hand tanpa tile tetap memakai pemilih tile dekoratif seperti biasa.
- **Server memeriksa data tile:** nomor harus 0 sampai 33, tidak lebih dari empat salinan, jumlah tile sesuai, bunga 0 sampai 7 tanpa ganda, dan hanya milik pemenang.
  Data yang tidak masuk akal dibuang, hand-nya tetap tersimpan. Tidak ada SQL baru.
- Menutup pemilih pola tanpa memakainya membawa kembali ke jendela tile dengan tangan yang sama. Cancel tidak mengubah apa pun.
- **File berubah dari v45:** `scoreboard.html` (sekitar +67 KB), `functions/_tables.js`, dan `functions/api/tables/[code].js`. Unggah ketiganya dalam satu commit.

## Update terbaru (v47): perbaiki urutan pemain pada meja yang sudah selesai

Kalau urutan duduk salah dimasukkan di scoreboard dan gamenya sudah selesai atau disimpan final: **Admin sesi, buka sesinya, pada kartu meja tekan "Perbaiki pemain"**
(tombol hanya ada di meja yang sudah punya hand). Host tidak bisa mengubah pemain setelah hand pertama, jadi ini dilakukan oleh admin.

- **Cara pakai:** geser nama dengan panah naik dan turun sampai urutannya benar (kursi 1 adalah dealer pertama, East), tekan **Lihat dampak**, baca hasilnya, lalu **Simpan**.
  **Simpan** baru aktif setelah dampak untuk urutan itu dilihat. Mengubah urutan lagi menghapus pratinjau dan menonaktifkan Simpan sampai dilihat lagi.
- **Yang terjadi:** orangnya tetap sama dan setiap hand ikut berpindah bersama orangnya (pemenang, pembuang, pemain yang salah, pemain tenpai, poin, pola, dan tile).
  Setelah itu dealer, angin, dan skor dihitung ulang dari hand pertama sesuai urutan baru, statistik leaderboard dibangun ulang, dan kursi yang pernah ditautkan ke pemain
  terdaftar ikut pindah bersama orangnya. Meja yang sudah disimpan final tetap final.
- **Pratinjau menunjukkan:** skor bersih tiap orang sebelum lalu sesudah, berapa hand yang dealernya berubah, dan peringatan bila dealer pertama berubah, bila game tidak lagi
  selesai, atau bila ada hand yang jatuh setelah game berakhir (tidak dihitung). Pratinjau tidak mengubah apa pun.
- **Yang tidak dicakup:** meja tanpa hand (pemainnya masih bisa diubah langsung di scoreboard). Penggantian nama ada di update v48 di bawah. Layar host yang masih terbuka dengan versi lama akan mendapat pemberitahuan konflik, bukan menimpa perbaikannya.
- Tidak ada SQL baru. **File berubah dari v46:** `admin-daily.html`, `functions/_tables.js`, dan **`functions/api/admin/table-order.js` (file baru)**. Unggah ketiganya dalam satu commit.

## Update terbaru (v48): ganti nama pemain, khusus admin

Jendela **Perbaiki pemain** (v47) sekarang juga bisa **mengganti nama**: setiap kursi punya kolom nama yang bisa diketik langsung, dan panah tetap dipakai untuk urutan. Keduanya bisa diubah
sekaligus dan dilihat dampaknya dulu sebelum disimpan. Seperti urutan, ini hanya bisa dilakukan admin (host tidak bisa mengubah pemain setelah hand pertama).

- **Aturan nama:** maksimal 16 karakter (sama dengan kolom nama di scoreboard), tidak boleh kosong, dan tidak boleh sama dengan nama pemain lain di meja itu (huruf besar atau kecil dianggap sama).
  Nama yang tidak diubah dibiarkan persis seperti semula. Pesan penolakan menyebut alasannya.
- **Hand tetap di kursinya.** Mengganti nama tidak mengubah skor, dealer, atau hand mana pun. Nama yang diganti hanya menggantikan nama di kursi itu (dan orangnya ikut pindah bila urutan juga digeser).
- **Dampak ke leaderboard:** nama baru diperlakukan seperti nama yang diketik host, jadi bila cocok dengan pemain terdaftar (nama panggilan atau ejaan lain miliknya), hand itu masuk ke halaman pemain tersebut.
  Pratinjau menyebutnya ("pemain terdaftar: ..." atau "belum terdaftar, dihitung tamu"). Bila nama baru dikenali sebagai pemain terdaftar yang sudah duduk di kursi lain di meja yang sama, perubahan ditolak karena
  satu orang tidak bisa mengisi dua kursi.
- **Tautan kursi:** tautan kursi ke pemain terdaftar yang dibuat di Admin pemain dibuat untuk nama lama, jadi untuk kursi yang diganti namanya tautannya dihapus (pratinjau menyebut jumlahnya) dan bisa ditautkan lagi.
  Kursi lain yang tidak diganti namanya tetap tertaut, ikut berpindah bersama orangnya.
- Pratinjau tidak mengubah apa pun, dan jumlah "hand dengan dealer berbeda" dihitung per orang, bukan per ejaan nama. Meja yang sudah disimpan final tetap final.
- Tidak ada SQL baru. **File berubah dari v47:** `admin-daily.html` dan `functions/api/admin/table-order.js`. Unggah keduanya dalam satu commit.

## Update terbaru (v49): Ruby, Jade, dan Pearl Dragon terbaca benar di Pick Tiles

Dua perbaikan pada pembacaan tile, setelah pengujian menemukan hand yang tidak disarankan atau salah dikenali:

- **Definisi yang diberlakukan sekarang:** naga yang sesuai (Ruby = Red, Jade = Green, Pearl = White) sebagai pong atau kong, ditambah **tiga set sisanya yang semuanya berada di suit naga itu**
  (Ruby = characters, Jade = bamboo, Pearl = dots) dan berbentuk pure straight 1-9 **atau tiga pong**, ditambah pasangan di suit yang sama. Sebelumnya varian tiga pong salah mengizinkan pong dari suit mana pun,
  sehingga hand dengan pong campuran suit keliru dikenali sebagai Ruby, Jade, atau Pearl. Itu sudah diperbaiki.
- **(Diganti di v50 di bawah.)** Di v49 pola Master dan Legendary sempat didahulukan; sekarang usulan kembali memilih nilai tertinggi, dengan pola Master yang kalah tetap disebut sebagai alternatif.
- **Pengujian:** seluruh 30.384 hand sah untuk tiap naga (pure straight dan tiga pong, dengan meld terbuka, kong, kong tertutup, menang Zi Mo dan Hu) terdeteksi dan disarankan, dan puluhan ribu hand yang mendekati syarat tetapi melanggar
  satu hal (suit pong, suit pasangan, naga yang salah, straight yang bukan 1-9) dibandingkan dengan hitungan independen dari jumlah tile, dan hasilnya sama di setiap hand.
- Tidak ada SQL baru. **File berubah dari v48:** hanya `scoreboard.html`.

## Update terbaru (v50): nilai tertinggi, minimum poin per mode, saran garden, dan aturan tile pengganti

Hasil pengecekan ulang aturan pada Pick Tiles (jendela tile dan pembacaan pola):

- **Usulan memilih nilai tertinggi.** Bila hand memenuhi pola Master atau Legendary tetapi tumpukan pola biasa bernilai lebih tinggi (misalnya hand Ruby varian tiga pong: 12 melawan 11), yang disarankan adalah yang tertinggi,
  dan pola Master yang kalah disebut di jendela ("Also qualifies: Ruby Dragon (11 points) ..."). Pada nilai yang sama, pola Master yang dipilih. Tetap bisa diubah di pemilih pola.
- **Minimum poin untuk menang dibaca dari game**, bukan dikunci 1. Casual 1, Default dan Tournament 2, Custom sesuai pengaturan (1 sampai 13). Bila poin pola (di luar bunga dan bonus kondisi menang) di bawah minimum itu, jendela menampilkan peringatan merah
  **Invalid win** ("The patterns add up to N points, below the minimum of M"), "Check patterns" dinonaktifkan, dan tombol **Record as Invalid win** langsung mengganti form menjadi Invalid win untuk pemain itu. Bunga dan kondisi menang tidak membantu mencapai minimum.
  Sebelumnya Default dan Tournament salah menerima hand dengan satu poin pola sebagai menang.
- **Win by Royal Garden dan Win by Imperial Garden disarankan otomatis** begitu bunga dan musim yang dipegang berjumlah 7 atau 8, walaupun hand belum sah atau belum lengkap (3 poin dan 4 poin, berdiri sendiri). Bila hand yang sah bernilai lebih tinggi, hand itu yang
  disarankan dan garden win disebut sebagai alternatif; pada nilai yang sama garden win yang dipilih. Pada garden win tanpa hand lengkap, tile tidak disimpan di hand itu. Garden win tidak dikenai minimum poin game.
- **Rule 14: kemenangan dengan tile pengganti dihitung sebagai Zi Mo.** Bila "Replacement tile" atau "Double replacement" dipilih, hand dibaca sebagai self draw (misalnya pong yang dilengkapi tile pengganti tetap concealed), dan jendela mengingatkan untuk
  mencatatnya sebagai Zi Mo bila hand dicatat sebagai Hu. Robbing a kong sebaliknya dibaca sebagai Hu, dengan pengingat serupa.
- **File berubah dari v49:** hanya `scoreboard.html`. Tidak ada SQL baru.

## Update terbaru (v51): tile dibagi antar pemenang pada Double dan Triple Hu, dan satu kondisi pengganti saja

- **Double Hu dan Triple Hu memakai satu set tile.** Di jendela Pick Tiles, tile yang sudah dipegang pemenang lain tidak bisa dipilih lagi oleh pemenang berikutnya (misalnya bila Budi memegang pong East, Citra hanya bisa memegang satu East),
  dan jendela menuliskan tile apa saja yang sudah terpakai. Bunga dan musim hanya ada satu, jadi yang dipegang pemenang lain tampil abu-abu. **Tile yang menang adalah satu tile bersama** (satu buangan memenangkan semua hand):
  ia dikunci sama untuk semua pemenang dan dihitung satu kali, bukan dua atau tiga kali. Contoh: bila satu pemenang memegang `555d` dan menang di 5 dots, pemenang lain masih boleh memegang dua 5 dots (termasuk tile bersama itu), tidak satu.
  Berlaku untuk Double Hu dan Triple Hu, dan pemenang pertama tidak dibatasi apa pun.
- **Server ikut memeriksa.** Bila tile yang dikirim untuk beberapa pemenang melebihi empat per jenis (dengan tile menang dihitung satu kali), tile yang menang berbeda, atau bunga yang sama dipegang dua pemenang, data tile hand itu dibuang (hand dan poinnya tetap tersimpan).
- **Replacement Tile dan Double Replacement Tile tidak bisa dipilih bersamaan** (hanya salah satu): di jendela tile, di pemilih pola (chip yang satunya terkunci), di mesin, dan di server. Double Replacement sudah termasuk replacement, jadi keduanya tidak dijumlah.
- Dikonfirmasi tanpa perubahan: garden win tidak dikenai minimum poin game, dan "No Flower / Season" berarti tidak ada bunga atau musim yang dipegang di hand itu.
- **File berubah dari v50:** `scoreboard.html` dan `functions/_tables.js` (keduanya ada di zip). Tidak ada SQL baru.

## Update terbaru (v52): halaman semua pemain

- **Halaman baru `/players`** menampilkan semua pemain terdaftar dengan statistiknya: net, game, hand menang dari hand dimainkan, win rate, rata-rata poin per kemenangan, hand terbaik, self draw, deal-in, win streak tertinggi, dan juara 1.
  Angkanya dihitung dengan rumus yang persis sama dengan halaman tiap pemain, jadi keduanya selalu sama.
- Di ponsel: daftar kartu yang bisa dibuka (ketuk untuk melihat semua angka, lalu "Open page" atau "Compare"), dengan menu urutan. Di desktop: tabel, dan setiap kepala kolom bisa diketuk untuk mengurutkan.
- Ada pencarian nama, filter **minimal game** (1, 3, 5, 10), dan filter periode serta mode yang sama dengan halaman lain (alamat membawa `?p=` dan `?m=`).
- **Bandingkan dua pemain:** angka berdampingan (yang lebih baik ditandai), ditambah rekor bertemu di meja yang sama (siapa finis lebih tinggi dan selisih net di meja-meja itu). Pilihan ikut tersimpan di alamat, jadi bisa dibagikan.
- **Privasi:** pemain yang menyembunyikan halamannya dan tamu (nama tidak terdaftar) tidak tampil. Tidak ada kontak maupun kode edit di data yang dikirim.
- Halaman utama diberi tautan **All players ›** di bawah judul, yang membawa periode dan mode yang sedang dilihat. Halaman lain tidak berubah.
- Data diambil dari endpoint baru `/api/players` (publik, di-cache 30 detik di Cloudflare seperti `/api/overview`). Alamat `/players/` dialihkan ke `/players`; alamat halaman pemain tidak berubah.
- **File berubah dari v51:** `index.html`, `_redirects`, `_headers`, dan dua file baru: `players.html` dan `functions/api/players.js`. Tidak ada SQL baru.
- Hanya registry yang aktif yang menampilkan pemain: sebelum ada pemain terdaftar, halaman menjelaskan bahwa belum ada pemain.


## Update terbaru (v53): Pick Patterns dan Pick Tiles untuk MCR, dan perbaikan kartu bagikan

**Mode MCR-4, MCR-8, dan MCR-Custom sekarang punya tiga cara mencatat poin hand**, sama seperti mode lain: **Points**
(diketik, seperti sebelumnya), **Pick Patterns** (pilih fan satu per satu), dan **Pick Tiles** (pilih tile, aplikasi
mencari fan dan poinnya, lalu host memeriksanya di Pick Patterns sebelum dipakai).

- **Acuan aturan: buku hijau WMO** (Mahjong Competition Rules 2006, edisi Agustus 2014). 81 fan, ditambah satu fan
  yang di buku tertulis di dalam Two Melded Kongs: satu kong terbuka dan satu kong tertutup bernilai 6. Two Concealed
  Kongs bernilai 8.
- **Minimum menang = base game** (4, 8, atau yang diketik di MCR-Custom), dihitung dari poin fan saja. **Bunga
  ditambahkan setelahnya dan tidak dihitung ke minimum.** Kalau poin fan di bawah minimum, hand ditandai "Invalid win"
  dan ada tombol untuk mencatatnya sebagai Invalid win.
- **Fan yang tidak bisa digabung diredupkan**, dan mengetuknya menjelaskan alasannya. Aturan penggabungan mengikuti
  kalimat "Does not combine with" di buku dan lima prinsip penghitungannya (Non-Repeat, Non-Separation, Non-Identical,
  pilih yang tertinggi, Account-Once).
- **Pick Tiles memakai data dari game:** angin putaran dan angin kursi pemenang (mengikuti urutan duduk MCR), serta
  Zi Mo atau Hu dari jenis hand. Host mengisi tile, tile yang menang, bunga, dan kondisi menang (Last tile, last tile
  of the wall, last discard, replacement tile, robbing the Kong). Mesin mencoba semua tafsir tangan dan memilih yang
  poinnya tertinggi.
- **Tersimpan di hand:** pola dan tile ikut disimpan, jadi muncul di riwayat, kartu bagikan, dan saat hand diedit.
  Game dengan kode meja ikut menyimpannya; server sekarang menerima kondisi menang MCR (sebelumnya akan membuang tile).

**Tafsiran yang perlu diketahui** (buku tidak menjelaskan):
- Nine Gates tidak membawa Two Concealed Pungs: pung 111 dan 999 adalah bagian dari fan itu (buku sudah melarang
  Pung of Terminals or Honors karena alasan yang sama).
- Pung yang dilengkapi tile menang dari buangan tidak dihitung tertutup.
- Fan tunggu (Edge, Closed, Single Wait) hanya sah bila tangan menunggu satu tile. Tile yang keempatnya sudah ada di
  tangan sendiri tidak dihitung sebagai tunggu.
- Last Tile diisi host, karena buku mensyaratkan terlihat jelas dari buangan.
- Pure Terminal Chows bernilai 64: Full Flush dan No Honors sama-sama sudah tercakup.
- Three Kongs boleh ditambah Concealed Kong dan Two Concealed Kongs (kalimat Three Kongs di buku). Tiga kong tertutup
  jadi 32 + 8 + 2 + 16 (Three Concealed Pungs) = 58.

**Keterbatasan:** Seven Pairs tidak membentuk fan dari susunan chow pasangannya (hand seperti itu dibaca sebagai tangan
biasa bila cocok). Di buku ada empat keterangan contoh yang tidak cocok dengan gambarnya sendiri (All Honors, Big Three
Winds, dan dua contoh Reversible Tiles); mesin mengikuti gambarnya.

**Perbaikan kartu bagikan:** saat rotasi kursi MCR menyala, angin kursi di kartu bagikan salah di putaran Selatan,
Barat, dan Utara (28 dari 64 kombinasi pemain dan tangan). Sekarang kartu memakai urutan duduk yang sama dengan tampilan meja.

## Update terbaru (v54): ubah nama sesi

(Label tombol di halaman admin sekarang berbahasa Inggris, lihat tabel di v55: Ubah nama menjadi Rename, Simpan menjadi Save, Batal menjadi Cancel.)

Di halaman admin, layar sebuah sesi sekarang punya opsi **Ubah nama** di samping Hapus sesi. Ketuk, kolom nama muncul
berisi nama sekarang (langsung terpilih). **Enter** atau **Simpan** menyimpan, **Esc** atau **Batal** membatalkan.

- Yang berubah hanya **nama**. Tanggal dan meja tidak tersentuh, dan tidak ada migrasi database.
- Nama dirapikan (spasi berlebih dibuang) dan dibatasi **80 huruf**. Nama kosong ditolak.
- Semua halaman yang menampilkan nama sesi (daftar sesi, halaman sesi publik, halaman pemain, halaman meja) membaca nama
  dari sesi itu, jadi ikut berubah. Halaman publik di-cache sekitar 30 detik, jadi nama baru bisa baru terlihat setelah itu.
- Hanya admin yang bisa mengubah. Server menolak permintaan tanpa kata sandi admin.

## Update terbaru (v55): header dan menu baru, cari nama sendiri, My page, dan seluruh situs berbahasa Inggris

**Header baru di leaderboard, All players, dan halaman pemain.** Nama merek tetap terlihat. Di ponsel ada ikon cari dan
tombol menu (tiga garis) di kanan atas. Dari layar 720 piksel kolom cari selalu terlihat sebagai kolom di header. Navigasinya
tetap lewat tombol menu di semua lebar layar; di layar lebar menunya berupa kartu kecil di bawah tombol, bukan panel selebar layar. Tautan kecil lama ("All players ›"
di bawah judul dan "Enter table code" di header) dihapus; keduanya kini ada di menu. Players di menu tetap membawa
pilihan periode dan mode yang sedang dipakai.

**Menu.** Isinya Leaderboard, Players, Table code, **My page** (hanya bila sudah disimpan), lalu grup **Admin** (Sessions
dan Players) paling bawah, bergaya lebih tenang. Admin selalu terlihat untuk semua orang, tetapi kedua halaman admin tetap
dilindungi kata sandi. Papan skor host (scoreboard) sengaja tidak diberi header ini.

**Find your name.** Ikon cari membuka kolom cari yang mencari **semua pemain terdaftar** (semua periode dan mode), jadi
orang yang hanya main MCR atau hanya bulan lalu tetap ketemu. Hasilnya diberi tag **Not in this view** bila ia tidak ada
di tampilan sekarang, lengkap dengan jumlah game, mode, dan tanggal terakhir main. Salah ketik (misalnya "riky") dijawab
dengan saran "Did you mean Ricky?". Bila memang tidak ada, pesannya jujur dan tidak menuduh. Di ponsel kolom cari menutupi header; tutup dengan mengetuk di luar kolom (ketukan itu tidak menekan apa pun di bawahnya) atau tombol Esc. Tidak ada tombol Cancel.
- Daftar nama berasal dari endpoint baru `/api/names`. Isinya hanya nama panggilan, jumlah game, tanggal terakhir, dan
  mode. Tidak ada nama lengkap, WhatsApp, Instagram, kode, pemain yang menyembunyikan halamannya, atau tamu. Di-cache
  sekitar 30 detik, sama seperti daftar pemain.
- Pemain yang sudah terdaftar tetapi belum punya satu pun game belum muncul (sama seperti di halaman All players).
- Di halaman All players, pencarian tanpa hasil sekarang menulis "No match with the current filters." (bukan lagi
  "No player matches") dan menampilkan blok **Also found, but not in this view** berisi orang yang tersembunyi oleh filter.

**This is me dan My page.** Di halaman pemain ada tombol **This is me**. Bila diketuk, halaman itu muncul sebagai **My
page** di menu pada setiap halaman publik. Yang disimpan hanya id dan nama panggilan, **di peramban perangkat itu saja**
(kunci `tbt-me`), tidak dikirim ke server. Tombolnya kecil, satu baris di bawah keterangan pemain, dan teks penjelasan baru muncul setelah halaman disimpan. Ketuk lagi untuk menghapus. Bila penyimpanan diblokir (mode pribadi), tombol
tidak ditampilkan dan semua halaman tetap jalan. Menghapus data situs di peramban juga menghapusnya.

**Peringkat 1 sampai 4 memakai permata di semua tampilan.** Urutannya: 1 **Diamond** (biru), 2 **Ruby** (merah),
3 **Jade** (hijau), 4 **Pearl** (krem). Bulatan bernomor tidak berubah bentuknya; cincinnya, garis di kiri, dan semburat
latar baris mengikuti warna permatanya (versi terang dan gelap punya warna sendiri supaya tetap terlihat), dan ikon
permata kecil muncul di samping nama. Ikon Jade berbentuk persegi panjang **tegak** bersudut bulat dengan garis silang di
sudutnya (criss cut) supaya berbeda dari Pearl yang bulat. Berlaku di:
- **Leaderboard** (Total dan Sessions) dan **kartu "Share top 10"** (kedua format, kelima tema). Di kartu itu mahkota dan
  warna emas, perak, perunggu sudah diganti permata. Bulatan nomor 1 tidak lagi terisi emas penuh.
- **Daftar game di halaman pemain** dirancang ulang. Bulatan peringkat diganti **pil peringkat** ("1st", "2nd", "3rd",
  "4th") berwarna permata, dengan **poin bersih tepat di bawahnya**. Pil dan poin adalah **satu blok** di kanan kartu,
  rata kanan dan berada di tengah vertikal kartu, sama seperti blok tanggal di kiri. Di antaranya ada tiga baris teks
  (judul, "Table 1 · Default", dan "1st in ... rounds · ... win rate") yang rapat dan sama jaraknya. Di tepi kiri kartu
  ada garis tipis dengan warna permata yang sama (seperti di leaderboard). Tinggi kartu seragam (sekitar 82 piksel di
  ponsel). Di layar sangat kecil (320 piksel) baris ketiga boleh turun menjadi dua baris.
- **Daftar game bisa dibuka (rangkuman wind round).** Mengetuk kartu game membuka ruang di bawahnya (panah kecil di tengah
  bawah kartu; satu game terbuka sekali waktu; bisa dengan keyboard). Isinya empat baris (East, South, West, North) dengan
  ubin hanzi berhuruf Kai Ti seperti di kartu bagikan scoreboard, peringkat pemain di ronde itu (pil berwarna permata), poin
  bersih, dan "6 hands · won 1". Di bawahnya ada tanda progres empat kotak (satu kotak per giliran dealer dalam satu wind
  round), lalu **final table** (empat pemain meja itu berurutan, pemilik halaman disorot), lalu "Game total" dan tautan
  "Open table recap" (rekap meja pindah ke sini; ketukan pada kartu sendiri kini membuka rangkuman, bukan rekap).
  Cara membaca tanda empat kotak: wind round yang selesai penuh empat; yang sedang berjalan terisi sebanyak giliran dealer
  yang sudah lewat (kotak berikutnya berbingkai, dan baris diberi "Live"); yang belum dimainkan redup ("Not played").
  Dealer yang bertahan (menang lagi) tidak menggeser kotak, karena yang dihitung giliran dealer, bukan jumlah hand. Pada game
  yang dihentikan host di tengah ronde, kotak tidak penuh dan tidak ada "Live". Ronde yang berakhir karena ada pemain
  bangkrut (aturan custom) tetap dihitung selesai. "Live" hanya muncul bila meja belum dikunci dan terakhir disimpan dalam
  12 jam terakhir.
  Tambahan di server: `/api/overview?player=` kini membawa untuk tiap game `wr` (hasil tiap wind round), `turn`, `done`,
  `live`, dan `tb` (final table); versi statistik naik dari 6 ke **7**, jadi semua meja dihitung ulang otomatis sekali saat
  pertama dibaca (tanpa migrasi database). Nama di final table adalah nama yang tertulis di meja, sama seperti di rekap
  meja; nama lengkap, WhatsApp, dan Instagram tidak ikut.
- **All players tidak berubah** (angka polos di huruf Playfair, tanpa bulatan atau permata).
- **Tidak berubah:** kartu bagikan di scoreboard (host) tetap memakai mahkota. Di standings scoreboard hanya huruf angka
  di dalam bulatan yang dibetulkan (sekarang huruf sans seperti di leaderboard, tegak sama tinggi, dan di tengah bulatan;
  sebelumnya Playfair yang turun 2 sampai 3 piksel di bawah tengah). Tanpa permata di sana.

Pemain yang seri berbagi peringkat dan permata yang sama, dan peringkat 5 ke bawah tidak punya ikon. Pembaca layar
membacakan nama permatanya setelah nama pemain.

**Panah di baris leaderboard.** Baris yang membuka halaman pemain kini berpanah. Baris tamu atau pemain yang
menyembunyikan halamannya tidak berpanah.

**Seluruh situs berbahasa Inggris.** Halaman daftar, halaman admin sesi, halaman admin pemain, dan semua pesan server
kini berbahasa Inggris. Dokumen BACA-DULU ini tetap berbahasa Indonesia. Dua hal sengaja tidak diubah supaya tautan lama
tidak patah: **nama berkas** (`admin-pemain.html`, `masuk.html`, `daftar.html`) dan parameter alamat `?sesi=`. Aturan nama
ganda di server masih mengenali kata "dan" (misalnya "Ana dan Budi" dihitung dua orang), dan catatan di halaman admin
menyebutnya apa adanya.

Padanan label admin (untuk membaca petunjuk lama di dokumen ini):

| Dulu | Sekarang |
|---|---|
| Sesi, Pemain, Masuk, Keluar | Sessions, Players, Sign in, Sign out |
| Buat sesi, Tambah meja, Buat meja | Create session, Add table, Create table |
| Ubah nama, Hapus sesi, Simpan, Batal | Rename, Delete session, Save, Cancel |
| Buka kunci, Perbaiki pemain, Salin link | Unlock, Fix players, Copy link |
| Perbarui registry, Pisah per game | Update registry, Split by game |
| Ikuti nama, Tautkan ke... | Follow the name, Link to... |
| Pendaftaran lewat link, Buat link baru | Sign-up by link, Create a new link |
| Tinjau dan setujui, Tolak | Review and approve, Reject |
| Daftarkan, Tambah pemain baru | Register, Add a new player |
| Sembunyikan halaman, Tampilkan halaman | Hide page, Show page |

**Yang diunggah.** Seluruh isi folder `tbt-website-latest.zip`. File baru: `functions/api/names.js`. Tidak ada migrasi
database.

**Pengujian.** 22 pemeriksaan server untuk daftar nama (privasi, halaman tersembunyi, tamu, mode, tanggal), 139
pemeriksaan di peramban (ikon cari, hasil, salah ketik, menu, My page, penyimpanan rusak atau diblokir, nama berbahaya,
All players, dan semua halaman di lebar 320 sampai 1280 piksel), ditambah seluruh rangkaian lama yang tetap lolos.


## Update terbaru (v56): host yang bisa membuat sesi dan meja, QR untuk kode meja, dan kode host 6 karakter

**Apa yang baru, singkatnya.** Kamu bisa menunjuk pemain terdaftar sebagai **host**. Host login di `/host` dengan nama panggilan dan kata sandi
pribadi, lalu membuat **sesi** (tanggal bebas) dan **meja** sendiri, dan mendapat kode meja sebagai link **dan QR**. Kamu sendiri juga mendapat
tombol **QR** di samping setiap link di halaman Sessions, dan kartu meja yang bisa dicetak.

**Cara memakainya (admin).**
1. Buka halaman **Players**. Di kartu **Hosts** dan di setiap baris pemain ada tombol **Make host** (aktif hanya bila pemain punya nomor WhatsApp).
2. Setelah konfirmasi muncul **detail login**: pesan WhatsApp yang sudah terisi (tombol "Send on WhatsApp") dan QR untuk halaman login. Pesan itu
   hanya menyebut aturannya ("6 digit terakhir nomor WhatsApp ini"), bukan angkanya, dan tidak memuat rahasia apa pun.
3. Host membuka `/host`, login dengan nama panggilan dan **6 digit terakhir nomor WhatsApp** sebagai kata sandi pertama, lalu **wajib memilih kata sandi
   sendiri** (minimal 8 karakter, tidak boleh memuat 6 digit itu atau sama dengan nama panggilan). Kata sandi pertama berlaku 7 hari.
4. **Reset password** (di kartu Hosts atau baris pemain): kata sandi kembali ke 6 digit terakhir, berlaku 7 hari, dan semua ponsel host itu keluar.
   **Revoke host**: host keluar di semua ponsel dan tidak bisa login lagi. Sesi dan meja yang sudah dibuat tidak tersentuh.
5. Kamu tidak pernah melihat kata sandi host. Menghapus pemain dari registry otomatis mencabut hak host-nya.
6. Di halaman **Sessions**, sesi dan meja buatan host diberi keterangan "by <nama host>".

**Apa yang boleh dilakukan host.** Membuat sesi (tanggal bebas, maksimal **10 sesi per hari**), mengganti nama sesinya sendiri, membuat meja di sesinya
sendiri (maksimal **24 meja per hari**), melihat kode dan QR mejanya sendiri, menghapus sesi atau meja miliknya **hanya bila masih kosong** (belum ada
hand), dan mencetak kartu meja. Host **tidak** bisa: memakai sesi buatan admin, melihat milik host lain, membuka kunci meja, menghapus meja yang sudah
ada skornya, atau melihat nomor WhatsApp dan nama lengkap pemain. Batas harian dihitung menurut hari di Jakarta (WIB), apa pun tanggal sesinya, dan
**tidak kembali** bila sesi atau meja dihapus.

**Keamanan.**
- Kata sandi disimpan sebagai hash PBKDF2 (SHA-256, 100.000 putaran, garam acak per host). Tidak ada yang bisa membacanya kembali.
- Login memberi cookie `tbt_host` yang **tidak bisa dibaca skrip halaman** (HttpOnly), hanya dikirim lewat HTTPS (Secure), tidak dikirim dari situs
  lain (SameSite=Strict), dan hanya untuk alamat `/api/host`. Berlaku 30 hari, paling banyak 5 ponsel sekaligus. Tombol **Sign out** mengakhirinya.
- Satu pesan galat yang sama untuk semua kegagalan login ("Nickname or password is wrong"), jadi halaman tidak membocorkan siapa yang host.
  Lima kali salah (alamat dan nama yang sama) mengunci 15 menit; ada juga batas per nama panggilan dan per alamat.
- **Kode meja:** meja baru, dibuat siapa pun, mendapat kode host **6 karakter** (kode pemain tetap 5). Kode lama 5 karakter tetap berlaku. Semua kode
  kini dibuat dengan pembangkit acak yang aman. Pencarian kode yang publik (halaman Table code, scoreboard, tampilan pemain, kunci) kini membatasi
  alamat yang terus menebak kode salah: sekitar 60 kode salah dalam 10 menit menahan alamat itu beberapa menit. Kode yang benar tidak pernah dihitung.
  Di tempat yang banyak orang memakai satu WiFi, batas ini cukup longgar untuk salah ketik biasa.
- Kartu meja yang dicetak hanya membawa **kode pemain**, tidak pernah kode host.

**QR.** Digambar langsung di peramban (tanpa layanan luar; kebijakan keamanan situs memang memblokir layanan QR pihak ketiga), jadi kode meja tidak keluar
dari situs. Pustakanya `qrcode-generator` (Kazuhiko Arase, lisensi MIT; pemberitahuan hak ciptanya tertulis di bagian atas `shared/qr.js` dan harus
tetap ada). Beratnya sekitar 7 KB terkompresi, hanya di halaman yang memakainya (host, Sessions, Players).

**Menu.** Kelompok tenang di bagian bawah menu kini berjudul "Admin and hosts" dan berisi Sessions, Players, dan **Host desk**.

**Pemasangan.** Unggah seluruh isi zip seperti biasa. **Tidak perlu SQL manual dan tidak perlu menekan tombol apa pun**: tabel baru (`registry_hosts`,
`host_logins`, `host_daily`, `rate_events`) dan kolom `created_by` di `days` dan `tables` dibuat otomatis saat fitur host pertama kali dipakai.
Fitur host baru aktif setelah ada player registry (Players, "Turn on the player registry") dan kamu menekan Make host pertama kali.

**Berkas baru.** `host.html` (halaman host), `functions/_hostauth.js` (keamanan host), `functions/api/host/*` (login, logout, password, me, sessions, tables),
`functions/api/admin/hosts.js`, `shared/qr.js` dan `shared/qr.css`, `shared/kai.css`. **Pengujian baru:** `hosts_server.test.mjs` (88 pemeriksaan) dan
`hosts.test.mjs` (162 pemeriksaan, memerlukan paket `jsqr` yang ikut terpasang bersama paket uji lain).

**Yang belum diuji di dunia nyata:** pemindaian kamera ponsel pada QR yang dicetak, pengiriman WhatsApp sungguhan, dan perilaku PBKDF2 serta cookie
di Cloudflare produksi (di lingkungan uji berjalan baik). Cobalah satu kali dengan satu host sungguhan sebelum diumumkan.

## Update terbaru (v57): Thirteen Orphans, Nine Gates, dan Seven Stars boleh menang dari Hu

Berlaku untuk mode Casual, Default, Tournament, dan Custom. Mode MCR tidak berubah.

- **Aturan lama dihapus:** ketiga pola itu tidak lagi harus self draw. Bila dimenangkan dari buangan (Hu), jendela Pick Tiles dan Pick Patterns tetap
  mengusulkan polanya dengan poin yang sama seperti saat self draw: Thirteen Orphans 13, Nine Gates 13, Seven Stars 11. Sebelumnya Hu dari tangan ini
  ditolak ("must be self drawn") atau jatuh ke pola biasa (Nine Gates saat Hu hanya terbaca Concealed Hand + Full Flush, 8 sampai 10 poin).
- **Deteksi Nine Gates diperiksa:** semua 118.800 kemungkinan 14 tile dalam satu suit dibandingkan dengan definisi terpisah (1112345678999 ditambah satu tile
  suit yang sama). Hanya 9 tangan yang Nine Gates, semuanya terdeteksi, tidak ada yang salah deteksi, dan semuanya dihitung 13 baik self draw maupun Hu.
  Tile penunggu (waits) juga benar: 9 tile untuk Nine Gates 13 tile, 13 tile untuk Thirteen Orphans 13 sisi. Jadi yang tampak "tidak terdeteksi" adalah
  penolakan saat Hu, yang sekarang sudah hilang. Bila masih ada tangan Nine Gates yang terbaca salah di layar, kirim tile dan tile menangnya.
- **Split Straight tetap:** buangan hanya boleh melengkapi set atau pasangannya (bukan split straight), dan pesan penolakannya hanya untuk kasus itu.
- **Berkas:** `template/scoreboard.html` (daftar SHAPES, penolakan di `score`, pesan alasan) dan sumber lab `tilelab/engine.mjs`, `tilelab/detect.mjs`.
- **Tes baru:** `tests/tile_nine_gates.test.mjs` dan `tests/tile_special_hands.test.mjs` (200 pemeriksaan lewat antarmuka sungguhan; pada scoreboard lama tes
  ini gagal di semua kasus Hu). Tes lab diperbarui: detect.test.mjs 322 pemeriksaan (termasuk 98 kemenangan self draw dan Hu), ui.test.mjs 97.
- **Seven Pairs dan keluarganya diperiksa:** Seven Pairs, Seven Steps, Seven Wonders, dan Scattered Stars sejak awal tidak wajib self draw. Saat Hu, poinnya
  sama seperti saat self draw di keempat mode (320 pemeriksaan lewat antarmuka, juga pada build sebelum v57). Tidak ada yang perlu dibenarkan.
- **Dua tes lama yang gagal sudah dibereskan (yang salah tesnya, bukan situs):**
  - `rank_marks.test.mjs`: leaderboard terbuka di bulan berjalan, sedangkan data contoh tes bertanggal Agustus sampai Oktober 2026. Begitu bulan berganti ke
    November, tidak ada baris yang tampil. Tes sekarang menetapkan "hari ini" ke 26 Oktober 2026 (`window.TBT_TODAY`), jadi tidak bergantung pada tanggal
    dijalankan (93 pemeriksaan lolos).
  - `scoreboard-integration/tilepick.test.mjs`: masih menyatakan bahwa mode MCR tidak punya Pick Tiles, padahal sejak v53 MCR punya. Pernyataannya diperbarui
    (61 pemeriksaan lolos).

## Update terbaru (v58): polish leaderboard dan scoreboard (metode unslop)

Hanya tampilan (CSS, teks, dan sedikit susunan). Fungsi, urutan bagian, dan data tidak berubah. Brand (warna, huruf, gem, wordmark) tidak diubah. Header
dipakai bersama oleh semua halaman publik, jadi perubahan header juga tampil di sana. Halaman lain tidak diubah.

- **Metode:** audit dengan daftar tanda dan token dari unslop (Damir Sokolovsky, @heydamir, lisensi CC BY 4.0, https://github.com/heydamir/unslop), mode Polish.
  Keputusan yang dikecualikan karena brand: Playfair berat 900 untuk judul dan skor, permukaan gelap bernuansa hijau, dan gem.
- **Spasi:** semua nilai ke grid 4 px (padding kartu 16, tepi halaman 20, tinggi header 56). Spasi di luar grid: leaderboard 42 jadi 0, scoreboard 120 jadi 3
  (sisanya checkbox bawaan browser).
- **Huruf:** judul halaman seragam 32 px. Tidak ada teks di bawah 12 px (11 px hanya di layar sempit 380 px ke bawah). Nama pemain dan angka kecil tetap berat 700
  (Inter Tight hanya memuat 400, 500, 700, jadi 600 tampil sebagai 700). Label, tab, tombol, dan judul kartu berat 500. Label huruf besar berjarak lebar
  menjadi huruf biasa (kecuali wordmark TILES BY TILES).
- **Bentuk:** dropdown, kolom cari, dan tombol aksi radius 16. Tombol ikon header (cari, menu) kotak radius 14. Kolom isian radius 12. Tab, chip, dan tag tetap pil.
- **Baris peringkat 1 sampai 4:** sapuan warna dilembutkan jadi separuh intensitas (`.row.m::before`, opacity .5). Garis kiri, cincin, dan gem tetap.
- **Scoreboard:**
  - Baris "Players and options" memuat tag mode (Default, MCR-8, dan seterusnya) di kanan dan rincian kunci di bawah judul (Min dan Streak, atau Base dan Min
    untuk MCR, ditambah chip Rotation, Deadwall, Start, atau Bankrupt bila aktif). Diisi dari `renderRules` (`#gsTag`, `#gsSub`).
  - Kartu Game rules hanya tampil bila "Players and options" dibuka (`#gsetup:not([open])+#rulesCard`). Pada mode lihat saja dan game yang sudah dikunci kartu itu
    tetap tampil, karena blok opsi disembunyikan di sana. Tab Standings tetap menampilkannya.
  - Chip "What happened?" dalam kisi sejajar (3 kolom, 4 kolom mulai 560 px), pill selisih di daftar Hands dalam kisi (2 kolom, 4 kolom di layar lebar).
  - Lede dipersingkat, tag "STANDINGS" menjadi "Standings", tautan hand (Edit, Insert before, Delete, Share) berwarna redup dan menyala saat disorot.
- **Gerak:** satu kurva `cubic-bezier(0.22, 1, 0.36, 1)` (150 ms, tekan 120 ms), hanya warna, latar, garis, dan transform. Tombol sedikit mengecil saat ditekan.
  Semua mengikuti pengaturan reduced-motion. Cincin fokus ditambahkan untuk tautan.
- **Berkas:** `template/index.html`, `template/scoreboard.html`, `shared/nav.css`.
- **Tes:** semua tes yang bisa dijalankan lolos (data pemain 528, nama 22, ronde angin 11 dan 69, host 88 dan 162, header 156, gem 46, rank mark 93, ganti nama sesi
  25 dan 29, angin kursi, tile 320 dan Nine Gates, MCR server 12 dan statistik 8). Dua perbaikan tes: `nav_browser.test.mjs` tidak mengunci tanggal pada satu konteks
  (leaderboard terbuka di bulan berjalan, jadi baris Oktober tidak tampil, gagal juga pada versi sebelumnya), sekarang dikunci ke 26 Oktober 2026.
  `mcr_integration.test.mjs` tidak bisa dijalankan sejak folder kerja lama direset karena modul bantu `mcr_engine.mjs` tidak ada, dan itu tidak terkait polish.

## Update terbaru (v59): kontrol lebih rapat dan jendela scoreboard dirapikan

Lanjutan v58 setelah dicek di ponsel: padding terasa terlalu besar, judul serif jendela terlalu tipis, dan daftar Pick Patterns kurang rapi. Hanya tampilan.

- **Padding lebih rapat:** chip 36 px (huruf 14, padding 6 12), tab 36 px, tombol 42 px, tombol mode di Players and options 35 px, pill selisih hand 26 px, jarak antar kartu 12 px.
  Chip dan tab di halaman utama punya area sentuh yang melebar 3 px ke sela-selanya (`.chip::before`, `.tab::before`), jadi terlihat kecil tapi tetap mudah dikenai.
- **Judul serif:** judul jendela (Pick patterns, Pick tiles, Share hand) dan judul bagian di Pick Tiles kembali berat 700. Di v58 ikut turun ke 500 dan jatuh ke 400
  karena Playfair 500 tidak dimuat.
- **Pick Patterns (biasa):** dua kolom di semua lebar, huruf 12 px, padding 8 px, jarak 6 px. Chip yang terbungkus di lebar 390 px: 15 jadi 6 dari 52.
- **Pick Patterns (semua mode MCR):** sebelumnya chip mengalir seperti pil setinggi 44 px, sekarang dua kolom dengan gaya yang sama (radius 12, tinggi satu baris 36 px,
  nama panjang boleh turun ke baris kedua). Kolom cari radius 16. Tes `mcr_ui_layout.mjs` memeriksa chip fan setinggi 36 px (bukan 44 px) karena sengaja dibuat rapat.
- **Jendela lain:** tingkat pola berhuruf biasa (bukan huruf besar), label suit di Pick Tiles dan label di jendela Bagikan berhuruf biasa, tombol tutup (x) punya area sentuh 44 px,
  jarak dirapikan ke grid 4 px, ukuran huruf 12,5 dan 17 menjadi 13 dan 18.
- **Berkas:** `template/scoreboard.html`, `template/index.html`, `tests/mcr_ui_layout.mjs`.
- **Tes:** semua lolos (data pemain 528, nama 22, ronde angin 11 dan 69, host 88 dan 162, header 156, gem 46, rank mark 93, ganti nama sesi 25 dan 29, angin kursi, tile 320
  dan Nine Gates, MCR server 12 dan statistik 8, tata letak MCR 50 layar tanpa masalah).

## Update terbaru (v60): halaman pemain, daftar pemain, dan pendaftaran dipoles

Hanya tampilan dan satu perilaku kecil di halaman pendaftaran. Memakai ukuran rapat yang sama dengan v59.

- **Halaman pemain (`player.html`) dan daftar pemain (`players.html`):** blok gaya bersama dengan leaderboard disamakan (dropdown, tombol Share, dan kolom cari radius 16; tab, chip, dan tag tetap pil;
  berat 600 yang sebenarnya tampil 700 menjadi 500 untuk label, sedangkan nama dan angka kecil tetap 700). Ukuran huruf disatukan (12, 13, 14, 15, 16, 20, 22, 32): angka Playfair
  utama 32 dan kedua 22, judul bagian 20. Label huruf besar berjarak lebar di kartu statistik ("OF 4 HANDS WON" dan sejenisnya) menjadi huruf biasa 12 px. Spasi ke grid 4 px.
  Kartu game memakai tinggi baris tetap (20, 16, 16 px) dan padding atas 14 px (nudge optik 2 px karena panah buka-tutup ada di padding bawah). Daftar pemain: kolom cari dan Sort radius 16,
  baris keterangan 12 px.
- **Pendaftaran (`daftar.html`):** judul 28 px, tombol "Send sign-up" radius 16, label formulir tetap 700, jarak ke grid 4 px. Teks "Thank you!" menjadi "Thank you".
  Setelah formulir terkirim, dan pada tautan yang sudah ditutup, judul dan kalimat pengantar disembunyikan sehingga hanya pesannya yang tampil.
- **Tes baru:** `tests/signup_page.test.mjs` (12 pemeriksaan: formulir, galat, layar terima kasih, tautan tertutup, tanpa geser samping dan tanpa em dash di 3 lebar dan 2 tema).
- **Tes lain:** semua lolos (data pemain 528, header 156, gem 46, rank mark 93, ronde angin 69, host 162, ganti nama sesi 29, tata letak MCR 50 layar).

## Update terbaru (v61): halaman host, admin, masuk, dan 404 dipoles, penjajaran vertikal dirapikan

Hanya tampilan. Dengan ini semua halaman situs sudah melewati polish unslop (v58 sampai v61).

- **Host (`host.html`), admin harian (`admin-daily.html`), admin pemain (`admin-pemain.html`), masuk (`masuk.html`), 404 (`404.html`):** memakai sistem yang sama dengan halaman lain.
  Spasi ke grid 4 px (sisi halaman 20, padding kartu 16). Judul halaman 28 px dan judul bagian 18 px. Berat 600 menjadi 500, tombol utama 500, nama tetap 700.
  Label bagian dan badge berhuruf besar berjarak lebar (MY SESSIONS, TABLES, DEFAULT) menjadi huruf biasa 12 px. Tombol aksi radius 16, kolom isian 12, kotak QR 16, tab navigasi tetap pil.
  Wordmark TILES BY TILES dan kolom kode di halaman masuk tetap berhuruf besar berjarak lebar (logo dan petunjuk format).
- **Judul panjang:** judul halaman dan judul bagian boleh turun baris (`overflow-wrap:anywhere`), karena judul 28 px yang panjang membuat halaman bergeser samping di layar 320 px.
  Navigasi admin dan host sedikit mengecil di layar 360 px ke bawah (huruf 13, jarak 6).
- **Penjajaran vertikal** (diperiksa dengan tiga pengukuran di 52 layar: pusat teks terhadap kotaknya, baris yang anaknya tidak satu pusat, dan dua item bertetangga di satu baris):
  - Kartu meja di admin harian: tautan "Fix players" dan "Delete" di tengah vertikal (`.th{align-items:center}`).
  - Baris ronde angin di halaman pemain: tile angin sejajar dengan nama, bukan dengan nama ditambah batang (`.we-r.seg .we-t{align-self:start;margin-top:2px}`).
  - Tombol Share di halaman pemain dan daftar pemain, serta dropdown filter di header desktop, sejajar dengan baris judul (`margin-top:-4px`, judul 37 px dan kontrol 44 px).
  - Tombol Share di daftar pemain ikut aturan v60 yang sebelumnya terlewat (radius 16, berat 500).
  - Dikecualikan karena disengaja: judul dan tombol yang rata atas, judul bagian yang sejajar baseline, kotak centang dengan teks beberapa baris, dan sel grid yang membentang beberapa baris.
- **Teks:** placeholder kolom pemain di admin harian "The host fills this in later" menjadi "Fill in later" (sebelumnya terpotong di layar sempit).
- **Berkas:** `template/host.html`, `admin-daily.html`, `admin-pemain.html`, `masuk.html`, `404.html`, `index.html`, `player.html`, `players.html`.
- **Tes:** semua lolos (data pemain 528, nama 22, ronde angin 11 dan 69, host 88 dan 162, ganti nama sesi 25 dan 29, pendaftaran 12, header 156, gem 46, rank mark 93,
  angin kursi, tile 320 dan Nine Gates, MCR server 12 dan statistik 8, tata letak MCR 50 layar).

## Update terbaru (v62): font Hanzi KaiTi

Semua huruf Mandarin di situs (東 南 西 北 untuk angin, 胡 自 摸 牌 untuk label dan kartu bagikan) kini memakai satu keluarga font, `TBT Hanzi`, yang sumbernya berkas
`KaiTi_1.ttf`. Teks Latin, angka, tombol, navigasi, dan isi halaman tidak berubah (diukur: font yang dipakai identik sebelum dan sesudah di sembilan halaman).

- **Sebelumnya:** dua keluarga (`TBT Hanzi` di leaderboard, daftar pemain, dan halaman pemain, `LXGW WenKai TC` di scoreboard) dengan 19 deklarasi `@font-face` yang tersebar di
  empat halaman, dan variabel `--kai` yang menaruh font sistem (KaiTi, Kaiti SC, STKaiti) di urutan pertama dan font yang disematkan di urutan terakhir.
- **Sekarang:** satu keluarga `TBT Hanzi` (nama dipertahankan) dengan satu deklarasi `@font-face` di `shared/kai.css`, disisipkan lewat `/* TBT Hanzi: the one font family for every Chinese character on the site (KaiTi). Latin text, numbers and everything else keep their own fonts.
   The files are fetched only by a page that really shows one of these characters. KaiTi has all the Traditional characters the site uses (East, Green dragon and the closing character included).
   The font is the WOFF2 copy of KaiTi (5 MB), which every browser that loads web fonts can read.
   Declared once here; the pages carry no copies of their own. */
@font-face{font-family:"TBT Hanzi";font-style:normal;font-weight:100 900;font-display:swap;unicode-range:U+3400-4DBF,U+4E00-9FFF,U+F900-FAFF;src:url(/assets/f/KaiTi_1.woff2) format("woff2");}
:root{--kai:"TBT Hanzi",KaiTi,"Kaiti SC",STKaiti,BiauKai,"KaiTi_GB2312",serif}
` ke leaderboard, daftar pemain,
  halaman pemain, dan scoreboard. Variabel `--kai` kini `"TBT Hanzi",KaiTi,"Kaiti SC",STKaiti,BiauKai,"KaiTi_GB2312",serif`, dan tumpukan font di JavaScript (kartu bagikan,
  tile angin di halaman pemain, tanda air) ikut diubah. Subset LXGW WenKai TC yang lama dibuang karena KaiTi memuat semua karakter yang dipakai (東, 終, dan 發 termasuk).
- **Berkas font:** `shared/fonts/KaiTi_1.TTF` (berkas asli, 11,8 MB) dan `shared/fonts/KaiTi_1.woff2` (font yang sama dalam format terkompresi, 5,1 MB), disalin build ke
  `assets/f/KaiTi_1.TTF` dan `assets/f/KaiTi_1.woff2` dengan nama persis (bukan hash). Peramban mengambil WOFF2; TTF hanya cadangan untuk peramban yang tidak membaca WOFF2 dan boleh dihapus
  untuk menghemat ruang repositori. Karena namanya tetap, berkas yang diganti perlu nama baru agar peramban tidak memakai salinan lama (cache `/assets/*` setahun).
  Berkas hanya diunduh halaman yang menampilkan huruf Mandarin: scoreboard, halaman pemain saat tile angin digambar, dan kartu bagikan. Leaderboard, daftar pemain, host, admin,
  pendaftaran, masuk, dan 404 tidak mengunduhnya.
- **Hanya untuk Hanzi:** `unicode-range` hanya mencakup ideograf CJK (U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF), jadi huruf Latin dan angka tidak pernah memakainya.
- **Tebal huruf:** KaiTi berbobot reguler, jadi garis tambahan yang membuatnya tampak semibold (`-webkit-text-stroke` di CSS, `strokeText` di kanvas) dipertahankan seperti sebelumnya.
- **Berkas yang berubah:** `shared/kai.css`, `shared/fonts/KaiTi_1.TTF` dan `KaiTi_1.woff2` (baru), `build.py` (menyalin berkas font yang dikirim apa adanya), `template/index.html`, `players.html`,
  `player.html`, `scoreboard.html`, `template/_headers` (hanya catatan), `tests/hanzi_font.test.mjs` (baru, 17 pemeriksaan), `tests/windrounds.test.mjs` (asersi tumpukan font diperbarui).
- **Catatan:** berkas `Kaiti-SC-Bold_1.ttf` yang diunggah lebih dulu tidak dipakai: font Mandarin Sederhana itu tidak punya 東, 終, dan 發, dan ditolak peramban sampai tiga nilai headernya diperbaiki.
  KaiTi (Beijing ZhongYi Electronics, 1995-2005) berhak cipta pihak lain; berkasnya bertanda `fsType` 8 (penyematan yang dapat disunting).

## Update terbaru (v62b): berkas TTF KaiTi dihapus

Hanya ada satu berkas font Hanzi sekarang: `assets/f/KaiTi_1.woff2` (5,1 MB). `KaiTi_1.TTF` (11,8 MB) dihapus dari `shared/fonts/` dan dari rujukan `src` di `shared/kai.css`. Semua browser yang memuat font web
membaca WOFF2, jadi cadangan itu tidak diperlukan; browser tua yang tidak bisa membacanya akan memakai font Kai sistem atau serif, seperti sebelum ada font ini. Folder situs menyusut 11,8 MB.
`tests/hanzi_font.test.mjs` kini memeriksa bahwa WOFF2 ada dengan nama persis dan sama dengan berkas sumber, bahwa TTF tidak ada, dan bahwa `kai.css` hanya menunjuk WOFF2 (18 pemeriksaan).

## Update terbaru (v63): pemain bisa mengklaim halamannya, lalu mengedit avatar, tag, dan bio

Cara kerjanya, tanpa Google dan tanpa layanan luar:

1. Di halaman pemain, pengunjung melihat tombol **Want to edit your profile?** (menggantikan tombol "This is me"). Menekannya membuat sebuah permintaan. Tidak ada pesan yang terkirim dari situs.
2. Di halaman admin pemain ada kartu baru **Profile logins**. Admin menekan **Send on WhatsApp**: pesan berisi tautan sekali pakai sudah siap dan terbuka di WhatsApp, ke nomor yang didaftarkan pemain.
   Tautan berlaku sekali dan 30 menit sejak tombol ditekan, hanya disimpan sebagai hash, dan hanya ditampilkan sekali. Yang menekan tombol di halaman pemain tidak pernah melihat tautannya.
3. Pemain membuka tautan (`/claim?t=...`), memilih kata sandi (minimal 8 karakter, bukan nama panggilan, bukan bagian dari nomor telepon), dan langsung masuk. Berikutnya masuk di `/claim` dengan nickname dan kata sandi.
   Lupa kata sandi: minta tautan baru dengan cara yang sama.
4. Pemilik melihat **Edit profile** dan **Share**, serta "Signed in as ... Sign out". Pengunjung hanya melihat profil. Halaman tetap publik; hanya tombolnya yang khusus pemilik.

- **Isi profil:** avatar (salah satu dari 22 karakter chibi quiz, bebas dipilih, default Blank Tile), bio sampai 120 huruf, dan sampai 3 tag dari Chicken Hand, Riichi, TBT, MCR, HK, Others. Nickname hanya admin yang bisa mengubah. Level, varian lain, dan kartu bagikan menyusul.
- **Keamanan:** kata sandi disimpan sebagai hash PBKDF2 bergaram; cookie `tbt_player` HttpOnly, Secure, SameSite=Strict, hanya untuk `/api/player`, berlaku 30 hari, paling banyak 5 ponsel; semua ponsel keluar bila kata sandi diganti atau admin menekan Reset login;
  pembatasan: 3 permintaan per pemain per hari, 10 per alamat per jam, 5 salah masuk per 15 menit per alamat dan nickname (15 per nickname, 40 per alamat). Nomor WhatsApp yang ditampilkan ke peminta hanya awalan negara dan 3 digit terakhir.
  Bio selalu ditampilkan sebagai teks biasa. Profil yang diubah selalu milik pemain yang masuk; id di permintaan diabaikan.
- **Admin:** Send on WhatsApp, Dismiss (tolak permintaan), Reset login (lupakan kata sandi dan keluarkan semua ponsel, profil tetap), Clear profile (hapus avatar, tag, dan bio). Permintaan yang tidak dijawab 48 jam gugur sendiri.
- **Pintasan My page** di menu kini terisi otomatis saat pemain masuk (tombol "This is me" tidak ada lagi). Yang sudah memilih "This is me" sebelumnya tetap mempunyai pintasannya di perangkat itu.
- **Tabel baru** dibuat sendiri saat pertama dipakai (tanpa SQL): `player_accounts`, `player_logins`, `player_claims`, `player_profiles`.
- **Gambar avatar:** `shared/avatars/<id>.svg` (dibuat dari modul quiz di `shared/quiz/` dengan `node tools/make-avatars.js`), disalin build ke `assets/a/`. Namanya tetap (bukan hash): bila gambar diganti, naikkan `AV_V` di `player.html`.
- **Berkas baru:** `template/claim.html`, `template/functions/_playeraccount.js`, `api/player/` (claim-request, claim, login, logout, me, profile), `api/admin/claims.js`, `shared/avatars/`, `shared/quiz/`, `tools/make-avatars.js`.
  Berkas yang berubah: `player.html`, `admin-pemain.html`, `_players.js` (profil ikut di data halaman pemain), `shared/nav.js` (mengekspos `setMe`), `build.py`.
- **Tes:** `profile_server.test.mjs` (68) dan `profile_page.test.mjs` (35) baru; `nav_browser.test.mjs` diperbarui (bagian "This is me" diganti pemeriksaan tombol edit dan My page); `tests/lib.mjs` mengenal `.svg`.

## Update terbaru (v64): Tile Personality Quiz di situs, pendaftaran terbuka, tag bebas

- **Halaman quiz `/quiz`** (`template/quiz.html`): quiz "Kamu Tile yang Mana?" (16 pertanyaan, 22 tile, karakter chibi) di dalam kerangka situs: header situs, token warna, font situs (Playfair, Inter Tight, TBT Hanzi), mode gelap.
  Judul tab: "Tile Personality Quiz: Kamu Tile yang Mana?". Sumbernya di `shared/quiz/` (`quiz-data.js` berisi 22 tile dan 16 pertanyaan; `quiz-faces.js`, `quiz-art.js`, `quiz-chibi.js` gambarnya; `quiz-app.js` aplikasinya).
  Isinya dimasukkan ke `quiz.html` dengan skrip kecil; ubah teks di `quiz-data.js`, lalu masukkan lagi ke halaman (modul `shared/quiz/*.js` ditempel berurutan di akhir `quiz.html`). `shared/quiz/quiz.css` adalah CSS asli artifact dan tidak dipakai langsung: gaya yang berlaku ada di `quiz.html`.
- **Bahasa quiz:** deskripsi, tips, dan satu tagline di 22 tile ditulis ulang dengan nada lebih lepas (label "Tips:" dihapus; pola "bukan X, tapi Y" dan susunan tiga serangkai dikurangi), teks halaman dan toast dirapikan. Pertanyaan dan pilihan jawaban tidak berubah. Emoji tetap di isi quiz (jawaban dan judul hasil); di kerangka halaman diganti ikon garis dan 牌.
- **Form hasil:** nama, Instagram, domisili (diketik), WhatsApp (opsional), centang undangan, dan kalimat persetujuan ("Dengan menekan Buka Tile Aku, ..."). Level mahjong tidak ditanyakan. Hasil langsung tampil setelah form, diikuti kartu **Follow @tiles.by.tiles** (tidak ada gerbang follow).
- **Penyimpanan:** `POST /api/quiz/lead` (header `x-tbt: quiz`) menulis ke tabel `quiz_leads` (dibuat otomatis saat pertama dipakai): satu baris per username Instagram (kirim lagi = memperbarui), paling banyak 10 kiriman per jam per alamat, kolom tersembunyi untuk bot, nomor WhatsApp disimpan dalam bentuk 62. Alamat pengunjung tidak disimpan.
- **Admin pemain:** kartu **Tile quiz responses** (daftar terbaru, tile terbanyak, Download CSV, Delete; sel CSV yang diawali `=`, `+`, `-`, `@` dibuat tidak berbahaya di spreadsheet) lewat `api/admin/quiz.js`.
- **Pendaftaran terbuka untuk umum:** saklar **Open to everyone** di kartu "Sign-up by link" (pengaturan `signup_open`). Saat terbuka: menu menampilkan **Sign up** dan `/daftar.html` menerima pendaftaran tanpa kode rahasia; tetap masuk daftar tunggu, tetap dibatasi laju, tetap perlu persetujuan admin; daftar nama tamu tidak ditampilkan tanpa tautan rahasia.
  Saat tautan dimatikan, "open" tidak berarti apa-apa. Menu mengecek `GET /api/signup?status=1` (jawaban kecil, disimpan 60 detik).
- **Tautan quiz:** menu header ("Tile Quiz"), kartu di bawah leaderboard (juga di tab Sessions), kartu "Sambil nunggu, cari tile kamu" di layar Thank you setelah mendaftar, dan tautan di lembar edit profil. Tiga karakter di kartu berganti-ganti tiap halaman dibuka (diundi sekali per kunjungan, bukan tiap digambar ulang).
- **Mode gelap quiz:** palet krem (bukan hijau muda): tombol dan judul `#EFE6D6` dengan teks hijau tua, merah 牌 sedikit dicerahkan (`#F4A0A0`, di luar brand kit). Kontras setiap teks diukur otomatis (4,5; 3 untuk teks besar) di terang dan gelap pada lebar 320, 390, dan 1280.
- **Tag profil tanpa batas** (dulu maksimal 3).
- **Berkas baru:** `template/quiz.html`, `template/functions/_quiz.js`, `api/quiz/lead.js`, `api/admin/quiz.js`, `tests/quiz_server.test.mjs` (58), `tests/quiz_page.test.mjs` (28). Berkas yang berubah: `shared/nav.js` (Tile Quiz dan Sign up di menu), `index.html`, `daftar.html`, `player.html`, `admin-pemain.html`, `_players.js`, `_playeraccount.js`, `api/signup.js`, `api/admin/players.js`, `tests/nav_browser.test.mjs`, `tests/profile_*.test.mjs`.
- **Catatan:** halaman quiz 364 KB (skrip dan seni di satu berkas, hanya dimuat di halaman itu). Gambar avatar bernama tetap (bukan hash): bila diganti, naikkan `?v=` pada rujukannya.

## Update terbaru (v65): kartu share quiz dan link quiz

- **Kartu story** (gambar 1080 x 1920 dari tombol "Download buat story"): memakai logo asli (PNG yang sama dengan header) dan wordmark TILES BY TILES (Playfair Display 900, huruf besar, berjarak seperti header).
  Judul tile tegak (font miring dari Playfair tidak termasuk brand kit); teks Inter Tight, Hanzi TBT Hanzi; warna abu-abu liar diganti warna brand (`#1B4332`, `#587263`).
  Footer: "Kamu tile yang mana?", **@tiles.by.tiles**, **Play. Learn. Connect.** Alamat situs dan slogan lama dihapus. Jarak footer dilonggarkan: pertanyaan naik 18 px (jarak ke handle 80 px).
  Kanvas memakai `letterSpacing` (Chrome, Firefox, Safari 17 ke atas); di Safari lama wordmark tampil sedikit lebih rapat.
- **Nama tile yang pucat** digelapkan hanya sebagai teks sampai kontrasnya minimal 4,5:1 di atas krem (fungsi `inkOn` di `quiz-app.js`): kini hanya Summer, Chrysanthemum, Blank Tile, dan Spring yang berubah. Berlaku di kartu story dan di halaman hasil (tampilan terang); glow dan gambar karakter tetap berwarna asli, mode gelap tetap krem.
- **Yang dibagikan ada dua:** story (gambar) dan **link quiz**: tombol kini "Share link quiz" dan mengirim alamat `/quiz` itu sendiri (bukan alamat tile) dengan teks "Aku <tile> <emoji> (<judul>). Kamu tile yang mana?". Tombol salin juga menyalin alamat quiz.
  Tautan lama `?tile=...` masih membuka tile itu. Kalimat di galeri disesuaikan ("kirim story atau link quiz-nya ke teman").
- **Tes:** `tests/quiz_page.test.mjs` kini 45 pemeriksaan: tombol share mengirim alamat quiz tanpa tile; story berukuran 1080 x 1920; kartu memuat handle, tagline, wordmark berjarak, dan pertanyaan; tanpa alamat situs atau slogan lain;
  semua font kartu adalah font brand kit dan tidak ada yang miring; logo asli dan gambar tile digambar; jarak footer; kontras nama keempat tile di kartu dan halaman.

## Update terbaru (v66): jarak tombol edit di halaman pemain

Di halaman pemain, tombol "Want to edit your profile?" (pengunjung) dan tombol "Edit profile" dan "Share" (pemilik) menempel ke filter tanggal dan mode (jarak 0 px). Kini ada jarak 16 px di bawahnya (`.pf-b.s` dan `.pf-acts`).
`tests/profile_page.test.mjs` memeriksa jarak itu (minimal 16 px) di lebar 320, 390, dan 1280 untuk pengunjung dan pemilik (41 pemeriksaan).
Berkas yang berubah: hanya `template/player.html` (jadi `player.html` di situs) dan catatan ini.

## Update terbaru (v67): share story yang jalan di HP, dan jarak kartu quiz di leaderboard

**Share story dan simpan gambar (halaman `/quiz`).** Penyebab di versi lama: gambar story baru dibuat *setelah* tombol ditekan (sekitar satu detik, termasuk memuat font), lalu `navigator.share` dipanggil. Safari dan sebagian browser Android menolak share kalau gambarnya baru dibuat
sesudah ketukan, dan kode lama menelan penolakan itu tanpa pesan, jadi tombol tampak mati. Bila browser tidak bisa share berkas (browser di dalam Instagram atau Facebook, Firefox Android), kode lama diam-diam mencoba mengunduh lewat tautan `blob:`
dan menampilkan "Udah ke-download" walau tidak terjadi apa-apa; unduhan dari halaman web juga sering mendarat di folder yang tidak dilihat galeri. Jendela gambar cadangan hanya muncul di bingkai preview dan masih berisi teks "Preview aja ... Di website asli".
- Gambar story kini dibuat lebih dulu begitu hasil tampil (`warmStory`), jadi **Share story** memanggil lembar share HP dalam ketukan yang sama. Berkasnya PNG `tiles-by-tiles-<tile>.png`, dengan judul "Tile Personality Quiz" dan teks yang memuat alamat quiz.
- Jika HP menolak share (bukan karena pengguna menutup lembarnya): gambar ditampilkan di jendela dengan petunjuk "Tahan gambarnya buat simpan ke galeri", tombol **Download**, dan tombol **Share** bila tersedia. Menutup lembar share tidak memunculkan apa pun.
- Di browser dalam aplikasi (Instagram, Facebook): langsung jendela gambar dengan petunjuk membuka halaman di Chrome atau Safari.
- Tombol baru **Simpan gambar ke galeri**: di komputer mengunduh berkas, di HP menampilkan gambarnya (tekan lama menyimpan ke galeri; di Safari menu "Add to Photos"). Tombol lama "Download buat story" kini "Share story". Esc, Tutup, dan klik di luar menutup jendela; fokus kembali ke tombol.
- Tombol yang ditekan terlalu cepat (sebelum gambar siap) menunggu gambarnya lalu share.

**Jarak kartu quiz di bawah leaderboard (`index.html`).** Jaraknya 12 px dari kartu daftar, dan di desktop terasa menempel. Kini 24 px di semua lebar (320 sampai 1440). Jarak dibuat dengan padding di pembungkus (`.qz-wrap`), bukan margin: margin kartu daftar (12 px) menyatu dengan margin kartu quiz di tata letak blok dan tetap menyisakan 12 px.

**Tes (`tests/quiz_page.test.mjs`, 64 pemeriksaan):** share di HP (berkas PNG, judul, teks, dipanggil dalam ketukan yang sama selagi tap masih aktif; ditutup pengguna tidak membuka apa pun; ditolak membuka jendela gambar; browser Instagram; browser tanpa share berkas; ketukan terlalu dini; komputer mengunduh),
jarak 24 sampai 40 px di enam lebar, dan teks jendela tidak lagi memuat "Preview aja". Pemeriksaan story lama kini berjalan di ukuran komputer karena di HP perilakunya memang berbeda.
**Berkas yang berubah:** `quiz.html`, `index.html`, dan catatan ini.

## Update terbaru (v68): pengaman untuk layar kosong

Halaman yang digambar skrip (player, daftar pemain, leaderboard, admin sesi, admin pemain, host) bisa tetap kosong kalau skrip halamannya tidak mulai (berkas rusak atau terpotong saat diunggah, browser sangat tua, skrip diblokir). Layar kosongnya tidak memberi petunjuk apa pun.
- Di `<head>` tiap halaman itu ada skrip kecil terpisah (jadi tetap jalan walau skrip utama salah sintaks). Setelah 4 detik, kalau skrip utama tidak mulai, atau ada galat dan belum ada yang tergambar, halaman menampilkan **"Can't load this page"**, tombol **Reload** dan **Leaderboard**, dan baris **Code:** berisi galat pertama
  (misalnya "Uncaught SyntaxError: Unexpected token ')'"). Kalau skripnya berjalan dan hanya menunggu server yang lambat, pesan ini tidak muncul.
- Tandanya: `shared/nav.js` mengisi `window.__tbtNav = true` di akhir (halaman admin dan host, yang tidak memakai nav.js, mengisinya di baris pertama skrip utamanya). Bendera ini menandai bahwa skrip halaman sampai di sana; kalau skripnya salah sintaks, bendera tidak pernah terisi.
- `_headers`: catatan lama yang masih menyebut nama font Hanzi yang lama diperbaiki (kini `assets/f/KaiTi_1.woff2`).
- Tes: `tests/blank_watchdog.test.mjs` (24 pemeriksaan): di enam halaman, kunjungan normal tidak pernah menampilkan pesan; saat semua skrip halaman dirusak dengan sengaja, pesan muncul setelah 4 detik dengan galatnya serta tombol Reload dan Leaderboard; saat server hanya tidak menjawab, pesan tidak muncul.
- Berkas yang berubah: `player.html`, `players.html`, `index.html`, `admin-daily.html`, `admin-pemain.html`, `host.html`, `_headers`, dan catatan ini.

## Update terbaru (v69): jendela Pick Tiles dan Pick Patterns

- **Tile bunga** di Pick Tiles kini sebesar tile lain. Penyebabnya baris bunga memakai grid 8 kolom sedangkan palet tile 9 kolom; kini bunga memakai grid 9 kolom yang sama (8 bunga, satu kolom kosong). Berlaku di semua mode.
- **Pilihan tile pemenang** ("Winning tile") juga memakai grid 9 kolom yang sama, jadi ukurannya sama dengan tile lain (dulu tetap 38 px). Garis sorot tile terpilih (`outline-offset` 1 px) tidak lagi menimpa tile di sebelahnya.
- **MCR, Pick Tiles:** teks "None held: that is a bonus point (No Flower / Season)" tidak muncul lagi di MCR (tanpa bunga tidak ada poin tambahan di MCR); di mode lain tetap ada. Label kondisi menang MCR: **Last of its kind** (dulu "Last tile"), **Last tile of the wall** (khusus Zi Mo), **Last discard of the game** (khusus Hu, tidak berubah),
  **Replacement tile after a kong**, **Robbing a Kong** (dulu "Robbing the Kong").
- **Pick Patterns:** pola *Robbing the Kong* kini bernama **Robbing a Kong**; nama pola lain tidak berubah. Kuncinya (`RobbingTheKong`) tidak berubah. Game yang sudah tersimpan masih membawa nama lama di datanya: scoreboard menampilkannya dengan nama baru (`patName`, di skrip pertama halaman),
  dan statistik pola di server (`_tables.js`, `PATTERN_ALIAS`) menghitung nama lama dan baru sebagai satu pola. Nama baru kelak cukup ditambahkan ke daftar alias itu.
- **Layar penuh di HP** (lebar sampai 600 px) untuk Pick Tiles, Pick Patterns MCR dan Pick Patterns mode lain (`#tileModal`, `#mcrPatModal`, `#patModal`): tinggi `100dvh`, sudut tidak membulat, header dan tombol bawah menempel dan memperhitungkan area aman layar. Di komputer tetap kartu (maks. 640 px).
  Tinggi kartu kini `85dvh` (dulu `85vh`, yang di sebagian browser HP mencakup area di balik bilah alamat dan bisa menutup tombol bawah).
- **Tes:** `tests/tile_modal.test.mjs` (313 pemeriksaan: 5 mode x Zi Mo/Hu x 3 lebar: ukuran bunga dan tile pemenang sama dengan palet, label, teks bonus per mode, nama Robbing a Kong, layar penuh di HP dan kartu di komputer) dan `tests/pattern_alias.test.mjs` (nama lama dan baru dihitung satu di statistik).
  `mcr_integration.test.mjs` disesuaikan dengan label baru, tetapi masih tidak bisa dijalankan di sini (lihat README).
- **Berkas yang berubah:** `scoreboard.html`, dan di server `functions/_tables.js` (bagian `functions/` ikut diunggah).

## Update terbaru (v70): pilihan ikut pindah saat pemenang diganti, dan Clear selection di Pick Patterns MCR

- **Pilihan ikut pindah.** Dulu pilihan tile, pola dan poin terikat ke pemain yang dipilih; kalau pemenang diganti, pilihannya tertinggal di pemain lama dan tidak ikut terhitung. Kini, saat pemenang diganti (jenis kemenangan Zi Mo atau Hu, satu pemenang):
  - **Tile yang dipilih** pindah apa adanya ke pemenang baru; pola dan poin yang dihitung dari tile itu dikosongkan, karena bergantung pada angin kursi pemenang. Di bawah tombol Pick Tiles muncul catatan "Tiles kept from <nama>. Open Pick Tiles to check the patterns for this winner."
    Saat Pick Tiles dibuka tile sudah terisi dan pola dihitung ulang untuk pemenang baru (Check patterns, lalu Use total). Catatan hilang setelah Pick Tiles dibuka.
  - **Pola yang dipilih manual** (Pick Patterns) dan **poin yang diketik** pindah apa adanya, termasuk totalnya.
  - Pemenang baru yang sudah punya pilihan tidak ditimpa; pindah bolak-balik mengikuti. Mengganti jenis kemenangan tetap mengosongkan formulir (`resetForm`). Double dan Triple Hu tidak berubah.
  - Kode: `picksOf`, `clearPicks`, `carryPicks`, `carryNote` di dekat `resetForm`; `carryPicks` dipanggil dari penanganan tombol pemenang (`data-a="win"`); bidang `carry` baru di formulir (`f.carry`).
- **Clear selection di Pick Patterns MCR.** Jendela MCR sebenarnya sudah punya tombol "Reset", tetapi di paling bawah daftar (setelah Flower tiles) sehingga tidak ketemu. Kini tombol **Clear selection** (nama sama dengan mode lain) ada di bagian atas ringkasan, hanya muncul kalau sudah ada fan atau bunga terpilih, dan menghapus semuanya sekaligus (fan dan jumlah bunga). Tombol "Reset" di bawah dihapus.
  Mode lain tidak berubah (sudah punya "Clear selection"); Pick Tiles sudah punya "Clear tiles".
- **Tes:** `tests/entry_carry.test.mjs` (19 pemeriksaan): tile pindah ke pemenang baru dengan catatan, tile sudah terisi dan pola dihitung ulang, hand tersimpan atas nama pemenang baru, pola manual dan poin ketik pindah (dan bolak-balik), mode Default, serta Clear selection (tidak ada saat kosong, menghapus fan dan bunga, lalu hilang).
- **Berkas yang berubah:** `scoreboard.html`.

## Update terbaru (v71): homepage baru, leaderboard pindah ke /leaderboard, teks homepage dari admin

**Homepage baru (`/`).** Alamat utama situs kini halaman depan, bukan leaderboard. Isinya: teks pembuka (diatur dari admin, lihat di bawah), angka musim ini (pemain, meja, sesi), kartu hijau **Latest session** (sesi terakhir, jumlah meja, pemain teratas, tombol ke hasilnya),
daftar **Latest sessions**, kartu "Never played before?" ke Instagram @tiles.by.tiles, **Leaderboard** musim berjalan (6 teratas, tampilan sama dengan leaderboard: lingkaran, garis, tint, dan permata Diamond, Ruby, Jade, Pearl), dan baris **At the table**
(isi table code langsung, Find your name, Tile Quiz). Karakter tile di halaman diacak saat dibuka, lalu satu karakter berganti tiap 6 detik (tidak pernah kembar; berhenti saat tab tidak dibuka; diacak sekali saja bila HP memakai "kurangi animasi").
Data diambil dari `/api/overview` yang sama dengan leaderboard, jadi angkanya selalu sama, dan diperbarui tiap 60 detik. Bagian event (Next up, Coming up, My booking) belum ada: menyusul bersama booking event.

**Leaderboard pindah ke `/leaderboard`** (`leaderboard.html`, isinya tidak berubah). Link lama tetap jalan: alamat dengan filter (`/?p=...`, `?m=`, `?tab=`, `?sesi=`, juga lewat `index.html`) diteruskan ke `/leaderboard` dengan filter yang sama (301).
Semua link ke `index.html` di halaman lain diganti: tombol Leaderboard dan tautan sesi ke `/leaderboard`, logo situs ke `/`. Menu kini dimulai dengan **Home**. Bar admin (Sessions, Players) dapat link **Homepage**.
**Layar venue:** ganti alamatnya ke `/leaderboard` (refresh otomatis tiap 30 detik tetap ada).

**Teks homepage dari admin (`/admin-home`).** Baris kecil di atas, headline, baris kedua, kata merah miring, intro, serta judul dan deskripsi untuk Google. Ada empat titik awal (Surabaya search, Tagline first, Warm invite, Learn first), preview langsung, penghitung karakter, dan contoh tampilan di Google.
Default: "Surabaya search" (judul "Tiles by Tiles | Komunitas & Belajar Mahjong Surabaya"). Teks disimpan di tabel D1 baru `site_settings`, yang dibuat otomatis saat pertama kali menekan Save: **tidak perlu menjalankan apa pun di Console D1.**
Server menulis teks itu ke HTML halaman sebelum dikirim (`functions/index.js`, HTMLRewriter), jadi judul, deskripsi, dan headline sudah ada untuk Google tanpa menjalankan skrip. Perubahan tampil dalam satu menit, tanpa upload ulang.

**SEO:** `robots.txt` (admin, host, scoreboard, daftar, claim, dan `/api/` tidak diindeks), `sitemap.xml` (`/`, `/leaderboard`, `/quiz`), `canonical` di homepage dan leaderboard, dan data terstruktur Organization (nama, logo, tagline, Surabaya, Instagram) di homepage.
Langkah yang perlu dilakukan sendiri: daftarkan situs di Google Search Console dan kirim `sitemap.xml`; buat Google Business Profile Tiles by Tiles (area layanan Surabaya).

**Diuji di sini** dengan `wrangler pages dev` dan database D1 lokal berisi data contoh: semua alamat lama dan baru, pengalihan, teks dari admin (termasuk karakter `<` yang di-escape), table code dari homepage (kode benar ke scoreboard, kode salah memberi pesan), tampilan HP 390 px dan desktop 1280 px tanpa scroll ke samping, menu, dan halaman admin.

**Berkas baru:** `leaderboard.html` (isi `index.html` lama), `admin-home.html`, `functions/index.js`, `functions/_home.js`, `functions/api/admin/home.js`, `robots.txt`, `sitemap.xml`.
**Berkas yang berubah:** `index.html` (kini homepage), `404.html`, `_headers`, `admin-daily.html`, `admin-pemain.html`, `claim.html`, `daftar.html`, `host.html`, `masuk.html`, `player.html`, `players.html`, `quiz.html`, `scoreboard.html`, dan catatan ini.
Upload seluruh isi folder seperti biasa (bagian `functions/` ikut diunggah). Binding `DB` dan `ADMIN_PASSWORD` tidak berubah.

## Update terbaru (v72): events dan booking

**Halaman publik (satu berkas `events.html`, tiga alamat):**
- **`/events`**: daftar event (filter Classes, Open Play, Tournaments; Upcoming dan Past), kursi tersisa, harga. Bagian "My bookings on this phone" muncul kalau HP itu pernah booking.
- **`/events/<id>/<nama>`**: halaman event (sesi, level, mode leaderboard per sesi, Good to know, Who is coming), dan form booking di `#book`: satu kartu per orang (maks. 8), nama, WhatsApp, Instagram, level (First timer, Beginner, Casual, Intermediate, Advanced), sesi dipilih per orang. Sesi penuh, tutup, atau beda level tidak bisa dipilih.
- **`/b/<kode rahasia>`**: halaman booking. Transfer persis total plus kode unik Rp 1 sampai 99, tulis berita transfer (contoh `TBT-4RSH DINDA`), ke salah satu dari dua rekening, lalu tekan **I have transferred** (tanpa upload bukti). Ada status, link untuk disimpan, tombol WhatsApp ke admin (bahasa Indonesia casual), dan **Cancel booking** sampai 24 jam sebelum sesi.

**Aturan yang dijaga server:** kursi ditahan 2 jam; lewat dari itu booking kedaluwarsa dan kursinya kembali (dihitung tiap kali ada yang membuka event, tanpa timer). Kuota tidak bisa terlewati walau dua orang booking bersamaan (kursi ditulis dalam satu transaksi yang menghitung ulang).
Kode unik tidak pernah sama dengan booking terbuka lain yang nominalnya sama di event itu. Booking ditutup N jam sebelum tiap sesi (diatur per event, default 2). **Bayar di venue** hanya kalau event mengizinkan dan **semua** nomor WA di booking terdaftar di registry; campuran member dan guest wajib transfer.
Nomor WA yang terdaftar otomatis menautkan pemain ke registry (namanya di Who is coming memakai nickname; pemain yang menyembunyikan halamannya dan guest hanya dihitung). Maks. 8 booking per jam dari satu perangkat; ada kolom jebakan bot.

**Admin (`/admin-events`, juga di bar admin dan menu):**
- Buat dan edit event: jenis, judul, tempat, deskripsi, sesi (tanggal, jam, durasi, kursi, harga, level, **mode leaderboard per sesi**), dua rekening, bayar di venue untuk member, kursi kelipatan 4, Who is coming, jam tutup booking, kontak WA. Publish atau simpan draft. Sesi yang sudah ada booking-nya tidak bisa dihapus dan kursinya tidak bisa di bawah yang sudah dipesan.
- Daftar booking per event dan per sesi: nominal yang dicari di mutasi rekening dan berita transfernya, nomor WA dan Instagram (bisa diklik), tanda TBT atau Guest.
  Tombol **Money is in: confirm**, **Not found** (kursi ditahan 2 jam lagi), **Mark paid** (venue), **Confirm anyway**, **Remove booking** (alasan, catat refund), **Remove** per pemain (kursinya kembali, total baru, catat refund bagiannya), **Refund sent**, **Copy booking link**, **Copy player list**.
  Setelah confirm, not found, atau remove, muncul pesan WhatsApp bahasa Indonesia casual yang bisa diedit lalu dibuka di WhatsApp ke nomor pemesan.
- Tabel D1 baru (`events`, `event_sessions`, `bookings`, `booking_players`, `booking_seats`) dibuat otomatis saat halaman event pertama kali dibuka: **tidak perlu Console D1.** Tidak ada binding baru (tidak ada upload gambar, jadi tidak perlu R2).

**Homepage:** kalau ada event, kartu hijau menjadi **Next up** (event terdekat, titik kursi, tombol Book), kolom kiri menjadi **Coming up**, tombol utama **See events**, dan kartu tengah di At the table menjadi **My booking** bila HP itu pernah booking. Tanpa event, homepage tetap seperti v71.
**Menu:** Home, **Events**, Leaderboard, Players, Table code, Tile Quiz; bagian admin dimulai dengan Events. Bar admin bisa digeser ke samping di HP kecil.
**SEO:** `/events` masuk `sitemap.xml`; `/b/` tidak diindeks (`robots.txt`, `_headers`).

**Diuji di sini** dengan `wrangler pages dev` dan D1 lokal: membuat event dua sesi dari admin; booking dua orang (salah level, belum centang persetujuan, sesi penuh); 7 booking serentak untuk 5 kursi tersisa (5 masuk, 2 ditolak); bayar di venue dengan guest (ditolak, menyebut nama) dan semua member (masuk);
I have transferred, Not found, tandai lagi, confirm, keluarkan satu pemain dengan refund, Refund sent, batal oleh pemesan; booking kedaluwarsa mengembalikan kursi; tampilan 360, 390 dan 1280 px tanpa scroll ke samping.

**Berkas baru:** `events.html`, `admin-events.html`, `functions/_events.js`, `functions/api/events.js`, `functions/api/events/[id].js`, `functions/api/book.js`, `functions/api/booking/[token].js`, `functions/api/admin/events.js`, `functions/api/admin/events/[id].js`, `functions/api/admin/bookings/[id].js`.
**Berkas yang berubah:** `index.html`, `leaderboard.html`, `player.html`, `players.html`, `quiz.html`, `admin-daily.html`, `admin-pemain.html`, `admin-home.html`, `_redirects`, `_headers`, `robots.txt`, `sitemap.xml`, dan catatan ini.
**Catatan domain:** alamat `tilesbytilesleaderboard.pages.dev` masih tertulis di canonical, `og:url`, `sitemap.xml`, `robots.txt` dan data Organization. Link booking di WhatsApp memakai alamat yang sedang dibuka, jadi otomatis ikut domain baru. Saat `tilesbytiles.id` aktif, alamat-alamat tadi diganti di satu update.

## Update terbaru (v73): domain tilesbytiles.id

Semua alamat untuk Google dan link preview kini memakai **https://tilesbytiles.id**: `canonical` (homepage, leaderboard, events), `og:url` dan `og:image` di semua halaman publik, `sitemap.xml`, baris Sitemap di `robots.txt`, data Organization di homepage, dan contoh tampilan Google di halaman admin Homepage text.
Alamat lama `tilesbytilesleaderboard.pages.dev` tetap jalan (link lama, QR meja yang sudah dicetak, layar venue); karena canonical menunjuk ke domain baru, Google menggabungkan keduanya ke tilesbytiles.id.
Link yang dibuat situs sendiri (link booking, link dan QR meja dari admin dan host) memakai alamat yang sedang dibuka, jadi buka admin lewat tilesbytiles.id supaya link baru ikut domain baru.
**Berkas yang berubah:** `index.html`, `leaderboard.html`, `events.html`, `player.html`, `players.html`, `quiz.html`, `admin-home.html`, `robots.txt`, `sitemap.xml`, dan catatan ini. Tidak ada perubahan database.

## Update terbaru (v74): booking manual, host event, dan jarak di halaman admin

**Tambah booking manual** (`/admin-events`, buka Bookings sebuah event, tombol **+ Add a booking**), untuk orang yang daftar lewat WhatsApp, DM Instagram, atau datang langsung:
- **Booked through:** WhatsApp, Instagram DM, Walk-in, Other. Tampil di daftar sebagai "Added by admin · Instagram DM" (atau nama host yang menambahkan).
- **Find a TBT player:** ketik nickname, pilih, maka pemain langsung tertaut ke registry dan server memakai WhatsApp serta Instagram yang terdaftar (nomornya tidak dikirim ke layar). Yang tidak terdaftar diisi sebagai guest.
- WhatsApp dan level **boleh kosong**. Tanpa nomor WA, setelah disimpan muncul pesan untuk disalin dan dikirim lewat DM.
- **Payment:** *Already paid* (langsung confirmed, dengan jumlah yang diterima), *Send transfer link* (seperti booking online: ditahan 2 jam, kode unik, berita transfer), *Pay at the venue* (boleh untuk guest), *Free (complimentary)*.
- **Allow over the seat limit** untuk walk-in saat sesi penuh. **Note** internal yang hanya terlihat admin dan host.
- Setelah disimpan, langsung muncul pesan WhatsApp yang sesuai (link transfer, catatan bayar di venue, atau konfirmasi).

**Host event:**
- Di **Edit event** ada kartu **Event hosts**: pilih dari pemain yang punya akun host (dibuat di halaman Players). Hanya admin yang memilih host dan membuat event baru.
- Host membuka **Events** dari Host desk (link baru di bar Host desk), lalu masuk `/admin-events` dengan login host-nya sendiri (tanpa password admin) dan hanya melihat event yang dia pegang.
  Di event itu host bisa melakukan semua yang admin lakukan: melihat dan menambah booking, confirm transfer, not found, mark paid, hapus booking atau pemain, refund, dan mengedit event (termasuk rekening). Event lain dijawab "You are not a host of this event."
- Server: logika admin event dipindah ke `functions/_eventsadmin.js` dan dipakai bersama oleh `/api/admin/...` (password admin) dan `/api/host/...` (login host, cookie yang sudah ada).

**Jarak di halaman admin:** judul dan kartu pertama tidak lagi menempel ke garis di bawah bar navigasi (jarak 24 px) di Events, Homepage, Sessions, dan Players.

**Database:** kolom baru `events.hosts`, `bookings.source`, `bookings.note`, `bookings.added_by`, ditambahkan otomatis saat halaman event pertama kali dibuka. Tidak perlu Console D1.
**Diuji di sini** dengan `wrangler pages dev`: admin memilih host, menambah booking manual (pemain dari registry plus guest tanpa WA, bayar di venue, sumber Instagram DM, note), booking walk-in sudah bayar tanpa WA; host login, hanya melihat eventnya, punya semua tombol, ditolak di event lain, tidak melihat kartu Event hosts.
**Berkas baru:** `functions/_eventsadmin.js`, `functions/api/host/events.js`, `functions/api/host/events/[id].js`, `functions/api/host/bookings/[id].js`.
**Berkas yang berubah:** `admin-events.html`, `admin-home.html`, `admin-daily.html`, `admin-pemain.html`, `host.html`, `events.html`, `functions/_events.js`, `functions/api/admin/events.js`, `functions/api/admin/events/[id].js`, `functions/api/admin/bookings/[id].js`, dan catatan ini.

## Update terbaru (v75): Event day, Game mode dan Chicken Hand, hapus event, homepage lebih ringkas

**Event day** (`/admin-events`, buka Bookings sebuah event, kotak **Event day**, satu tombol per sesi; tanda ✓ berarti sesi itu sudah punya meja):
- Semua yang booking sesi itu tampil, otomatis 4 orang per meja. Pemain terdaftar memakai nickname, guest diberi tanda Guest, yang belum bayar diberi tanda "Not paid yet".
- Urutan: **Group by level**, **Shuffle**, atau **Booking order**. Tiap pemain bisa dipindah meja (T1, T2, ...). Tiap meja punya **Game mode** sendiri (awalnya mengikuti mode sesi).
- **Create session and N tables** membuat satu sesi leaderboard (nama event dan tanggalnya) beserta mejanya: nama sudah di kursi, pemain terdaftar tertaut ke profilnya, tiap meja punya kode, Scorekeeper link, dan Players link. QR untuk dicetak tetap dari Host desk atau Sessions.
- Pemain yang booking belakangan muncul di **Not at a table yet**, tinggal tambah meja. Orang yang sudah duduk tidak dimasukkan dua kali.
- Host event juga bisa memakai Event day. Meja yang dibuat host di sini **tidak dihitung** ke batas 24 meja per hari, dan sesinya muncul di Host desk host itu.

**Game mode dan Chicken Hand:** label "Leaderboard mode" di form event diganti **Game mode**, dengan pilihan baru **Chicken Hand**. Sesi Chicken Hand bisa dibooking seperti biasa tetapi **tidak masuk leaderboard**: Event day hanya menampilkan daftar pemain (dengan Copy player list), tanpa membuat meja. Di halaman event publik baris Scores menjelaskannya.

**Hapus event:** di bawah Edit event (hanya admin) ada **Delete this event**. Hanya bisa kalau tidak ada booking aktif dan tidak ada refund yang belum dikirim, dan harus mengetik judul event untuk konfirmasi. Sesi leaderboard yang sudah dibuat dari Event day tetap ada.

**Homepage:** kartu "Got a table code?" dan "My booking / Find your name" dihapus dari bawah homepage; yang tersisa kartu quiz.

**Database:** kolom baru `event_sessions.day_id`, ditambahkan otomatis. Tidak perlu Console D1.
**Diuji di sini** dengan `wrangler pages dev`: 11 pemain (7 terdaftar, 4 guest) jadi 3 meja dengan mode berbeda (Default dan MCR-4), sesi leaderboard tercipta, booking walk-in dan transfer setelahnya masuk ke meja ke-4, sesi Chicken Hand tanpa meja, layar 390 px tanpa geser ke samping.
**Berkas baru:** `functions/api/admin/events/[id]/day.js`, `functions/api/host/events/[id]/day.js`.
**Berkas yang berubah:** `index.html`, `admin-events.html`, `events.html`, `functions/_events.js`, `functions/_eventsadmin.js`, `functions/_tables.js`, `functions/api/admin/events/[id].js`, dan catatan ini.

## Update terbaru (v76): game mode di setiap pilihan sesi, dan pindah sesi per pemain

**Game mode terlihat di mana-mana:** kalau ada beberapa sesi di jam yang sama, pilihan sesinya sekarang menyebut game mode-nya:
- Admin Bookings: tombol filter sesi ("Fri 27 Nov 19:00 · **MCR-4** · 0/8") dan tombol Event day.
- Form booking peserta: setiap pilihan di "Coming to" punya label mode (Default mode, MCR-4 mode, Chicken Hand). Halaman booking peserta juga menulis mode di setiap sesi yang diikuti.
- Add a booking (admin/host): setiap pilihan sesi menyebut mode-nya.

**Move (pindah sesi atau game mode):** di setiap pemain dalam booking aktif ada tombol **Move** (selama event punya lebih dari satu sesi).
- Pilih sesi tujuan; yang sekarang diberi tanda "Now". Hanya pemain itu yang pindah, sisa booking tetap.
- Sesi penuh: centang "Allow over the seat limit".
- Harga berbeda: booking yang belum bayar langsung ikut total baru (nominal transfer ikut berubah). Yang sudah bayar dan pindah ke sesi lebih murah bisa dicatat refund-nya (maksimal kelebihan bayarnya). Yang pindah ke sesi lebih mahal dapat catatan internal "owes Rp X more" untuk ditagih di venue.
- Setelah pindah, muncul pesan WhatsApp siap kirim.
- Kalau pemain sudah duduk di meja Event day di sesi lamanya, muncul peringatan: meja itu dibetulkan manual di scoreboard.
- Host event juga bisa memakai Move.

**Database:** tidak ada perubahan.
**Diuji di sini** dengan `wrangler pages dev`: pindah ke sesi lain dengan harga sama, pindah ke sesi lebih murah dengan refund, sesi penuh, pesan WhatsApp.
**Berkas yang berubah:** `admin-events.html`, `events.html`, `functions/_eventsadmin.js`, dan catatan ini.
