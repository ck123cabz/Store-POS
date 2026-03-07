-- ═══════════════════════════════════════════════════════════════════════════════
-- INGREDIENT UNIT SYSTEM REFACTOR
-- Full normalization: Unit reference table, PurchaseVariants, unified base-unit stock
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── STEP 1: Create Unit dimension enum and Unit/UnitConversion tables ────────

CREATE TYPE "UnitDimension" AS ENUM ('WEIGHT', 'VOLUME', 'COUNT');

CREATE TABLE "units" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "abbr" TEXT NOT NULL,
  "dimension" "UnitDimension" NOT NULL,
  "is_discrete" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "units_name_key" ON "units"("name");
CREATE UNIQUE INDEX "units_abbr_key" ON "units"("abbr");
CREATE INDEX "units_dimension_idx" ON "units"("dimension");

CREATE TABLE "unit_conversions" (
  "id" SERIAL PRIMARY KEY,
  "from_unit_id" INTEGER NOT NULL REFERENCES "units"("id"),
  "to_unit_id" INTEGER NOT NULL REFERENCES "units"("id"),
  "factor" DECIMAL(15,6) NOT NULL
);
CREATE UNIQUE INDEX "unit_conversions_from_unit_id_to_unit_id_key" ON "unit_conversions"("from_unit_id", "to_unit_id");

-- ─── STEP 2: Seed standard units ─────────────────────────────────────────────

INSERT INTO "units" ("id", "name", "abbr", "dimension", "is_discrete", "sort_order") VALUES
  -- Weight
  (1,  'g',     'g',     'WEIGHT', false, 1),
  (2,  'kg',    'kg',    'WEIGHT', false, 2),
  (3,  'oz',    'oz',    'WEIGHT', false, 3),
  (4,  'lb',    'lb',    'WEIGHT', false, 4),
  -- Volume
  (5,  'mL',    'mL',    'VOLUME', false, 10),
  (6,  'L',     'L',     'VOLUME', false, 11),
  (7,  'fl oz', 'fl oz', 'VOLUME', false, 12),
  (8,  'cup',   'cup',   'VOLUME', false, 13),
  (9,  'tbsp',  'tbsp',  'VOLUME', false, 14),
  (10, 'tsp',   'tsp',   'VOLUME', false, 15),
  (11, 'gal',   'gal',   'VOLUME', false, 16),
  -- Count
  (12, 'pcs',       'pcs',   'COUNT', true, 20),
  (13, 'each',      'ea',    'COUNT', true, 21),
  (14, 'dozen',     'doz',   'COUNT', true, 22),
  (15, 'bottle',    'btl',   'COUNT', true, 30),
  (16, 'can',       'can',   'COUNT', true, 31),
  (17, 'pack',      'pk',    'COUNT', true, 32),
  (18, 'box',       'box',   'COUNT', true, 33),
  (19, 'sack',      'sack',  'COUNT', true, 34),
  (20, 'bag',       'bag',   'COUNT', true, 35),
  (21, 'bundle',    'bdl',   'COUNT', true, 36),
  (22, 'container', 'ctr',   'COUNT', true, 37),
  (23, 'tank',      'tank',  'COUNT', true, 38);

SELECT setval('"units_id_seq"', 23, true);

-- ─── STEP 3: Seed standard unit conversions (bidirectional) ──────────────────

