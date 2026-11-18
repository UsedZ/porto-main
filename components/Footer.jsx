"use client";

import { FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa";
import { HiArrowUp } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/translations";
import Reveal from "@/components/ui/Reveal";

const Footer = () => {
  const { lang } = useLanguage();
  const t = translations[lang].footer;

  const socials = [
    { icon: FaGithub, url: "https://github.com/syncid", label: "GitHub" },
    { icon: FaLinkedin, url: "https://www.linkedin.com/in/syahrul-ramlan-39a71231b/?locale=en", label: "LinkedIn" },
    { icon: FaInstagram, url: "https://www.instagram.com/syhl.id/", label: "Instagram" },
  ];

  const footerLinks = ["#home", "#about", "#skills", "#projects", "#contact"];

  return (
    <footer className="border-t border-border bg-surface">
      <div className="shell">
        <Reveal stagger={0}>
          <div className="flex flex-col gap-10 py-12 md:flex-row md:justify-between">
            <div className="max-w-sm">
              <p className="text-sm font-semibold text-text">Syahrul Ramlan</p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{t.description}</p>
              <div className="mt-4 flex gap-2">
                {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-muted transition-colors hover:border-border-strong hover:text-text"
                >
                  <social.icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-14 gap-y-8">
            <div>
              <p className="eyebrow">{t.quickLinks}</p>
              <ul className="mt-3 space-y-2">
                {t.links.map((linkName, index) => (
                  <li key={linkName}>
                    <a href={footerLinks[index]} className="text-sm text-text-muted transition-colors hover:text-text">
                      {linkName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow">{t.getInTouch}</p>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                <li>
                  <a href="mailto:sahroel.ramlan@gmail.com" className="transition-colors hover:text-text">
                    sahroel.ramlan@gmail.com
                  </a>
                </li>
                <li>0812-9244-7465</li>
                <li>Jakarta, Indonesia</li>
              </ul>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="hairline" />

        <div className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-text-subtle" suppressHydrationWarning>
            © {new Date().getFullYear()} Syahrul Ramlan. All rights reserved.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text"
            aria-label="Kembali ke atas"
          >
            <HiArrowUp size={13} />
            {lang === "en" ? "Back to top" : "Kembali ke atas"}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
