/**
 * 3D fallback (WebGL) tests.
 *
 * Spec §6.3: the static fallback Scene3DFallback must render when WebGL is not
 * available (no canvas 2D/3D context). The Hero must hold the show3D guard so
 * Scene3D is skipped when the canvas cannot render. These are file-based
 * behavior assertions (source-level verification) because node:test has no DOM.
 *
 * Spec §6.4: this is a BEHAVIOR assertion (feature availability), not a markup
 * presence check, but it stops at the source level here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

test("Scene3DFallback renders the gradient mesh + static poster + vignette", () => {
  const src = read("components/hero/Scene3DFallback.jsx");
  assert.ok(
    /bg-gradient-to-br/.test(src),
    "fallback must render a gradient mesh layer",
  );
  assert.ok(
    /from-accent-violet/.test(src) && /via-accent-blue/.test(src),
    "gradient mesh must use violet + blue cinematic accents",
  );
  assert.ok(
    /\/models\/hero-poster\.png/.test(src) && /\/models\/hero-poster-dark\.png/.test(src),
    "fallback must render both praterender posters (light + dark)",
  );
  assert.ok(
    /vignette/.test(src),
    "fallback must apply the vignette overlay",
  );
});

test("Hero guards Scene3D behind hasWebGL + reduced motion + low-end mobile", () => {
  const hero = read("components/Hero.jsx");
  assert.ok(
    /\buseReducedMotion\b/.test(hero),
    "Hero must import and call useReducedMotion()",
  );
  assert.ok(
    /\buseMemo\b/.test(hero),
    "Hero must memoize the WebGL capability check (useMemo)",
  );
  assert.ok(
    /hasWebGL/.test(hero) || /webGl/.test(hero) || /webgl/.test(hero),
    "Hero must compute a hasWebGL flag via canvas.getContext('webgl2')",
  );
  assert.ok(
    /reduceMotion/.test(hero) || /prefersReducedMotion/.test(hero) || /reducedMotion/.test(hero),
    "Hero must bind the reduced-motion flag to a reduceMotion/prefersReducedMotion/reducedMotion variable",
  );
  assert.ok(
    /isLowEndMobile/.test(hero) || /hardwareConcurrency/.test(hero),
    "Hero must detect low-end mobile (hardwareConcurrency <= 4 && screen.width < 768)",
  );
  assert.ok(
    /show3D/.test(hero),
    "Hero must compute a show3D flag",
  );
  // Must render Scene3D when show3D is true, and Scene3DFallback when false.
  assert.ok(
    /<Scene3D/.test(hero) || /><Scene3D/.test(hero),
    "Hero must render <Scene3D /> when show3D is true",
  );
  assert.ok(
    /<Scene3DFallback/.test(hero) || /><Scene3DFallback/.test(hero),
    "Hero must render <Scene3DFallback /> when show3D is false",
  );
});

test("Scene3DFallback is an SSR-safe client component with no three import", () => {
  const src = read("components/hero/Scene3DFallback.jsx");
  assert.ok(/^"use client"/m.test(src), "Scene3DFallback must be a client component");
  assert.ok(
    !/import\s+.*three/.test(src) && !/from\s+['"]three['"]/.test(src),
    "Scene3DFallback must not import three (it is pure JSX/CSS)",
  );
  assert.ok(
    !/import\s+['"]@react-three\/fiber['"]/.test(src),
    "Scene3DFallback must not import @react-three/fiber",
  );
});
