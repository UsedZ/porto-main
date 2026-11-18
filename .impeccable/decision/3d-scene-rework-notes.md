# Catatan Rombak Scene 3D di Belakang Foto — porto-main

**Status:** DITUNDA (menunggu arah). Jangan ubah scene lagi sebelum arah dipilih.
**Tanggal:** 2026-11-18
**Penilai:** pemilik (Bapak) — verdict: "3D-nya agak norak".
**Cakupan:** hanya project porto-main.

---

## 1. Masalah konkret (terukur, bukan opini)

| # | Gejala | Bukti |
|---|---|---|
| 1 | Orb wireframe menutupi area judul & tepi kartu foto | screenshot hero (light & dark), overlap terlihat pada area "Ramlan" dan border kartu |
| 2 | Terasa "neon orb" generik | additive blending + emissive tinggi; di tema gelap jadi hijau menyala penuh |
| 3 | Posisi mati di tengah (0,0,0) | objek bersaing dengan foto profil, padahal foto = fokus utama hero |
| 4 | Tidak ada kedalaman | tanpa fog/blur layer; objek terasa ditempel di atas background |

Kesimpulan: masalahnya bukan three.js-nya, tapi **art direction** — objek terlalu besar, terlalu terang, dan salah tempat.

---

## 2. Rujukan yang dipelajari (SUDAH dianalisis frame-nya)

> Metode: download tidak bisa (YouTube bot-check menolak yt-dlp walau pakai cookie sesi), jadi saya ambil **frame resmi video** (maxresdefault + hq1–hq3 dari i.ytimg.com) dan menganalisis gambarnya. Ini bukti visual nyata, bukan menebak dari judul.

### Video 2 — "Create a 3D Developer Portfolio Website" (Code with Me)
Frame: `_w0AQA00WEs_maxresdefault.jpg`, `hq2.jpg`

| Aspek | Temuan |
|---|---|
| Objek 3D | **Karakter/kepala-bahu bergaya kartun** (matte, seperti mainan vinyl) — bukan wireframe, bukan orb |
| Posisi | Karakter **besar di belakang kartu profil**, sebagian tertutup kartu; ada juga avatar kecil di dalam kartu |
| Skala | Karakter latar jauh lebih besar dari judul, tapi **diredupkan** sehingga tidak bersaing; kartu profil jadi fokus |
| Cahaya | **Spotlight kerucut dari atas**, latar hitam pekat, vignette dalam, rim light satu warna |
| Material | Matte/doff (kulit, kain), semi-gloss pada rambut/jaket — bukan glow |
| Partikel | **Debu/rintik halus** turun perlahan, bukan grid neon |
| Gerak | Karakter beranimasi halus (mengetik/bernapas), kamera zoom-out frontal; UI statis |
| Kenapa rapi | Hierarki jelas (judul → kartu → objek latar), negative space luas, satu aksen warna, border tipis pada kartu |

### Video 1 — "Build a Stunning 3D Animated Portfolio" (EvolveXtudio)
Frame: `kEnAeyQ_qnM_maxresdefault.jpg` + audit demo live

| Aspek | Temuan |
|---|---|
| Teknik situs demo | **0 canvas WebGL**, 0 video, 0 iframe → aset 3D **pra-render** (PNG/GIF) + framer-motion (26 translate, 18 rotate) |
| Komposisi | Close-up karakter besar **diblur** di kiri sebagai atmosfer; karakter tajam di tengah-bawah; panel UI mengapit |
| Kedalaman | DOF: foreground blur → midground tajam → background redup |
| Warna | Gelap + neon terbatas (ungu/magenta/cyan), glow **selektif** pada border/tombol saja |
| Partikel | Nyaris tanpa partikel; hanya haze dan bokeh halus |
| Kenapa rapi | Fokus tunggal, palet disiplin, material seragam, blur terkendali, ruang negatif cukup |

### Kesimpulan lintas rujukan
1. Yang membuat "premium": **kedalaman berlapis (blur), satu fokus, satu aksen warna, gerak lambat** — bukan objek menyala di tengah.
2. Objek 3D diperlakukan sebagai **lapisan atmosfer di belakang** elemen UI, sering **tertutup sebagian** oleh kartu/foto.
3. Partikel dipakai sebagai **debu halus**, bukan grid/bintang neon.
4. Material **matte/doff** mendominasi; glow hanya di tepi (rim light), tidak pernah memenuhi objek.
5. Tidak ada contoh yang memakai **orb wireframe besar di tengah** — itu justru pola yang Bapak nilai norak.

