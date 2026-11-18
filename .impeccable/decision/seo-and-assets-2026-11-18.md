# Keputusan aset & SEO — 18 Nov 2026

## Konteks

Porto-main belum punya sitemap, robots, OG image, meta lengkap, 404 kustom, dan aset proyek masih 5,64 MB. Tugas lanjutan: kerjakan yang tidak butuh keputusan desain.

## Yang dilakukan

1. Kompresi aset di `public/images` dengan sharp. JPEG maksimal 1600 px, quality 80, mozjpeg, progressive. PNG palet quality 92. Original disalin ke `backups/images-original-1795007707719/`.
2. Nama file dan path tidak diubah, jadi tidak ada perubahan pada komponen maupun 105 test.
3. `lib/site.js` jadi satu sumber URL publik. Default `https://syahrulramlan.vercel.app`, bisa ditimpa lewat `NEXT_PUBLIC_SITE_URL`.
4. `app/sitemap.js`, `app/robots.js`, `app/manifest.js`, `app/opengraph-image.jsx`, `app/twitter-image.jsx`, `app/not-found.jsx`.
5. Metadata lengkap di `app/layout.js`: metadataBase, title template, canonical, Open Graph, Twitter card, robots, JSON-LD Person.

## Hasil terukur

- Aset: 5,64 MB → 2,38 MB, turun 3,26 MB (58 persen).
- Test: 105 pass, 0 fail.
- Build: sukses, rute `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/opengraph-image`, `/twitter-image`, `/_not-found` ikut terbangun.
- HTTP: home 200, sitemap 200, robots 200, manifest 200, OG 200, halaman tidak ada 404.
- Browser: judul 404 benar, overflow horizontal 0, dua tombol ada, tidak ada gambar rusak.

## Catatan

- `vision_analyze` gagal karena kuota model gratis Tokenharbor habis sampai 24 Nov 19:49 UTC. Pemeriksaan visual terutama lewat DOM dan metrik halaman, bukan penglihatan model.
- JSON-LD memakai `dangerouslySetInnerHTML`, tapi isinya objek statis di file ini, bukan input pengguna.
- Tidak ada commit ke git, sesuai instruksi owner.

## Pertanyaan untuk owner

1. Alamat produksi sebenarnya apa? Package ini memakai placeholder `syahrulramlan.vercel.app` untuk canonical dan sitemap.
2. Apakah aset perlu diubah ke WebP/AVIF dan referensi diperbarui, atau cukup kompresi in-place seperti sekarang?
3. Apakah halaman detail proyek dan CV unduhan mau dibuat? Ini butuh keputusan isi dan bentuk.
4. Apakah robot harus melarang `/admin` saja atau seluruh `/api` juga sudah tepat?
5. Apakah warna kartu OG terang sudah cocok, atau mau versi gelap hijau?
