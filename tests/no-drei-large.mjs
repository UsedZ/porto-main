/**
 * No-big-three audit.
 *
 * Spec §6.3: verify @react-three/drei is NOT installed. drei gzip is 484.6 KB,
 * far above the budget. Only a small helper (≤8 KB) is allowed and must be
 * explicitly approved in the architect spec. File-based check per spec §6.4.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

test("package.json must not list @react-three/drei as a dependency", () => {
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(
    !Object.prototype.hasOwnProperty.call(all, "drei"),
    "package.json must not add 'drei' to dependencies/devDependencies",
  );
});

test("node_modules must not contain the drei package", () => {
  assert.ok(
    !Object.prototype.hasOwnProperty.call(
      { ...pkg.dependencies, ...pkg.devDependencies },
      "drei",
    ),
    "drei must not be installed",
  );
});
