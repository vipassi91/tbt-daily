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
