# Spesifikasi Cinematic Film Rework — usedz-porto

**Status:** READ-ONLY spesifikasi untuk worker implementasi  
**Tanggal:** 15 November 2026  
**Owner approval:** B-full cinematic 3D, target ~430 KB tambahan payload  
**Commit/push/deploy:** Tetap butuh approval terpisah  

---

## 1. Design Tokens — Cinematic Film

Semua token ditambahkan ke `tailwind.config.js` `theme.extend` (Tailwind v3.4, bukan `@theme` v4) dan ke `app/globals.css` sebagai CSS variable berpasangan. Palet ini menggantikan token lama saat mode `dark` aktif; mode `light` tetap menggunakan token existing.

### 1.1 Palet warna (dark cinematic)

```css
/* app/globals.css — ditambahkan di dalam .dark {} */
.dark {
  /* Base — hitam pekat dengan redup biru */
  --bg: 10 10 12;
  --bg-elevated: 16 16 20;

  /* Surface — lebih terang dari base, untuk kartu/container */
  --surface: 22 22 28;
  --surface-soft: 28 28 34;

  /* Border — samar, tidak keras */
  --border: 45 45 55;
  --border-strong: 70 70 80;

  /* Text — putih hangat, bukan putih murni */
  --text: 245 245 242;
  --text-muted: 180 180 178;
  --text-subtle: 140 140 140;

  /* Accent — ungu-biru cinematic */
  --accent: 130 100 255;       /* violet */
  --accent-secondary: 60 120 255;  /* blue */
  --accent-glow: 130 100 255;  /* untuk blur/glow efek */

  /* Gradient mesh warna */
  --mesh-violet: 130 100 255;
  --mesh-blue: 40 80 200;
  --mesh-deep: 15 15 30;

  /* On-accent (teks di atas accent) */
  --on-accent: 10 10 12;
}
```

### 1.2 Token Tailwind v3 (tailwind.config.js)

```js
// Di dalam theme.extend.colors — tambahkan:
colors: {
  // Existing tokens tetap ada; tambahkan cinematic:
  'bg-cinema': 'rgb(var(--bg) / <alpha-value>)',
  'surface-cinema': 'rgb(var(--surface) / <alpha-value>)',
  'surface-soft': 'rgb(var(--surface-soft) / <alpha-value>)',
  'border-cinema': 'rgb(var(--border) / <alpha-value>)',
  'text-cinema': 'rgb(var(--text) / <alpha-value>)',
  'text-muted-cinema': 'rgb(var(--text-muted) / <alpha-value>)',
  'accent-violet': 'rgb(var(--accent) / <alpha-value>)',
  'accent-blue': 'rgb(var(--accent-secondary) / <alpha-value>)',
  'accent-glow': 'rgb(var(--accent-glow) / <alpha-value>)',
  'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
}
```

### 1.3 Skala tipografi

```js
// tailwind.config.js — theme.extend.fontSize
fontSize: {
  // Display serif besar (gunakan font Sora yang sudah ada, atau tambah serif)
  'display-2xl': ['clamp(3.5rem, 10vw, 8rem)', { lineHeight: '0.92', letterSpacing: '-0.04em', fontWeight: '700' }],
  'display-xl':  ['clamp(2.75rem, 7vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.035em', fontWeight: '700' }],
  'display-lg':  ['clamp(2rem, 5vw, 3.5rem)', { lineHeight: '1.0', letterSpacing: '-0.03em', fontWeight: '700' }],
  'display-md':  ['clamp(1.5rem, 3.5vw, 2.5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' }],

  // Sans body
  'body-lg': ['1rem', { lineHeight: '1.65', letterSpacing: '-0.01em' }],
  'body-base': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
  'caption': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
}
```

**Font family:** Tambahkan di `theme.extend.fontFamily`:
```js
fontFamily: {
  serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
  // Sora tetap ada sebagai display
}
```

