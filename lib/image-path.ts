/**
 * Client-safe helpers for detecting image file paths inside message text.
 * No Node.js imports — usable from browser components.
 */

/** Trailing punctuation that may follow a path token inside running text. */
const TRAILING_TRIM_RE = /[，。；：！？,.!?;:()\[\]{}"'`]+$/u;

/** Token-level matcher for absolute image paths inside message text. */
const IMAGE_PATH_TOKEN_RE = /(?<![\w.:/])\/[^\s"'`]+\.(?:png|jpe?g|gif|webp|bmp)\b/gi;

/** A non-empty image path token, or null. */
export function cleanImagePathToken(token: string): string | null {
  const cleaned = token.replace(TRAILING_TRIM_RE, "");
  if (!cleaned.startsWith("/")) return null;
  return cleaned;
}

/**
 * Extract absolute image file paths from message text. Each token must be an
 * absolute path ending in a known image extension; trailing punctuation is
 * tolerated so paths inside running text still match.
 */
export function extractImagePaths(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of text.matchAll(IMAGE_PATH_TOKEN_RE)) {
    const cleaned = cleanImagePathToken(match[0]);
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      result.push(cleaned);
    }
  }
  return result;
}

/**
 * Same matcher as extractImagePaths, for removing image path tokens (plus any
 * trailing punctuation) from message text before rendering.
 */
export function IMAGE_PATH_TOKEN_GLOBAL_RE(): RegExp {
  return /(?<![\w.:/])\/[^\s"'`]+\.(?:png|jpe?g|gif|webp|bmp)\b[，。；：！？,.!?;:()\[\]{}"'`]*/gi;
}
