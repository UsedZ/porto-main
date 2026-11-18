/** @license Apache-2.0 © Syahrul Ramlan
 *  Navbar structural tests: mobile menu wiring, scroll effect, language toggle,
 *  and the menu-item → translation-key mapping for both desktop and mobile views.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const navbar = read("components/Navbar.jsx");
const translations = (
  await import(`file://${path.join(root, "translations/index.js")}`)
).default;

const navKeys = Object.keys(translations.en.nav);

test("Navbar imports useState + useEffect and declares mobile-menu + scroll state", () => {
  assert.ok(/import\s*\{\s*useState/.test(navbar), "Navbar must import useState");
  assert.ok(/useEffect/.test(navbar), "Navbar must import useEffect");
  assert.ok(
    /const\s+\[isOpen\s*,\s*setIsOpen\]\s*=\s*useState\(false\)/.test(navbar),
    "Navbar must declare const [isOpen, setIsOpen] = useState(false)",
  );
  assert.ok(
    /const\s+\[scrolled\s*,\s*setScrolled\]\s*=\s*useState\(false\)/.test(navbar),
    "Navbar must declare const [scrolled, setScrolled] = useState(false)",
  );
});

test("Navbar wires a scroll listener that sets scrolled from window.scrollY", () => {
  assert.ok(
    /window\.addEventListener\s*\(\s*["']scroll["']/.test(navbar),
    "Navbar must attach a scroll event listener",
  );
  assert.ok(
    /setScrolled\s*\(\s*window\.scrollY/.test(navbar),
    "Navbar scroll handler must call setScrolled(window.scrollY …)",
  );
});

test("Navbar mobile menu button toggles isOpen and the dropdown reads isOpen", () => {
  const openBtn = navbar.match(
    /onClick\s*=\s*\{\s*\(\)\s*=>\s*setIsOpen\s*\(\s*\(v\)\s*=>\s*!v\s*\)\s*\}/,
  );
  assert.ok(openBtn, "Navbar must have a mobile menu button with onClick={() => setIsOpen((v) => !v)}");

  assert.ok(
    /maxHeight:\s*isOpen\s*\?\s*["']320px["']\s*:\s*["']0["']/.test(navbar),
    "Navbar mobile dropdown must gate its maxHeight on the isOpen state",
  );
});

test("Navbar desktop + mobile language buttons both call toggleLang", () => {
  assert.ok(
    /onClick\s*=\s*\{\s*toggleLang\s*\}/.test(navbar),
    "Navbar must have at least one language toggle button calling toggleLang",
  );
  const toggleCount = (navbar.match(/onClick\s*=\s*\{\s*toggleLang\s*\}/g) || []).length;
  assert.ok(
    toggleCount >= 2,
    `Navbar must wire toggleLang on both desktop and mobile language buttons (found ${toggleCount})`,
  );
});

test("Navbar menu items are derived from translations[lang].nav keys", () => {
  for (const key of navKeys) {
    assert.ok(
      new RegExp(`t\\.${key}`).test(navbar),
      `Navbar must reference t.${key} for the nav link label`,
    );
  }
});

test("Navbar desktop nav iterates over menuItems and renders each item's link + name", () => {
  // Desktop <nav> must map over menuItems and render href={item.link} + {item.name}.
  assert.ok(
    /menuItems\.map/.test(navbar),
    "Navbar desktop nav must use menuItems.map",
  );
  assert.ok(
    /item\.link/.test(navbar),
    "Navbar desktop nav must reference item.link for the href",
  );
  assert.ok(
    /item\.name/.test(navbar),
    "Navbar desktop nav must reference item.name for the label",
  );
});

test("Navbar ThemeToggle is rendered in both desktop and mobile toolbars", () => {
  assert.ok(/<ThemeToggle\s*\/>/.test(navbar), "Navbar must render <ThemeToggle />");
  const ttCount = (navbar.match(/<ThemeToggle\s*\/>/g) || []).length;
  assert.ok(
    ttCount >= 2,
    `Navbar must render ThemeToggle in both desktop and mobile bars (found ${ttCount})`,
  );
});
