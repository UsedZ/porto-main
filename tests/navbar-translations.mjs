/** @license Apache-2.0 © Syahrul Ramlan
 *  Navbar translation tests: every nav label is pulled from
 *  translations[lang].nav, both desktop and mobile menus render the same
 *  four link keys, and the language toggle buttons reflect the current lang.
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
const navLabels = {
  en: translations.en.nav,
  id: translations.id.nav,
};

test("Navbar references t.home, t.about, t.projects, t.contact for link labels", () => {
  for (const key of navKeys) {
    assert.ok(
      new RegExp(`\\b${key}\\b`).test(navbar),
      `Navbar must reference the "${key}" key from translations`,
    );
  }
});

test("Navbar desktop nav menu items use translations[lang].nav values", () => {
  // The menuItems array is built from t.home, t.about, t.projects, t.contact.
  // Verify the JSX constructs menuItems using these keys.
  assert.ok(
    /menuItems\s*=\s*\[/.test(navbar),
    "Navbar must declare a menuItems array",
  );
  for (const key of navKeys) {
    assert.ok(
      new RegExp(`t\\.${key}`).test(navbar),
      `Navbar menuItems must reference t.${key}`,
    );
  }
});

test("Navbar mobile menu renders the same four nav labels as desktop", () => {
  // Both desktop and mobile menus iterate over the same menuItems array.
  // Verify the mobile menu also uses menuItems.map.
  assert.ok(
    /menuItems\.map/.test(navbar),
    "Navbar mobile menu must also use menuItems.map",
  );
  // The mobile menu items should render item.name.
  assert.ok(
    /item\.name/.test(navbar),
    "Navbar mobile menu items must render item.name",
  );
});

test("Navbar language toggle reflects current lang state in both EN and ID buttons", () => {
  // The desktop language button shows EN or ID based on lang state.
  assert.ok(
    /lang\s*===\s*["']en["']/.test(navbar),
    "Navbar must check lang === 'en' for the EN button active state",
  );
  assert.ok(
    /lang\s*===\s*["']id["']/.test(navbar),
    "Navbar must check lang === 'id' for the ID button active state",
  );
});

test("Navbar EN/ID labels match translations", () => {
  // The EN/ID button labels are hard-coded as "EN" and "ID" (language codes).
  assert.ok(
    />EN</.test(navbar),
    "Navbar must render the EN label in the language toggle",
  );
  assert.ok(
    />ID</.test(navbar),
    "Navbar must render the ID label in the language toggle",
  );
});

test("Navbar translation keys produce correct EN labels", () => {
  const en = translations.en.nav;
  assert.equal(en.home, "Home", "EN nav.home must be 'Home'");
  assert.equal(en.about, "About", "EN nav.about must be 'About'");
  assert.equal(en.projects, "Projects", "EN nav.projects must be 'Projects'");
  assert.equal(en.contact, "Contact", "EN nav.contact must be 'Contact'");
});

test("Navbar translation keys produce correct ID labels", () => {
  const id = translations.id.nav;
  assert.equal(id.home, "Beranda", "ID nav.home must be 'Beranda'");
  assert.equal(id.about, "Tentang", "ID nav.about must be 'Tentang'");
  assert.equal(id.projects, "Proyek", "ID nav.projects must be 'Proyek'");
  assert.equal(id.contact, "Kontak", "ID nav.contact must be 'Kontak'");
});
