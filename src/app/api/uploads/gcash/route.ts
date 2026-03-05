import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed MIME types for images
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
type AllowedMimeType = (typeof ALLOWED_TYPES)[number]

// Magic number signatures for validating actual file content
const MAGIC_NUMBERS: Record<AllowedMimeType, { signature: number[]; offset: number }[]> = {
  "image/jpeg": [
    { signature: [0xff, 0xd8, 0xff], offset: 0 },
  ],
  "image/png": [
    { signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  ],
  "image/webp": [
    { signature: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  ],
}

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

  if (mimeType === "image/webp") {
    const webpSignature = [0x57, 0x45, 0x42, 0x50]
    const hasWebpSignature = webpSignature.every(
      (byte, index) => buffer[8 + index] === byte
    )
    if (!hasWebpSignature) return false
  }

  return true
}

/**
 * POST /api/uploads/gcash
 * Upload a GCash payment confirmation photo.
 * Returns a base64 data URL for database storage (no filesystem writes).
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || ""

    let fileBuffer: Buffer
    let mimeType = "image/jpeg"

    if (contentType.includes("application/json")) {
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

      const { photoData } = body as Record<string, unknown>

      if (!photoData || typeof photoData !== "string") {
        return NextResponse.json(
          { error: "photoData is required and must be a string" },
          { status: 400 }
        )
      }

      // Validate base64 data URI
      const match = photoData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
      if (!match) {
        return NextResponse.json(
          { error: "Invalid image data format. Expected base64 data URI with jpeg, png, or webp" },
          { status: 400 }
        )
      }

      mimeType = match[1] as AllowedMimeType
      const base64Data = match[2]

      if (!ALLOWED_TYPES.includes(mimeType as AllowedMimeType)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
          { status: 400 }
        )
      }

      try {
        fileBuffer = Buffer.from(base64Data, "base64")
      } catch {
        return NextResponse.json(
          { error: "Invalid base64 encoding" },
          { status: 400 }
        )
      }

      if (fileBuffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }

      if (!validateImageMagicNumber(fileBuffer, mimeType as AllowedMimeType)) {
        return NextResponse.json(
          { error: "File content does not match claimed image type" },
          { status: 400 }
        )
      }

      // Return the data URL as-is — it's already in the right format
      return NextResponse.json({ path: photoData })

    } else if (contentType.includes("multipart/form-data")) {
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

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "No photo file provided" },
          { status: 400 }
        )
      }

      mimeType = file.type
      if (!ALLOWED_TYPES.includes(mimeType as AllowedMimeType)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }

      if (file.size === 0) {
        return NextResponse.json(
          { error: "Empty file provided" },
          { status: 400 }
        )
      }

      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)

      if (!validateImageMagicNumber(fileBuffer, mimeType as AllowedMimeType)) {
        return NextResponse.json(
          { error: "File content does not match claimed image type" },
          { status: 400 }
        )
      }

      // Convert to base64 data URL
      const base64 = fileBuffer.toString("base64")
      const dataUrl = `data:${mimeType};base64,${base64}`

      return NextResponse.json({ path: dataUrl })

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
