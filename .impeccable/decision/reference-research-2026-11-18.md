# Riset Referensi Portofolio Sinematik — 18 Nov 2026

Tujuan: mengumpulkan referensi nyata (GitHub, YouTube, Reddit) untuk mengubah portofolio dari "hero dengan objek 3D" menjadi **pengalaman sinematik yang bergerak mengikuti scroll**, plus bahan untuk menambah skill bertema *agentic coding*.

Catatan kejujuran: Reddit memblokir IP ini (HTTP 403 di `reddit.com`, `old.reddit.com`, `api.reddit.com`, dan `r.jina.ai`), jadi untuk Reddit hanya judul + ringkasan hasil pencarian yang bisa dikutip, bukan isi diskusinya.

---

## 1. Diagnosis: kenapa sekarang terasa statis

| Gejala | Sebab teknis (terukur di proyek ini) |
|---|---|
| Scroll tidak mengubah "adegan" | Kamera hanya dolly 1.1 unit + objek mengikuti kartu; tidak ada jalur kamera, tidak ada pinned scene, tidak ada progres cerita |
| Sorotan datar | Satu spotlight statis; tidak ada key/rim yang bergerak mengikuti progres atau mengikuti kursor |
| Tidak ada momentum | Nilai di-lerp `0.16` per frame tanpa `damp` berbasis waktu; tidak ada smooth scroll (Lenis) sehingga scroll terasa "kaku bawaan browser" |
| Tidak ada transisi antar section | Kanvas hanya hero + projects; setelah itu memudar `layerAlpha()` → halaman jadi statis |
| Terasa "website statis + hiasan" | Tidak ada preloader, tidak ada text reveal, tidak ada sticky/pinned sequence, tidak ada transisi halaman |

---

## 2. Teknik inti yang harus dikuasai (dari referensi)

### 2.1 Scroll = playhead (satu progres untuk seluruh cerita)
Sumber: `lalvar.com/blog/building-a-scroll-driven-3d-portfolio`

```js
const p = window.scrollY / maxScroll;          // 0 → 1 sepanjang halaman
const x = baseX * Math.cos(p * Math.PI * 2.5); // jalur serpentine
const y = Math.sin(p * Math.PI * 3) - 2.1 * p * p;
group.position.x = THREE.MathUtils.damp(group.position.x, x, 2.5, delta);
group.position.y = THREE.MathUtils.damp(group.position.y, y, 2.5, delta);
```

Pelajaran penting: pakai `damp(current, target, lambda, delta)` (berbasis waktu) bukan `lerp` per-frame, supaya gerak punya momentum dan tidak berubah kecepatan saat fps turun. Efek samping: saat fps jatuh, animasi tetap konsisten.

### 2.2 Kamera di atas kurva (CatmullRomCurve3)
Sumber: Wawa Sensei — "Recreating Atmos 3D Website" Part 1 (Curved Path), `wass08/r3f-wawatmos-part-1`, `ClassOutside/ThreeJS_Camera_Follow_Path`.

```js
const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4]);
// t = progres scroll (0..1) → posisi + lookAt diambil dari kurva
camera.position.copy(curve.getPointAt(t));
camera.lookAt(curve.getPointAt(Math.min(t + 0.02, 1)));
```

Ini yang membuat kamera "terbang" antar section, bukan cuma zoom. Atmos memakai pesawat + awan + kurva; kita bisa memakai kurva yang sama untuk mengelilingi objek/kartu proyek.

### 2.3 Pinned scene + hindari "dead scroll"
Sumber: `Rohithpranov07/Portfolio-cinematic` (commit "Tighten scroll transitions to remove dead-scroll lag") dan GSAP ScrollTrigger.

- Tinggi section **dihitung dari `scrollDistance`**, bukan angka hardcode.
- Akhiri pin tepat saat animasi selesai (`trim pin tails`) — kalau tidak, muncul 1–2 viewport scroll yang terasa macet.
- `anticipatePin: 1` untuk handoff yang mulus.

### 2.4 Sticky card stack untuk proyek
Sumber: MengTo `cinematic-scroll-storytelling` — kartu proyek menumpuk (sticky), kartu lama mengecil/memudar saat kartu baru masuk. Ini pola yang paling terasa "premium" dan cocok dengan konsep "bahasan fokus per proyek" yang sudah dipilih pemilik.

### 2.5 Teks: split reveal bermasker
Sumber: MengTo `cinematic-gsap-lenis-motion-system`; GSAP SplitText gratis sejak 3.13.

