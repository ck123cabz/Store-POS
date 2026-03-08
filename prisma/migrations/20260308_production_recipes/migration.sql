-- CreateEnum: IngredientType
CREATE TYPE "IngredientType" AS ENUM ('RAW', 'PREPARED');

-- Add type column to ingredients (default RAW for all existing rows)
ALTER TABLE "ingredients" ADD COLUMN "type" "IngredientType" NOT NULL DEFAULT 'RAW';

-- Add batch_yield to ingredients (how many base units one batch produces)
-- Only meaningful for PREPARED ingredients. NULL for RAW.
ALTER TABLE "ingredients" ADD COLUMN "batch_yield" DECIMAL(12,4) NULL;

-- CreateTable: production_recipe_items
CREATE TABLE "production_recipe_items" (
    "id" SERIAL NOT NULL,
    "output_ingredient_id" INTEGER NOT NULL,
    "input_ingredient_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "base_quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unit_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_recipe_items_pkey" PRIMARY KEY ("id")
);

-- Unique: one input ingredient per production recipe
CREATE UNIQUE INDEX "production_recipe_items_output_ingredient_id_input_ingredient_id_key"
    ON "production_recipe_items"("output_ingredient_id", "input_ingredient_id");

-- Foreign keys
ALTER TABLE "production_recipe_items"
    ADD CONSTRAINT "production_recipe_items_output_ingredient_id_fkey"
    FOREIGN KEY ("output_ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_recipe_items"
    ADD CONSTRAINT "production_recipe_items_input_ingredient_id_fkey"
    FOREIGN KEY ("input_ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_recipe_items"
    ADD CONSTRAINT "production_recipe_items_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for querying "what production recipes use this ingredient?"
CREATE INDEX "production_recipe_items_input_ingredient_id_idx"
    ON "production_recipe_items"("input_ingredient_id");
