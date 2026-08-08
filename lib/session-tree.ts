import type { AgentMessage, SessionEntry, SessionTreeNode } from "./types";

const MAX_LABEL_LENGTH = 160;
const MAX_LABEL_SCAN_LENGTH = 4096;

export interface SessionTreeItem {
  id: string;
  parentId: string | null;
  type: string;
  role?: AgentMessage["role"];
  label: string;
  timestamp: string;
  branchDepth: number;
  childCount: number;
  active: boolean;
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content.slice(0, MAX_LABEL_SCAN_LENGTH);
  if (!Array.isArray(content)) return "";

  let text = "";
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const value = block as { type?: string; text?: unknown; toolName?: unknown; name?: unknown };
    let next = "";
    if (value.type === "text" && typeof value.text === "string") {
      next = value.text;
    } else if (value.type === "toolCall") {
      const name = typeof value.toolName === "string"
        ? value.toolName
        : typeof value.name === "string"
          ? value.name
          : "tool";
      next = `[tool call: ${name}]`;
    }
    if (!next) continue;
    text += `${text ? " " : ""}${next.slice(0, MAX_LABEL_SCAN_LENGTH - text.length)}`;
    if (text.length >= MAX_LABEL_SCAN_LENGTH) break;
  }
  return text;
}

function compactLabel(text: string): string {
  const compact = text.slice(0, MAX_LABEL_SCAN_LENGTH).replace(/\s+/g, " ").trim();
  return compact.length > MAX_LABEL_LENGTH ? `${compact.slice(0, MAX_LABEL_LENGTH)}…` : compact;
}

export function getSessionTreeEntryLabel(entry: SessionEntry): { label: string; role?: AgentMessage["role"] } {
  if (entry.type === "message") {
    const message = entry.message;
    const role = message.role;
    const text = "content" in message ? compactLabel(textFromContent(message.content)) : "";
    if (text) return { label: text, role };
    if (role === "toolResult") return { label: `[tool result: ${message.toolName ?? "tool"}]`, role };
    if (role === "bashExecution") return { label: compactLabel(message.command) || "[shell command]", role };
    return { label: `[${role}]`, role };
  }

  const entryType = entry.type;
  switch (entry.type) {
    case "compaction":
      return { label: compactLabel(entry.summary) || "[compaction]" };
    case "branch_summary":
      return { label: compactLabel(entry.summary) || "[branch summary]" };
    case "model_change":
      return { label: `${entry.provider}/${entry.modelId}` };
    case "thinking_level_change":
      return { label: `Thinking: ${entry.thinkingLevel}` };
    case "custom_message":
      return { label: compactLabel(textFromContent(entry.content)) || `[${entry.customType}]` };
    case "custom":
      return { label: `[${entry.customType}]` };
    case "label":
      return { label: entry.label ? `Label: ${entry.label}` : "Label cleared" };
    case "session_info":
      return { label: entry.name ? `Session: ${entry.name}` : "Session info" };
    default:
      return { label: entryType };
  }
}

export function flattenSessionTree(tree: SessionTreeNode[], leafId: string | null): SessionTreeItem[] {
  const parentById = new Map<string, string | null>();
  const discoveryStack = [...tree];
  while (discoveryStack.length > 0) {
    const node = discoveryStack.pop()!;
    parentById.set(node.entry.id, node.entry.parentId);
    discoveryStack.push(...node.children);
  }

  const activePath = new Set<string>();
  let cursor = leafId;
  while (cursor && !activePath.has(cursor)) {
    activePath.add(cursor);
    cursor = parentById.get(cursor) ?? null;
  }

  const items: SessionTreeItem[] = [];
  const stack: Array<{ node: SessionTreeNode; branchDepth: number }> = [];
  for (let index = tree.length - 1; index >= 0; index -= 1) {
    stack.push({ node: tree[index], branchDepth: 0 });
  }

  while (stack.length > 0) {
    const { node, branchDepth } = stack.pop()!;
    const { label, role } = getSessionTreeEntryLabel(node.entry);
    items.push({
      id: node.entry.id,
      parentId: node.entry.parentId,
      type: node.entry.type,
      ...(role ? { role } : {}),
      label,
      timestamp: node.entry.timestamp,
      branchDepth,
      childCount: node.children.length,
      active: activePath.has(node.entry.id),
    });

    const childDepth = node.children.length > 1 ? branchDepth + 1 : branchDepth;
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: node.children[index], branchDepth: childDepth });
    }
  }

  return items;
}
