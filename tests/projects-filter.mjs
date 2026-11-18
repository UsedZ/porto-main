/** @license Apache-2.0 © Syahrul Ramlan
 *  Projects filter tests: category filter buttons are derived from
 *  translations[lang].projects.categories, the filter index state toggles
 *  visibility correctly, and the "All" filter shows every project.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const projects = read("components/Projects.jsx");
const translations = (
  await import(`file://${path.join(root, "translations/index.js")}`)
).default;

/** Escape a string for safe use inside a RegExp pattern. */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("Projects component imports useState for filter state", () => {
  assert.ok(
    /import\s*\{\s*useState/.test(projects),
    "Projects must import useState",
  );
  assert.ok(
    /const\s+\[filterIndex\s*,\s*setFilterIndex\s*\]\s*=\s*useState\(/.test(
      projects,
    ),
    "Projects must declare const [filterIndex, setFilterIndex] = useState(...)",
  );
});

test("Projects filter buttons are derived from translations[lang].projects.categories", () => {
  for (const lang of ["en", "id"]) {
    const cats = translations[lang].projects.categories;
    assert.equal(cats.length, 4, `${lang} projects.categories must have exactly 4 items`);

    // The JSX iterates t.categories.map for filter buttons.
    assert.ok(
      /t\.categories\.map/.test(projects),
      "Projects must iterate t.categories.map for filter buttons",
    );
  }
});

test("Projects renders all four category filter buttons", () => {
  const enCats = translations.en.projects.categories;
  for (const cat of enCats) {
    assert.ok(
      new RegExp(escapeRegex(cat)).test(projects),
      `Projects must render filter button for category "${cat}"`,
    );
  }
});

test("Projects filter index 0 (All) shows all projects", () => {
  // The visible computation: filterIndex === 0 ? allProjects : filtered.
  assert.ok(
    /filterIndex\s*===\s*0/.test(projects),
    "Projects must check filterIndex === 0 for the 'All' filter",
  );
  assert.ok(
    /allProjects/.test(projects),
    "Projects must reference allProjects when filterIndex is 0",
  );
});

test("Projects filter applies category-based visibility for non-All filters", () => {
  // Verify the filter logic compares against projectCategories.
  assert.ok(
    /projectCategories\[/.test(projects),
    "Projects filter must reference projectCategories for filtering",
  );
  assert.ok(
    /enCategories\[filterIndex\]/.test(projects),
    "Projects filter must compare against enCategories[filterIndex]",
  );
});

test("Projects filter button uses aria-pressed to indicate active state", () => {
  assert.ok(
    /aria-pressed/.test(projects),
    "Projects filter buttons must use aria-pressed",
  );
  assert.ok(
    /active/.test(projects),
    "Projects filter must compute an active state for the pressed button",
  );
});

test("Projects onClick handler calls setFilterIndex with the category index", () => {
  assert.ok(
    /setFilterIndex\(index\)/.test(projects),
    "Projects filter button onClick must call setFilterIndex(index)",
  );
});

test("EN categories are ['All', 'Web Development', 'IT Support', 'IoT']", () => {
  const expected = ["All", "Web Development", "IT Support", "IoT"];
  assert.deepStrictEqual(
    translations.en.projects.categories,
    expected,
    "EN projects.categories must be [All, Web Development, IT Support, IoT]",
  );
});

test("ID categories are ['Semua', 'Pengembangan Web', 'IT Support', 'IoT']", () => {
  const expected = ["Semua", "Pengembangan Web", "IT Support", "IoT"];
  assert.deepStrictEqual(
    translations.id.projects.categories,
    expected,
    "ID projects.categories must be [Semua, Pengembangan Web, IT Support, IoT]",
  );
});

test("Projects has exactly 3 project items in both languages", () => {
  for (const lang of ["en", "id"]) {
    assert.equal(
      translations[lang].projects.items.length,
      3,
      `${lang} projects.items must have exactly 3 entries`,
    );
  }
});

test("Projects category labels in EN match the filter button text", () => {
  const enCats = translations.en.projects.categories;
  // Filter buttons are rendered from t.categories.map, so each EN category
  // label must appear in the source.
  for (const cat of enCats) {
    assert.ok(
      new RegExp(escapeRegex(cat)).test(projects),
      `Projects must render filter button for EN category "${cat}"`,
    );
  }
  // The filter logic: projectCategories[i] is the category assigned to project i.
  // For non-All filters, the visible set is computed by comparing against enCategories[filterIndex].
  assert.ok(
    /projectCategories\[i\]\s*===\s*enCategories\[filterIndex\]/.test(projects),
    "Projects filter must compare projectCategories[i] against enCategories[filterIndex]",
  );
  // projectCategories must have exactly 3 entries (one per project).
  const projectCategoriesMatch = projects.match(
    /const\s+projectCategories\s*=\s*\[([^\]]+)\]/,
  );
  assert.ok(projectCategoriesMatch, "projectCategories array must be findable");
  const declared = projectCategoriesMatch[1]
    .split(",")
    .map((s) => s.trim().replace(/"/g, "").replace(/'/g, ""));
  assert.equal(
    declared.length,
    3,
    "projectCategories must have exactly 3 entries (one per project)",
  );
  // Verify the 3 declared categories match the 3 project item descriptions.
  const enItems = translations.en.projects.items;
  const expectedCats = ["IT Support", "IoT", "Web Development"];
  assert.deepStrictEqual(declared, expectedCats, "projectCategories must be [IT Support, IoT, Web Development]");
});
