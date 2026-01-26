-- AlterTable
ALTER TABLE "users" ADD COLUMN     "perm_audit_log" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "perm_reports" BOOLEAN NOT NULL DEFAULT false;
