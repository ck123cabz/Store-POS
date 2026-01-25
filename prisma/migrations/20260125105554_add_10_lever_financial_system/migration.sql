-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "perm_products" BOOLEAN NOT NULL DEFAULT false,
    "perm_categories" BOOLEAN NOT NULL DEFAULT false,
    "perm_transactions" BOOLEAN NOT NULL DEFAULT false,
    "perm_users" BOOLEAN NOT NULL DEFAULT false,
    "perm_settings" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "position" TEXT,
    "hourly_rate" DECIMAL(10,2),
    "start_date" TIMESTAMP(3),
    "employment_status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "track_stock" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "prep_time" INTEGER,
    "labor_cost" DECIMAL(10,2),
    "overhead_allocation" DECIMAL(10,2),
    "true_cost" DECIMAL(10,2),
    "true_margin" DECIMAL(10,2),
    "true_margin_percent" DECIMAL(5,2),
    "is_hero_item" BOOLEAN NOT NULL DEFAULT false,
    "speed_rating" TEXT,
    "ingredient_sharing" TEXT,
    "menu_decision" TEXT,
    "weekly_units_sold" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_type" TEXT,
    "traffic_source" TEXT,
    "first_visit" TIMESTAMP(3),
    "last_visit" TIMESTAMP(3),
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "lifetime_spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "avg_ticket" DECIMAL(10,2),
    "usual_order" TEXT,
    "is_regular" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "order_number" INTEGER NOT NULL,
    "ref_number" TEXT NOT NULL DEFAULT '',
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "customer_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2),
    "change_amount" DECIMAL(10,2),
    "payment_type" TEXT NOT NULL DEFAULT '',
    "payment_info" TEXT NOT NULL DEFAULT '',
    "till_number" INTEGER NOT NULL DEFAULT 1,
    "mac_address" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "weather" TEXT,
    "court_status" TEXT,
    "day_type" TEXT,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "is_drink_only" BOOLEAN NOT NULL DEFAULT false,
    "has_food_attached" BOOLEAN NOT NULL DEFAULT false,
    "is_group_order" BOOLEAN NOT NULL DEFAULT false,
    "daypart" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "app_mode" TEXT NOT NULL DEFAULT 'Point of Sale',
    "store_name" TEXT NOT NULL DEFAULT '',
    "address_line_1" TEXT NOT NULL DEFAULT '',
    "address_line_2" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "tax_number" TEXT NOT NULL DEFAULT '',
    "currency_symbol" TEXT NOT NULL DEFAULT '$',
    "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "charge_tax" BOOLEAN NOT NULL DEFAULT false,
    "receipt_footer" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cuisine_type" TEXT,
    "service_style" TEXT,
    "seats" INTEGER,
    "operating_days_per_week" INTEGER,
    "monthly_rent" DECIMAL(10,2),
    "target_food_cost_percent" DECIMAL(5,2),
    "target_labor_cost_percent" DECIMAL(5,2),
    "target_net_profit_percent" DECIMAL(5,2),
    "avg_hourly_labor_cost" DECIMAL(10,2),
    "target_ticket_size" DECIMAL(10,2),
    "target_rev_per_labor_hour" DECIMAL(10,2),
    "target_repeat_rate" DECIMAL(5,2),
    "target_destination_percent" DECIMAL(5,2),
    "target_true_margin_percent" DECIMAL(5,2),

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "payment_terms" TEXT,
    "account_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "cost_per_unit" DECIMAL(10,2) NOT NULL,
    "par_level" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3),
    "vendor_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_items" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_logs" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "estimated_cost" DECIMAL(10,2) NOT NULL,
    "preventable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vendor_id" INTEGER,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'Paid',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_logs" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "hours_worked" DECIMAL(4,2) NOT NULL,
    "ot_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "hourly_rate" DECIMAL(10,2) NOT NULL,
    "tips" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_pulse" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "revenue" DECIMAL(10,2) NOT NULL,
    "transactions" INTEGER NOT NULL,
    "avg_ticket" DECIMAL(10,2) NOT NULL,
    "upsells_attempted" INTEGER NOT NULL DEFAULT 0,
    "upsells_converted" INTEGER NOT NULL DEFAULT 0,
    "weather" TEXT,
    "court_status" TEXT,
    "best_seller" TEXT,
    "waste" TEXT,
    "vibe" TEXT,
    "one_thing" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_pulse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_scorecards" (
    "id" SERIAL NOT NULL,
    "week_starting" TIMESTAMP(3) NOT NULL,
    "total_revenue" DECIMAL(10,2) NOT NULL,
    "food_cost_percent" DECIMAL(5,2),
    "total_transactions" INTEGER NOT NULL,
    "avg_ticket" DECIMAL(10,2) NOT NULL,
    "best_daypart" TEXT,
    "worst_daypart" TEXT,
    "waste_cost" DECIMAL(10,2),
    "spoilage_percent" DECIMAL(5,2),
    "repeat_customers" INTEGER,
    "repeat_rate_percent" DECIMAL(5,2),
    "labor_hours" DECIMAL(6,2),
    "rev_per_labor_hour" DECIMAL(10,2),
    "destination_percent" DECIMAL(5,2),
    "upsell_attempts" INTEGER,
    "upsell_conversions" INTEGER,
    "upsell_rate_percent" DECIMAL(5,2),
    "week_focus" TEXT,
    "hero_item_pushed" TEXT,
    "win_of_week" TEXT,
    "problem_to_solve" TEXT,
    "overall_health" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmarks" (
    "id" SERIAL NOT NULL,
    "metric" TEXT NOT NULL,
    "low_good" DECIMAL(5,2),
    "target" DECIMAL(5,2),
    "high_warning" DECIMAL(5,2),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_order_number_key" ON "transactions"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_items_product_id_ingredient_id_key" ON "recipe_items"("product_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_pulse_date_key" ON "daily_pulse"("date");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_scorecards_week_starting_key" ON "weekly_scorecards"("week_starting");

-- CreateIndex
CREATE UNIQUE INDEX "benchmarks_metric_key" ON "benchmarks"("metric");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_logs" ADD CONSTRAINT "labor_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