INSERT INTO "unit_conversions" ("from_unit_id", "to_unit_id", "factor") VALUES
  -- Weight: kg ↔ g
  (2, 1, 1000),       -- 1 kg = 1000 g
  (1, 2, 0.001),      -- 1 g = 0.001 kg
  -- Weight: lb ↔ g
  (4, 1, 453.592),    -- 1 lb = 453.592 g
  (1, 4, 0.002205),   -- 1 g = 0.002205 lb
  -- Weight: oz ↔ g
  (3, 1, 28.3495),    -- 1 oz = 28.3495 g
  (1, 3, 0.035274),   -- 1 g = 0.035274 oz
  -- Volume: L ↔ mL
  (6, 5, 1000),       -- 1 L = 1000 mL
  (5, 6, 0.001),      -- 1 mL = 0.001 L
  -- Volume: gal ↔ mL
  (11, 5, 3785.41),   -- 1 gal = 3785.41 mL
  (5, 11, 0.000264),  -- 1 mL = 0.000264 gal
  -- Volume: cup ↔ mL
  (8, 5, 240),        -- 1 cup = 240 mL
  (5, 8, 0.004167),   -- 1 mL = 0.004167 cup
  -- Volume: tbsp ↔ mL
  (9, 5, 15),         -- 1 tbsp = 15 mL
  (5, 9, 0.066667),   -- 1 mL = 0.066667 tbsp
  -- Volume: tsp ↔ mL
  (10, 5, 5),         -- 1 tsp = 5 mL
  (5, 10, 0.2),       -- 1 mL = 0.2 tsp
  -- Volume: fl oz ↔ mL
  (7, 5, 29.5735),    -- 1 fl oz = 29.5735 mL
  (5, 7, 0.033814),   -- 1 mL = 0.033814 fl oz
  -- Count: dozen ↔ pcs
  (14, 12, 12),       -- 1 dozen = 12 pcs
  (12, 14, 0.083333); -- 1 pcs = 0.083333 dozen

-- ─── STEP 4: Create PurchaseVariant table ────────────────────────────────────

