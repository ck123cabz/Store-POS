-- AlterTable: Add requiresKitchen to categories
ALTER TABLE "categories" ADD COLUMN "requires_kitchen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add requiresKitchen to products (nullable for override)
ALTER TABLE "products" ADD COLUMN "requires_kitchen" BOOLEAN;

-- CreateTable: kitchen_orders
CREATE TABLE "kitchen_orders" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "order_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cooking_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "served_at" TIMESTAMP(3),
    "is_rush" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "kitchen_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: kitchen_order_items
CREATE TABLE "kitchen_order_items" (
    "id" SERIAL NOT NULL,
    "kitchen_order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "kitchen_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kitchen_orders_status_idx" ON "kitchen_orders"("status");

-- CreateIndex
CREATE INDEX "kitchen_orders_sent_at_idx" ON "kitchen_orders"("sent_at");

-- AddForeignKey
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_kitchen_order_id_fkey" FOREIGN KEY ("kitchen_order_id") REFERENCES "kitchen_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
