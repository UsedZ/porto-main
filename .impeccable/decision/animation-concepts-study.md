# Konsep Animasi Web — Studi Mendalam

Sumber primer yang dipelajari (bukan ringkasan orang lain):
- `anthropics/skills` → `skills/frontend-design` (196k★, repo resmi Agent Skills)
- `MengTo/Skills` (7,7k★, MIT) → `animation-systems`, `build-awwwards-quality-sites`, `build-threejs-scroll-worlds`, `scroll-world-storytelling`, `cinematic-gsap-lenis-motion-system`, `cinematic-scroll-storytelling`, `editorial-portfolio-chapters`, `scroll-progress-timeline`, `progressive-blur`, `animation-on-scroll`
- MDN: CSS scroll-driven animations (`animation-timeline`, `scroll()`, `view()`), View Transition API
- web.dev: high-performance CSS animations (compositor-only properties, layer promotion, will-change)
- motion.dev: `animate()` (mini vs hybrid), transform axes, SVG path animation
- Referensi kode: `brunosimon/folio-2025`, `Z4YT0N/awwwards-collection` (257 klon SOTD), `14islands/r3f-scroll-rig`, `wass08/r3f-wawatmos-part-1`, `Rohithpranov07/Portfolio-cinematic`, `lalvar.com` (studi kasus)

---

## 1. Prinsip dasar: animasi ada untuk menjelaskan, bukan menghias

Lima fungsi motion (dari `animation-systems`):
1. menjelaskan hierarki (apa yang penting),
2. mengonfirmasi aksi (feedback),
3. menuntun perhatian (mata dibawa ke mana),
4. menjaga kontinuitas spasial (objek yang sama berpindah tempat, bukan muncul-hilang),
5. menambah kesan craftsmanship.

**Kalau sebuah animasi tidak memenuhi salah satunya, hapus.** Ini yang membedakan Stripe/Linear/Apple dari situs "banyak efek".

Prinsip kedua (dari `frontend-design`): **"spend your boldness in one place"** — satu momen besar (hero/intro), sisanya tenang dan disiplin. Selain itu, motion otomatis (tanpa aksi user) harus sedikit; yang menjawab aksi user (klik, buka, konfirmasi) justru dianjurkan karena menunjukkan apa yang berubah.

Prinsip ketiga: **keterbacaan menang atas efek**. Studi kasus lalvar: kanvas diredupkan ke 30% saat masuk section teks.

---

## 2. Token motion (angka, bukan selera)

Dari `animation-systems` + `cinematic-gsap-lenis-motion-system`:

| Kebutuhan | Durasi | Easing |
|---|---|---|
| Micro (hover/press) | 120–200 ms | ease-out |
| Perubahan state UI (toggle/select) | 180–260 ms | ease-out |
| Popover/toast | 220–320 ms | ease-out |
| Entrance section | 400–800 ms | `power3.out` |
| Hero sequence | 800–1600 ms (ber-beat) | `expo.out` |
| Control feedback (editorial) | 160–220 ms | `cubic-bezier(.22,.61,.36,1)` |
| Entrance panel editorial | 500–760 ms | sama |
| Scroll scrub | `scrub: 0.8–1.4` | — |

Stagger: **40–90 ms** per elemen (kata 35–70 ms, baris 80–140 ms), lebih kecil di mobile.
Offset standar masuk: 8/16/24 px (bukan 40–60 px yang terlihat "template").
Trigger reveal: `start: "top 82%"`; pin handoff `anticipatePin: 1`.

Easing yang dipakai: `power3.out`, `power4.out`, `expo.out`. **Hindari** bounce/elastic kecuali brand memang playful.

---

## 3. Taksonomi teknik (12 pola yang wajib dikenal)

| # | Teknik | Kapan dipakai | Biaya | Risiko |
|---|---|---|---|---|
| 1 | **Fade + rise** (opacity + translateY 12–24px) | entrance default teks/kartu | sangat murah | membosankan kalau dipakai di semua section |
| 2 | **Masked text reveal** (line/word mask, overflow hidden) | headline, hero copy | murah | aksesibilitas (teks terpecah) harus dijaga: simpan nama utuh untuk screen reader |
| 3 | **Sticky card stack** | daftar proyek berurutan | sedang | kartu menutupi footer / scroll terjebak |
| 4 | **Scroll-scrubbed timeline** (progres = posisi scroll) | cerita per bab | sedang | "dead scroll" bila pin terlalu panjang |
| 5 | **Pinned chapter** (section dipin, konten berganti di dalamnya) | 1–3 momen besar saja | mahal | tinggi section harus dihitung dari `scrollDistance` |
| 6 | **Parallax berlapis** (<5% geseran) | kedalaman latar | murah | parallax besar = mual + rusak di mobile |
| 7 | **Horizontal scroll** | galeri/deret proyek | sedang | keyboard & touch harus tetap bisa |
| 8 | **Progress timeline** (garis mengisi, step aktif) | proses/timeline | murah | jangan umumkan tiap scroll ke screen reader |
| 9 | **Progressive blur** (6–8 lapis backdrop-filter ber-mask) | tepi viewport, nav | **mahal di GPU** | di software rendering bikin fps jatuh (lihat §7) |
| 10 | **Magnetic button / cursor** | CTA utama, link besar | murah | wajib dimatikan di touch |
| 11 | **Camera journey di satu dunia 3D** | hero→section dengan objek yang sama | mahal | butuh conductor + kurva + fallback |
| 12 | **Scroll-scrubbed video** (frame demi frame) | realisme sinematik | mahal (aset) | encoding harus GOP kecil; poster wajib |

