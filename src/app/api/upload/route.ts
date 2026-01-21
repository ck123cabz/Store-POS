import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate timestamp-based filename
    const ext = path.extname(file.name)
    const filename = `${Date.now()}${ext}`

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    // Write file
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    return NextResponse.json({ filename })
  } catch {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
