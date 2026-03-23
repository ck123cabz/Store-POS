-- ═══════════════════════════════════════════════════════════════════════════════
-- REMOVE LINKED VARIANT SYSTEM
-- Collapse linked variant → recipe. Remove sellable/sync fields from
-- PurchaseVariant and linkedVariantId/needsPricing from Product.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Drop FK constraint on products.linked_variant_id ───────────────────────
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_linked_variant_id_fkey";

-- ─── Drop unique index on products.linked_variant_id ────────────────────────
DROP INDEX IF EXISTS "products_linked_variant_id_key";

-- ─── Drop unique index on purchase_variants.linked_product_id ───────────────
DROP INDEX IF EXISTS "purchase_variants_linked_product_id_key";

-- ─── Remove columns from products ──────────────────────────────────────────
ALTER TABLE "products" DROP COLUMN IF EXISTS "linked_variant_id";
ALTER TABLE "products" DROP COLUMN IF EXISTS "needs_pricing";

-- ─── Remove columns from purchase_variants ─────────────────────────────────
ALTER TABLE "purchase_variants" DROP COLUMN IF EXISTS "sellable";
ALTER TABLE "purchase_variants" DROP COLUMN IF EXISTS "sell_price";
ALTER TABLE "purchase_variants" DROP COLUMN IF EXISTS "linked_product_id";
ALTER TABLE "purchase_variants" DROP COLUMN IF EXISTS "sync_status";
ALTER TABLE "purchase_variants" DROP COLUMN IF EXISTS "sync_error";
ALTER TABLE "purchase_variants" DROP COLUMN IF EXISTS "last_sync_at";