Teknik 1, 2, 8 aman dipakai banyak tempat. Teknik 4, 5, 11 maksimal 1–3 kali per halaman — kalau semua section dipin, halaman jadi menyiksa.

---

## 4. Arsitektur "satu dunia + satu conductor"

Dari `build-threejs-scroll-worlds` (yang paling relevan untuk kasus kita):

**Tesis:** satu renderer, satu scene, satu dunia yang bertahan; scroll hanyalah konduktor yang menentukan state.

```text
WebGL canvas
  worldRoot
    environment      (langit, lantai, siluet jauh)
    architecture     (landmark tetap)
    chapterSets      (props per bab)
    interactives     (raycast target)
    atmosphere       (fog, partikel)
  DOM di atas canvas
    semantic chapters (heading, copy, link)
    fixed interface   (progress, nav)
```

Dua nilai progres yang **harus dipisah**:

```js
rig.target = progressFromScroll(scrollY);          // eksak, deterministik
rig.smooth = reduceMotion ? rig.target
                          : damp(rig.smooth, rig.target, 5.2, dt); // sinematik
```

- `target` untuk navigasi, URL, aksesibilitas, gating interaksi.
- `smooth` untuk kamera dan interpolasi visual.
- Posisi scroll yang sama **harus** menghasilkan state yang sama saat maju, mundur, lompat cepat, maupun setelah reload.

**Scene ledger** (4–8 bab) disimpan sebagai data, bukan angka tersebar di CSS/loop:

```js
const chapters = [{
  id: "hero", scrollWeight: 1.2,
  copy: { eyebrow, title, body },
  camera: { position: [0,3.8,13.5], target: [0,2.4,-8], fov: 38,
            mobile: { position: [0,4.8,18], fov: 46 } },
  world: { key: 1.0, fog: 0.018, particles: 0.25 },
  focus: ["laptop"], interactions: ["inspect"]
}];
```

Aturan penting: **bab yang hanya berbeda teks bukan bab** — harus ada perubahan komposisi/ruang.

---

## 5. Kamera = sinematografi, bukan dolly berulang

- Simpan `position`, `target`, `fov`, opsional roll/lens shift, plus override mobile.
- Gunakan **Catmull-Rom** untuk perjalanan kontinu; interpolasi segmen untuk belokan yang disengaja.
- Periksa kurva: tembus dinding, kaki masuk tanah, target berbalik, lonjakan kecepatan.
- Parameterkan dengan **progres bab**, bukan panjang busur kurva.
- `scrollWeight` memberi *dwell* pada bab penting — jangan mengubah jalur kamera hanya untuk memperlambat.
- Enam dolly-in ke titik yang sama **bukan** enam adegan. Gerak kamera harus memperlihatkan hubungan ruang baru: mendekat, menyingkap, melewati, berubah skala, memeriksa, kehorison, pergi.

---

## 6. Aksesibilitas (kebijakan tegas)

- `prefers-reduced-motion: reduce` → **render state akhir**, bukan "animasi dipercepat". Matikan smooth-scroll, scrub, pin, parallax.
- Teks yang dipecah: simpan nama utuh untuk pembaca layar; jangan pecah link/markup inline.
- Konten harus tetap lengkap tanpa JS.
- Jangan mengumumkan setiap update scroll (`aria-live` hanya untuk perubahan bermakna).
- Tombol/CTA fokus terlihat; jangan jadikan titik dekoratif sebagai satu-satunya kontrol.

---

## 7. Performa: di mana biayanya sebenarnya

Dari web.dev + pengalaman mengukur di proyek ini:

