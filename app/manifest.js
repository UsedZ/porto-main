import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

/** Manifest untuk "Add to Home Screen" di ponsel. */
export default function manifest() {
  return {
    name: `${SITE_NAME} — Portfolio`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#22c55e",
    orientation: "portrait-primary",
    lang: "id",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
    ],
  };
}
