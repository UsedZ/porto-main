/** @license Apache-2.0 © Syahrul Ramlan
 *  About + Skills content tests: bilingual copy truth, expertise card count,
 *  capabilities skills list, and the full tech-stack rendering (names + icons).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

/** Escape a string for safe use inside a RegExp pattern. */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const about = read("components/About.jsx");
const skills = read("components/Skills.jsx");
const translations = (
  await import(`file://${path.join(root, "translations/index.js")}`)
).default;

/* ---------- About.jsx ---------- */

test("About heading renders t.heading + t.headingHighlight + hard-coded bilingual suffix", () => {
  // The heading is built dynamically; verify the source references the right keys.
  assert.ok(
    /\{t\.heading\}/.test(about),
    "About must render {t.heading}",
  );
  assert.ok(
    /\{t\.headingHighlight\}/.test(about),
    "About must render {t.headingHighlight}",
  );

  // Hard-coded bilingual suffix: EN + ID.
  assert.ok(
    /with\s+a\s+builder's\s+habit\./.test(about),
    "About EN must append the hard-coded builder suffix",
  );
  assert.ok(
    /dengan\s+kebiasaan\s+seorang\s+pembangun\./.test(about),
    "About ID must append the hard-coded builder suffix",
  );
});

test("About renders exactly 3 expertise cards from t.expertise", () => {
  for (const lang of ["en", "id"]) {
    const items = translations[lang].about.expertise;
    assert.equal(items.length, 3, `${lang} about.expertise must have exactly 3 items`);

    // The JSX iterates t.expertise.map; verify the map call exists.
    assert.ok(
      /t\.expertise\.map/.test(about),
      "About must iterate t.expertise.map for expertise cards",
    );
    assert.ok(
      /\{item\.title\}/.test(about),
      "About expertise card must render {item.title}",
    );
    assert.ok(
      /\{item\.description\}/.test(about),
      "About expertise card must render {item.description}",
    );
    assert.ok(
      /String\(index\s*\+\s*1\)\.padStart\(2,\s*["']0["']\)/.test(about),
      "About expertise cards must use 0-padded index numbering",
    );
  }
});

test("About capabilities section renders t.skills as list items", () => {
  for (const lang of ["en", "id"]) {
    const skillsArr = translations[lang].about.skills;
    assert.ok(skillsArr.length > 0, `${lang} about.skills must not be empty`);

    // The JSX iterates t.skills.map; verify the map call exists.
    assert.ok(
      /t\.skills\.map/.test(about),
      "About must iterate t.skills.map for capabilities",
    );
    assert.ok(
      /\{skill\}/.test(about),
      "About capabilities must render {skill} from the map",
    );
  }
});

/* ---------- Skills.jsx ---------- */

const EXPECTED_TECH = [
  { name: "React", color: "#61DAFB" },
  { name: "Next.js", color: "currentColor" },
  { name: "Tailwind", color: "#06B6D4" },
  { name: "JavaScript", color: "#EAB308" },
  { name: "TypeScript", color: "#3178C6" },
  { name: "Node.js", color: "#339933" },
  { name: "MongoDB", color: "#47A248" },
  { name: "Git", color: "#F05032" },
  { name: "Figma", color: "#F24E1E" },
  { name: "Docker", color: "#2496ED" },
];

test("Skills imports exactly the 10 Si* icon names for the tech stack", () => {
  const importLine = skills.match(/import\s*\{([^}]+)\}\s*from\s*["']react-icons\/si["']/);
  assert.ok(importLine, "Skills must import from react-icons/si");

  const imported = importLine[1].split(",").map((s) => s.trim().replace(/\s+/g, ""));
  const expected = EXPECTED_TECH.map((t) => {
    const base =
      t.name === "Next.js"
        ? "Nextdotjs"
        : t.name === "Node.js"
          ? "Nodedotjs"
          : t.name === "Tailwind"
            ? "Tailwindcss"
            : t.name === "JavaScript"
              ? "Javascript"
              : t.name === "TypeScript"
                ? "Typescript"
                : t.name === "MongoDB"
                  ? "Mongodb"
                  : t.name;
    return `Si${base}`;
  });

  for (const exp of expected) {
    assert.ok(
      imported.some((imp) => imp === exp),
      `Skills must import ${exp} from react-icons/si`,
    );
  }
});

test("Skills tech stack renders all 10 entries with correct name + color", () => {
  for (const tech of EXPECTED_TECH) {
    assert.ok(
      new RegExp(`name:\\s*["']${escapeRegex(tech.name)}["']`).test(skills),
      `Skills must declare tech entry "${tech.name}"`,
    );
    assert.ok(
      new RegExp(`color:\\s*["']${escapeRegex(tech.color)}["']`).test(skills),
      `Skills entry "${tech.name}" must use color ${tech.color}`,
    );
  }
});

test("Skills renders t.title + t.titleHighlight + t.subtitle from translations", () => {
  // The Skills component renders these keys dynamically; verify the key
  // references exist in the source and the translation values are non-empty.
  assert.ok(
    /\{t\.title\}/.test(skills),
    "Skills must render {t.title}",
  );
  assert.ok(
    /\{t\.titleHighlight\}/.test(skills),
    "Skills must render {t.titleHighlight}",
  );
  assert.ok(
    /\{t\.subtitle\}/.test(skills),
    "Skills must render {t.subtitle}",
  );
  for (const lang of ["en", "id"]) {
    const t = translations[lang].skills;
    assert.ok(
      typeof t.title === "string" && t.title.trim().length > 0,
      `${lang} skills.title must be a non-empty string`,
    );
    assert.ok(
      typeof t.titleHighlight === "string" && t.titleHighlight.trim().length > 0,
      `${lang} skills.titleHighlight must be a non-empty string`,
    );
    assert.ok(
      typeof t.subtitle === "string" && t.subtitle.trim().length > 0,
      `${lang} skills.subtitle must be a non-empty string`,
    );
  }
});

test("Skills learning text + see-built CTA are wired from translations", () => {
  assert.ok(
    /t\.learningText/.test(skills),
    "Skills must render {t.learningText}",
  );
  assert.ok(
    /t\.seeBuilt/.test(skills),
    "Skills must render {t.seeBuilt}",
  );
  for (const lang of ["en", "id"]) {
    const t = translations[lang].skills;
    assert.ok(
      typeof t.learningText === "string" && t.learningText.trim().length > 0,
      `${lang} skills.learningText must be a non-empty string`,
    );
    assert.ok(
      typeof t.seeBuilt === "string" && t.seeBuilt.trim().length > 0,
      `${lang} skills.seeBuilt must be a non-empty string`,
    );
  }
});