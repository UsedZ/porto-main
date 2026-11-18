"use client";

import { useState, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/translations";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { lang, toggleLang } = useLanguage();
  const t = translations[lang].nav;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const menuItems = [
    { name: t.home, link: "#home" },
    { name: t.about, link: "#about" },
    { name: t.projects, link: "#projects" },
    { name: t.contact, link: "#contact" },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-bg/85 backdrop-blur-md border-b border-border"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="shell">
        <div className="flex h-16 items-center justify-between md:h-[4.5rem]">
          <a
            href="#home"
            className="group inline-flex items-center gap-2.5 text-[0.95rem] font-semibold tracking-tight text-text"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-[0.7rem] font-bold text-on-accent">
              SR
            </span>
            <span className="hidden sm:inline">Syahrul Ramlan</span>
          </a>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {menuItems.map((item) => (
              <a
                key={item.link}
                href={item.link}
                className="text-[0.8125rem] font-medium text-text-muted transition-colors hover:text-text"
              >
                {item.name}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={toggleLang}
              className="flex items-center overflow-hidden rounded-lg border border-border bg-surface text-[0.6875rem] font-bold"
              aria-label="Toggle language"
            >
              <span className={`px-2.5 py-1.5 transition-colors ${lang === "en" ? "bg-accent text-on-accent" : "text-text-muted"}`}>
                EN
              </span>
              <span className={`px-2.5 py-1.5 transition-colors ${lang === "id" ? "bg-accent text-on-accent" : "text-text-muted"}`}>
                ID
              </span>
            </button>
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <FaTimes size={16} /> : <FaBars size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div
        className="overflow-hidden border-border bg-bg md:hidden"
        style={{
          maxHeight: isOpen ? "320px" : "0",
          transition: "max-height 0.28s ease",
          borderTopWidth: isOpen ? "1px" : "0",
        }}
      >
        <div className="shell flex flex-col gap-1 py-3">
          {menuItems.map((item) => (
            <a
              key={item.link}
              href={item.link}
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-text-muted hover:bg-surface hover:text-text"
            >
              {item.name}
            </a>
          ))}
          <div className="mt-1 flex items-center gap-2 px-2">
            <button
              onClick={toggleLang}
              className="flex items-center overflow-hidden rounded-lg border border-border bg-surface text-[0.6875rem] font-bold"
            >
              <span className={`px-2.5 py-1.5 ${lang === "en" ? "bg-accent text-on-accent" : "text-text-muted"}`}>EN</span>
              <span className={`px-2.5 py-1.5 ${lang === "id" ? "bg-accent text-on-accent" : "text-text-muted"}`}>ID</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
