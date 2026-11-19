/**
 * Kontrak latar hero (keputusan owner 19 Nov 2026):
 * tidak ada WebGL, tidak ada objek 3D, tidak ada poster pra-render.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

test("Hero memakai latar CSS saja, tanpa kanvas/WebGL", () => {
  const hero = read("components/Hero.jsx");
  assert.ok(/<Scene3DFallback\s*\/>/.test(hero), "Hero harus merender latar statis");
  assert.ok(!/<Scene3D\b/.test(hero), "Hero tidak boleh merender Scene3D");
  assert.ok(!/dynamic\(/.test(hero), "Hero tidak boleh memuat modul 3D secara dynamic");
  assert.ok(!/getContext\(/.test(hero), "Hero tidak boleh membuat probe WebGL");
  assert.ok(!/useReducedMotion/.test(hero), "Hero tidak perlu hook reduced-motion lagi");
});

test("latar statis hanya gradient, tanpa vignette gelap", () => {
  const src = read("components/hero/Scene3DFallback.jsx");
  assert.ok(/bg-gradient-to-br/.test(src), "latar harus punya gradient");
  assert.ok(/from-accent-violet/.test(src) && /via-accent-blue/.test(src), "aksen gradient harus ada");
  assert.ok(!/vignette/.test(src), "tidak boleh ada vignette gelap di latar tema terang");
  assert.ok(!/hero-poster/.test(src), "tidak boleh ada poster 3D");
  assert.ok(!/<img/.test(src), "tidak boleh ada gambar latar");
  assert.ok(!/three/.test(src), "latar tidak boleh mengimpor three");
});

test("modul dan aset 3D sudah dihapus dari proyek", () => {
  for (const rel of [
    "components/hero/Scene3D.jsx",
    "components/hero/useReducedMotion.js",
    "public/models/hero-poster.png",
    "public/models/hero-poster-dark.png",
    "public/models/hero-robot.glb",
  ]) {
    assert.ok(!existsSync(path.join(root, rel)), `${rel} tidak boleh ada lagi`);
  }
});
