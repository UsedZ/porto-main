"use client";

/**
 * Fallback statis: poster hasil praterender scene three.js
 * (public/models/hero-poster.png & hero-poster-dark.png).
 * Dipakai saat WebGL mati, reduced-motion, atau watchdog menyerah.
 */
export default function Scene3DFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient mesh tipis: memberi kedalaman kalau poster belum termuat */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/20 via-accent-blue/10 to-transparent" />
      {/* Poster praterender — tema terang */}
      <img
        src="/models/hero-poster.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover dark:hidden"
        loading="eager"
        decoding="async"
      />
      {/* Poster praterender — tema gelap */}
      <img
        src="/models/hero-poster-dark.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 hidden h-full w-full object-cover dark:block"
        loading="eager"
        decoding="async"
      />
      {/* Vignette supaya teks tetap terbaca */}
      <div className="absolute inset-0 vignette" />
    </div>
  );
}
