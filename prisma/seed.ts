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
  // EXAMPLE INGREDIENTS - RAW inputs + one PREPARED item (Tocino Sticks)
  // ═══════════════════════════════════════════════════════════════════════════════

  // Unit ID quick reference (from units array above):
  //   1=g, 2=kg, 5=mL, 6=L, 12=pcs, 15=bottle, 17=pack, 19=sack

  // --- RAW ingredients (inputs for Tocino Sticks) ---
  const porkBelly = await prisma.ingredient.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Pork Belly',
      category: 'Protein',
      type: 'RAW',
      baseUnitId: 1, // g
      stockQty: 5000,
      avgCostPerBaseUnit: 0.38, // ~₱380/kg
      parLevel: 2000,
    },
  })

  const brownSugar = await prisma.ingredient.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Brown Sugar',
      category: 'Dry Goods',
      type: 'RAW',
      baseUnitId: 1, // g
      stockQty: 2000,
      avgCostPerBaseUnit: 0.06, // ~₱60/kg
      parLevel: 500,
    },
  })

  const soySauce = await prisma.ingredient.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Soy Sauce',
      category: 'Condiments',
      type: 'RAW',
      baseUnitId: 5, // mL
      stockQty: 1000,
      avgCostPerBaseUnit: 0.08, // ~₱80/L
      parLevel: 500,
    },
  })

  const garlic = await prisma.ingredient.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      name: 'Garlic',
      category: 'Produce',
      type: 'RAW',
      baseUnitId: 1, // g
      stockQty: 500,
      avgCostPerBaseUnit: 0.20, // ~₱200/kg
      parLevel: 200,
    },
  })

  const pineappleJuice = await prisma.ingredient.upsert({
    where: { id: 5 },
    update: {},
    create: {
      id: 5,
      name: 'Pineapple Juice',
      category: 'Condiments',
      type: 'RAW',
      baseUnitId: 5, // mL
      stockQty: 500,
      avgCostPerBaseUnit: 0.10, // ~₱100/L
      parLevel: 250,
    },
  })

  // --- PREPARED ingredient: Tocino Sticks ---
  const tocinoSticks = await prisma.ingredient.upsert({
    where: { id: 6 },
    update: {},
    create: {
      id: 6,
      name: 'Tocino Sticks',
      category: 'Protein',
      type: 'PREPARED',
      baseUnitId: 12, // pcs
      batchYield: 20, // 20 sticks per batch
      stockQty: 0,
      avgCostPerBaseUnit: 0,
      parLevel: 20,
    },
  })

  // --- Purchase variants for RAW ingredients ---
  const rawVariants = [
    { ingredientId: porkBelly.id,     label: '1kg pack',         contentQty: 1000, contentUnitId: 1,  packageQty: 1, packageUnitId: 17, costPerVariant: 380,  baseUnitsPerVariant: 1000, isDefault: true },
    { ingredientId: brownSugar.id,    label: '1kg bag',          contentQty: 1000, contentUnitId: 1,  packageQty: 1, packageUnitId: 20, costPerVariant: 60,   baseUnitsPerVariant: 1000, isDefault: true },
    { ingredientId: soySauce.id,      label: '1L bottle',        contentQty: 1000, contentUnitId: 5,  packageQty: 1, packageUnitId: 15, costPerVariant: 80,   baseUnitsPerVariant: 1000, isDefault: true },
    { ingredientId: garlic.id,        label: '250g pack',        contentQty: 250,  contentUnitId: 1,  packageQty: 1, packageUnitId: 17, costPerVariant: 50,   baseUnitsPerVariant: 250,  isDefault: true },
    { ingredientId: pineappleJuice.id,label: '1L carton',        contentQty: 1000, contentUnitId: 5,  packageQty: 1, packageUnitId: 18, costPerVariant: 100,  baseUnitsPerVariant: 1000, isDefault: true },
    { ingredientId: tocinoSticks.id,  label: '20pcs batch',      contentQty: 20,   contentUnitId: 12, packageQty: 1, packageUnitId: 17, costPerVariant: 0,    baseUnitsPerVariant: 20,   isDefault: true },
  ]

  for (const variant of rawVariants) {
    await prisma.purchaseVariant.upsert({
      where: { id: rawVariants.indexOf(variant) + 1 },
      update: {},
      create: variant,
    })
  }

  // --- Production recipe for Tocino Sticks (per batch of 20 sticks) ---
  // Recipe: 500g pork belly, 100g brown sugar, 60mL soy sauce, 20g garlic, 30mL pineapple juice
  const productionRecipe = [
    { outputIngredientId: tocinoSticks.id, inputIngredientId: porkBelly.id,      quantity: 500, baseQuantity: 500, unitId: 1, note: 'Sliced thin, about 25g per stick' },
    { outputIngredientId: tocinoSticks.id, inputIngredientId: brownSugar.id,     quantity: 100, baseQuantity: 100, unitId: 1, note: null },
    { outputIngredientId: tocinoSticks.id, inputIngredientId: soySauce.id,       quantity: 60,  baseQuantity: 60,  unitId: 5, note: null },
    { outputIngredientId: tocinoSticks.id, inputIngredientId: garlic.id,         quantity: 20,  baseQuantity: 20,  unitId: 1, note: 'Minced' },
    { outputIngredientId: tocinoSticks.id, inputIngredientId: pineappleJuice.id, quantity: 30,  baseQuantity: 30,  unitId: 5, note: 'For tenderizing' },
  ]

  for (const item of productionRecipe) {
    await prisma.productionRecipeItem.upsert({
      where: {
        outputIngredientId_inputIngredientId: {
          outputIngredientId: item.outputIngredientId,
          inputIngredientId: item.inputIngredientId,
        },
      },
      update: { quantity: item.quantity, baseQuantity: item.baseQuantity, unitId: item.unitId, note: item.note },
      create: item,
    })
  }

  console.log('Seeded 5 RAW ingredients + 1 PREPARED ingredient (Tocino Sticks) with production recipe')

  // Reset auto-increment sequences after seeding with explicit IDs
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('ingredients', 'id'), COALESCE((SELECT MAX(id) FROM ingredients), 0) + 1, false)`)
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('purchase_variants', 'id'), COALESCE((SELECT MAX(id) FROM purchase_variants), 0) + 1, false)`)
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('production_recipe_items', 'id'), COALESCE((SELECT MAX(id) FROM production_recipe_items), 0) + 1, false)`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEFAULT SHIFT TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════════

  const defaultTemplates = [
    { name: "Morning", startTime: "06:00", endTime: "14:00", color: "#F59E0B" },
    { name: "Evening", startTime: "14:00", endTime: "22:00", color: "#3B82F6" },
    { name: "Night", startTime: "22:00", endTime: "06:00", color: "#6366F1" },
  ]

  for (const template of defaultTemplates) {
    await prisma.shiftTemplate.upsert({
      where: { id: defaultTemplates.indexOf(template) + 1 },
      update: {},
      create: template,
    })
  }

  console.log("Seeded default shift templates")

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
  console.log('  - 5 RAW ingredients + 1 PREPARED ingredient (Tocino Sticks)')
  console.log('  - 6 purchase variants + 5 production recipe items')
  console.log('  - 3 default shift templates')
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
