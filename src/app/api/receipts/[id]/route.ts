import { NextRequest, NextResponse } from "next/server"
import { generateReceiptPDF } from "@/lib/receipt-pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const transactionId = parseInt(id, 10)

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      )
    }

    const pdfBuffer = await generateReceiptPDF(transactionId)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${id}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Receipt generation error:", error)

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate receipt"

    return NextResponse.json(
      { error: errorMessage },
      { status: error instanceof Error && error.message === "Transaction not found" ? 404 : 500 }
    )
  }
}