Di `app/layout.js`, tambahkan `Playfair Display` dari `next/font/google`:
```js
const playfair = PlayfairDisplay({ subsets: ['latin'], variable: '--font-playfair', display: 'swap', weight: ['400', '500', '600', '700'] });
// Tambahkan playfair.variable ke className di <html>
```

### 1.4 Spacing scale

Gunakan Tailwind default spacing; tambahkan custom jika perlu:
```js
spacing: {
  '18': '4.5rem',
  '22': '5.5rem',
  '26': '6.5rem',
  '30': '7.5rem',
}
```

### 1.5 Vignette & noise

```css
/* app/globals.css — class .vignette */
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: radial-gradient(
    ellipse 80% 60% at 50% 40%,
    transparent 40%,
    rgba(0, 0, 0, 0.55) 100%
  );
}

/* Noise overlay — opsional, aktif hanya di dark mode */
.dark .noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}
```

### 1.6 Aturan kontras teks (fallback)

Semua teks di atas `bg-cinema` atau `surface-cinema` harus menggunakan `text-cinema` atau `text-muted-cinema`. Hindari `text-white` murni. Untuk teks di atas accent violet, gunakan `on-accent`.

---

## 2. Motion Language

### 2.1 Durasi & easing dasar

| Efek | Durasi | Easing |
|------|--------|--------|
| Fade-in elemen masuk | 400–600ms | `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out quad) |
| Hover transform (btn, card) | 180–250ms | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Scroll reveal (stagger) | 500–800ms per elemen | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Transisi section (carousel) | 300ms | `ease-out` |
| Parallax scroll | 800–1200ms (linked to scroll) | linear dengan damping |
| Typewriter / role rotate | existing (dipertahankan) | — |

### 2.2 Stagger per section

Setiap section yang muncul saat scroll mendapat stagger index:
- **Hero:** 0–6 (copy muncul bertahap, profile image terakhir)
- **About:** 0–4 (heading, paragraf, kartu expertise)
- **Skills:** 0–3 (heading, grid icon, learning text)
- **Projects:** 0–2 (heading, filter, grid kartu — kartu grid stagger 0.08s antar item)
- **Contact:** 0–2 (heading, body, kontak list)

Implementasi: setiap elemen dapat `data-stagger` index; motion hook membaca index dan menghitung delay.

### 2.3 Scroll reveal

Gunakan `framer-motion` `useInView` atau IntersectionObserver manual. Elemen yang pernah terlihat sekali tidak animasi ulang (set `hasRevealed` state).

**Aturan:** Hanya elemen `.reveal` yang mendapat scroll animation. Elemen di dalam Hero (sudah `rise` class) TIDAK mendapat scroll reveal tambahan.

### 2.4 Hover hierarchy

| Level | Elemen | Efek |
|-------|--------|-------|
| 1 | Tombol primary/ghost | `translateY(-1px)` + shadow naik |
| 2 | Card project | `translateY(-3px)` + border naik + shadow |
| 3 | Icon skill | `scale-110` + color shift |
| 4 | Nav link | `text-text` dari `text-text-muted` |
| 5 | Social icon | `border-text` dari `border-border` |

### 2.5 Transisi antar-section

Saat scroll melewati batas section, Tambahkan subtle gradient line di section edge yang bergerak searah scroll (pelacakan scroll position). Optional: section transition glow di border-bottom section yang sedang di-scroll-into-view.

### 2.6 Batas maksimum elemen bergerak bersamaan

- Maks 8 elemen animasi simultaneous (staggered reveal).
- Elemen yang sudah selesai animasinya tidak dihitung.
- Jika melebihi, queue sisanya dengan delay tambahan 100ms.

### 2.7 `prefers-reduced-motion`

Sudah ada blok di `globals.css` baris 208–216. Pastikan:
- 3D scene TIDAK render jika `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- Parallax TIDAK aktif
- Semua `framer-motion` animation diganti static mount (opacity 1, transform none)

