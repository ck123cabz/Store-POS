-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "hourly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "employment_status" TEXT NOT NULL DEFAULT 'Active',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "user_id" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_logs" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "shift_template_id" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "hours_worked" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "calculated_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paid_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "payment_method" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "shift_logs_employee_id_idx" ON "shift_logs"("employee_id");

-- CreateIndex
CREATE INDEX "shift_logs_date_idx" ON "shift_logs"("date");

-- CreateIndex
CREATE INDEX "payment_records_employee_id_idx" ON "payment_records"("employee_id");

-- AddColumn
ALTER TABLE "settings" ADD COLUMN "pay_period_type" TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE "settings" ADD COLUMN "pay_period_start_day" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_shift_template_id_fkey" FOREIGN KEY ("shift_template_id") REFERENCES "shift_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
