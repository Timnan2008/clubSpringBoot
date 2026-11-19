import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = resolve(root, ".agents/skills/unslop");
const manifest = JSON.parse(
  readFileSync(resolve(root, "docs/design/unslop/upstream.json"), "utf8"),
);
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const files = readdirSync(source, { recursive: true, withFileTypes: true })
  .filter((file) => file.isFile())
  .map((file) =>
    resolve(file.parentPath, file.name)
      .slice(source.length + 1)
      .replaceAll("\\", "/"),
  )
  .sort();
assert.deepEqual(
  files,
  manifest.files.map((file) => file.path).sort(),
  "The installed file list changed",
);
for (const file of manifest.files) {
  const path = resolve(source, file.path);
  assert.ok(!lstatSync(path).isSymbolicLink(), `Unexpected link: ${file.path}`);
  assert.equal(sha256(path), file.sha256, `Upstream file changed: ${file.path}`);
}
assert.equal(sha256(resolve(root, manifest.licenseFile.path)), manifest.licenseFile.sha256);
const skill = readFileSync(resolve(source, "SKILL.md"), "utf8");
assert.match(skill, /^---\nname: unslop\n/);
assert.match(skill, /Damir Sokolovsky/);
for (const [, path] of skill.matchAll(/\]\((references\/[^)#]+)(?:#[^)]+)?\)/g)) {
  assert.ok(existsSync(resolve(source, path)), `Missing skill reference: ${path}`);
}
const require = createRequire(resolve(root, "package.json"));
require.resolve("playwright-core");
const result = {
  passed: true,
  repository: manifest.repository,
  commit: manifest.commit,
  unchangedFiles: files.length,
  playwright: "existing project dependency",
};
const output = resolve(root, "desktop/.cache/unslop/verification.json");
mkdirSync(resolve(root, "desktop/.cache/unslop"), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  `PASS: unslop installed; ${files.length} upstream files and license verified; Playwright available.`,
);
