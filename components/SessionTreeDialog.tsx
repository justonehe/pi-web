"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionTreeItem } from "@/lib/session-tree";

interface Props {
  sessionId: string | null;
  activeLeafId: string | null;
  onClose: () => void;
  onNavigate: (entryId: string, options: { summarize: boolean }) => Promise<void>;
}

interface TreeResponse {
  items?: SessionTreeItem[];
  leafId?: string | null;
  error?: string;
}

function roleLabel(item: SessionTreeItem): string {
  switch (item.role) {
    case "user": return "U";
    case "assistant": return "A";
    case "toolResult": return "T";
    case "bashExecution": return "$";
    case "custom": return "C";
    default: return item.type.slice(0, 1).toUpperCase();
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function SessionTreeDialog({ sessionId, activeLeafId, onClose, onNavigate }: Props) {
  const [items, setItems] = useState<SessionTreeItem[]>([]);
  const [loadedLeafId, setLoadedLeafId] = useState<string | null>(activeLeafId);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(activeLeafId);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState<"plain" | "summary" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!sessionId) {
      setItems([]);
      setLoading(false);
      setError("No active session");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${encodeURIComponent(sessionId)}/tree`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as TreeResponse;
        if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
        const nextItems = body.items ?? [];
        const nextLeafId = body.leafId ?? null;
        setItems(nextItems);
        setLoadedLeafId(nextLeafId);
        setSelectedId(nextLeafId ?? nextItems.at(-1)?.id ?? null);
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [sessionId]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => (
      item.label.toLowerCase().includes(normalized)
      || item.type.toLowerCase().includes(normalized)
      || item.role?.toLowerCase().includes(normalized)
    ));
  }, [items, query]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    rowRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const moveSelection = useCallback((delta: number) => {
    if (filteredItems.length === 0) return;
    const currentIndex = selectedId
      ? filteredItems.findIndex((item) => item.id === selectedId)
      : -1;
    const nextIndex = Math.max(0, Math.min(filteredItems.length - 1, currentIndex + delta));
    setSelectedId(filteredItems[nextIndex].id);
  }, [filteredItems, selectedId]);

  const navigate = useCallback(async (summarize: boolean) => {
    if (!selectedId || navigating) return;
    setNavigating(summarize ? "summary" : "plain");
    setError(null);
    try {
      await onNavigate(selectedId, { summarize });
      onClose();
    } catch (navigationError) {
      setError(navigationError instanceof Error ? navigationError.message : String(navigationError));
    } finally {
      setNavigating(null);
    }
  }, [navigating, onClose, onNavigate, selectedId]);

  const selectedIsCurrent = selectedId === loadedLeafId;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !navigating) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.36)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Session tree"
        style={{
          width: "min(920px, 100%)",
          height: "min(760px, calc(100dvh - 40px))",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid var(--border)",
          borderRadius: 10,
          background: "var(--bg)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.32)",
        }}
      >
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-panel)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ color: "var(--text)", fontSize: 14, fontWeight: 650 }}>Session tree</div>
              <div style={{ marginTop: 2, color: "var(--text-dim)", fontSize: 11 }}>
                Select any saved point and continue from there
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={navigating !== null}
              aria-label="Close session tree"
              style={{
                width: 28,
                height: 28,
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--bg)",
                color: "var(--text-muted)",
                cursor: navigating ? "not-allowed" : "pointer",
              }}
            >
              ×
            </button>
          </div>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !navigating) {
                event.preventDefault();
                onClose();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                moveSelection(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveSelection(-1);
              } else if (event.key === "Enter" && selectedId) {
                event.preventDefault();
                void navigate(false);
              }
            }}
            placeholder="Search messages, roles, or entry types"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--border)",
              borderRadius: 7,
              outline: "none",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {loading ? (
            <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Loading session tree...</div>
          ) : items.length === 0 && !error ? (
            <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>This session has no saved entries.</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>No matching entries.</div>
          ) : (
            filteredItems.map((item) => {
              const selected = item.id === selectedId;
              const current = item.id === loadedLeafId;
              const indent = Math.min(item.branchDepth, 14) * 14;
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    if (node) rowRefs.current.set(item.id, node);
                    else rowRefs.current.delete(item.id);
                  }}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  onDoubleClick={() => void navigate(false)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 34,
                    padding: `5px 8px 5px ${8 + indent}px`,
                    border: `1px solid ${selected ? "var(--accent)" : "transparent"}`,
                    borderRadius: 6,
                    background: selected ? "var(--bg-selected)" : item.active ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 18,
                    height: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: 4,
                    border: `1px solid ${item.role === "user" ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)"}`,
                    color: item.role === "user" ? "var(--accent)" : "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                  }}>
                    {roleLabel(item)}
                  </span>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: current ? "var(--accent)" : item.active ? "var(--text-muted)" : "var(--border)",
                  }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                    {item.label}
                  </span>
                  {item.childCount > 1 && (
                    <span style={{ color: "var(--accent)", fontSize: 10, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      {item.childCount} branches
                    </span>
                  )}
                  {current && <span style={{ color: "var(--accent)", fontSize: 10, flexShrink: 0 }}>current</span>}
                  <span style={{ color: "var(--text-dim)", fontSize: 10, flexShrink: 0 }}>{formatTimestamp(item.timestamp)}</span>
                </button>
              );
            })
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px", background: "var(--bg-panel)" }}>
          {error && <div style={{ marginBottom: 8, color: "#ef4444", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
              {filteredItems.length} of {items.length} entries · ↑/↓ select · Enter continue
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={navigating !== null}
                style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text-muted)", cursor: navigating ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void navigate(true)}
                disabled={!selectedId || selectedIsCurrent || navigating !== null}
                title={selectedIsCurrent ? "The selected entry is already current" : "Summarize the branch being left before navigating"}
                style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text-muted)", cursor: !selectedId || selectedIsCurrent || navigating ? "not-allowed" : "pointer", opacity: !selectedId || selectedIsCurrent ? 0.5 : 1 }}
              >
                {navigating === "summary" ? "Summarizing..." : "Continue with summary"}
              </button>
              <button
                type="button"
                onClick={() => void navigate(false)}
                disabled={!selectedId || navigating !== null}
                style={{ padding: "7px 12px", border: "1px solid var(--accent)", borderRadius: 6, background: "var(--accent)", color: "#fff", cursor: !selectedId || navigating ? "not-allowed" : "pointer", opacity: !selectedId ? 0.5 : 1 }}
              >
                {navigating === "plain" ? "Navigating..." : selectedIsCurrent ? "Stay here" : "Continue here"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
