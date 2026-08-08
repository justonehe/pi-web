import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function loadSubject() {
  return import("./image-path.ts");
}

test("extracts absolute image paths from message text", async () => {
  const { extractImagePaths } = await loadSubject();
  const tmp = tmpdir();
  const a = path.join(tmp, "pi-web-abc.png");
  const b = path.join(tmp, "pi-web-def.jpg");

  assert.deepEqual(extractImagePaths(`${a}\n${b}\n请看看这张图`), [a, b]);
  // Trailing punctuation tolerated
  assert.deepEqual(extractImagePaths(`看看 ${a}。然后回答`), [a]);
  // Relative paths, URLs and non-image files ignored
  assert.deepEqual(extractImagePaths("看看 ./img.png 和 /etc/passwd 和 notes.md 和 https://a.com/x.png"), []);
  // Duplicates deduplicated
  assert.deepEqual(extractImagePaths(`${a}\n${a}`), [a]);
});
