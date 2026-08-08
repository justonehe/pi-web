import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function loadSubject() {
  return import("./image-files.ts");
}

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex").toString("base64");

test("saves images into the temp dir with the right extension and content", async () => {
  const { imagesToTempFiles } = await loadSubject();

  const paths = imagesToTempFiles([
    { data: PNG_SIGNATURE, mimeType: "image/png" },
    { data: Buffer.from("ffd8ff", "hex").toString("base64"), mimeType: "image/jpeg" },
  ]);

  assert.equal(paths.length, 2);
  for (const p of paths) {
    assert.ok(path.isAbsolute(p), `expected absolute path, got ${p}`);
    assert.ok(p.startsWith(tmpdir()), `expected temp dir path, got ${p}`);
    assert.ok(existsSync(p), `expected file to exist: ${p}`);
  }
  assert.match(paths[0], /pi-web-.*\.png$/);
  assert.match(paths[1], /pi-web-.*\.jpg$/);
  assert.equal(
    readFileSync(paths[0]).toString("hex"),
    Buffer.from(PNG_SIGNATURE, "base64").toString("hex"),
  );
  for (const p of paths) rmSync(p, { force: true });
});

test("falls back to png for unknown mime types", async () => {
  const { imagesToTempFiles } = await loadSubject();
  const [p] = imagesToTempFiles([{ data: "AA==", mimeType: "image/heic" }]);
  try {
    assert.match(p, /pi-web-.*\.png$/);
  } finally {
    rmSync(p, { force: true });
  }
});

test("modelSupportsImages treats unknown modalities as vision-capable", async () => {
  const { modelSupportsImages } = await loadSubject();
  assert.equal(modelSupportsImages(["text", "image"]), true);
  assert.equal(modelSupportsImages(["text"]), false);
  assert.equal(modelSupportsImages(undefined), true);
});
