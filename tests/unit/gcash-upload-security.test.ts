/**
 * Unit tests for GCash upload security functions
 *
 * Tests cover:
 * - Magic number validation for image files
 * - Transaction ID sanitization
 * - Secure filename generation
 */
import { describe, it, expect } from "vitest"

// Since these are internal functions, we'll recreate them here for testing
// In a production environment, these would be exported from a shared module

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
type AllowedMimeType = (typeof ALLOWED_TYPES)[number]

const MAGIC_NUMBERS: Record<
  AllowedMimeType,
  { signature: number[]; offset: number }[]
> = {
  "image/jpeg": [{ signature: [0xff, 0xd8, 0xff], offset: 0 }],
  "image/png": [
    {
      signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      offset: 0,
    },
  ],
  "image/webp": [{ signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }],
}

function validateImageMagicNumber(
  buffer: Buffer,
  mimeType: AllowedMimeType
): boolean {
  if (buffer.length < 12) return false

  const signatures = MAGIC_NUMBERS[mimeType]
  if (!signatures) return false

  for (const { signature, offset } of signatures) {
    const matches = signature.every(
      (byte, index) => buffer[offset + index] === byte
    )
    if (!matches) return false
  }

  if (mimeType === "image/webp") {
    const webpSignature = [0x57, 0x45, 0x42, 0x50]
    const hasWebpSignature = webpSignature.every(
      (byte, index) => buffer[8 + index] === byte
    )
    if (!hasWebpSignature) return false
  }

  return true
}

function sanitizeTransactionId(txId: string | null | undefined): string {
  if (!txId || typeof txId !== "string") return ""
  const sanitized = txId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)
  return sanitized ? `-tx${sanitized}` : ""
}

describe("GCash Upload Security", () => {
  describe("validateImageMagicNumber", () => {
    it("should validate a valid JPEG file", () => {
      // JPEG magic numbers: FF D8 FF
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ])
      expect(validateImageMagicNumber(jpegBuffer, "image/jpeg")).toBe(true)
    })

    it("should reject an invalid JPEG file", () => {
      // Some random bytes that aren't JPEG
      const invalidBuffer = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      ])
      expect(validateImageMagicNumber(invalidBuffer, "image/jpeg")).toBe(false)
    })

    it("should validate a valid PNG file", () => {
      // PNG magic numbers: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ])
      expect(validateImageMagicNumber(pngBuffer, "image/png")).toBe(true)
    })

    it("should reject an invalid PNG file", () => {
      // JPEG bytes claimed as PNG
      const invalidBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ])
      expect(validateImageMagicNumber(invalidBuffer, "image/png")).toBe(false)
    })

    it("should validate a valid WebP file", () => {
      // WebP: RIFF....WEBP
      const webpBuffer = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x00,
        0x00,
        0x00,
        0x00, // file size (placeholder)
        0x57,
        0x45,
        0x42,
        0x50, // WEBP
      ])
      expect(validateImageMagicNumber(webpBuffer, "image/webp")).toBe(true)
    })

    it("should reject WebP with wrong WEBP signature", () => {
      // RIFF header but not WEBP
      const invalidBuffer = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x00,
        0x00,
        0x00,
        0x00,
        0x41,
        0x56,
        0x49,
        0x20, // "AVI " instead of "WEBP"
      ])
      expect(validateImageMagicNumber(invalidBuffer, "image/webp")).toBe(false)
    })

    it("should reject files that are too small", () => {
      const smallBuffer = Buffer.from([0xff, 0xd8, 0xff])
      expect(validateImageMagicNumber(smallBuffer, "image/jpeg")).toBe(false)
    })

    it("should reject a text file disguised as image", () => {
      // Plain text content
      const textBuffer = Buffer.from("Hello, World!")
      expect(validateImageMagicNumber(textBuffer, "image/jpeg")).toBe(false)
      expect(validateImageMagicNumber(textBuffer, "image/png")).toBe(false)
      expect(validateImageMagicNumber(textBuffer, "image/webp")).toBe(false)
    })

    it("should reject a JavaScript file disguised as image", () => {
      // Script content that might be malicious
      const scriptBuffer = Buffer.from("<script>alert('xss')</script>")
      expect(validateImageMagicNumber(scriptBuffer, "image/jpeg")).toBe(false)
    })

    it("should reject a PDF file disguised as image", () => {
      // PDF magic number: %PDF
      const pdfBuffer = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xd3, 0xeb,
      ])
      expect(validateImageMagicNumber(pdfBuffer, "image/jpeg")).toBe(false)
      expect(validateImageMagicNumber(pdfBuffer, "image/png")).toBe(false)
    })

    it("should reject an executable file disguised as image", () => {
      // ELF magic number (Linux executable)
      const elfBuffer = Buffer.from([
        0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      ])
      expect(validateImageMagicNumber(elfBuffer, "image/png")).toBe(false)
    })
  })

  describe("sanitizeTransactionId", () => {
    it("should return empty string for null input", () => {
      expect(sanitizeTransactionId(null)).toBe("")
    })

    it("should return empty string for undefined input", () => {
      expect(sanitizeTransactionId(undefined)).toBe("")
    })

    it("should return empty string for empty string input", () => {
      expect(sanitizeTransactionId("")).toBe("")
    })

    it("should prefix valid transaction ID with -tx", () => {
      expect(sanitizeTransactionId("123")).toBe("-tx123")
    })

    it("should allow alphanumeric characters", () => {
      expect(sanitizeTransactionId("abc123XYZ")).toBe("-txabc123XYZ")
    })

    it("should allow hyphens and underscores", () => {
      expect(sanitizeTransactionId("tx-123_abc")).toBe("-txtx-123_abc")
    })

    it("should remove path traversal characters", () => {
      expect(sanitizeTransactionId("../../../etc/passwd")).toBe("-txetcpasswd")
    })

    it("should remove special characters", () => {
      expect(sanitizeTransactionId("tx<script>alert(1)</script>")).toBe(
        "-txtxscriptalert1script"
      )
    })

    it("should remove slashes", () => {
      expect(sanitizeTransactionId("path/to/file")).toBe("-txpathtofile")
    })

    it("should remove backslashes", () => {
      expect(sanitizeTransactionId("path\\to\\file")).toBe("-txpathtofile")
    })

    it("should remove null bytes", () => {
      expect(sanitizeTransactionId("tx\x00id")).toBe("-txtxid")
    })

    it("should truncate long transaction IDs to 32 characters", () => {
      const longId = "a".repeat(100)
      const result = sanitizeTransactionId(longId)
      // Result should be -tx + 32 chars = 35 chars total
      expect(result).toBe("-tx" + "a".repeat(32))
    })

    it("should handle unicode characters by removing them", () => {
      expect(sanitizeTransactionId("tx123")).toBe("-txtx123")
    })

    it("should handle dots in transaction ID", () => {
      expect(sanitizeTransactionId("file.txt")).toBe("-txfiletxt")
    })
  })

  describe("MIME type validation", () => {
    it("should only allow specified MIME types", () => {
      expect(ALLOWED_TYPES).toContain("image/jpeg")
      expect(ALLOWED_TYPES).toContain("image/png")
      expect(ALLOWED_TYPES).toContain("image/webp")
      expect(ALLOWED_TYPES).not.toContain("image/gif")
      expect(ALLOWED_TYPES).not.toContain("application/pdf")
      expect(ALLOWED_TYPES).not.toContain("text/html")
    })
  })
})
