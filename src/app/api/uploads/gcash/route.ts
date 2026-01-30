import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

// GCash proof photos are stored in public/uploads/gcash-proofs/
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "gcash-proofs")

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed MIME types for images
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
type AllowedMimeType = (typeof ALLOWED_TYPES)[number]

// Magic number signatures for validating actual file content
// These are the first bytes of valid image files
const MAGIC_NUMBERS: Record<AllowedMimeType, { signature: number[]; offset: number }[]> = {
  "image/jpeg": [
    { signature: [0xff, 0xd8, 0xff], offset: 0 }, // JPEG/JFIF
  ],
  "image/png": [
    { signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 }, // PNG
  ],
  "image/webp": [
    { signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header
    // WebP also has "WEBP" at offset 8, checked separately
  ],
}

/**
 * Validate file content by checking magic numbers (file signatures)
 * This prevents uploading malicious files disguised as images
 */
function validateImageMagicNumber(buffer: Buffer, mimeType: AllowedMimeType): boolean {
  if (buffer.length < 12) return false

  const signatures = MAGIC_NUMBERS[mimeType]
  if (!signatures) return false

  for (const { signature, offset } of signatures) {
    const matches = signature.every(
      (byte, index) => buffer[offset + index] === byte
    )
    if (!matches) return false
  }

  // Additional check for WebP: verify "WEBP" signature at offset 8
  if (mimeType === "image/webp") {
    const webpSignature = [0x57, 0x45, 0x42, 0x50] // "WEBP"
    const hasWebpSignature = webpSignature.every(
      (byte, index) => buffer[8 + index] === byte
    )
    if (!hasWebpSignature) return false
  }

  return true
}

/**
 * Sanitize transaction ID to prevent path traversal and special characters
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function sanitizeTransactionId(txId: string | null | undefined): string {
  if (!txId || typeof txId !== "string") return ""
  // Remove any characters that aren't alphanumeric, hyphen, or underscore
  // Also limit length to prevent abuse
  const sanitized = txId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)
  return sanitized ? `-tx${sanitized}` : ""
}

/**
 * Generate a cryptographically secure unique filename
 */
function generateSecureFilename(extension: string, transactionId?: string | null): string {
  const timestamp = Date.now()
  const randomPart = crypto.randomBytes(8).toString("hex")
  const txPart = sanitizeTransactionId(transactionId)
  return `gcash-${timestamp}-${randomPart}${txPart}.${extension}`
}

/**
 * POST /api/uploads/gcash
 * Upload a GCash payment confirmation photo
 *
 * Accepts:
 * - multipart/form-data with "photo" field containing the image file
 * - application/json with "photoData" field containing base64 image data
 *
 * Returns:
 * - { path: string } - The public path to the uploaded file
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    const contentType = request.headers.get("content-type") || ""

    let fileBuffer: Buffer
    let fileExtension = "jpg"
    let mimeType = "image/jpeg"

    if (contentType.includes("application/json")) {
      // Handle base64 JSON upload
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        )
      }

      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { error: "Request body must be an object" },
          { status: 400 }
        )
      }

      const { photoData, transactionId } = body as Record<string, unknown>

      if (!photoData || typeof photoData !== "string") {
        return NextResponse.json(
          { error: "photoData is required and must be a string" },
          { status: 400 }
        )
      }

      // Validate and parse base64 data URI with strict MIME type matching
      // Only allow specific image types, not arbitrary patterns
      const match = photoData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
      if (!match) {
        return NextResponse.json(
          { error: "Invalid image data format. Expected base64 data URI with jpeg, png, or webp" },
          { status: 400 }
        )
      }

      mimeType = match[1] as AllowedMimeType
      const base64Data = match[2]

      // Double-check MIME type is in allowed list (defense in depth)
      if (!ALLOWED_TYPES.includes(mimeType as AllowedMimeType)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
          { status: 400 }
        )
      }

      // Determine file extension
      fileExtension = mimeType.split("/")[1]
      if (fileExtension === "jpeg") fileExtension = "jpg"

      // Decode base64
      try {
        fileBuffer = Buffer.from(base64Data, "base64")
      } catch {
        return NextResponse.json(
          { error: "Invalid base64 encoding" },
          { status: 400 }
        )
      }

      // Validate file size
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }

      // Validate actual file content matches claimed MIME type (magic number check)
      if (!validateImageMagicNumber(fileBuffer, mimeType as AllowedMimeType)) {
        return NextResponse.json(
          { error: "File content does not match claimed image type" },
          { status: 400 }
        )
      }

      // Generate secure unique filename
      const filename = generateSecureFilename(fileExtension, transactionId as string | null)

      // Write file with explicit path construction to prevent traversal
      const filePath = path.join(UPLOAD_DIR, path.basename(filename))
      await writeFile(filePath, fileBuffer, { mode: 0o644 })

      // Return public path
      const publicPath = `/uploads/gcash-proofs/${filename}`
      return NextResponse.json({ path: publicPath })

    } else if (contentType.includes("multipart/form-data")) {
      // Handle form data upload
      let formData: FormData
      try {
        formData = await request.formData()
      } catch {
        return NextResponse.json(
          { error: "Invalid form data" },
          { status: 400 }
        )
      }

      const file = formData.get("photo")
      const transactionId = formData.get("transactionId")

      // Validate file exists and is a File object
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "No photo file provided" },
          { status: 400 }
        )
      }

      // Validate file type from request (will verify with magic numbers after reading)
      mimeType = file.type
      if (!ALLOWED_TYPES.includes(mimeType as AllowedMimeType)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
          { status: 400 }
        )
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }

      // Validate file size is not zero
      if (file.size === 0) {
        return NextResponse.json(
          { error: "Empty file provided" },
          { status: 400 }
        )
      }

      // Determine file extension
      fileExtension = mimeType.split("/")[1]
      if (fileExtension === "jpeg") fileExtension = "jpg"

      // Read file data
      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)

      // Validate actual file content matches claimed MIME type (magic number check)
      // This prevents uploading malicious files with spoofed MIME types
      if (!validateImageMagicNumber(fileBuffer, mimeType as AllowedMimeType)) {
        return NextResponse.json(
          { error: "File content does not match claimed image type" },
          { status: 400 }
        )
      }

      // Generate secure unique filename (transactionId is sanitized inside the function)
      const txIdValue = typeof transactionId === "string" ? transactionId : null
      const filename = generateSecureFilename(fileExtension, txIdValue)

      // Write file with explicit path construction to prevent traversal
      const filePath = path.join(UPLOAD_DIR, path.basename(filename))
      await writeFile(filePath, fileBuffer, { mode: 0o644 })

      // Return public path
      const publicPath = `/uploads/gcash-proofs/${filename}`
      return NextResponse.json({ path: publicPath })

    } else {
      return NextResponse.json(
        { error: "Unsupported content type. Use multipart/form-data or application/json" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("GCash upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
