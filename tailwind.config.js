/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Monochrome tokens: values live in app/globals.css (:root = light,
      // .dark = dark) as RGB channels so opacity modifiers like bg-surface/90 work.
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        "text-muted": "rgb(var(--text-muted) / <alpha-value>)",
        "text-subtle": "rgb(var(--text-subtle) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--accent-hover) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        "on-accent": "rgb(var(--on-accent) / <alpha-value>)",
        // Cinematic tokens
        "bg-cinema": "rgb(var(--bg-cinema) / <alpha-value>)",
        "surface-cinema": "rgb(var(--surface-cinema) / <alpha-value>)",
        "surface-soft": "rgb(var(--surface-soft) / <alpha-value>)",
        "border-cinema": "rgb(var(--border-cinema) / <alpha-value>)",
        "text-cinema": "rgb(var(--text-cinema) / <alpha-value>)",
        "text-muted-cinema": "rgb(var(--text-muted-cinema) / <alpha-value>)",
        "accent-violet": "rgb(var(--accent-violet) / <alpha-value>)",
        "accent-blue": "rgb(var(--accent-blue) / <alpha-value>)",
        "accent-glow": "rgb(var(--accent-glow) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
      },
      fontSize: {
        'display-2xl': ['clamp(3.5rem, 10vw, 8rem)', { lineHeight: '0.92', letterSpacing: '-0.04em', fontWeight: '700' }],
        'display-xl': ['clamp(2.75rem, 7vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.035em', fontWeight: '700' }],
        'display-lg': ['clamp(2rem, 5vw, 3.5rem)', { lineHeight: '1.0', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-md': ['clamp(1.5rem, 3.5vw, 2.5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.65', letterSpacing: '-0.01em' }],
        'body-base': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'caption': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out",
        "fade-up-slow": "fadeUp 1s ease-out",
        "scale-in": "scaleIn 0.5s ease-out",
        "pulse-gentle": "pulseGentle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGentle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [],
};
