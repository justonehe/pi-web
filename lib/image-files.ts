import { randomUUID } from "crypto";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const NON_VISION_IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
};

function extensionForImageMimeType(mimeType: string): string | null {
  return NON_VISION_IMAGE_EXT[mimeType] ?? null;
}

/**
 * Save attached images into the temp dir and return their absolute paths.
 * Mirrors the TUI's clipboard-image behavior so non-vision models can still
 * read the file (and run OCR) instead of silently dropping the image.
 */
export function imagesToTempFiles(images: Array<{ data: string; mimeType: string }>): string[] {
  const paths: string[] = [];
  for (const image of images) {
    const ext = extensionForImageMimeType(image.mimeType) ?? "png";
    const filePath = join(tmpdir(), `pi-web-${randomUUID()}.${ext}`);
    writeFileSync(filePath, Buffer.from(image.data, "base64"));
    paths.push(filePath);
  }
  return paths;
}

/** Whether a model's input modalities include images. Unknown models count as vision-capable. */
export function modelSupportsImages(input: Array<"text" | "image"> | undefined): boolean {
  return input?.includes("image") ?? true;
}
