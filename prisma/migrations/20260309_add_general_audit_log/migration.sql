-- General-purpose audit log table for tracking all entity changes
CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "entity" TEXT NOT NULL,
  "entity_id" INTEGER,
  "action" TEXT NOT NULL,
  "changes" JSONB,
  "summary" TEXT NOT NULL,
  "user_id" INTEGER,
  "user_name" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
