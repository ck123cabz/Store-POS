-- CreateTable
CREATE TABLE "inventory_count_drafts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_name" TEXT NOT NULL,
    "counts" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_count_drafts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "inventory_count_drafts" ADD CONSTRAINT "inventory_count_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
