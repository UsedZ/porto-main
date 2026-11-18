/**
 * Reduced-motion: karena tidak ada animasi WebGL lagi, kontraknya berubah —
 * pastikan tidak ada jalur kanvas/WebGL sama sekali di hero.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

test("tidak ada jalur WebGL di Hero", () => {
  const hero = read("components/Hero.jsx");
  assert.ok(!/getContext\(/.test(hero), "jangan minta konteks WebGL");
  assert.ok(!/<Scene3D\b/.test(hero), "jangan mount komponen 3D");
  assert.ok(!/matchMedia/.test(hero), "tidak perlu deteksi prefers-reduced-motion");
});

test("latar statis tidak beranimasi", () => {
  const src = read("components/hero/Scene3DFallback.jsx");
  assert.ok(!/animate-/.test(src), "latar tidak boleh punya kelas animasi");
  assert.ok(!/requestAnimationFrame/.test(src), "latar tidak boleh pakai rAF");
  assert.ok(!/canvas/i.test(src), "latar tidak boleh menyebut canvas");
});
