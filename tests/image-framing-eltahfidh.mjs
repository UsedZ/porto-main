/**
 * Focused tests: portrait image framing (Hero profile + IT Support 12.jpeg) and
 * the authentic elTAHFIDH sample wired into the real Web Development carousel.
 *
 * These assertions test real code/data behaviour (per-slide framing resolution,
 * carousel data, bilingual copy, asset bytes) - not the mere presence of a CSS
 * class string somewhere in the tree.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const hero = read("components/Hero.jsx");
const projects = read("components/Projects.jsx");
const translations = (
  await import(pathToFileURL(path.join(root, "translations/index.js")).href)
).default;

/** Extract the real framing resolver from Projects.jsx and execute it. */
function loadFitResolver(source) {
  const mapMatch = source.match(/const\s+imageFit\s*=\s*\{[\s\S]*?\n\};/);
  assert.ok(
    mapMatch,
    "Projects.jsx must declare an explicit per-image framing map: const imageFit = { ... }",
  );
  const fnMatch = source.match(
    /const\s+fitFor\s*=\s*\(\s*\w+\s*\)\s*=>\s*[\s\S]*?\n\s*\}\s*;/,
  );
  assert.ok(
    fnMatch,
    "Projects.jsx must declare a per-slide resolver: const fitFor = (src) => { ... };",
  );
  const context = { console };
  vm.createContext(context);
  vm.runInContext(`${mapMatch[0]}\n${fnMatch[0]}\nresult = fitFor;`, context);
  assert.equal(typeof context.result, "function", "fitFor must be a function");
  return context.result;
}

/** Read the real carousel image arrays from Projects.jsx. */
function loadProjectImages(source) {
  const block = source.match(/const\s+projectImages\s*=\s*\[[\s\S]*?\n\];/);
  assert.ok(block, "Projects.jsx must declare const projectImages = [ ... ];");
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${block[0]}\nresult = projectImages;`, context);
  return context.result;
}

const fitFor = (src) => loadFitResolver(projects)(src);
const projectImages = () => loadProjectImages(projects);

const ELTAHFIDH_URL = "https://eltahfidh.or.id/";
const ELTAHFIDH_ASSET = "/images/eltahfidh.png";

test("Hero renders /images/profile.jpeg with a portrait frame matching source 758x1340", () => {
  // The square frame that cropped the portrait source must be gone.
  assert.ok(
    !/w-64\s+h-64/.test(hero),
    "Hero.jsx must not use the square w-64 h-64 frame for the profile photo",
  );
  assert.ok(
    !/md:w-80\s+md:h-80/.test(hero),
    "Hero.jsx must not use the square md:w-80 md:h-80 frame for the profile photo",
  );

  // Frame aspect must follow the real source aspect ratio (758x1340).
  assert.ok(
    /aspect-\[758\/1340\]/.test(hero),
    "Hero.jsx profile frame must use aspect-[758/1340] to match the 758x1340 source",
  );

  // Responsive width ladder instead of one fixed square size, so desktop and
  // mobile both follow the source aspect ratio.
  const profileBlock = hero.slice(hero.indexOf("{/* Profile Image */}"));
  assert.ok(
    /className="[^"]*aspect-\[758\/1340\][^"]*"/.test(profileBlock),
    "the profile frame box must declare aspect-[758/1340] in its own className",
  );
  const widths = profileBlock.match(/\b(?:sm:|md:|lg:)?w-\d+\b/g) || [];
  assert.ok(
    widths.length >= 2,
    `Hero profile frame must be responsive (found width classes: ${widths.join(", ") || "none"})`,
  );
});

test("Hero profile image uses object-contain (no crop, no stretch) and no object-cover remains", () => {
  const imgBlock = hero.slice(
    hero.indexOf('src="/images/profile.jpeg"') - 200,
    hero.indexOf('src="/images/profile.jpeg"') + 600,
  );
  assert.ok(
    /className="[^"]*object-contain[^"]*"/.test(imgBlock),
    "the /images/profile.jpeg Image must be rendered with object-contain",
  );
  assert.ok(
    !/object-cover/.test(hero),
    "Hero.jsx must not use object-cover anywhere (it crops the portrait source)",
  );
  assert.ok(
    /\bfill\b/.test(imgBlock),
    "the profile Image must keep fill sizing inside the portrait frame",
  );
});

test("Projects carousel resolves framing per slide: 12.jpeg is contain, every other slide is cover", () => {
  const itSupportImages = projectImages()[0];
  assert.ok(
    itSupportImages.includes("/images/12.jpeg"),
    "IT Support carousel must still contain /images/12.jpeg",
  );

  // Real behaviour of the resolver, not a presence check.
  assert.equal(
    fitFor("/images/12.jpeg"),
    "object-contain",
    'fitFor("/images/12.jpeg") must resolve to object-contain so the subject is not cropped',
  );
  for (const images of projectImages()) {
    for (const src of images) {
      if (src === "/images/12.jpeg") continue;
      assert.equal(
        fitFor(src),
        "object-cover",
        `fitFor("${src}") must stay object-cover (unchanged framing for existing slides)`,
      );
    }
  }

  // The carousel Image must consume the resolver instead of a hardcoded class.
  const carouselImage = projects.slice(
    projects.indexOf("src={project.images["),
  );
  assert.ok(
    /className=\{`\$\{fitFor\(/.test(carouselImage),
    "the carousel <Image> must use the per-slide fitFor(...) resolver in its className",
  );
  assert.ok(
    !/className="object-cover/.test(carouselImage.slice(0, 400)),
    "the carousel <Image> must not hardcode object-cover",
  );
});

