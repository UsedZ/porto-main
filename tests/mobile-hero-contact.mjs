/**
 * Focused tests: mobile hero framing safety and contact-card overflow hygiene.
 * Guards the regressions previously observed at 390x844 (square frame that
 * letterboxes the portrait source, masked tel: link, horizontal clipping).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const hero = read("components/Hero.jsx");
const contact = read("components/Contact.jsx");

test("Hero profile frame keeps the source portrait aspect on every breakpoint", () => {
  assert.ok(
    /aspect-\[758\/1340\]/.test(hero),
    "Hero must size the profile frame by the real 758x1340 source aspect",
  );
  assert.ok(
    !/w-64\s+h-64/.test(hero) && !/md:w-80\s+md:h-80/.test(hero),
    "Hero must not fall back to a square frame that letterboxes the portrait",
  );
  assert.ok(
    /object-contain/.test(hero),
    "Hero must render the profile photo uncropped (object-contain)",
  );
});

test("Hero text column cannot overflow horizontally at 390px", () => {
  assert.ok(
    /min-w-0/.test(hero),
    "Hero must apply min-w-0 so long text cannot force horizontal overflow",
  );
  assert.ok(
    /flex-wrap/.test(hero),
    "Hero CTA row must wrap instead of overflowing on narrow viewports",
  );
});

test("Contact card drops the invalid masked tel: link", () => {
  const telLinks = contact.match(/tel:[^"']*/g) || [];
  for (const link of telLinks) {
    assert.ok(
      !link.includes("*"),
      `contact link must not contain a masked phone number: ${link}`,
    );
    assert.ok(
      /^tel:\+?\d+$/.test(link),
      `contact tel link must be a dialable number: ${link}`,
    );
  }
  // The phone row is informational only; it must render as a non-link card.
  assert.ok(
    /info\.link\s*\?/.test(contact),
    "Contact must conditionally render the anchor so link-less rows (phone) are not broken anchors",
  );
  const phoneEntry = (contact.match(/\{[^{}]*FiPhone[^{}]*\}/) || [""])[0];
  assert.ok(
    !/\blink:/.test(phoneEntry),
    "the phone contact entry must not define a link (the masked tel: value must be gone)",
  );
  assert.ok(
    !/tel:\+628\*+7465/.test(contact),
    "the masked tel:+628****7465 link must be removed",
  );
});

test("Contact card text cannot overflow horizontally at 390px", () => {
  assert.ok(
    /min-w-0/.test(contact),
    "Contact must apply min-w-0 on the card text column",
  );
  assert.ok(
    /break-words|break-all/.test(contact),
    "Contact must wrap long values (e.g. the email address)",
  );
  assert.ok(
    !/whitespace-nowrap/.test(contact),
    "Contact must not use whitespace-nowrap on card content",
  );
});
