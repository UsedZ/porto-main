/**
 * Satu sumber kebenaran untuk alamat publik situs.
 * Ubah lewat env NEXT_PUBLIC_SITE_URL saat deploy (mis. domain sendiri).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://syahrulramlan.vercel.app";

export const SITE_NAME = "Syahrul Ramlan";

export const SITE_DESCRIPTION =
  "Portfolio Syahrul Ramlan: IT Support Specialist dengan pengalaman praktis IoT dan Web Development. Berbasis di Jakarta, terbuka untuk peluang kerja.";