test("elTAHFIDH screenshot asset exists as a real, unique PNG", () => {
  const assetPath = path.join(root, "public/images/eltahfidh.png");
  assert.ok(existsSync(assetPath), "public/images/eltahfidh.png must exist");
  const stat = statSync(assetPath);
  assert.ok(stat.size > 30000, `asset must be a real screenshot (size ${stat.size} bytes)`);

  const bytes = readFileSync(assetPath);
  assert.deepEqual(
    bytes.subarray(0, 8),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    "asset must be a real PNG file",
  );
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(24);
  assert.ok(
    width >= 800 && height >= 500,
    `screenshot dimensions must be web-capture sized (got ${width}x${height})`,
  );

  // Must not be a duplicate/copy of any other portfolio asset.
  const others = readdirSync(path.join(root, "public/images")).filter(
    (f) => f !== "eltahfidh.png",
  );
  for (const other of others) {
    const otherBytes = readFileSync(path.join(root, "public/images", other));
    assert.ok(
      !otherBytes.equals(bytes),
      `eltahfidh.png must not be a copy of public/images/${other}`,
    );
  }
});

test("elTAHFIDH screenshot is the first asset of the real Web Development carousel", () => {
  const webImages = projectImages()[2];
  assert.ok(
    webImages[0] === ELTAHFIDH_ASSET,
    `Web Development carousel must lead with ${ELTAHFIDH_ASSET} (got ${webImages[0]})`,
  );
  assert.ok(
    projectImages().every((images) => images.length > 0),
    "every project carousel must keep its existing images",
  );
});

test("EN and ID copy truthfully identify the elTAHFIDH sample and carry the live link", () => {
  for (const lang of ["en", "id"]) {
    const item = translations[lang].projects.items[2];
    assert.ok(item, `${lang} translations must keep the Web Development project item`);
    assert.ok(
      /eltahfidh/i.test(item.description),
      `${lang} Web Development description must identify elTAHFIDH`,
    );
    assert.equal(
      item.demoUrl,
      ELTAHFIDH_URL,
      `${lang} Web Development item must link to ${ELTAHFIDH_URL}`,
    );
    assert.ok(
      typeof item.demoLabel === "string" && item.demoLabel.trim().length > 0,
      `${lang} Web Development item must have a demoLabel for the link`,
    );
  }
  // Existing project copy must stay intact.
  for (const lang of ["en", "id"]) {
    const items = translations[lang].projects.items;
    assert.equal(items.length, 3, `${lang} must keep exactly 3 project items`);
    assert.ok(/e-?commerce/i.test(items[2].description) || /web/i.test(items[2].description));
  }
});

test("Projects.jsx renders the elTAHFIDH live link safely in the project card", () => {
  assert.ok(
    /project\.demoUrl/.test(projects),
    "Projects.jsx must render project.demoUrl for the live sample link",
  );
  assert.ok(
    /href=\{project\.demoUrl\}/.test(projects),
    "the demo link must use href={project.demoUrl}",
  );
  const linkBlock = projects.slice(projects.indexOf("href={project.demoUrl}") - 200);
  assert.ok(
    /target="_blank"/.test(linkBlock.slice(0, 600)),
    "the demo link must open in a new tab",
  );
  assert.ok(
    /rel="noopener noreferrer"/.test(linkBlock.slice(0, 600)),
    "the demo link must use rel=noopener noreferrer",
  );
  assert.ok(
    /project\.demoLabel/.test(projects),
    "the demo link label must come from project.demoLabel (EN/ID)",
  );
});

test("category filters still map to the existing project categories", () => {
  assert.ok(
    /projectCategories\s*=\s*\["IT Support",\s*"IoT",\s*"Web Development"\]/.test(projects),
    "Projects.jsx must keep its existing category mapping",
  );
  assert.ok(
    /filterIndex/.test(projects) && /setFilterIndex/.test(projects),
    "Projects.jsx must keep the category filter state",
  );
});