Token rasa yang dipakai:
- ease `power3.out` / `power4.out` / `expo.out`
- scrub `0.8–1.4` (delay sinematik), reveal `0.75–1.1s`
- stagger kata `0.035–0.07s`, baris `0.08–0.14s`, kartu `0.06–0.1s`
- trigger `start: "top 82%"`

### 2.6 Lenis + ScrollTrigger (wiring kanonik)

```js
const lenis = new Lenis({ lerp: 0.08, smoothWheel: true, wheelMultiplier: 0.9, anchors: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```
Wajib: matikan seluruh sistem saat `prefers-reduced-motion`, dan `ScrollTrigger.refresh()` setelah gambar/font termuat.

### 2.7 3D menempel ke layout DOM
Sumber: `14islands/r3f-scroll-rig` — mesh WebGL disinkronkan dengan elemen DOM (posisi + skala), sehingga objek 3D bisa "duduk" di dalam kartu/teks tanpa kehilangan scroll native. Ini alternatif yang lebih rapi daripada menghitung NDC manual seperti yang kita lakukan sekarang.

### 2.8 Keterbacaan adalah fitur
Sumber: lalvar — kanvas diredupkan ke 30% saat masuk section konten, kartu dibuat lebih opak, warna teks muted dinaikkan. Referensi ini eksplisit: "budget as much time for legibility as for the effect".

### 2.9 Performa
- DPR cap 1.75 (kita 1.25–1.5; sudah aman)
- Bloom/post-processing dimatikan di mobile
- Three di-load `dynamic(..., { ssr:false })`, halaman tetap statis dulu
- `brunosimon/folio-2025` mengompres aset: WebP untuk UI, `gltf-transform` + KTX2 untuk model — pelajaran untuk aset kita (GLB 464 KB masih tanpa kompresi KTX)

---

## 3. Repo referensi (semua bisa dibaca)

| Repo | Isi / teknik | Bintang |
|---|---|---|
| `brunosimon/folio-2025` | standar industri, MIT; pipeline aset (WebP, gltf-transform, KTX) | 2.0k |
| `Z4YT0N/awwwards-collection` | **257 klon SOTD** (Ochi, Zentry, Maggi, Thakuma, Refokus, ExoApe, MGS) — bahan bedah tercepat | 30 |
| `14islands/r3f-scroll-rig` | sync mesh WebGL ↔ elemen DOM | ~600 |
| `ClassOutside/ThreeJS_Camera_Follow_Path` | kamera ikut CatmullRomCurve3 saat scroll | 12 |
| `wass08/r3f-wawatmos-part-1` | Atmos clone (kurva + awan + pesawat), tutorial bertahap | — |
| `Madewill/R3F-AWWARDS-website` | replika Atmos | — |
| `Rohithpranov07/Portfolio-cinematic` | camera choreography, pinned scene, perbaikan dead-scroll | 9 |
| `Jewgah/space-portfolio` | scroll-through-space, Next 16 + R3F, CV + JSON-LD | 0 (baru) |
| `Ali-Sanati/awwwards-portfolio` | React + GSAP + Three, tutorial lengkap | 170 |
| `DivyTR/Portfolio` | magnetic button (tarik dari ~90px), terminal HUD | 1 |
| `MengTo/Skills` | dua "skill" motion: GSAP+Lenis system & scroll storytelling (angka token konkret) | — |

Studi kasus blog: `lalvar.com/blog/building-a-scroll-driven-3d-portfolio` (300 baris, jujur soal biaya baca & SSR flash).

---

## 4. YouTube

| Video | Fokus |
|---|---|
| `youtube.com/watch?v=8r8rzp8t2aM` | Reproduce Atmos (R3F) — kurva kamera |
| `youtube.com/watch?v=i0229UsdBwc` | "Awwwards portfolio in 2 hours" — alur kerja |
| `youtube.com/watch?v=Q7AOvWpIVHU` | 3D portfolio pemula (Three.js) |
| `youtube.com/watch?v=tXAUy6OQn0g` | Scroll-driven 3D animation |
| `youtube.com/watch?v=gIPk9j4byQs` | GSAP + scroll scrub untuk produk |
| `youtube.com/watch?v=WpNYfYKLkU` | satu ScrollTrigger menampilkan proyek satu per satu |
| `youtube.com/watch?v=4A0dP8yMwD` | text reveal yang dipakai hampir semua situs award |
| `youtube.com/watch?v=hFLczA59PSU` | WebGL + Barba.js (transisi antar halaman) |
| `youtube.com/watch?v=ATdaYQw0ptk` | kursus Creative Frontend (GSAP/Three/R3F, 10 jam) |

