import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"
import { prisma } from "@/lib/prisma"

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 15,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  address: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  divider: {
    borderBottom: "1px dashed #999",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  label: {
    color: "#666",
  },
  itemsHeader: {
    flexDirection: "row",
    marginBottom: 4,
    borderBottom: "1px solid #ddd",
    paddingBottom: 2,
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  itemName: {
    flex: 1,
  },
  itemQty: {
    width: 30,
    textAlign: "center",
  },
  itemPrice: {
    width: 50,
    textAlign: "right",
  },
  totalSection: {
    marginTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  grandTotal: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 4,
    paddingTop: 4,
    borderTop: "1px solid #333",
  },
  footer: {
    marginTop: 15,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
})

interface ReceiptDocumentProps {
  transaction: {
    id: number
    orderNumber: number
    createdAt: Date
    subtotal: { toString: () => string }
    discount: { toString: () => string }
    taxAmount: { toString: () => string }
    total: { toString: () => string }
    paidAmount: { toString: () => string } | null
    changeAmount: { toString: () => string } | null
    paymentType: string
    tillNumber: number
    user: { fullname: string }
    customer: { name: string } | null
    items: Array<{
      productName: string
      quantity: number
      price: { toString: () => string }
    }>
  }
  settings: {
    storeName: string
    addressLine1: string
    addressLine2: string
    phone: string
    taxNumber: string
    currencySymbol: string
    taxPercentage: { toString: () => string }
    receiptFooter: string
  } | null
}

function ReceiptDocument({ transaction, settings }: ReceiptDocumentProps) {
  const symbol = settings?.currencySymbol || "$"
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Document>
      <Page size={[226, 600]} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.storeName}>
            {settings?.storeName || "Store"}
          </Text>
          {settings?.addressLine1 && (
            <Text style={styles.address}>{settings.addressLine1}</Text>
          )}
          {settings?.addressLine2 && (
            <Text style={styles.address}>{settings.addressLine2}</Text>
          )}
          {settings?.phone && (
            <Text style={styles.address}>Tel: {settings.phone}</Text>
          )}
          {settings?.taxNumber && (
            <Text style={styles.address}>VAT: {settings.taxNumber}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Order Info */}
        <View style={styles.row}>
          <Text>Order #: {transaction.orderNumber}</Text>
          <Text>{formatDate(transaction.createdAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Cashier: {transaction.user.fullname}</Text>
          <Text>Till: {transaction.tillNumber}</Text>
        </View>
        {transaction.customer && (
          <View style={styles.row}>
            <Text>Customer: {transaction.customer.name}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Items Header */}
        <View style={styles.itemsHeader}>
          <Text style={[styles.itemName, { fontWeight: "bold" }]}>Item</Text>
          <Text style={[styles.itemQty, { fontWeight: "bold" }]}>Qty</Text>
          <Text style={[styles.itemPrice, { fontWeight: "bold" }]}>Price</Text>
        </View>

        {/* Items */}
        {transaction.items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.productName}</Text>
            <Text style={styles.itemQty}>{item.quantity}</Text>
            <Text style={styles.itemPrice}>
              {symbol}
              {item.price.toString()}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>
              {symbol}
              {transaction.subtotal.toString()}
            </Text>
          </View>

          {parseFloat(transaction.discount.toString()) > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>
                -{symbol}
                {transaction.discount.toString()}
              </Text>
            </View>
          )}

          {parseFloat(transaction.taxAmount.toString()) > 0 && (
            <View style={styles.totalRow}>
              <Text>
                Tax ({settings?.taxPercentage?.toString() || "0"}%)
              </Text>
              <Text>
                {symbol}
                {transaction.taxAmount.toString()}
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>TOTAL</Text>
            <Text>
              {symbol}
              {transaction.total.toString()}
            </Text>
          </View>

          {transaction.paidAmount && (
            <View style={styles.totalRow}>
              <Text>Paid ({transaction.paymentType})</Text>
              <Text>
                {symbol}
                {transaction.paidAmount.toString()}
              </Text>
            </View>
          )}

          {transaction.changeAmount && (
            <View style={styles.totalRow}>
              <Text>Change</Text>
              <Text>
                {symbol}
                {transaction.changeAmount.toString()}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        {settings?.receiptFooter && (
          <View style={styles.footer}>
            <Text>{settings.receiptFooter}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

export async function generateReceiptPDF(
  transactionId: number
): Promise<Buffer> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      customer: true,
      items: true,
      user: {
        select: { fullname: true },
      },
    },
  })

  if (!transaction) {
    throw new Error("Transaction not found")
  }

  const settings = await prisma.settings.findFirst()

  const buffer = await renderToBuffer(
    <ReceiptDocument transaction={transaction} settings={settings} />
  )

  return Buffer.from(buffer)
}
