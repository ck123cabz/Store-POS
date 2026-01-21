import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateReceiptPDF } from "@/lib/receipt-pdf"
import { sendReceiptEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      )
    }

    const transactionId = parseInt(id, 10)

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      )
    }

    // Fetch transaction to verify it exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Fetch settings for store name and currency symbol
    const settings = await prisma.settings.findFirst()

    // Generate the PDF
    const pdfBuffer = await generateReceiptPDF(transactionId)

    // Send the email with PDF attached
    const storeName = settings?.storeName || "Store"
    const currencySymbol = settings?.currencySymbol || "$"
    const total = `${currencySymbol}${transaction.total.toString()}`

    await sendReceiptEmail({
      to: email,
      storeName,
      orderId: transaction.orderNumber,
      total,
      pdfBuffer,
    })

    return NextResponse.json({
      success: true,
      message: `Receipt sent to ${email}`,
    })
  } catch (error) {
    console.error("Email receipt error:", error)

    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email receipt"

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