CREATE TABLE "purchase_variants" (
  "id" SERIAL PRIMARY KEY,
  "ingredient_id" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "content_qty" DECIMAL(10,3) NOT NULL,
  "content_unit_id" INTEGER NOT NULL REFERENCES "units"("id"),
  "package_qty" INTEGER NOT NULL DEFAULT 1,
  "package_unit_id" INTEGER NOT NULL REFERENCES "units"("id"),
  "cost_per_variant" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "base_units_per_variant" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "sellable" BOOLEAN NOT NULL DEFAULT false,
  "sell_price" DECIMAL(10,2),
  "linked_product_id" INTEGER UNIQUE,
  "sync_status" TEXT NOT NULL DEFAULT 'synced',
  "sync_error" TEXT,
  "last_sync_at" TIMESTAMP(3),
  "vendor_id" INTEGER REFERENCES "vendors"("id"),
  "barcode" TEXT UNIQUE,
  "sku" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "purchase_variants_ingredient_id_idx" ON "purchase_variants"("ingredient_id");

-- ─── STEP 5: Add new columns to ingredients ──────────────────────────────────

ALTER TABLE "ingredients" ADD COLUMN "base_unit_id" INTEGER;
ALTER TABLE "ingredients" ADD COLUMN "stock_qty" DECIMAL(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "ingredients" ADD COLUMN "avg_cost_per_base_unit" DECIMAL(12,6) NOT NULL DEFAULT 0;
ALTER TABLE "ingredients" ADD COLUMN "count_unit_id" INTEGER;
-- par_level already exists as integer, we'll handle the type change after data migration

-- ─── STEP 6: Map existing baseUnit strings → unit IDs ────────────────────────

-- Helper: create a temp mapping table
CREATE TEMPORARY TABLE unit_name_map (old_name TEXT, unit_id INTEGER);
INSERT INTO unit_name_map VALUES
  ('kg', 2), ('g', 1), ('L', 6), ('liter', 6), ('l', 6), ('ml', 5), ('mL', 5),
  ('pcs', 12), ('pc', 12), ('piece', 12), ('pieces', 12),
  ('each', 13), ('ea', 13),
  ('bottle', 15), ('can', 16), ('pack', 17), ('box', 18),
  ('sack', 19), ('bag', 20), ('bundle', 21), ('container', 22), ('tank', 23),
  ('gallon', 11), ('gal', 11), ('dozen', 14);

-- Map baseUnit string → baseUnitId
UPDATE "ingredients" i
SET "base_unit_id" = COALESCE(
  (SELECT m.unit_id FROM unit_name_map m WHERE LOWER(m.old_name) = LOWER(i."base_unit") LIMIT 1),
  (SELECT m.unit_id FROM unit_name_map m WHERE LOWER(m.old_name) = LOWER(i."unit") LIMIT 1),
  12  -- default to 'pcs' if no match
);

-- ─── STEP 7: Migrate stock data ──────────────────────────────────────────────

-- Convert quantity (packages) → stockQty (base units): stockQty = quantity * packageSize
UPDATE "ingredients"
SET "stock_qty" = "quantity" * "package_size";

-- Compute avgCostPerBaseUnit = costPerPackage / packageSize (or costPerUnit for legacy)
UPDATE "ingredients"
SET "avg_cost_per_base_unit" = CASE
  WHEN "package_size" > 0 AND "cost_per_package" > 0 THEN "cost_per_package" / "package_size"
  WHEN "cost_per_unit" > 0 THEN "cost_per_unit"
  ELSE 0
END;

-- ─── STEP 8: Create one PurchaseVariant per existing Ingredient ──────────────

-- Map packageUnit strings to unit IDs for variants
INSERT INTO "purchase_variants" (
  "ingredient_id", "label", "content_qty", "content_unit_id", "package_qty",
  "package_unit_id", "cost_per_variant", "base_units_per_variant",
  "sellable", "sell_price", "linked_product_id", "sync_status", "sync_error", "last_sync_at",
  "vendor_id", "barcode", "is_default", "is_active"
)
SELECT
  i."id",
  COALESCE(i."package_unit", 'each'),  -- label
  i."package_size",                      -- content_qty
  i."base_unit_id",                      -- content_unit_id (same as base unit for default variant)
  1,                                     -- package_qty
  COALESCE(
    (SELECT m.unit_id FROM unit_name_map m WHERE LOWER(m.old_name) = LOWER(i."package_unit") LIMIT 1),
    i."base_unit_id"                     -- fall back to base unit
  ),
  i."cost_per_package",                  -- cost_per_variant
  i."package_size",                      -- base_units_per_variant
  i."sellable",
  i."sell_price",
  i."linked_product_id",
  i."sync_status",
  i."sync_error",
  i."last_sync_at",
  i."vendor_id",
  i."barcode",
  true,                                  -- isDefault
  i."is_active"
FROM "ingredients" i;

-- ─── STEP 9: Update Product links: linkedIngredientId → linkedVariantId ──────

ALTER TABLE "products" ADD COLUMN "linked_variant_id" INTEGER UNIQUE;

UPDATE "products" p
SET "linked_variant_id" = pv."id"
FROM "purchase_variants" pv
WHERE pv."linked_product_id" = p."id";

-- Also update the FK in purchase_variants to point correctly
UPDATE "purchase_variants" pv
SET "linked_product_id" = p."id"
FROM "products" p
WHERE p."linked_variant_id" = pv."id"
  AND pv."linked_product_id" IS NULL;

-- ─── STEP 10: Update RecipeItem: unit string → unitId ────────────────────────

ALTER TABLE "recipe_items" ADD COLUMN "unit_id" INTEGER;

UPDATE "recipe_items" ri
SET "unit_id" = (SELECT m.unit_id FROM unit_name_map m WHERE LOWER(m.old_name) = LOWER(ri."unit") LIMIT 1)
WHERE ri."unit" IS NOT NULL AND ri."unit" != '';

-- ─── STEP 11: Update WasteLog: add unitId and baseQuantity ──────────────────

ALTER TABLE "waste_logs" ADD COLUMN "unit_id" INTEGER;
ALTER TABLE "waste_logs" ADD COLUMN "base_quantity" DECIMAL(10,3) NOT NULL DEFAULT 0;

-- Set unitId from ingredient's base unit
UPDATE "waste_logs" wl
SET "unit_id" = i."base_unit_id",
    "base_quantity" = wl."quantity"
FROM "ingredients" i
WHERE wl."ingredient_id" = i."id";

-- Default any remaining nulls to pcs (12)
UPDATE "waste_logs" SET "unit_id" = 12 WHERE "unit_id" IS NULL;

-- ─── STEP 12: Update IngredientUnitAlias: add unitId ─────────────────────────

ALTER TABLE "ingredient_unit_aliases" ADD COLUMN "unit_id" INTEGER;

UPDATE "ingredient_unit_aliases" iua
SET "unit_id" = (SELECT m.unit_id FROM unit_name_map m WHERE LOWER(m.old_name) = LOWER(iua."name") LIMIT 1);

-- ─── STEP 13: Update IngredientHistory: add purchaseVariantId ────────────────

ALTER TABLE "ingredient_history" ADD COLUMN "purchase_variant_id" INTEGER;

-- ─── STEP 14: Convert parLevel from Int to Decimal ───────────────────────────
-- parLevel was Int (in packages), convert to Decimal (in base units)

-- First, store converted value
ALTER TABLE "ingredients" ADD COLUMN "par_level_new" DECIMAL(12,4) NOT NULL DEFAULT 0;
UPDATE "ingredients" SET "par_level_new" = "par_level" * "package_size";

-- ─── STEP 15: Make base_unit_id NOT NULL now that data is migrated ───────────

ALTER TABLE "ingredients" ALTER COLUMN "base_unit_id" SET NOT NULL;

-- ─── STEP 16: Add foreign key constraints ────────────────────────────────────

ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "units"("id");
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_count_unit_id_fkey" FOREIGN KEY ("count_unit_id") REFERENCES "units"("id");
ALTER TABLE "purchase_variants" ADD CONSTRAINT "purchase_variants_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE;
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id");
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id");
ALTER TABLE "ingredient_unit_aliases" ADD CONSTRAINT "ingredient_unit_aliases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id");
ALTER TABLE "products" ADD CONSTRAINT "products_linked_variant_id_fkey" FOREIGN KEY ("linked_variant_id") REFERENCES "purchase_variants"("id");

-- Make waste_logs.unit_id NOT NULL now
ALTER TABLE "waste_logs" ALTER COLUMN "unit_id" SET NOT NULL;

-- ─── STEP 17: Drop legacy columns ───────────────────────────────────────────

-- Drop the old par_level and rename the new one
ALTER TABLE "ingredients" DROP COLUMN "par_level";
ALTER TABLE "ingredients" RENAME COLUMN "par_level_new" TO "par_level";

-- Drop legacy ingredient columns
ALTER TABLE "ingredients" DROP COLUMN "base_unit";
ALTER TABLE "ingredients" DROP COLUMN "package_size";
ALTER TABLE "ingredients" DROP COLUMN "package_unit";
ALTER TABLE "ingredients" DROP COLUMN "cost_per_package";
ALTER TABLE "ingredients" DROP COLUMN "unit";
ALTER TABLE "ingredients" DROP COLUMN "cost_per_unit";
ALTER TABLE "ingredients" DROP COLUMN "quantity";
ALTER TABLE "ingredients" DROP COLUMN "count_by_base_unit";
ALTER TABLE "ingredients" DROP COLUMN "sellable";
ALTER TABLE "ingredients" DROP COLUMN "sell_price";
ALTER TABLE "ingredients" DROP COLUMN "linked_product_id";
ALTER TABLE "ingredients" DROP COLUMN "sync_status";
ALTER TABLE "ingredients" DROP COLUMN "sync_error";
ALTER TABLE "ingredients" DROP COLUMN "last_sync_at";
ALTER TABLE "ingredients" DROP COLUMN "barcode";

-- Drop recipe_items.unit string (replaced by unit_id FK)
ALTER TABLE "recipe_items" DROP COLUMN "unit";

-- Drop products.linked_ingredient_id (replaced by linked_variant_id)
ALTER TABLE "products" DROP COLUMN "linked_ingredient_id";

-- Drop temporary table
DROP TABLE IF EXISTS unit_name_map;
