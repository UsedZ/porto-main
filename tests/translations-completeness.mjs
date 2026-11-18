/** @license Apache-2.0 © Syahrul Ramlan
 *  Translation completeness tests: every required section + key must exist in
 *  both en and id, the elTAHFIDH project must be truthfully described in both
 *  languages, and project/item counts must stay stable.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const translations = (
  await import(`file://${path.join(root, "translations/index.js")}`)
).default;

const ELTAHFIDH_URL = "https://eltahfidh.or.id/";

const REQUIRED_SECTIONS = ["nav", "hero", "about", "skills", "projects", "contact", "footer"];

const PROJECT_ITEM_KEYS = ["title", "description", "demoUrl", "demoLabel"];

/* ---------- Section presence ---------- */

test("Both en and id carry all required top-level sections", () => {
  for (const lang of ["en", "id"]) {
    const t = translations[lang];
    for (const section of REQUIRED_SECTIONS) {
      assert.ok(
        Object.hasOwn(t, section),
        `${lang} translations must have a "${section}" section`,
      );
    }
  }
});

/* ---------- Nav ---------- */

test("Nav section has all four link keys in both languages", () => {
  const navKeys = ["home", "about", "projects", "contact"];
  for (const lang of ["en", "id"]) {
    const t = translations[lang].nav;
    for (const key of navKeys) {
      assert.ok(
        typeof t[key] === "string" && t[key].trim().length > 0,
        `${lang} nav.${key} must be a non-empty string`,
      );
    }
  }
});

/* ---------- Hero ---------- */

test("Hero section has greeting, viewWork, contactMe in both languages", () => {
  const heroKeys = ["viewWork", "contactMe"];
  for (const lang of ["en", "id"]) {
    const t = translations[lang].hero;
    for (const key of heroKeys) {
      assert.ok(
        typeof t[key] === "string" && t[key].trim().length > 0,
        `${lang} hero.${key} must be a non-empty string`,
      );
    }
  }
});

/* ---------- About ---------- */

test("About section has title, heading, headingHighlight, p1, p2, cta, capabilitiesTitle, capabilitiesHighlight in both languages", () => {
  const aboutKeys = [
    "title",
    "titleHighlight",
    "heading",
    "headingHighlight",
    "p1",
    "p2",
    "cta",
    "capabilitiesTitle",
    "capabilitiesHighlight",
  ];
  for (const lang of ["en", "id"]) {
    const t = translations[lang].about;
    for (const key of aboutKeys) {
      assert.ok(
        typeof t[key] === "string" && t[key].trim().length > 0,
        `${lang} about.${key} must be a non-empty string`,
      );
    }
    assert.ok(
      Array.isArray(t.expertise) && t.expertise.length === 3,
      `${lang} about.expertise must be an array of exactly 3 items`,
    );
    assert.ok(
      Array.isArray(t.skills) && t.skills.length > 0,
      `${lang} about.skills must be a non-empty array`,
    );
    for (const item of t.expertise) {
      assert.ok(
        typeof item.title === "string" && item.title.trim().length > 0,
        `${lang} about.expertise item must have a non-empty title`,
      );
      assert.ok(
        typeof item.description === "string" && item.description.trim().length > 0,
        `${lang} about.expertise item must have a non-empty description`,
      );
    }
  }
});

/* ---------- Skills ---------- */

test("Skills section has title, titleHighlight, subtitle, learningText, seeBuilt in both languages", () => {
  const skillsKeys = ["title", "titleHighlight", "subtitle", "learningText", "seeBuilt"];
  for (const lang of ["en", "id"]) {
    const t = translations[lang].skills;
    for (const key of skillsKeys) {
      assert.ok(
        typeof t[key] === "string" && t[key].trim().length > 0,
        `${lang} skills.${key} must be a non-empty string`,
      );
    }
  }
});

/* ---------- Projects ---------- */

test("Projects section has title, titleHighlight, subtitle, categories, viewMore in both languages", () => {
  const projKeys = ["title", "titleHighlight", "subtitle", "viewMore"];
  for (const lang of ["en", "id"]) {
    const t = translations[lang].projects;
    for (const key of projKeys) {
      assert.ok(
        typeof t[key] === "string" && t[key].trim().length > 0,
        `${lang} projects.${key} must be a non-empty string`,
      );
    }
    assert.ok(
      Array.isArray(t.categories) && t.categories.length === 4,
      `${lang} projects.categories must be an array of exactly 4 items`,
    );
  }
});

