-- Externalize hardcoded business values into Settings
-- All columns have defaults matching current hardcoded values → zero-downtime, backward-compatible

-- Business Rules
ALTER TABLE "settings" ADD COLUMN "void_window_days" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "settings" ADD COLUMN "void_reasons" JSONB NOT NULL DEFAULT '["Wrong Items","Test Transaction","Customer Dispute","Duplicate Entry","Other"]';
ALTER TABLE "settings" ADD COLUMN "waste_reasons" JSONB NOT NULL DEFAULT '["Expired","Spoiled","Overproduction","Prep Waste","Dropped/Spilled","Quality Issue","Customer Return","Other"]';

-- Daypart Boundaries (hour 0-23)
ALTER TABLE "settings" ADD COLUMN "daypart_morning_start" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "settings" ADD COLUMN "daypart_midday_start" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "settings" ADD COLUMN "daypart_afternoon_start" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "settings" ADD COLUMN "daypart_evening_start" INTEGER NOT NULL DEFAULT 18;

-- Kitchen Alerts (minutes)
ALTER TABLE "settings" ADD COLUMN "kitchen_warning_minutes" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "settings" ADD COLUMN "kitchen_danger_minutes" INTEGER NOT NULL DEFAULT 10;

-- Inventory Thresholds
ALTER TABLE "settings" ADD COLUMN "low_stock_critical_ratio" DECIMAL(3,2) NOT NULL DEFAULT 0.25;
ALTER TABLE "settings" ADD COLUMN "low_stock_warning_ratio" DECIMAL(3,2) NOT NULL DEFAULT 0.50;
ALTER TABLE "settings" ADD COLUMN "stock_critical_max" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "settings" ADD COLUMN "stock_low_max" INTEGER NOT NULL DEFAULT 20;

-- Financial Rules
ALTER TABLE "settings" ADD COLUMN "credit_warning_threshold" DECIMAL(3,2) NOT NULL DEFAULT 0.80;
ALTER TABLE "settings" ADD COLUMN "suggested_price_markup" DECIMAL(4,2) NOT NULL DEFAULT 1.50;

-- Category: isBeverage flag
ALTER TABLE "categories" ADD COLUMN "is_beverage" BOOLEAN NOT NULL DEFAULT false;

-- Preserve existing behavior: category ID 2 was hardcoded as beverage
UPDATE "categories" SET "is_beverage" = true WHERE "id" = 2;
