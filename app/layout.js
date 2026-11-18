import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_DESCRIPTION } from "@/lib/site";

// Playfair Display for cinematic display type scale (spec §1.3).
// Rendered via <link> in <head> (next/font/google cannot resolve its barrel on
// this Next.js 16.0.10 build — the stub index.js is empty), so the font CSS is
// fetched from Google Fonts and the variable is defined in globals.css.
const FONT_PLAYFAIR_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700&display=swap";

// Runs before first paint so a saved choice applies without a flash.
// Light is the default; only an explicit "dark" choice turns it on.
const themeScript = `(function(){try{if(localStorage.getItem("theme")==="dark"){}}catch(e){}})()`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Syahrul Ramlan — IT Support, IoT & Web Development",
    template: "%s — Syahrul Ramlan",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "portfolio",
    "IT support",
    "IoT",
    "web developer",
    "Syahrul Ramlan",
    "Jakarta",
  ],
  authors: [{ name: "Syahrul Ramlan" }],
  creator: "Syahrul Ramlan",
  applicationName: "Syahrul Ramlan Portfolio",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: "Syahrul Ramlan",
    title: "Syahrul Ramlan — IT Support, IoT & Web Development",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Syahrul Ramlan — IT Support, IoT & Web Development",
    description: SITE_DESCRIPTION,
  },
};

/** Data terstruktur agar mesin pencari mengenali profil ini sebagai Person. */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Syahrul Ramlan",
  jobTitle: "IT Support Specialist",
  description: SITE_DESCRIPTION,
  address: { "@type": "PostalAddress", addressLocality: "Jakarta", addressCountry: "ID" },
  knowsAbout: ["IT Support", "IoT", "Web Development", "Networking"],
  url: SITE_URL,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="font-sans antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_PLAYFAIR_URL} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        {/* JSON statis dari konstanta di file ini — tidak ada input pengguna, jadi aman. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <LanguageProvider>{children}</LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
