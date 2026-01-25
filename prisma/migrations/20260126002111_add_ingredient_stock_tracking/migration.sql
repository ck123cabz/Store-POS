-- AlterTable: Add stock tracking fields to ingredients
ALTER TABLE "ingredients" ADD COLUMN     "quantity" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "ingredients" ADD COLUMN     "last_restock_date" TIMESTAMP(3);
ALTER TABLE "ingredients" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ingredients" ADD COLUMN     "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_barcode_key" ON "ingredients"("barcode");

-- CreateTable: IngredientHistory for audit trail
CREATE TABLE "ingredient_history" (
    "id" SERIAL NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "change_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT NOT NULL,
    "new_value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "reason_note" TEXT,
    "user_id" INTEGER NOT NULL,
    "user_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingredient_history_ingredient_id_idx" ON "ingredient_history"("ingredient_id");

-- CreateIndex
CREATE INDEX "ingredient_history_created_at_idx" ON "ingredient_history"("created_at");

-- CreateIndex
CREATE INDEX "ingredient_history_change_id_idx" ON "ingredient_history"("change_id");

-- AddForeignKey
ALTER TABLE "ingredient_history" ADD CONSTRAINT "ingredient_history_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
