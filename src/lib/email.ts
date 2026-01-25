import { Resend } from "resend"

// Lazy initialization to avoid errors during build when API key is not present
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is not configured. Email functionality is disabled."
      )
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

interface SendReceiptEmailParams {
  to: string
  storeName: string
  orderId: number
  total: string
  pdfBuffer: Buffer
}

export async function sendReceiptEmail({
  to,
  storeName,
  orderId,
  total,
  pdfBuffer,
}: SendReceiptEmailParams) {
  const resend = getResendClient()
  const fromDomain = process.env.RESEND_DOMAIN || "resend.dev"

  const { data, error } = await resend.emails.send({
    from: `${storeName} <receipts@${fromDomain}>`,
    to,
    subject: `Receipt #${orderId} - ${storeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Thank you for your purchase!</h2>
        <p>Your receipt for order #${orderId} is attached to this email.</p>
        <p style="font-size: 18px; font-weight: bold; color: #333;">Total: ${total}</p>
        <br/>
        <p style="color: #666;">Thank you for shopping with us!</p>
        <p style="color: #333; font-weight: bold;">${storeName}</p>
      </div>
    `,
    attachments: [
      {
        filename: `receipt-${orderId}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  })

  if (error) {
    throw error
  }

  return data
}
