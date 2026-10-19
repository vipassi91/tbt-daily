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
- Catatan untuk klien lain: teks "@tiles.by.tiles" dan "Play. Learn. Connect." pada kartu share
  (dan footer serta kartu story) masih tertulis langsung di kode, belum jadi pengaturan brand.
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
  `brands/<slug>.json` (kalau kosong, barisnya tidak ditampilkan). Ini hanya untuk template produk, bukan
  untuk yang diunggah.
- Tidak ada perubahan database. File yang diunggah dan berubah dari v18: `index.html`
  (template produk juga: `build.py` dan `brands/tbt.json`).

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
- Nama brand di bilah diambil dari pengaturan brand (`brand_name`), jadi ikut berganti untuk klien lain.
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
  Untuk klien lain: cek kontras warna `muted` dan `red` di `brands/<slug>.json`.

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
  (1200x630, 68 KB). Alamat situs diambil dari `site_url` di `brands/<slug>.json` (sekarang
  `https://tilesbytilesleaderboard.pages.dev`). Kalau pindah ke domain sendiri, ubah `site_url` lalu build ulang.
  Brand tanpa `site_url` tidak mendapat tag pratinjau (deskripsi tetap ada). Gambar pratinjau per brand:
  `brands/<slug>.og.jpg`. WhatsApp menyimpan pratinjau lama; untuk mengujinya tambahkan `?v=2` di ujung alamat.
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