---

## 5. Reddit (hanya judul — isi diblokir 403)

- r/threejs — "Rebuilt my portfolio, scroll-driven, one continuous 3D scene"
- r/threejs — "I built a scroll-driven Ganapati cinematic experience in Three.js"
- r/threejs — "How can camera follow a path"
- r/webdev — "We built a scroll-animated 3D website in Three.js. I'd love your honest …"
- r/webdev — "Trying to build an animated portfolio... kinda stuck choosing the tech stack"
- r/Frontend — "How can I do webs like awwwards?"

Pola yang terlihat dari judul: yang dipuji bukan "3D-nya", tapi **satu scene kontinu** dan **cerita per section**. Yang dikritik biasanya scroll-jacking dan berat.

---

## 6. Bahan skill "agentic coding" untuk portofolio

Bukti pasar: lowongan "AI Application Engineer (LLM / RAG / Multi-Agent Systems)"; daftar `awesome-ai-coding-agents` (Claude Code, Codex, Cursor, Gemini CLI, Aider, OpenHands, Cline); demo kelas portofolio `openclaw-mcp-agentic-lab` ("portfolio-grade multi-agent AI engineering"); MengTo merilis "agent-skills" (skill sebagai unit kemampuan agen).

Usulan pengelompokan (tiap poin harus punya bukti repo/commit/demo):

1. **Agent orchestration** — pola planner/implementer/reviewer, routing model, fallback chain berlapis (persis yang kita bangun di Hermes).
2. **Tool protocol (MCP)** — merancang & mengekspos tool, function calling, structured output.
3. **Retrieval (RAG)** — chunking, embedding, rerank, evaluasi jawaban.
4. **Evals & guardrail** — golden test, review trajectory, budget token/biaya, audit log perubahan agen.
5. **Automation pipeline** — kanban-driven dispatch, cron job, CI agent, worker terisolasi.
6. **Coding agents in practice** — Claude Code / Codex CLI / Cursor / Aider / OpenCode sebagai alat kerja, dengan artefak bukti (handoff doc, change log, PR).

Yang membedakan portofolio "pakai AI" vs "mengerti agentic": **bukti sistem**, bukan daftar tools — mis. "orchestrator 4 profil + fallback 3 lapis + audit log" jauh lebih kuat daripada "familiar with ChatGPT".

---

## 7. Arah yang mungkin (belum diputuskan)

**A. Cinematic continuous scene (paling sesuai keluhan "masih statis")**
Satu kanvas, satu kurva kamera, 4–5 "chapter": Hero → About (kamera menyamping, teks reveal) → Skills (objek 3D berubah wujud/rotasi per klaster) → Projects (sticky card stack + kamera mendekat per kartu) → Contact (kamera mundur, objek mengecil, finale). Teknologi: three + GSAP ScrollTrigger + Lenis. Biaya: sedang–besar, risiko: berat di laptop tanpa GPU.

**B. Hybrid: DOM storytelling + scene 3D ringan**
Teks/kartu tetap DOM (Lenis + reveal + sticky stack), 3D hanya sebagai lapisan atmosfer dengan kurva sederhana. Lebih aman performa, tapi tidak se-"wah" A.

**C. Scroll-scrubbed video (alternatif tanpa WebGL berat)**
Render animasi di Blender lalu scrub frame via scroll (pola Apple). Sangat mulus, tapi aset besar dan tidak interaktif.

---

## 8. Yang belum bisa dijawab riset ini

- Apakah gaya "satu scene kontinu" cocok dengan identitas IT Support/IoT (bukan studio kreatif)? Ini keputusan pemilik.
- fps nyata di mesin pemilik untuk pendekatan A belum diukur — perlu spike 1 section dulu sebelum rombak total.
- Reddit tidak bisa dibaca penuh dari IP ini; kalau perlu, harus lewat akun/Proxy.


---

## 9. Komunitas Discord (tambahan — diminta pemilik)

