"use client";

import { FiSun, FiMoon } from "react-icons/fi";
import { useLanguage } from "@/context/LanguageContext";

// The `dark` class on <html> is set before first paint by the inline script in
// app/layout.js. Icons swap via dark: variants, so server and client render the
// same markup and there is no hydration mismatch or theme flash.
const ThemeToggle = () => {
  const { lang } = useLanguage();
  const label = lang === "en" ? "Toggle dark / light mode" : "Ganti mode gelap / terang";

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // Storage blocked (e.g. private mode): the choice just won't persist.
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 flex items-center justify-center bg-bg border border-border rounded-lg text-text-muted hover:text-text hover:border-border-strong transition-colors duration-200"
      aria-label={label}
      title={label}
    >
      <FiMoon size={16} className="dark:hidden" />
      <FiSun size={16} className="hidden dark:block" />
    </button>
  );
};

export default ThemeToggle;