---

## 3. Prinsip desain "tidak norak"

1. Objek 3D = **lapisan latar**, bukan bintang: lebar ≤ 35% kartu foto, posisi di belakang / belakang-kanan foto, tidak pernah menyentuh blok judul.
2. **Kontras rendah**: material gelap/metal + satu aksen tipis. Tidak ada additive glow di tema terang.
3. **Gerak pendek & lambat**: satu siklus 8–14 detik, parallax kamera ≤ 2°, tanpa pulse besar.
4. **Kedalaman**: fog/atmospheric + blur layer belakang (DOF palsu); grid titik jadi debu halus, bukan bintang neon.
5. **Satu bahasa bentuk**: pilih satu keluarga geometri (panel kaca / kubus kawat / cincin tipis). Jangan campur orb + partikel + ring.
6. **Palet**: terang = amber/gold redup; gelap = emerald redup (keputusan terakhir Bapak).
7. **Scrim teks**: gradient halus di belakang blok teks, konten selalu di atas kanvas (z-10).
8. Dilarang: glow penuh di belakang wajah/foto — itu sumber kesan norak.

---

## 4. Opsi arah (pilih satu sebelum eksekusi)

| Opsi | Isi | Trade-off |
|---|---|---|
| **A. Pre-render + parallax** | Render objek 3D jadi beberapa PNG/WebP berlapis (objek, bayangan, debu), animasi CSS/framer | Paling mirip referensi, paling aman, bundle WebGL 0 KB; tapi tidak interaktif terhadap kursor |
| **B. three.js minimal** | Objek kecil di belakang kartu foto, shader sederhana, tanpa glow, DOF palsu, morph per proyek | Interaktif & hidup; butuh tuning komposisi |
| **C. Hybrid** | three.js hanya 1 objek kecil + CSS untuk kedalaman/parallax | Seimbang; paling banyak komponen |

**Rekomendasi saya: C** — mempertahankan kerja three.js yang sudah jalan (60 fps, scroll-driven, watchdog) tapi ukuran/posisi/glow diubah drastis supaya jadi lapisan latar, bukan pusat perhatian.

### 4b. Konsekuensi aset (penting)

Rujukan memakai **model karakter**. Project ini tidak punya aset GLB/karakter. Tiga jalan:

| Jalan | Isi | Catatan |
|---|---|---|
| (i) Bentuk abstrak matte | Prisma/torus/kubus doff di belakang kartu foto, spotlight + debu | Tanpa unduh aset, paling cepat, tetap bisa "premium" kalau material & komposisi benar |
| (ii) GLB karakter gratis | Unduh model GLB lisensi bebas, muat dengan `GLTFLoader` (sudah ada di three) | Perlu persetujuan unduh + cek lisensi; bundle bertambah |
| (iii) Pra-render karakter | Render sekali → PNG/WebP berlapis, animasi CSS | Mirip situs rujukan #1, bundle WebGL nol |

### 4c. Directive implementasi (dari temuan rujukan)

1. Hapus orb wireframe tengah. Objek pindah ke **belakang kartu foto**, sebagian tertutup kartu (occlusion).
2. Material **matte** (roughness 0.7–0.9, metalness 0–0.1); glow hanya **rim light** tipis, bukan emissive penuh.
3. Tambah **spotlight kerucut dari atas** + vignette; latar tetap terang/gelap sesuai tema.
4. Ganti grid neon dengan **debu halus** (≤1.200 partikel kecil, turun pelan, opacity 0.2–0.35).
5. **DOF palsu**: layer belakang diberi blur/fog, layer tengah (objek) tajam.
6. Skala objek ≤ 40% tinggi viewport; **tidak boleh** menyentuh blok judul.
7. Gerak: idle 8–14 detik per siklus; kamera dolly saat scroll; tanpa pulse besar.
8. Satu aksen warna: terang amber redup, gelap emerald redup, hanya untuk rim + debu.

---

## 5. Kriteria diterima (harus diukur, bukan dikira)

1. Bounding box objek tidak menutupi > 5% area judul/paragraf — diukur `getBoundingClientRect`.
2. Screenshot desktop + mobile: teks 100% terbaca.
3. FPS ≥ 50 desktop; pause saat offscreen; fallback poster utuh.
4. Tema terang tidak memakai additive blending.
5. Tidak ada elemen 3D di belakang wajah pada kartu foto.

