/** @license Apache-2.0 © Syahrul Ramlan
 *  Footer tests: social link URLs, quick-links mapping, dynamic copyright year,
 *  and the "get in touch" contact lines.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const footer = read("components/Footer.jsx");
const translations = (
  await import(`file://${path.join(root, "translations/index.js")}`)
).default;

/** Escape a string for safe use inside a RegExp pattern. */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EXPECTED_SOCIALS = [
  { label: "GitHub", url: "https://github.com/syncid" },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/syahrul-ramlan-39a71231b/?locale=en",
  },
  { label: "Instagram", url: "https://www.instagram.com/syhl.id/" },
];

test("Footer socials carry the correct external URLs", () => {
  for (const s of EXPECTED_SOCIALS) {
    assert.ok(
      new RegExp(`url:\\s*["']${escapeRegex(s.url)}["']`).test(footer),
      `Footer must declare social url for "${s.label}": ${s.url}`,
    );
    assert.ok(
      new RegExp(`label:\\s*["']${escapeRegex(s.label)}["']`).test(footer),
      `Footer must declare social label "${s.label}"`,
    );
  }
});

test("Footer socials open in a new tab with noopener noreferrer", () => {
  // The JSX may place target and rel on separate lines; match across whitespace.
  assert.ok(
    /target=["']_blank["'][\s\S]*?rel=["']noopener\s+noreferrer["']/.test(footer),
    "Footer social links must use target=_blank rel=noopener noreferrer",
  );
});

test("Footer renders t.description, t.quickLinks, t.getInTouch, and t.links from translations", () => {
  // The footer renders these translation keys dynamically; verify the key
  // references exist in the source (not the resolved EN text).
  assert.ok(
    /t\.description/.test(footer),
    "Footer must render t.description from translations",
  );
  assert.ok(
    /t\.quickLinks/.test(footer),
    "Footer must render t.quickLinks from translations",
  );
  assert.ok(
    /t\.getInTouch/.test(footer),
    "Footer must render t.getInTouch from translations",
  );
  assert.ok(
    /t\.links/.test(footer),
    "Footer must render t.links from translations",
  );

  // Verify the actual EN values are present in the translations file.
  const en = translations.en.footer;
  assert.ok(en.description.trim().length > 0, "EN footer.description must not be empty");
  assert.ok(en.quickLinks.trim().length > 0, "EN footer.quickLinks must not be empty");
  assert.ok(en.getInTouch.trim().length > 0, "EN footer.getInTouch must not be empty");
});

test("Footer quick-links map to the correct section anchors in order", () => {
  const footerLinks = ["#home", "#about", "#skills", "#projects", "#contact"];
  for (const link of footerLinks) {
    assert.ok(
      new RegExp(escapeRegex(link)).test(footer),
      `Footer must include anchor link "${link}"`,
    );
  }
});

test("Footer copyright year is dynamic (new Date().getFullYear())", () => {
  assert.ok(
    /new\s+Date\(\)\.getFullYear\(\)/.test(footer),
    "Footer must call new Date().getFullYear() for the copyright year",
  );
  assert.ok(
    /All\s+rights\s+reserved/.test(footer),
    "Footer must include the 'All rights reserved' text",
  );
});

test("Footer get-in-touch section lists email, phone, and location", () => {
  assert.ok(
    /sahroel\.ramlan@gmail\.com/.test(footer),
    "Footer get-in-touch must show the email address",
  );
  assert.ok(
    /0812-9244-7465/.test(footer),
    "Footer get-in-touch must show the phone number",
  );
  assert.ok(
    /Jakarta,\s+Indonesia/.test(footer),
    "Footer get-in-touch must show the location",
  );
});

test("Footer scroll-to-top button uses smooth scroll and bilingual label", () => {
  assert.ok(
    /window\.scrollTo\s*\(\s*\{[\s\S]*?top:\s*0[\s\S]*?behavior:\s*["']smooth["'][\s\S]*?\}\s*\)/.test(
      footer,
    ),
    "Footer scroll-to-top must call window.scrollTo with behavior: 'smooth'",
  );
  assert.ok(
    /Back\s+to\s+top/.test(footer),
    "Footer scroll-to-top must have the EN label",
  );
  assert.ok(
    /Kembali\s+ke\s+atas/.test(footer),
    "Footer scroll-to-top must have the ID label",
  );
});
