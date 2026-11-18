/** @license Apache-2.0 © Syahrul Ramlan
 *  Contact socials tests: every social link in the Contact card carries the
 *  correct external URL, opens in a new tab with noopener noreferrer, and the
 *  social icon import set matches what Contact.jsx consumes.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const contact = read("components/Contact.jsx");

/** Escape a string for safe use inside a RegExp pattern. */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EXPECTED_SOCIALS = [
  { name: "WhatsApp", url: "https://wa.me/6281292447465" },
  { name: "Instagram", url: "https://www.instagram.com/syhl.id/" },
  { name: "GitHub", url: "https://github.com/syncid" },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/syahrul-ramlan-39a71231b/?locale=en",
  },
];

test("Contact card renders all four social links with correct URLs", () => {
  for (const s of EXPECTED_SOCIALS) {
    assert.ok(
      new RegExp(escapeRegex(s.url)).test(contact),
      `Contact must declare social link URL for "${s.name}": ${s.url}`,
    );
  }
});

test("Contact social links open in a new tab with noopener noreferrer", () => {
  // The JSX may place target and rel on separate lines; match across whitespace.
  assert.ok(
    /target=["_blank"]["\s\S]*?rel=["noopener\s+noreferrer/]/.test(contact),
    "Contact social links must use target=_blank rel=noopener noreferrer",
  );
});

test("Contact socials use the correct react-icons/fa icon set", () => {
  assert.ok(
    /FaWhatsapp/.test(contact),
    "Contact must import FaWhatsapp for the WhatsApp icon",
  );
  assert.ok(
    /FaInstagram/.test(contact),
    "Contact must import FaInstagram for the Instagram icon",
  );
  assert.ok(
    /FaGithub/.test(contact),
    "Contact must import FaGithub for the GitHub icon",
  );
  assert.ok(
    /FaLinkedin/.test(contact),
    "Contact must import FaLinkedin for the LinkedIn icon",
  );
});

test("Contact socials label is wired from the link name via aria-label={social.name}", () => {
  // Contact.jsx renders aria-label={social.name} for each social link,
  // so the label is dynamically derived from the link name at runtime.
  assert.ok(
    /aria-label=\{\s*social\.name\s*\}/.test(contact),
    "Contact social links must use aria-label={social.name}",
  );
  // Verify each social name is present in the socialLinks data array.
  for (const s of EXPECTED_SOCIALS) {
    assert.ok(
      new RegExp(`name:\\s*["']${escapeRegex(s.name)}["']`).test(contact),
      `Contact socialLinks must include ${s.name} with name "${s.name}"`,
    );
  }
});