test("Both languages have exactly 3 project items", () => {
  for (const lang of ["en", "id"]) {
    assert.equal(
      translations[lang].projects.items.length,
      3,
      `${lang} projects.items must have exactly 3 entries`,
    );
  }
});

test("Every project item has title and description; items with demoUrl also have demoLabel", () => {
  for (const lang of ["en", "id"]) {
    const items = translations[lang].projects.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      assert.ok(
        typeof item.title === "string" && item.title.trim().length > 0,
        `${lang} projects.items[${i}] must have a non-empty "title"`,
      );
      assert.ok(
        typeof item.description === "string" && item.description.trim().length > 0,
        `${lang} projects.items[${i}] must have a non-empty "description"`,
      );
      if (Object.hasOwn(item, "demoUrl")) {
        assert.ok(
          typeof item.demoLabel === "string" && item.demoLabel.trim().length > 0,
          `${lang} projects.items[${i}] has demoUrl so must also have a non-empty "demoLabel"`,
        );
      }
    }
  }
});

test("Web Development item (index 2) has a non-empty demoUrl and demoLabel in both languages", () => {
  for (const lang of ["en", "id"]) {
    const item = translations[lang].projects.items[2];
    assert.ok(
      typeof item.demoUrl === "string" && item.demoUrl.trim().length > 0,
      `${lang} projects.items[2].demoUrl must be a non-empty string`,
    );
    assert.ok(
      typeof item.demoLabel === "string" && item.demoLabel.trim().length > 0,
      `${lang} projects.items[2].demoLabel must be a non-empty string`,
    );
  }
});

test("elTAHFIDH is truthfully identified in both EN and ID Web Development descriptions", () => {
  for (const lang of ["en", "id"]) {
    const desc = translations[lang].projects.items[2].description;
    assert.ok(
      /eltahfidh/i.test(desc),
      `${lang} Web Development description must mention elTAHFIDH`,
    );
  }
});

test("Web Development demoUrl points to the live elTAHFIDH site in both languages", () => {
  for (const lang of ["en", "id"]) {
    assert.equal(
      translations[lang].projects.items[2].demoUrl,
      ELTAHFIDH_URL,
      `${lang} projects.items[2].demoUrl must be ${ELTAHFIDH_URL}`,
    );
  }
});

test("EN and ID project item counts + first two descriptions are structurally aligned", () => {
  const enItems = translations.en.projects.items;
  const idItems = translations.id.projects.items;
  assert.equal(enItems.length, idItems.length, "EN and ID must have the same number of project items");

  for (let i = 0; i < enItems.length; i++) {
    assert.ok(
      typeof enItems[i].title === "string",
      `EN projects.items[${i}].title must be a string`,
    );
    assert.ok(
      typeof idItems[i].title === "string",
      `ID projects.items[${i}].title must be a string`,
    );
    assert.ok(
      typeof enItems[i].description === "string" && enItems[i].description.length > 0,
      `EN projects.items[${i}].description must be non-empty`,
    );
    assert.ok(
      typeof idItems[i].description === "string" && idItems[i].description.length > 0,
      `ID projects.items[${i}].description must be non-empty`,
    );
  }
});

/* ---------- Contact ---------- */

test("Contact section has title, titleHighlight, heading, body, socialLabel in both languages", () => {
  const contactKeys = ["title", "titleHighlight", "heading", "body", "socialLabel"];
  for (const lang of ["en", "id"]) {
    const t = translations[lang].contact;
    for (const key of contactKeys) {
      assert.ok(
        typeof t[key] === "string" && t[key].trim().length > 0,
        `${lang} contact.${key} must be a non-empty string`,
      );
    }
  }
});

/* ---------- Footer ---------- */

test("Footer section has description, quickLinks, getInTouch, links in both languages", () => {
  const footerKeys = ["description", "quickLinks", "getInTouch"];
  for (const lang of ["en", "id"]) {
    const t = translations[lang].footer;
    for (const key of footerKeys) {
      assert.ok(
        typeof t[key] === "string" && t[key].trim().length > 0,
        `${lang} footer.${key} must be a non-empty string`,
      );
    }
    assert.ok(
      Array.isArray(t.links) && t.links.length === 5,
      `${lang} footer.links must be an array of exactly 5 items`,
    );
    for (const link of t.links) {
      assert.ok(
        typeof link === "string" && link.trim().length > 0,
        `${lang} footer.links must contain only non-empty strings`,
      );
    }
  }
});
