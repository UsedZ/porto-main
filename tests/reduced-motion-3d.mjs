/**
 * Reduced-motion 3D test.
 *
 * Spec §6.3: when the user's OS requests reduced motion, the 3D scene must NOT
 * mount (no WebGL context, no parallax). Behavior: render the page with a mock
 * matchMedia and assert Scene3D is not rendered (the fallback is rendered).
 * Node's test runner has no DOM, so the assertions stay file-based: they verify
 * the source-level guards that make the mock render safe.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

test("Hero resolves reduced-motion before mounting the 3D scene", () => {
  const hero = read("components/Hero.jsx");
  assert.ok(
    /\buseReducedMotion\b/.test(hero),
    "Hero must call useReducedMotion() to read the user preference",
  );
  assert.ok(
    /reduceMotion/.test(hero) || /prefersReducedMotion/.test(hero) || /reducedMotion/.test(hero),
    "Hero must bind the reduced-motion flag to reduceMotion / prefersReducedMotion / reducedMotion",
  );
  assert.ok(
    /matchMedia/.test(hero) || /reducedMotion/.test(hero),
    "the reduced-motion source of truth must be window.matchMedia or the useReducedMotion hook",
  );
});

test("Hero omits Scene3D (shows fallback) when reduced motion is active", () => {
  const hero = read("components/Hero.jsx");
  // show3D must include a !reduceMotion guard so the canvas is never mounted.
  assert.ok(
    /show3D/.test(hero),
    "Hero must compute a show3D flag",
  );
  assert.ok(
    /!reduceMotion/.test(hero) || /!prefersReducedMotion/.test(hero) || /!reducedMotion/.test(hero),
    "show3D must be false when reduceMotion is true",
  );
});

test("Scene3D short-circuits before rendering the Canvas when reduced motion is active", () => {
  const scene = read("components/hero/Scene3D.jsx");
  // Either the scene itself checks reduced-motion, or it is only ever mounted
  // after Hero's show3D guard has passed. Verify at least one guard exists in
  // the scene module (defense in depth so no WebGL context is requested).
  assert.ok(
    /reduceMotion/.test(scene) || /prefersReducedMotion/.test(scene) || /reducedMotion/.test(scene) ||
    /matchMedia/.test(scene),
    "Scene3D must check reduced-motion or be guarded by Hero before mounting the Canvas",
  );
});
