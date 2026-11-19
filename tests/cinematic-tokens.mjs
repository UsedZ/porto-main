/**
 * Cinematic token tests.
 *
 * Spec §6.3: verify the cinematic design tokens are registered in
 *   - tailwind.config.js  (Tailwind v3 color tokens, serif font, display type scale)
 *   - app/globals.css     (CSS variables inside .dark)
 * These assertions are file-based (regex over source) per spec §6.4.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

test("tailwind.config.js registers cinematic color tokens", () => {
  const cfg = read("tailwind.config.js");
  assert.ok(
    /bg-cinema/.test(cfg),
    "tailwind config must define the 'bg-cinema' color token",
  );
  assert.ok(
    /accent-violet/.test(cfg),
    "tailwind config must define the 'accent-violet' color token",
  );
  assert.ok(
    /accent-blue/.test(cfg),
    "tailwind config must define the 'accent-blue' color token",
  );
  assert.ok(
    /accent-glow/.test(cfg),
    "tailwind config must define the 'accent-glow' color token",
  );
  assert.ok(
    /on-accent/.test(cfg),
    "tailwind config must define the 'on-accent' color token",
  );
  assert.ok(
    /serif/.test(cfg),
    "tailwind config must define a 'serif' fontFamily stack (Playfair Display)",
  );
  assert.ok(
    /display-2xl/.test(cfg),
    "tailwind config must define the 'display-2xl' font size token",
  );
});

test("app/globals.css defines cinematic CSS variables inside .dark", () => {
  const css = read("app/globals.css");
  assert.ok(
    /--bg:\s*10\s+10\s+12/.test(css),
    "dark mode must set --bg: 10 10 12 (deep black)",
  );
  assert.ok(
    /--bg-cinema/.test(css),
    "dark mode must define --bg-cinema",
  );
  assert.ok(
    /--surface-cinema/.test(css),
    "dark mode must define --surface-cinema",
  );
  assert.ok(
    /--text-cinema/.test(css),
    "dark mode must define --text-cinema",
  );
  assert.ok(
    /--accent-violet/.test(css),
    "dark mode must define --accent-violet",
  );
  assert.ok(
    /--accent-blue/.test(css),
    "dark mode must define --accent-blue",
  );
  assert.ok(
    /--on-accent/.test(css),
    "dark mode must define --on-accent",
  );
  assert.ok(!/\.vignette/.test(css), "globals.css tidak boleh mendefinisikan vignette gelap");
  assert.ok(
    /\.dark \.noise-overlay/.test(css) || /\.noise-overlay/.test(css),
    "globals.css must define the .noise-overlay class",
  );
  assert.ok(!/rgba\(20,\s*20,\s*17/.test(css), "tidak boleh ada bayangan gelap berbasis rgba(20,20,17)");
});
