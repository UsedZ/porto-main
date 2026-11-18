"use client";

/**
 * Latar hero: gradient halus + vignette.
 * Nama file dipertahankan untuk kompatibilitas import, tetapi tidak ada
 * kanvas, WebGL, model 3D, atau poster pra-render lagi.
 * Keputusan owner: objek 3D di pojok tidak membantu dan mengganggu.
 */
export default function Scene3DFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/20 via-accent-blue/10 to-transparent" />
      <div className="absolute inset-0 vignette" />
    </div>
  );
}
