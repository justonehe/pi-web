import { existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

/** True when the resolved path is a known image file inside the temp dir. */
export function isTempImagePath(candidate: string): boolean {
  return resolveTempImagePath(candidate) !== null;
}

/**
 * Resolve a client-supplied image path to a readable temp file, or null when
 * the path is not a temp-dir image (path traversal / arbitrary reads rejected).
 */
export function resolveTempImagePath(candidate: string): string | null {
  if (!candidate || !candidate.startsWith("/")) return null;
  const ext = path.extname(candidate).slice(1).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return null;
  const resolved = path.resolve(candidate);
  const tempPrefix = path.resolve(tmpdir()) + path.sep;
  if (!resolved.startsWith(tempPrefix)) return null;
  if (!existsSync(resolved)) return null;
  return resolved;
}

export function imageMimeForPath(filePath: string): string | null {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return IMAGE_MIME[ext] ?? null;
}