Worker implementasi harus menambahkan check di `useEffect` atau context:
```js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

## 3. 3D Hero Scene

### 3.1 Komponen 3D

**Path:** `components/hero/Scene3D.jsx` (baru)

**Teknologi:** `three.js` langsung (bukan `@react-three/fiber` penuh jika tidak perlu, tapi fiber + drei disetujui terbatas — lihat 3.4).

**Objek scene:**
- Latar belakang: gradient mesh ungu-biru (bisa CSS atau three.js gradient)
- Objek utama: bentuk geometris abstrak (sphere/io shape/torus knot) yang berputar pelan
- Partikel: 50–100 partikel kecil mengambang (opsional, hanya jika budget memungkinkan)
- Lighting: 2–3 point light + ambient

**Kamera:**
- Default position: `(0, 0, 6)`
- Mouse parallax: kamera mengikuti pointer dengan damping 0.05
- Batas movement: `±0.5` di x dan y

**Interaksi pointer:**
- `onPointerMove` → update camera target
- `onPointerLeave` → kembalikan ke center dengan animasi pelan

### 3.2 Konfigurasi R3F

```jsx
// components/hero/Scene3D.jsx
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef } from 'react';

export default function Scene3D() {
  return (
    <Canvas
      dpr={[1, 1.5]}           // cap DPR di 1.5 untuk performa
      frameloop="demand"       // hanya render saat ada perubahan
      camera={{ position: [0, 0, 6], fov: 45 }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>
    </Canvas>
  );
}
```

### 3.3 Pause saat offscreen/hidden tab

```js
useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        canvasRef.current?.setState({ playing: true });
      } else {
        canvasRef.current?.setState({ playing: false });
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);

// Tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // pause rAF / render loop
  } else {
    // resume
  }
});
```

### 3.4 Dynamic import + SSR:false

Di `components/Hero.jsx`, ganti/ tambah:

```jsx
const Scene3D = dynamic(() => import('@/components/hero/Scene3D'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-bg-cinema" />,
});
```

**Chunk terpisah:** `Scene3D.jsx` dan dependensinya (three, fiber) akan di-bundle sebagai chunk terpisah dan hanya dimuat setelah hydration.

### 3.5 Larangan `@react-three/drei`

`@react-three/drei` adalah 484.6 KB gzip — terlalu besar. Diijinkan SATU helper kecil dari drei jika benar-benar needed dan disetujui di spec ini:

| Helper | Ukuran gzip | Disetujui? |
|--------|-------------|------------|
| `useCursor` | ~2 KB | ✅ Ya |
| `Stars` | ~3 KB | ✅ Ya |
| `Sparkles` | ~4 KB | ✅ Ya |
| `OrbitControls` | ~8 KB | ❌ Tidak (tidak needed untuk hero) |
| `Text` (troika) | ~12 KB | ❌ Tidak |
| `Scroll` / `ScrollControls` | ~15 KB | ❌ Tidak |
| `useSpring` / `useMatrixRotation` | ~1 KB | ✅ Ya |

**Rekomendasi:** Gunakan `useCursor` dari drei untuk cursor perubahan saat hover scene, dan implementasi `Stars`/`Sparkles` manual dengan three.js biasa jika dibutuhkan (lebih kecil dari paket drei).

**Jika tidak ada helper kecil yang disetujui:** Scene3D murni pakai `three` + `three/addons/` individual yang kecil.

### 3.6 Fallback non-WebGL

Komponen `Scene3DFallback.jsx` (baru):

```jsx
// components/hero/Scene3DFallback.jsx
export default function Scene3DFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient mesh statis */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/20 via-accent-blue/10 to-transparent" />
      {/* Poster statis — profile.jpeg dengan filter cinematic */}
      <div className="absolute inset-0 bg-[url('/images/profile.jpeg')] bg-cover bg-center filter-[contrast_1.1_brightness_0.8] opacity-60" />
      {/* Vignette overlay */}
      <div className="absolute inset-0 vignette" />
    </div>
  );
}
```

**Kapan fallback aktif:**
1. `!window.WebGLRenderingContext` atau `!HTMLCanvasElement.prototype.getContext('webgl2')`
2. `prefers-reduced-motion: reduce`
3. Mobile low-end: `navigator.hardwareConcurrency <= 4` AND `screen.width < 768`
4. Error boundary catch saat Scene3D gagal mount

**Di Hero.jsx:**
```jsx
const hasWebGL = useMemo(() => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}, []);

