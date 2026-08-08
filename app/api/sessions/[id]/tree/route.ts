import { NextResponse } from "next/server";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { resolveSessionPath } from "@/lib/session-reader";
import { flattenSessionTree } from "@/lib/session-tree";
import type { SessionTreeNode } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const filePath = await resolveSessionPath(id);
    if (!filePath) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionManager = SessionManager.open(filePath);
    const leafId = sessionManager.getLeafId();
    const items = flattenSessionTree(
      sessionManager.getTree() as unknown as SessionTreeNode[],
      leafId,
    );

    return NextResponse.json({ items, leafId });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
