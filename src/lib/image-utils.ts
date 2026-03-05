/**
 * Resolve an image source from the stored value.
 *
 * New uploads store a full data URL (data:image/...;base64,...).
 * Legacy uploads stored just a filename (e.g. "1709234567.jpg").
 *
 * This helper returns the value ready to use as an <img> or <Image> src.
 */
export function getImageSrc(storedValue: string): string {
  if (!storedValue) return ""
  // Already a data URL — use as-is
  if (storedValue.startsWith("data:")) return storedValue
  // Legacy filename — prepend the old uploads path
  return `/uploads/${storedValue}`
}

/**
 * Check if a stored image value is a data URL (base64).
 * Used to set `unoptimized` on next/image for data URLs.
 */
export function isDataUrl(src: string): boolean {
  return src.startsWith("data:")
}

/**
 * Convert a File to a base64 data URL string.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString("base64")
  return `data:${file.type};base64,${base64}`
}
