-- Phase 4: POS Integration Migration
-- Adds product-ingredient linking and sellable ingredient auto-sync

-- AlterTable: Add POS-Ingredient linking fields to products
ALTER TABLE "products" ADD COLUMN "linked_ingredient_id" INTEGER;
ALTER TABLE "products" ADD COLUMN "needs_pricing" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Unique constraint on linked_ingredient_id
CREATE UNIQUE INDEX "products_linked_ingredient_id_key" ON "products"("linked_ingredient_id");

-- AlterTable: Add sellable/sync fields to ingredients
ALTER TABLE "ingredients" ADD COLUMN "sellable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ingredients" ADD COLUMN "linked_product_id" INTEGER;
ALTER TABLE "ingredients" ADD COLUMN "sync_status" TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE "ingredients" ADD COLUMN "sync_error" TEXT;
ALTER TABLE "ingredients" ADD COLUMN "last_sync_at" TIMESTAMP(3);

-- CreateIndex: Unique constraint on linked_product_id
CREATE UNIQUE INDEX "ingredients_linked_product_id_key" ON "ingredients"("linked_product_id");

-- AddForeignKey: Product -> Ingredient (for linked ingredient)
ALTER TABLE "products" ADD CONSTRAINT "products_linked_ingredient_id_fkey" FOREIGN KEY ("linked_ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