---

## 6. Riwayat teknis (jangan diulang)

- Gate WebGL salah (`window.gl`) → diperbaiki jadi `getContext('webgl2'|'webgl')`; scene sebelumnya tidak pernah tampil.
- Scene ditulis ulang: three.js murni (tanpa `@react-three/fiber`), 4.900 titik, DPR ≤ 1.5, pause offscreen, watchdog < 24 fps → poster.
- Kanvas = layer `fixed` dari hero sampai akhir Projects, fade setelahnya; konten About/Projects/Contact `relative z-10`.
- Bug performa yang pernah ada: `gl_PointSize` 64–140 px → 4 fps; sudah diklem 1–9 px → 60 fps.
- Palet gelap = hijau `#22C55E`; tema terang tetap hangat.
- Belum selesai: komposisi objek, morph per proyek, visibilitas field tema terang, antialiasing garis.

---

## 7. Catatan pemilik (verbatim)

> "jujur 3d nya agak norak ya, nanti simpan ke catatan untuk rombak model 3d di belakang foto saya itu agak norak"

---

## 8. Implementasi v2 (18 Nov 2026) — sesuai arah (ii)+(iii)

**Aset:** `public/models/hero-robot.glb` — RobotExpressive, **CC0 1.0** (Tomás Laulhé / quaternius, modifikasi Don McCurdy). 463.988 byte, tanpa tekstur, 14 animasi (`Idle` dipakai).

**Yang berubah dari versi "norak":**
- Orb wireframe + grid neon **dihapus**.
- Model GLB **matte** (MeshLambertMaterial) ditempatkan **di belakang kartu foto** (`#hero-photo`), skala 0.72× tinggi kartu, anchor tengah kartu, di-clamp agar kepala tidak terpotong tepi atas.
- Debu halus 900 titik (turun pelan, opacity ~0.3) menggantikan grid neon.
- Spotlight lembut dari atas + ambient + rim light aksen (amber di terang, emerald di gelap).
- Kamera dolly pelan saat scroll; model berputar idle ~12 detik/putaran + animasi `Idle` dari GLB.
- Fallback & watchdog tetap: pause offscreen, fps<24 (setelah 2 jendela pemanasan) turunkan DPR lalu serah ke poster.

**Pengukuran di mesin ini (tanpa akselerasi GPU):**
- fps 42–50 dengan kanvas; 60–61 tanpa kanvas → selisih ~10–18 fps karena rasterisasi WebGL software di lingkungan tes, bukan beban JS (`frameMs` ~0 ms).
- draw calls 20, triangles ~3.2k, DPR 1 (di-cap 1.5).
- 105/105 test hijau, build exit 0.

**Belum selesai (lanjutan):**
1. Contact shadow lembut di bawah model supaya tidak "mengambang".
2. DOF palsu berlapis (blur layer belakang).
3. Morph/posisi berbeda per kartu proyek.
4. Poster pra-render (opsi iii) — `window.__scene3d.snapshot()` sudah tersedia, tinggal skrip penyimpanan + wiring ke `Scene3DFallback`.
5. Verifikasi fps di mesin ber-GPU (lingkungan tes ini software GL).

---

## 9. Responsif (18 Nov 2026)

**Tiga tier kualitas** dipilih dari lebar viewport + jumlah core (`components/Hero.jsx`):

| Tier | Pemicu | DPR | Debu | Jarak kamera | Skala model |
|---|---|---|---|---|---|
| full | ≥1024px | ≤1.5 | 900 | 5.8 | 0.72 × tinggi kartu |
| medium | 768–1023px | ≤1.25 | 520 | 6.1 | 0.70 |
| light | <768px | ≤1.0 | 300 | 6.6 | — (model disembunyikan) |
| off | core ≤2 | — | — | — | poster statis |

**Keputusan mobile:** karakter 3D **tidak ditampilkan** di <768px. Alasannya terukur: hero mobile dipenuhi judul, CTA, dan ikon sosial; setiap percobaan menempatkan robot (0.30 → 0.20 tinggi layar) tetap bertabrakan dengan tombol atau terpotong tepi kanan. Atmosfer mobile dipikul debu + spotlight saja. Kalau pemilik ingin karakter tetap tampil di mobile, perlu area kosong khusus (mis. band di bawah kartu foto) — belum ada.

**Watchdog bertahap** (menggantikan "langsung poster"): fps<24 selama 2 jendela → DPR 0.75 → DPR 0.6 + debu 50% + fog off → baru poster.