const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
const isLowEndMobile = navigator.hardwareConcurrency <= 4 && screen.width < 768;

const show3D = hasWebGL && !reduceMotion && !isLowEndMobile;
```

---

## 4. Dependency Plan + Budget

### 4.1 Paket yang ditambah

| Paket | Versi | Gzip | Kegunaan | Lazy? |
|-------|-------|------|----------|-------|
| `three` | ^0.164.0 | ~177.7 KB | Engine 3D utama | Ya (hanya di Scene3D chunk) |
| `@react-three/fiber` | ^8.15.0 | ~49.7 KB | React binding untuk three | Ya (hanya di Scene3D chunk) |
| `framer-motion` | ^12 (sudah ada) | ~46.6 KB | Scroll reveal, layout animation | Tidak (diused di banyak section) |
| `lenis` | ^1.1.0 | ~5.0 KB | Smooth scroll (opsional) | Tidak (global) |

**Total tambahan:** ~232.4 KB gzip (three + fiber + lenis)

**Catatan:** `framer-motion` sudah terpasang (^12.23.24) tapi tidak dipakai. Dengan dipakai, kontribusi ke first-load sudah termasuk di baseline 199.4 KB. Jika hanya dipakai di beberapa komponen, consider code-split.

### 4.2 Target first-load final

- Baseline saat ini: **199.4 KB gzip** (JS), 6.1 KB CSS, 19.5 KB HTML
- Tambahan Cinematic: ~232.4 KB (three+fiber+lenis) + est. 15 KB (komponen baru, token CSS)
- **Target total: ≤480 KB gzip**

**Ukur, jangan kira-kira:** Lihat bagian 7.

### 4.3 Chunk lazy strategy

| Chunk | Konten | Kapan dimuat |
|-------|--------|--------------|
| `main` (initial) | layout, navbar, hero copy, profile image, static fallback | First load |
| `Scene3D.*` | three.js, fiber, Scene3D component, helper | Setelah hydration, sebelum hero mount (dynamic import) |
| `motion.*` | framer-motion (jika di-code-split) | First load (sudah di baseline) |
| `section-*.js` | About, Skills, Projects, Contact, Footer (sudah di dynamic) | Scroll-triggered (sudah ada) |

---

## 5. File Ownership Map

### 5.1 File yang disentuh (modified)

| File | Perubahan |
|------|-----------|
| `app/globals.css` | Tambah token cinematic, vignette, noise class |
| `tailwind.config.js` | Tambah color tokens, fontSize, fontFamily serif |
| `app/layout.js` | Tambah Playfair Display font, pass variable ke html |
| `components/Hero.jsx` | Tambah dynamic Scene3D, fallback logic, motion reveal |
| `components/Navbar.jsx` | Minor: hover state cinematic, scroll behavior |
| `components/Projects.jsx` | Minor: card hover cinematic, transisi image lebih halus |
| `components/Skills.jsx` | Minor: icon hover scale lebih tegas |
| `components/About.jsx` | Minor: card reveal scroll animation |
| `components/Contact.jsx` | Minor: scroll reveal |
| `components/Footer.jsx` | Minor: scroll reveal |

### 5.2 File baru (created)

| File | Isi |
|------|-----|
| `components/hero/Scene3D.jsx` | Canvas three.js scene |
| `components/hero/Scene3DFallback.jsx` | Gradient mesh + poster statis |
| `components/hero/useReducedMotion.js` | Hook `prefers-reduced-motion` |
| `components/ui/Reveal.jsx` | Wrapper framer-motion scroll reveal |
| `styles/cinematic.css` | (opsional) additional cinematic utility classes |

### 5.3 File yang dihapus (deleted)

**Tidak ada.** Semua file existing dipertahankan; perubahan adalah additive.

### 5.4 Satu writer

Worker yang ditugaskan implementasi ini adalah **satu orang** (assignee). Tidak ada parallel edit.

---

## 6. Test Strategy

### 6.1 Invariant wajib dipertahankan (tidak boleh longgar)

| # | Invariant | Basis | Aksi |
|---|-----------|-------|------|
| 1 | Portrait tampil utuh (tidak crop/stretch) di desktop & mobile 390px | `tests/mobile-hero-contact.mjs` | **Pertahankan** assertion `aspect-[758/1340]` dan `object-contain` |
| 2 | `eltahfidh.png` tetap slide pertama kategori Web Development + link live asli | `tests/image-framing-eltahfidh.mjs` | **Pertahankan** semua assertion yang menyentuh `projectImages`, `fitFor`, `translations`, dan link |
| 3 | Tidak ada `tel:` bertopeng apa pun | `tests/mobile-hero-contact.mjs` | **Pertahankan** assertion masked tel check |
| 4 | Tidak ada overflow horizontal di 390px | `tests/mobile-hero-contact.mjs` | **Pertahankan** `min-w-0` dan `flex-wrap` check |
| 5 | Paritas copy EN/ID untuk semua section | `tests/image-framing-eltahfidh.mjs` | **Pertahankan** translation parity check |
| 6 | `prefers-reduced-motion` tidak memicu animasi 3D/parallax | **Test baru** (lihat 6.3) | Tambah assertion behavior |
| 7 | Build, lint (0 error), dan test runner exit 0 | CI | **Pertahankan** sebagai gate |

### 6.2 Assertion yang diubah (diperbarui untuk markup baru)

| Test file | Assertion lama | Perubahan |
|-----------|----------------|-----------|
| `image-framing-eltahfidh.mjs` | `/aspect-\\[758\\/1340\\]/.test(hero)` | **Tetap**, tapi tambah bahwa aspect ratio bisa berada di dalam component 3D wrapper — cek bahwa profile image tetap ada di DOM dengan aspect ratio benar |
| `image-framing-eltahfidh.mjs` | `/w-64\\s+h-64/.test(hero)` dan `/md:w-80\\s+md:h-80/.test(hero)` | **Tetap** — square frame masih dilarang |
| `image-framing-eltahfidh.mjs` | `/object-contain/.test(hero)` | **Tetap** |
| `mobile-hero-contact.mjs` | `/min-w-0/.test(hero)` | **Tetap** |
| `mobile-hero-contact.mjs` | `/flex-wrap/.test(hero)` | **Tetap** |

**Catatan:** Test-file-based assertion (`regex` pada source code) boleh diperbarui jika markup berubah, tapi invariant behavior-nya tetap sama. Contoh: jika `aspect-[758/1340]` dipindah ke wrapper div, regex harus disesuaikan tapi assertion "portrait tidak crop" tetap.

### 6.3 Test behavior baru (wajib)

| Test | Tujuan | Implementasi |
|------|--------|--------------|
| `tests/reduced-motion-3d.mjs` | Verifikasi Scene3D tidak mount saat `prefers-reduced-motion: reduce` | Test behavior: render halaman dengan mock `matchMedia`, assert Scene3D tidak di-render (atau fallback yang di-render) |
| `tests/3d-fallback-webgl.mjs` | Verifikasi fallback aktif saat WebGL tidak ada | Test behavior: mock `window.WebGLRenderingContext` undefined, assert fallback component muncul |
| `tests/cinematic-tokens.mjs` | Verifikasi token cinematic ada di tailwind config dan globals.css | Test file: regex cek keberadaan `--bg: 10 10 12` di `.dark`, `bg-cinema` di tailwind config |
| `tests/no-drei-large.mjs` | Verifikasi `@react-three/drei` tidak di-install (kecuali helper kecil yang disetujui) | Test file: cek `package.json` tidak ada `drei` di dependencies |

### 6.4 Per assertion: file-based vs behavior

| Assertion | Jenis |
|-----------|-------|
| `aspect-[758/1340]` ada di Hero | File-based (regex source) |
| `object-contain` dipakai untuk profile | File-based (regex source) |
| Tidak ada square frame `w-64 h-64` | File-based (regex source) |
| `min-w-0` ada di Hero | File-based (regex source) |
| `flex-wrap` ada di Hero | File-based (regex source) |
| Tidak ada masked `tel:` | File-based (regex source) |
| `filterIndex` dan `setFilterIndex` ada | File-based (regex source) |
| `projectImages` array ada dengan struktur benar | File-based + behavior (vm execution) |
| `fitFor` resolver berfungsi benar | Behavior (vm execution + assert return value) |
| `eltahfidh.png` ada, ukuran benar, bukan duplikat | Behavior (fs stat + bytes check) |
| EN/ID translation parity | Behavior (import translations, assert keys) |
| Link demo elTAHFIDH benar | Behavior (assert URL) |
| `prefers-reduced-motion` → no 3D | **Behavior** (render test dengan mock) |
| WebGL fallback aktif | **Behavior** (render test dengan mock) |
| Build exit 0 | Behavior (subprocess) |
| Lint 0 error | Behavior (subprocess) |
| Test runner exit 0 | Behavior (subprocess) |

### 6.5 Aturan: jangan longgar

- Tidak boleh menghapus assertion yang melindungi invariant portrait, elTAHFIDH, atau paritas EN/ID.
- Jika markup berubah, update regex/test secara proporsional — jangan hapus.
- Test behavior baru boleh ditambah; test lama yang sudah tidak relevan boleh dimodifikasi tapi bukan dihapus tanpa replacement.

---

## 7. Acceptance Commands

### 7.1 Build & lint

```bash
cd /home/sync-id/Documents/BackUP_Migrasi/porto-local/porto-main

