import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function loadSubject() {
  return import("./temp-image-file.ts");
}

test("rejects non-temp and non-image paths", async () => {
  const { resolveTempImagePath } = await loadSubject();
  assert.equal(resolveTempImagePath("/etc/passwd"), null);
  assert.equal(resolveTempImagePath("/tmp/not-image.txt"), null);
  assert.equal(resolveTempImagePath("../etc/passwd.png"), null);
  assert.equal(resolveTempImagePath(""), null);
  assert.equal(resolveTempImagePath("/etc/pi-web-abc.png"), null);
});

test("resolves real temp image files only", async (t) => {
  const { resolveTempImagePath } = await loadSubject();
  const file = path.join(tmpdir(), `pi-web-${Date.now()}.png`);
  writeFileSync(file, Buffer.from("89504e47", "hex"));
  t.after(() => import("node:fs").then((fs) => fs.rmSync(file, { force: true })));

  assert.equal(resolveTempImagePath(file), file);
  // Nonexistent file rejected
  assert.equal(resolveTempImagePath(path.join(tmpdir(), "pi-web-missing.png")), null);
});

test("maps image extensions to mime types", async () => {
  const { imageMimeForPath } = await loadSubject();
  assert.equal(imageMimeForPath("/tmp/a.png"), "image/png");
  assert.equal(imageMimeForPath("/tmp/a.jpeg"), "image/jpeg");
  assert.equal(imageMimeForPath("/tmp/a.webp"), "image/webp");
  assert.equal(imageMimeForPath("/tmp/a.txt"), null);
});