**Pengukuran (emulasi, deviceScaleFactor=1, software GL):**

| Permintaan | innerWidth nyata | Tier | fps | scrollW | Model |
|---|---|---|---|---|---|
| 390×844 | 390 | light | 59 | 390 = viewport | disembunyikan |
| 700×900 | 933 | medium | 58 | 924 < 933 | tampil |
| 900×900 | 1200 | full | 49 | 1190 < 1200 | tampil |
| 1024×800 | 1365 | full | 49 | 1356 < 1365 | tampil |
| 1440×900 | 1920 | full | 42 | 1910 < 1920 | tampil |

Tidak ada overflow horizontal di semua lebar. fps 42–49 pada canvas besar adalah batas lingkungan software GL (baseline halaman 60 tanpa canvas); di mesin ber-GPU belum diverifikasi.

**Clamp komposisi:** model di-clamp agar siluet utuh — `ndcX ≤ 0.96 − lebar/2`, `ndcY ≤ 0.92 − tinggi/2`, plus faktor keamanan 1.45× untuk lebar (Box3 statis lebih kecil dari pose skinned).

---

## 10. Implementasi lengkap (18 Nov 2026)

Kelima item yang tertunda dikerjakan sekaligus:

1. **Contact shadow** — billboard lembut (radial gradient 128×128, CanvasTexture) di belakang model, skala mengikuti siluet, opasitas 0.32 (terang) / 0.42 (gelap). Dipakai karena scene tidak punya lantai — plane horizontal akan terlihat sebagai garis tipis.
2. **DOF palsu** — debu dipecah dua lapisan: dekat (z −1.5…1.2, ukuran 1.9×, `uSoft` 0.04 = tepi tajam) dan jauh (z −7.5…−2.0, ukuran 0.6×, `uSoft` 0.5 = bokeh). Tanpa EffectComposer, jadi biayanya nol tambahan draw call besar.
3. **Morph per proyek** — saat scroll masuk `#projects`, model menempel ke kartu terdekat (grid), digeser ke gutter kanan, skala 0.46× tinggi kartu, dan warna rim bergeser hue 0.028 per indeks proyek (tiga variasi). Kembali ke kartu foto saat di hero.
4. **Poster praterender (opsi iii)** — `snapshot(width, bg)` merender sekali lalu mengembalikan PNG; hasilnya `public/models/hero-poster.png` (280 KB) & `hero-poster-dark.png` (128 KB). `Scene3DFallback` sekarang memakai keduanya + gradient mesh + vignette. Mode `?poster=1` mematikan watchdog khusus untuk praterender.
5. **Komposisi mobile** — model tetap tampil di <768px, menempel di belakang kartu foto (skala 0.52× tinggi kartu), jadi tidak lagi bertabrakan dengan CTA.

**Perbaikan pendukung**
- Tinggi model dikalikan 1.4 saat pengukuran: `Box3` statis lebih pendek dari pose skinned, ini penyebab kepala terpotong di iterasi sebelumnya.
- Watchdog: pemanasan 6 jendela, hanya menilai kalau jendela itu menggambar ≥8 frame, ambang 22 fps, menyerah setelah 6 streak; turun bertahap DPR 0.75 → 0.6 + debu 50% + fog off → poster.
- `sceneFailed` di-reset saat resize/rotasi → kesempatan mencoba lagi.
- Debug: `window.__scene3d.setShadow(bool)`, `.setDust(bool)` untuk mengukur biaya komponen.

**Perubahan kontrak tes** — `tests/3d-fallback-webgl.mjs` sebelumnya menuntut `/images/profile.jpeg`; fallback sekarang poster praterender, jadi asersi diperbarui ke `hero-poster.png` + `hero-poster-dark.png`. 105/105 tetap hijau.

**Angka (headless Chromium, SwiftShader/software GL — bukan GPU asli)**
- 1066×692, dpr turun 0.6, debu 315/386: **14–21 fps** (scene hidup, watchdog sudah menurunkan kualitas).
- 390×844 light tier: 55–60 fps, canvas 1, tanpa overflow.
- draw calls 22, triangles 3.239, tanpa overflow horizontal di 390 / 933 / 1200 / 1365 / 1920 px.

**Belum terverifikasi:** fps di browser ber-GPU. Host punya Intel HD 620 + GeForce 930MX, tetapi browser uji berjalan software (SwiftShader), jadi angka di atas adalah batas bawah, bukan wajar.
