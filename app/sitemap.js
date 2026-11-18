import { SITE_URL } from "@/lib/site";

/** Hanya halaman publik yang boleh masuk sitemap. */
export default function sitemap() {
  const lastModified = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