1. **Hanya `transform` dan `opacity`** yang boleh dianimasikan terus-menerus (composite stage). `width/height/top/left` memicu layout; `filter`/`backdrop-filter` memicu paint mahal.
2. **Jangan mengukur layout setiap frame.** Di proyek ini `placeModel()` memanggil `getElementById` + `getBoundingClientRect()` + `querySelectorAll` tiap frame → forced reflow. Ini sumber "kaku" yang tidak terlihat di `frameMs` (karena reflow terjadi di luar pengukuran render).
3. **`backdrop-filter` bertumpuk** (progressive blur 6–8 lapis, nav blur, kartu blur) di atas kanvas transparan = biaya komposit besar; di software rendering langsung jatuh ke belasan fps.
4. DPR canvas dibatasi 1–2; Bloom/post-processing dimatikan di mobile; perbaikan: halaman statis dulu, three di-load lazy.
5. `will-change` hanya pada elemen yang benar-benar beranimasi, dan dilepas setelahnya.

Diagnosa yang benar urutannya: (a) apakah ada layout read per frame? (b) apakah ada properti non-compositor yang dianimasikan? (c) apakah kompositornya yang berat (blur/alpha canvas)? (d) baru bicara GPU/three.

---

## 8. Audit porto-main terhadap standar di atas

| Aspek | Standar | Kondisi sekarang | Dampak |
|---|---|---|---|
| Conductor (progres eksak vs smooth) | dipisah, deterministik | hanya `progress` lerp 0.06 | gerak tidak deterministik, mundur terasa beda |
| Layout read per frame | nol | ada (rect, querySelectorAll, getBoundingClientRect) | tersendat, tidak terlihat di frameMs |
| Bab/chapter | 4–8 bab dengan endpoint kamera | 2 mode (hero/projects) | tidak ada cerita |
| Kamera | kurva Catmull-Rom | dolly linear + geser NDC | terasa statis |
| Pinned/sticky | maksimal 1–3 | tidak ada | tidak ada momen "berhenti dan lihat" |
| Text reveal | masked, stagger 35–70 ms | tidak ada | halaman terasa datar |
| Smooth scroll | satu engine (Lenis) | tidak ada | scroll bawaan browser, tanpa momentum |
| Motion token | terdokumentasi | tidak ada | durasi/easing acak per tempat |
| Reduced motion | state akhir | satu frame statis | sudah benar arahnya |
| Performa komposit | minim blur di atas kanvas | blur nav + kartu + kanvas alpha | fps 10–24 terukur |

---

## 9. Storyboard usulan untuk portofolio (5 bab, satu dunia)

| Bab | Peran cerita | Kamera (desktop) | Elemen DOM |
|---|---|---|---|
| 0 Preloader | menyiapkan dunia | kamera jauh, objek gelap, 0.8–1.2 s | counter 0–100, garis progres |
| 1 Hero | janji + identitas | kamera dekat 3/4, objek utama (meja kerja/setup IT) | nama, peran, CTA |
| 2 About | siapa & dari mana | kamera menyamping, melewati objek, fov turun | paragraf reveal per baris |
| 3 Skills | bukti kemampuan | kamera naik, objek berubah material/warna per klaster | klaster skill masuk bergantian |
| 4 Projects | bukti kerja | kamera mendekat per kartu, sticky stack | kartu proyek + meta |
| 5 Contact | penutup | kamera mundur, objek mengecil, fokus ke horizon | CTA tunggal |

`scrollWeight`: hero 1.2, about 1.0, skills 1.0, projects 1.8 (paling lama), contact 0.9.

---

## 10. Tiga mode produksi (pilih satu, jangan campur)

| Mode | Kekuatan | Biaya | Cocok untuk |
|---|---|---|---|
| Video scrub | realisme fotografis, hasil paling "film" | aset besar (encode GOP kecil), tidak interaktif | bila ingin paling sinematik |
| Three.js world | kedalaman nyata, kamera responsif | kerja WebGL + fallback | bila ingin objek bisa "diperiksa" |
| HTML/data/type | aksesibel, ringan, tajam | kurang spektakel | bila isi lebih penting dari efek |

Aturan dari skill: jangan menyamarkan video sebagai Three.js, dan jangan mencampur tiga mode dalam satu halaman tanpa alasan.

---

## 11. Yang masih perlu dipelajari / diputuskan

- Apakah portofolio ini butuh "dunia" (mode 2) atau cukup editorial + type (mode 3) dengan satu momen 3D.
- Aset dunia: model apa yang mewakili "IT support + IoT + web" tanpa jadi robot generik.
- Batas performa nyata di laptop pemilik (Intel HD 620): perlu spike 1 bab, ukur, baru lanjut.
- Apakah GSAP + Lenis boleh masuk dependensi (keduanya gratis; GSAP 3.13 termasuk SplitText).