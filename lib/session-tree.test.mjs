import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { flattenSessionTree, getSessionTreeEntryLabel } = await jiti.import("./session-tree.ts");

function userEntry(id, parentId, content) {
  return {
    type: "message",
    id,
    parentId,
    timestamp: "2026-01-01T00:00:00.000Z",
    message: { role: "user", content },
  };
}

function assistantEntry(id, parentId, content) {
  return {
    type: "message",
    id,
    parentId,
    timestamp: "2026-01-01T00:00:01.000Z",
    message: {
      role: "assistant",
      provider: "test",
      model: "test",
      content: [{ type: "text", text: content }],
    },
  };
}

function node(entry, children = []) {
  return { entry, children };
}

test("keeps a linear session readable without increasing branch indentation", () => {
  const tree = [
    node(userEntry("u1", null, "start"), [
      node(assistantEntry("a1", "u1", "answer"), [
        node(userEntry("u2", "a1", "continue")),
      ]),
    ]),
  ];

  const items = flattenSessionTree(tree, "u2");

  assert.deepEqual(items.map((item) => item.id), ["u1", "a1", "u2"]);
  assert.deepEqual(items.map((item) => item.branchDepth), [0, 0, 0]);
  assert.deepEqual(items.map((item) => item.active), [true, true, true]);
});

test("increments indentation only when a real branch is introduced", () => {
  const tree = [
    node(userEntry("root", null, "root"), [
      node(assistantEntry("main", "root", "main answer"), [
        node(userEntry("main-leaf", "main", "main follow-up")),
      ]),
      node(assistantEntry("alt", "root", "alternate answer")),
    ]),
  ];

  const items = flattenSessionTree(tree, "alt");

  assert.deepEqual(items.map((item) => [item.id, item.branchDepth]), [
    ["root", 0],
    ["main", 1],
    ["main-leaf", 1],
    ["alt", 1],
  ]);
  assert.deepEqual(items.filter((item) => item.active).map((item) => item.id), ["root", "alt"]);
  assert.equal(items[0].childCount, 2);
});

test("builds concise labels without exposing large message bodies", () => {
  const longText = `first line\n${"x".repeat(300)}`;
  const label = getSessionTreeEntryLabel(userEntry("u1", null, longText));

  assert.equal(label.role, "user");
  assert.match(label.label, /^first line x+/);
  assert.ok(label.label.length <= 161);
  assert.ok(label.label.endsWith("…"));
});

test("flattens deep sessions iteratively", () => {
  const root = node(userEntry("0", null, "0"));
  let current = root;
  for (let index = 1; index < 3000; index += 1) {
    const child = node(userEntry(String(index), String(index - 1), String(index)));
    current.children.push(child);
    current = child;
  }

  const items = flattenSessionTree([root], "2999");

  assert.equal(items.length, 3000);
  assert.equal(items[2999].active, true);
  assert.equal(items[2999].branchDepth, 0);
});
