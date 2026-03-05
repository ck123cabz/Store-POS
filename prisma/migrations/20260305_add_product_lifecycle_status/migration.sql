-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNAVAILABLE', 'DISCONTINUED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "status_changed_at" TIMESTAMP(3),
ADD COLUMN "status_changed_by" TEXT;
