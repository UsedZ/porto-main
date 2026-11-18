import Link from "next/link";

export const metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="shell flex min-h-screen flex-col items-center justify-center gap-6 py-24 text-center">
      <p className="eyebrow">
        <span className="eyebrow-index">404</span> — Not Found
      </p>
      <h1 className="display text-[clamp(2rem,6vw,3.25rem)] leading-[1.05] text-text">
        Halaman ini tidak ada
      </h1>
      <p className="max-w-md text-[0.9375rem] leading-relaxed text-text-muted">
        Alamatnya mungkin salah ketik atau sudah dipindahkan. Kembali ke halaman
        utama untuk melihat pekerjaan, kemampuan, dan cara menghubungi saya.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[rgb(var(--on-accent))] transition-colors hover:bg-accent-hover"
        >
          Kembali ke beranda
        </Link>
        <Link
          href="/#projects"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-border-strong"
        >
          Lihat proyek
        </Link>
      </div>
    </main>
  );
}