```
┌────────────────────────────────┬─────────────────────┬───────────────────────────────────────────┐
│ Komunitas                      │ Skala (terlapor)    │ Kegunaan untuk riset ini                   │
├────────────────────────────────┼─────────────────────┼───────────────────────────────────────────┤
│ Three.js (resmi)               │ 18.205 anggota,     │ tanya jawab WebGL/three; invite            │
│ discord.gg/56GBJwAnUS          │ 1.989 online        │ discord.gg/56GBJwAnUS (juga invite @mrdoob)│
│ Bruno Simon — public           │ 14.444 anggota      │ diskusi umum seputar Three.js Journey      │
│ discord.gg/6EHuVam             │                     │                                           │
│ Bruno Simon — private          │ 28.109 anggota      │ dukungan langsung Bruno, channel per lesson│
│ (berbayar/anggota course)      │                     │ (tidak saya ikuti — butuh akses)           │
│ Web Dev & Design               │ ~48.000 anggota     │ feedback portofolio, lowongan, event       │
│ discord.com/invite/web         │                     │                                           │
│ Frontend Indonesia             │ ~3.145 anggota      │ konteks lokal (HTML/CSS/JS/React/Vue/...), │
│ s.feid.dev/discord             │                     │ bisa dipakai untuk uji pembaca Indonesia   │
│ Design Buddies / SuperHi       │ —                   │ portfolio review, talk, resource sharing   │
│ awesome-dev-discord (GitHub)   │ daftar kurasi       │ sumber server resmi lain, termasuk         │
│ ljosberinn/awesome-dev-discord │                     │ komunitas subreddit                       │
│ JavaScript Indonesia           │ —                   │ komunitas JS lokal (disdex                 │
│                                │                     │ server 836471154399117312)                │
└────────────────────────────────┴─────────────────────┴───────────────────────────────────────────┘
```

Catatan: angka anggota berasal dari direktori publik (disdex, threejs-journey.com, Hive Index, GroupFinds) dan bisa berubah. Saya **tidak masuk** server-server ini — hanya mengumpulkan alamat dan reputasinya. Wawa Sensei juga punya Discord untuk tutorial R3F (tautan dari halaman tutorialnya).

## 10. Reddit — usaha akses & batasnya (diperbarui)

Sudah dicoba dengan lima jalur, semuanya ditolak dari mesin ini:

| Jalur | Hasil |
|---|---|
| `reddit.com/...` via curl (UA browser) | 403 |
| `old.reddit.com/.../.json` | 403 Blocked |
| `api.reddit.com/...` | 403 |
| `r.jina.ai/https://www.reddit.com/...` | 403 "blocked by network security" |
| `api.pullpush.io` (arsip Reddit) via curl & browser | 403 Cloudflare |
| `redlib.catsarch.com` | 403 Anubis challenge |

Jadi isi komentar thread tidak bisa saya baca; yang tercatat di bagian 4 tetap hanya judul + ringkasan hasil pencarian. Kalau Bapak mau isi diskusinya, jalur yang perlu disediakan: akun Reddit yang login di browser, atau akses jaringan yang tidak diblokir.

## 11. YouTube — judul terverifikasi via oEmbed

| ID | Judul asli | Kanal |
|---|---|---|
| `8r8rzp8t2aM` | Reproduce Atmos Awwwards 3D Website with React Three Fiber | Wawa Sensei |
| `i0229UsdBwc` | Build Your Dream 3D Dev Awwwards Portfolio in 2 hours | Ali Sanati Dev |
| `Q7AOvWpIVHU` | Build a Mindblowing 3D Portfolio Website — Three.js Beginner's Tutorial | Fireship |
| `tXAUy6OQn0g` | Build a Scroll-Driven 3D Animation with Three.js | Codegiz |
| `gIPk9j4byQs` | This 3D Scroll Animation Makes Your Product Page Feel Alive (GSAP & Three) | Codegrid |
| `hFLczA59PSU` | Creating a simple portfolio website with WebGL and Barba.js | awwwards. |
| `ATdaYQw0ptk` | Creative Frontend Course — GSAP, Three.js & React in 10 Hours | JavaScript Mastery |
| `dcGfNtt7FW0` | AWWWARDS Jelly Spiral Scrolling Experience — Three.js + GSAP | HankTheTank |
| `RdyZnB6ElLs` | Build an Awwwards Winning 3D Website — Next.js, three.js, GSAP | Oxeni |
| `41lfYQhUzRs` | Build and Deploy 3 Animated Websites with GSAP & Three.js to Land a Job | JavaScript Mastery |

Dua ID dari daftar awal (`WpNYfYKLkU`, `4A0dP8yMwD`) **gagal diverifikasi** via oEmbed — kemungkinan video dihapus atau ID salah; jangan dipakai sebagai rujukan sebelum dicek manual.

Pola kanal: Wawa Sensei (R3F mendalam, seri Atmos), Bruno Simon (Three.js Journey), Ali Sanati (portofolio Awwwards), JavaScript Mastery (course panjang), Fireship (pemula cepat), awwwards. (reproduksi situs nyata), HankTheTank/Oxeni/Codegrid (efek scroll spesifik).
