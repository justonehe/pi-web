import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { imageMimeForPath, resolveTempImagePath } from "@/lib/temp-image-file";

export const dynamic = "force-dynamic";

/**
 * Serve an image file that lives inside the temp dir (e.g. images attached
 * under non-vision models, written as `pi-web-<uuid>.<ext>`). Only temp-dir
 * image files are readable — arbitrary paths are rejected.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("path") ?? "";
  const filePath = resolveTempImagePath(raw);
  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }
  const mime = imageMimeForPath(filePath);
  if (!mime) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const data = readFileSync(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