# Build production
npm run build
# Harus exit 0

# Lint
npm run lint
# Harus 0 error (warning boleh)
```

### 7.2 Test runner

```bash
node --test tests/*.mjs
# Harus exit 0, semua test pass
```

### 7.3 Ukur payload first-load

```bash
# 1. Build dulu
npm run build

# 2. Start production server di port 3000
npm run start &
sleep 3

# 3. Ukur HTML
curl -s http://localhost:3000 | wc -c
# Target: ~19.5 KB (HTML tidak berubah banyak)

# 4. Daftar semua JS chunk
curl -s http://localhost:3000 | grep -o '_next/static/js/[^"]*\.js' | sort -u
# Atau langsung listing folder:
ls -la .next/static/js/

# 5. Ukur setiap chunk gzip
for f in .next/static/js/*.js; do
  echo "$f: $(gzip -c "$f" | wc -c) bytes gzip"
done

# 6. Total JS gzip
gzip -c .next/static/js/*.js | wc -c
# Target: ≤480 KB

# 7. CSS
gzip -c .next/static/css/*.css | wc -c
# Target: ~6.1 KB (tidak bertambah banyak)

# 8. Matikan server
kill %1
```

### 7.4 Verifikasi 3D scene

```bash
# Buka di browser (manual):
open http://localhost:3000

# Cek di DevTools:
# - Network tab: cek Scene3D chunk dimuat setelah hydration
# - Console: tidak ada WebGL error
# - Performance: LCP tidak degradation signifikan
```

### 7.5 Verifikasi reduced-motion

```bash
# Di browser, buka DevTools → Rendering → emulate prefers-reduced-motion
# atau tambah class .reduce di body
# Cek: 3D scene tidak muncul, fallback muncul, tidak ada animasi
```

---

## 8. Risiko & Rollback

### 8.1 Risiko LCP/CLS

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Scene3D chunk besar, memakan waktu load | LCP naik | Dynamic import dengan `ssr:false`; fallback langsung tampil; Scene3D dimuat async setelah hero statis terlihat |
| Tiga.js initial render blocking | CLS jika elemen berubah ukuran | Scene3D container punya fixed aspect ratio atau min-height; fallback punya same dimensions |
| Font Playfair Display belum loaded | FOIT/FOUT | `display: swap` sudah diatur di next/font; fallback Georgia |
| Partikel/animasi terlalu berat | Scroll jank | `frameloop="demand"`, `dpr={[1, 1.5]}`, batasi partikel ≤100 |

### 8.2 Cara mematikan 3D tanpa membongkar layout

**Flag environment:** Tambah di `.env.local`:

```env
NEXT_PUBLIC_CINEMATIC_ENABLED=false
```

Di `components/Hero.jsx`:

```jsx
const cinematicEnabled = process.env.NEXT_PUBLIC_CINEMATIC_ENABLED !== 'false';

if (!cinematicEnabled) {
  return <HeroStatic />; // versi tanpa Scene3D, tetap pakai token cinematic
}
```

**Cara lain:** Di `Scene3D.jsx`, wrap dengan conditional render:

```jsx
if (!hasWebGL || reduceMotion || isLowEndMobile) {
  return <Scene3DFallback />;
}
```

### 8.3 Kondisi berhenti (stop conditions)

Worker harus berhenti dan report ke owner jika:

1. **Total JS gzip > 500 KB** setelah semua perubahan (melebihi budget 480 KB target)
2. **LCP > 2.5s** di Lighthouse (baseline saat ini belum diukur, tapi jika naik signifikan)
3. **CLS > 0.1** (animasi menyebabkan layout shift)
4. **`prefers-reduced-motion` test gagal** (animasi masih berjalan)
5. **Build atau lint error** yang tidak bisa di-resolve dalam 1 sesi
6. **`@react-three/drei` terpaksa dipakai** dan ukuran melebihi budget

### 8.4 Rollback plan

Jika implementasi gagal atau melebihi budget:

1. **Hapus Scene3D chunk:** Hapus `components/hero/Scene3D.jsx`, `components/hero/Scene3DFallback.jsx`, dan dynamic import di `Hero.jsx`
2. **Hapus three.js & fiber:** `npm uninstall three @react-three/fiber` (jika diinstall)
3. **Hapus token cinematic:** Kembalikan `tailwind.config.js` dan `globals.css` ke baseline (atau hapus section cinematic)
4. **Test:** `npm run build && node --test tests/*.mjs` — harus tetap pass

---

## 9. Keputusan Kunci (untuk handoff)

1. **Palet Cinematic Film** — hitam pekat (`#0a0a0c`), accent violet (`#8264ff`) + blue (`#3c78ff`), vignette radial, noise overlay 3.5% di dark mode. Semua sebagai CSS variable + Tailwind v3 token.
2. **Motion language** — durasi 400–800ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`, stagger per section (0–6 index), max 8 elemen bergerak bersamaan, `prefers-reduced-motion` dihormati (sudah ada di globals.css).
3. **3D hero** — three.js + @react-three/fiber (bukan drei kecuali helper kecil ≤8KB), `dpr={[1,1.5]}`, `frameloop="demand"`, pause offscreen/hidden tab, dynamic import ssr:false, fallback non-WebGL (gradient mesh + poster) untuk perangkat tanpa WebGL/reduced-motion/low-end mobile.
4. **Budget** — three (177.7) + fiber (49.7) + lenis (5.0) + framer-motion existing (46.6) = ~279 KB tambahan; target final ≤480 KB gzip; ukur dengan curl+gzip, bukan estimasi.
5. **Test invariant** — portrait `aspect-[758/1340]` + `object-contain` wajib tetap, `eltahfidh.png` tetap slide 1 Web Development + link live, tidak ada `tel:` bertopeng, tidak ada overflow 390px, paritas EN/ID, `prefers-reduced-motion` tidak trigger 3D, build+lint+test exit 0. Test lama dipertahankan; test behavior baru ditambah untuk 3D fallback dan reduced-motion.

---

*Dokumen ini READ-ONLY. Worker implementasi mengeksekusi berdasarkan spesifikasi ini. Owner approval untuk commit/push/deploy terpisah.*
