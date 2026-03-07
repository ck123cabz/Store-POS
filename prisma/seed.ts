import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // ═══════════════════════════════════════════════════════════════════════════════
  // UNITS - Standard reference data (23 units)
  // ═══════════════════════════════════════════════════════════════════════════════

  const units = [
    // Weight
    { id: 1,  name: 'g',         abbr: 'g',     dimension: 'WEIGHT' as const, isDiscrete: false, sortOrder: 1 },
    { id: 2,  name: 'kg',        abbr: 'kg',    dimension: 'WEIGHT' as const, isDiscrete: false, sortOrder: 2 },
    { id: 3,  name: 'oz',        abbr: 'oz',    dimension: 'WEIGHT' as const, isDiscrete: false, sortOrder: 3 },
    { id: 4,  name: 'lb',        abbr: 'lb',    dimension: 'WEIGHT' as const, isDiscrete: false, sortOrder: 4 },
    // Volume
    { id: 5,  name: 'mL',        abbr: 'mL',    dimension: 'VOLUME' as const, isDiscrete: false, sortOrder: 10 },
    { id: 6,  name: 'L',         abbr: 'L',     dimension: 'VOLUME' as const, isDiscrete: false, sortOrder: 11 },
    { id: 7,  name: 'fl oz',     abbr: 'fl oz', dimension: 'VOLUME' as const, isDiscrete: false, sortOrder: 12 },
    { id: 8,  name: 'cup',       abbr: 'cup',   dimension: 'VOLUME' as const, isDiscrete: false, sortOrder: 13 },
    { id: 9,  name: 'tbsp',      abbr: 'tbsp',  dimension: 'VOLUME' as const, isDiscrete: false, sortOrder: 14 },
    { id: 10, name: 'tsp',       abbr: 'tsp',   dimension: 'VOLUME' as const, isDiscrete: false, sortOrder: 15 },
    { id: 11, name: 'gal',       abbr: 'gal',   dimension: 'VOLUME' as const, isDiscrete: false, sortOrder: 16 },
    // Count
    { id: 12, name: 'pcs',       abbr: 'pcs',   dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 20 },
    { id: 13, name: 'each',      abbr: 'ea',    dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 21 },
    { id: 14, name: 'dozen',     abbr: 'doz',   dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 22 },
    { id: 15, name: 'bottle',    abbr: 'btl',   dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 30 },
    { id: 16, name: 'can',       abbr: 'can',   dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 31 },
    { id: 17, name: 'pack',      abbr: 'pk',    dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 32 },
    { id: 18, name: 'box',       abbr: 'box',   dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 33 },
    { id: 19, name: 'sack',      abbr: 'sack',  dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 34 },
    { id: 20, name: 'bag',       abbr: 'bag',   dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 35 },
    { id: 21, name: 'bundle',    abbr: 'bdl',   dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 36 },
    { id: 22, name: 'container', abbr: 'ctr',   dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 37 },
    { id: 23, name: 'tank',      abbr: 'tank',  dimension: 'COUNT' as const, isDiscrete: true, sortOrder: 38 },
  ]

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { id: unit.id },
      update: unit,
      create: unit,
    })
  }

  console.log(`Seeded ${units.length} standard units`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // UNIT CONVERSIONS - Bidirectional standard conversions (20 pairs)
  // ═══════════════════════════════════════════════════════════════════════════════

  const conversions = [
    // Weight: kg ↔ g
    { fromUnitId: 2, toUnitId: 1, factor: 1000 },
    { fromUnitId: 1, toUnitId: 2, factor: 0.001 },
    // Weight: lb ↔ g
    { fromUnitId: 4, toUnitId: 1, factor: 453.592 },
    { fromUnitId: 1, toUnitId: 4, factor: 0.002205 },
    // Weight: oz ↔ g
    { fromUnitId: 3, toUnitId: 1, factor: 28.3495 },
    { fromUnitId: 1, toUnitId: 3, factor: 0.035274 },
    // Volume: L ↔ mL
    { fromUnitId: 6, toUnitId: 5, factor: 1000 },
    { fromUnitId: 5, toUnitId: 6, factor: 0.001 },
    // Volume: gal ↔ mL
    { fromUnitId: 11, toUnitId: 5, factor: 3785.41 },
    { fromUnitId: 5, toUnitId: 11, factor: 0.000264 },
    // Volume: cup ↔ mL
    { fromUnitId: 8, toUnitId: 5, factor: 240 },
    { fromUnitId: 5, toUnitId: 8, factor: 0.004167 },
    // Volume: tbsp ↔ mL
    { fromUnitId: 9, toUnitId: 5, factor: 15 },
    { fromUnitId: 5, toUnitId: 9, factor: 0.066667 },
    // Volume: tsp ↔ mL
    { fromUnitId: 10, toUnitId: 5, factor: 5 },
    { fromUnitId: 5, toUnitId: 10, factor: 0.2 },
    // Volume: fl oz ↔ mL
    { fromUnitId: 7, toUnitId: 5, factor: 29.5735 },
    { fromUnitId: 5, toUnitId: 7, factor: 0.033814 },
    // Count: dozen ↔ pcs
    { fromUnitId: 14, toUnitId: 12, factor: 12 },
    { fromUnitId: 12, toUnitId: 14, factor: 0.083333 },
  ]

  for (const conv of conversions) {
    await prisma.unitConversion.upsert({
      where: {
        fromUnitId_toUnitId: { fromUnitId: conv.fromUnitId, toUnitId: conv.toUnitId },
      },
      update: { factor: conv.factor },
      create: conv,
    })
  }

  console.log(`Seeded ${conversions.length} unit conversions`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADMIN USER
  // ═══════════════════════════════════════════════════════════════════════════════

  const hashedPassword = await bcrypt.hash('admin', 10)

  const _admin = await prisma.user.upsert({
    where: { id: 1 },
    update: {
      permVoid: true,
    },
    create: {
      id: 1,
      username: 'admin',
      password: hashedPassword,
      fullname: 'Administrator',
      permProducts: true,
      permCategories: true,
      permTransactions: true,
      permUsers: true,
      permSettings: true,
      permVoid: true,
      status: '',
      position: 'Owner',
      hourlyRate: 0,
      employmentStatus: 'Active',
    },
  })

  console.log('Created admin user')

  // ═══════════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════════

  const _settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      appMode: 'Point of Sale',
      storeName: 'Kitchen Line',
      addressLine1: '',
      addressLine2: '',
      phone: '',
      taxNumber: '',
      currencySymbol: '₱',
      taxPercentage: 0,
      chargeTax: false,
      receiptFooter: 'Thank you for your purchase!',
      logo: '',
      cuisineType: 'Fast-Casual',
      serviceStyle: 'Counter Service',
      operatingDaysPerWeek: 7,
      targetFoodCostPercent: 32,
      targetLaborCostPercent: 30,
      targetNetProfitPercent: 10,
      avgHourlyLaborCost: 75,
      targetTicketSize: 85,
      targetRevPerLaborHour: 350,
      targetRepeatRate: 40,
      targetDestinationPercent: 25,
      targetTrueMarginPercent: 65,
    },
  })

  console.log('Created settings with benchmark targets')

  // ═══════════════════════════════════════════════════════════════════════════════
  // BENCHMARKS
  // ═══════════════════════════════════════════════════════════════════════════════

  const benchmarks = [
    { metric: 'Food Cost %', lowGood: 28, target: 32, highWarning: 38, description: 'Cost of ingredients as percentage of food revenue.' },
    { metric: 'Labor Cost %', lowGood: 25, target: 30, highWarning: 35, description: 'Total labor cost as percentage of revenue.' },
    { metric: 'Prime Cost %', lowGood: 55, target: 62, highWarning: 70, description: 'Food + Labor combined.' },
    { metric: 'Net Profit %', lowGood: 15, target: 10, highWarning: 5, description: 'Bottom line profit margin.' },
    { metric: 'Beverage Cost %', lowGood: 18, target: 22, highWarning: 28, description: 'Cost of beverages as percentage of beverage revenue.' },
    { metric: 'Spoilage Rate %', lowGood: 2, target: 4, highWarning: 6, description: 'Waste cost as percentage of purchases.' },
    { metric: 'Repeat Rate %', lowGood: 50, target: 40, highWarning: 25, description: 'Percentage of customers who return.' },
    { metric: 'Rev/Labor Hour', lowGood: 500, target: 350, highWarning: 250, description: 'Revenue generated per staff hour worked.' },
    { metric: 'True Margin %', lowGood: 70, target: 65, highWarning: 50, description: 'Menu price minus ALL costs divided by price.' },
    { metric: 'Destination %', lowGood: 35, target: 25, highWarning: 10, description: 'Customers who came specifically for you.' },
    { metric: 'Avg Ticket', lowGood: 100, target: 85, highWarning: 55, description: 'Average transaction value.' },
    { metric: 'Food Attachment %', lowGood: 50, target: 35, highWarning: 20, description: 'Transactions that include food.' },
  ]

  for (const benchmark of benchmarks) {
    await prisma.benchmark.upsert({
      where: { metric: benchmark.metric },
      update: benchmark,
      create: benchmark,
    })
  }

  console.log(`Seeded ${benchmarks.length} industry benchmarks`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════════

  await prisma.category.upsert({
    where: { id: 1 },
    update: { requiresKitchen: true },
    create: { id: 1, name: 'Food', requiresKitchen: true },
  })

  await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Beverages' },
  })

  console.log('Created categories')

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════════

  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1, name: 'Burger Steak', price: 95, categoryId: 1, quantity: 50, trackStock: true, image: '',
      prepTime: 8, overheadAllocation: 10, speedRating: 'Medium', ingredientSharing: 'Medium', menuDecision: 'Workhorse',
    },
  })

  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2, name: 'Tocilog', price: 85, categoryId: 1, quantity: 50, trackStock: true, image: '',
      prepTime: 6, overheadAllocation: 8, speedRating: 'Fast', ingredientSharing: 'High', menuDecision: 'Star', isHeroItem: true,
    },
  })

  await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3, name: 'Loaded Fries', price: 65, categoryId: 1, quantity: 100, trackStock: true, image: '',
      prepTime: 5, overheadAllocation: 5, speedRating: 'Fast', ingredientSharing: 'High', menuDecision: 'Star',
    },
  })

  await prisma.product.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4, name: 'Gatorade', price: 45, categoryId: 2, quantity: 200, trackStock: true, image: '',
      prepTime: 0, overheadAllocation: 0, speedRating: 'Instant', ingredientSharing: 'Low', menuDecision: 'Workhorse',
    },
  })

  await prisma.product.upsert({
    where: { id: 5 },
    update: {},
    create: {
      id: 5, name: 'Pocari Sweat', price: 50, categoryId: 2, quantity: 200, trackStock: true, image: '',
      prepTime: 0, overheadAllocation: 0, speedRating: 'Instant', ingredientSharing: 'Low', menuDecision: 'Workhorse',
    },
  })

  await prisma.product.upsert({
    where: { id: 6 },
    update: {},
    create: {
      id: 6, name: 'Iced Coffee', price: 55, categoryId: 2, quantity: 100, trackStock: false, image: '',
      prepTime: 2, overheadAllocation: 3, speedRating: 'Fast', ingredientSharing: 'Low', menuDecision: 'Puzzle',
    },
  })

  console.log('Created sample products')

  // ═══════════════════════════════════════════════════════════════════════════════
  // VENDORS
  // ═══════════════════════════════════════════════════════════════════════════════

  await prisma.vendor.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'Metro Supermarket', category: 'Food - General', paymentTerms: 'COD', notes: 'Daily grocery runs' } })
  await prisma.vendor.upsert({ where: { id: 2 }, update: {}, create: { id: 2, name: 'Meat Supplier Co.', category: 'Food - Protein', paymentTerms: 'Net 7', notes: 'Delivers Tuesdays and Fridays' } })
  await prisma.vendor.upsert({ where: { id: 3 }, update: {}, create: { id: 3, name: 'Beverage Distributor', category: 'Beverage', paymentTerms: 'Net 15', notes: 'Gatorade, Pocari wholesale' } })

  console.log('Created sample vendors')

  // ═══════════════════════════════════════════════════════════════════════════════
  // INGREDIENTS - Using new schema (baseUnitId, stockQty, avgCostPerBaseUnit)
  // ═══════════════════════════════════════════════════════════════════════════════

  // Unit ID references: g=1, kg=2, mL=5, L=6, pcs=12, each=13, bottle=15

  const ingredients = [
    // Proteins - stock in base units
    { id: 1,  name: 'Ground Beef',        category: 'Protein',    baseUnitId: 2,  stockQty: 50,    avgCostPerBaseUnit: 280,  vendorId: 2 },  // 50 kg @ ₱280/kg
    { id: 2,  name: 'Tocino (Pork)',      category: 'Protein',    baseUnitId: 2,  stockQty: 50,    avgCostPerBaseUnit: 220,  vendorId: 2 },  // 50 kg @ ₱220/kg
    { id: 3,  name: 'Eggs',              category: 'Protein',    baseUnitId: 12, stockQty: 200,   avgCostPerBaseUnit: 8,    vendorId: 1 },  // 200 pcs @ ₱8/pc
    { id: 4,  name: 'Bacon Bits',        category: 'Protein',    baseUnitId: 2,  stockQty: 20,    avgCostPerBaseUnit: 350,  vendorId: 2 },  // 20 kg @ ₱350/kg
    // Produce & Dry Goods
    { id: 5,  name: 'Garlic Rice',       category: 'Dry Goods',  baseUnitId: 2,  stockQty: 50,    avgCostPerBaseUnit: 55,   vendorId: 1 },  // 50 kg @ ₱55/kg
    { id: 6,  name: 'Potatoes (Fries)',  category: 'Produce',    baseUnitId: 2,  stockQty: 50,    avgCostPerBaseUnit: 45,   vendorId: 1 },  // 50 kg @ ₱45/kg
    { id: 7,  name: 'Onions',           category: 'Produce',    baseUnitId: 2,  stockQty: 30,    avgCostPerBaseUnit: 60,   vendorId: 1 },  // 30 kg @ ₱60/kg
    { id: 8,  name: 'Cheese (shredded)', category: 'Dairy',      baseUnitId: 2,  stockQty: 20,    avgCostPerBaseUnit: 380,  vendorId: 1 },  // 20 kg @ ₱380/kg
    // Condiments
    { id: 9,  name: 'Mushroom Gravy',    category: 'Condiments', baseUnitId: 6,  stockQty: 30,    avgCostPerBaseUnit: 120,  vendorId: 1 },  // 30 L @ ₱120/L
    { id: 10, name: 'Sour Cream',        category: 'Condiments', baseUnitId: 2,  stockQty: 20,    avgCostPerBaseUnit: 280,  vendorId: 1 },  // 20 kg @ ₱280/kg
    // Beverages
    { id: 11, name: 'Gatorade (wholesale)',  category: 'Beverage', baseUnitId: 13, stockQty: 100, avgCostPerBaseUnit: 28,   vendorId: 3 },  // 100 ea @ ₱28/ea
    { id: 12, name: 'Pocari (wholesale)',    category: 'Beverage', baseUnitId: 13, stockQty: 100, avgCostPerBaseUnit: 30,   vendorId: 3 },  // 100 ea @ ₱30/ea
    { id: 13, name: 'Coffee Beans',          category: 'Beverage', baseUnitId: 2,  stockQty: 10,  avgCostPerBaseUnit: 450,  vendorId: 1 },  // 10 kg @ ₱450/kg
    { id: 14, name: 'Milk',                  category: 'Dairy',    baseUnitId: 6,  stockQty: 50,  avgCostPerBaseUnit: 85,   vendorId: 1 },  // 50 L @ ₱85/L
  ]

  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: { stockQty: ing.stockQty },
      create: ing,
    })
  }

  console.log(`Created ${ingredients.length} ingredients`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // PURCHASE VARIANTS - Default variant per ingredient
  // ═══════════════════════════════════════════════════════════════════════════════

  const variants = [
    // Proteins
    { id: 1,  ingredientId: 1,  label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 280,  baseUnitsPerVariant: 1 },
    { id: 2,  ingredientId: 2,  label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 220,  baseUnitsPerVariant: 1 },
    { id: 3,  ingredientId: 3,  label: 'each',       contentQty: 1,   contentUnitId: 12, packageUnitId: 13, costPerVariant: 8,    baseUnitsPerVariant: 1 },
    { id: 4,  ingredientId: 4,  label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 350,  baseUnitsPerVariant: 1 },
    // Produce & Dry Goods
    { id: 5,  ingredientId: 5,  label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 55,   baseUnitsPerVariant: 1 },
    { id: 6,  ingredientId: 6,  label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 45,   baseUnitsPerVariant: 1 },
    { id: 7,  ingredientId: 7,  label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 60,   baseUnitsPerVariant: 1 },
    { id: 8,  ingredientId: 8,  label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 380,  baseUnitsPerVariant: 1 },
    // Condiments
    { id: 9,  ingredientId: 9,  label: 'liter',      contentQty: 1,   contentUnitId: 6,  packageUnitId: 6,  costPerVariant: 120,  baseUnitsPerVariant: 1 },
    { id: 10, ingredientId: 10, label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 280,  baseUnitsPerVariant: 1 },
    // Beverages
    { id: 11, ingredientId: 11, label: 'bottle',     contentQty: 1,   contentUnitId: 13, packageUnitId: 15, costPerVariant: 28,   baseUnitsPerVariant: 1 },
    { id: 12, ingredientId: 12, label: 'bottle',     contentQty: 1,   contentUnitId: 13, packageUnitId: 15, costPerVariant: 30,   baseUnitsPerVariant: 1 },
    { id: 13, ingredientId: 13, label: 'kg',         contentQty: 1,   contentUnitId: 2,  packageUnitId: 2,  costPerVariant: 450,  baseUnitsPerVariant: 1 },
    { id: 14, ingredientId: 14, label: 'liter',      contentQty: 1,   contentUnitId: 6,  packageUnitId: 6,  costPerVariant: 85,   baseUnitsPerVariant: 1 },
  ]

  for (const v of variants) {
    await prisma.purchaseVariant.upsert({
      where: { id: v.id },
      update: {},
      create: { ...v, isDefault: true },
    })
  }

  console.log(`Created ${variants.length} purchase variants`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // RECIPE ITEMS - Link products to ingredients for cost calculation
  // ═══════════════════════════════════════════════════════════════════════════════

  const allRecipes = [
    // Burger Steak (productId: 1)
    { productId: 1, ingredientId: 1, quantity: 0.15, baseQuantity: 0.15 },   // 150g ground beef
    { productId: 1, ingredientId: 3, quantity: 1, baseQuantity: 1 },         // 1 egg
    { productId: 1, ingredientId: 5, quantity: 0.15, baseQuantity: 0.15 },   // 150g garlic rice
    { productId: 1, ingredientId: 7, quantity: 0.03, baseQuantity: 0.03 },   // 30g onions
    { productId: 1, ingredientId: 9, quantity: 0.05, baseQuantity: 0.05 },   // 50ml gravy
    // Tocilog (productId: 2)
    { productId: 2, ingredientId: 2, quantity: 0.12, baseQuantity: 0.12 },   // 120g tocino
    { productId: 2, ingredientId: 3, quantity: 1, baseQuantity: 1 },         // 1 egg
    { productId: 2, ingredientId: 5, quantity: 0.15, baseQuantity: 0.15 },   // 150g garlic rice
    // Loaded Fries (productId: 3)
    { productId: 3, ingredientId: 6, quantity: 0.2, baseQuantity: 0.2 },     // 200g potatoes
    { productId: 3, ingredientId: 4, quantity: 0.03, baseQuantity: 0.03 },   // 30g bacon bits
    { productId: 3, ingredientId: 8, quantity: 0.05, baseQuantity: 0.05 },   // 50g cheese
    { productId: 3, ingredientId: 10, quantity: 0.03, baseQuantity: 0.03 },  // 30g sour cream
    // Gatorade (productId: 4)
    { productId: 4, ingredientId: 11, quantity: 1, baseQuantity: 1 },        // 1 bottle
    // Pocari (productId: 5)
    { productId: 5, ingredientId: 12, quantity: 1, baseQuantity: 1 },        // 1 bottle
    // Iced Coffee (productId: 6)
    { productId: 6, ingredientId: 13, quantity: 0.02, baseQuantity: 0.02 },  // 20g coffee beans
    { productId: 6, ingredientId: 14, quantity: 0.05, baseQuantity: 0.05 },  // 50ml milk
  ]

  for (const recipe of allRecipes) {
    await prisma.recipeItem.upsert({
      where: {
        productId_ingredientId: {
          productId: recipe.productId,
          ingredientId: recipe.ingredientId,
        },
      },
      update: { quantity: recipe.quantity, baseQuantity: recipe.baseQuantity },
      create: recipe,
    })
  }

  console.log(`Created ${allRecipes.length} recipe items`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // SAMPLE CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════════════

  await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Walk-in Customer', phone: '', email: '', customerType: 'Walk-in', visitCount: 0, lifetimeSpend: 0, isRegular: false },
  })

  await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2, name: 'Juan Dela Cruz', phone: '09171234567', email: 'juan@email.com',
      customerType: 'Pickleball Player', trafficSource: 'Court Regular',
      visitCount: 12, lifetimeSpend: 1250, avgTicket: 104.17, usualOrder: 'Tocilog + Gatorade',
      isRegular: true, firstVisit: new Date('2026-01-10'), lastVisit: new Date('2026-01-24'),
      notes: 'Plays every morning. Prefers extra egg.',
    },
  })

  console.log('Created sample customers')

  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('Database seeded successfully!')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('Summary:')
  console.log('  - 23 standard units + 20 conversions')
  console.log('  - 1 admin user (admin/admin)')
  console.log('  - Settings with 10-Lever benchmark targets')
  console.log('  - 12 industry benchmarks')
  console.log('  - 2 categories (Food, Beverages)')
  console.log('  - 6 products with true cost fields')
  console.log('  - 3 vendors')
  console.log('  - 14 ingredients with unified base-unit stock')
  console.log('  - 14 default purchase variants')
  console.log('  - Recipe items linking products to ingredients')
  console.log('  - 2 sample customers')
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
