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
  // ADMIN USER
  // ═══════════════════════════════════════════════════════════════════════════════

  const hashedPassword = await bcrypt.hash('admin', 10)

  const _admin = await prisma.user.upsert({
    where: { id: 1 },
    update: {
      permVoid: true, // Grant void permission to existing admin
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
      // LEVER 8: Labor fields
      position: 'Owner',
      hourlyRate: 0, // Owner doesn't have hourly rate
      employmentStatus: 'Active',
    },
  })

  console.log('Created admin user')

  // ═══════════════════════════════════════════════════════════════════════════════
  // SETTINGS - Enhanced with 10-Lever benchmark targets
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
      // Business Setup
      cuisineType: 'Fast-Casual',
      serviceStyle: 'Counter Service',
      operatingDaysPerWeek: 7,
      // Target Benchmarks (10-Lever targets from playbook)
      targetFoodCostPercent: 32,
      targetLaborCostPercent: 30,
      targetNetProfitPercent: 10,
      avgHourlyLaborCost: 75, // ₱75/hour average
      targetTicketSize: 85,
      targetRevPerLaborHour: 350,
      targetRepeatRate: 40,
      targetDestinationPercent: 25,
      targetTrueMarginPercent: 65,
    },
  })

  console.log('Created settings with benchmark targets')

  // ═══════════════════════════════════════════════════════════════════════════════
  // BENCHMARKS - Industry reference data for restaurant KPIs
  // ═══════════════════════════════════════════════════════════════════════════════

  const benchmarks = [
    {
      metric: 'Food Cost %',
      lowGood: 28,
      target: 32,
      highWarning: 38,
      description: 'Cost of ingredients as percentage of food revenue. Lower is better.',
    },
    {
      metric: 'Labor Cost %',
      lowGood: 25,
      target: 30,
      highWarning: 35,
      description: 'Total labor cost as percentage of revenue. Includes wages, benefits, taxes.',
    },
    {
      metric: 'Prime Cost %',
      lowGood: 55,
      target: 62,
      highWarning: 70,
      description: 'Food + Labor combined. The two biggest controllable costs.',
    },
    {
      metric: 'Net Profit %',
      lowGood: 15,
      target: 10,
      highWarning: 5,
      description: 'Bottom line profit margin after all expenses.',
    },
    {
      metric: 'Beverage Cost %',
      lowGood: 18,
      target: 22,
      highWarning: 28,
      description: 'Cost of beverages as percentage of beverage revenue.',
    },
    {
      metric: 'Spoilage Rate %',
      lowGood: 2,
      target: 4,
      highWarning: 6,
      description: 'Waste cost as percentage of purchases. Track to optimize cash conversion.',
    },
    {
      metric: 'Repeat Rate %',
      lowGood: 50,
      target: 40,
      highWarning: 25,
      description: 'Percentage of customers who return. Higher is better. Regulars drive profit.',
    },
    {
      metric: 'Rev/Labor Hour',
      lowGood: 500,
      target: 350,
      highWarning: 250,
      description: 'Revenue generated per staff hour worked. Minimum viable is ₱250-300.',
    },
    {
      metric: 'True Margin %',
      lowGood: 70,
      target: 65,
      highWarning: 50,
      description: 'Menu price minus ALL costs (food + labor + overhead) divided by price.',
    },
    {
      metric: 'Destination %',
      lowGood: 35,
      target: 25,
      highWarning: 10,
      description: 'Percentage of customers who came specifically for you, not borrowed traffic.',
    },
    {
      metric: 'Avg Ticket',
      lowGood: 100,
      target: 85,
      highWarning: 55,
      description: 'Average transaction value. Increase through upsells and combos.',
    },
    {
      metric: 'Food Attachment %',
      lowGood: 50,
      target: 35,
      highWarning: 20,
      description: 'Percentage of transactions that include food (not drink-only).',
    },
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
  // CATEGORIES - Food & Beverages
  // ═══════════════════════════════════════════════════════════════════════════════

  const _foodCategory = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Food' },
  })

  const _beverageCategory = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Beverages' },
  })

  console.log('Created categories')

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCTS - Sample menu items with 10-Lever fields
  // ═══════════════════════════════════════════════════════════════════════════════

  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Burger Steak',
      price: 95,
      categoryId: 1,
      quantity: 50,
      trackStock: true,
      image: '',
      // LEVER 1: Unit Economics
      prepTime: 8, // 8 minutes
      overheadAllocation: 10, // ₱10 for gas, packaging
      // LEVER 4: Menu Focus
      speedRating: 'Medium',
      ingredientSharing: 'Medium',
      menuDecision: 'Workhorse',
    },
  })

  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Tocilog',
      price: 85,
      categoryId: 1,
      quantity: 50,
      trackStock: true,
      image: '',
      // LEVER 1: Unit Economics
      prepTime: 6,
      overheadAllocation: 8,
      // LEVER 4: Menu Focus
      speedRating: 'Fast',
      ingredientSharing: 'High',
      menuDecision: 'Star',
      isHeroItem: true,
    },
  })

  await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Loaded Fries',
      price: 65,
      categoryId: 1,
      quantity: 100,
      trackStock: true,
      image: '',
      // LEVER 1: Unit Economics
      prepTime: 5,
      overheadAllocation: 5,
      // LEVER 4: Menu Focus
      speedRating: 'Fast',
      ingredientSharing: 'High',
      menuDecision: 'Star',
    },
  })

  await prisma.product.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      name: 'Gatorade',
      price: 45,
      categoryId: 2,
      quantity: 200,
      trackStock: true,
      image: '',
      // LEVER 1: Unit Economics
      prepTime: 0, // No prep
      overheadAllocation: 0,
      // LEVER 4: Menu Focus
      speedRating: 'Instant',
      ingredientSharing: 'Low',
      menuDecision: 'Workhorse',
    },
  })

  await prisma.product.upsert({
    where: { id: 5 },
    update: {},
    create: {
      id: 5,
      name: 'Pocari Sweat',
      price: 50,
      categoryId: 2,
      quantity: 200,
      trackStock: true,
      image: '',
      // LEVER 1: Unit Economics
      prepTime: 0,
      overheadAllocation: 0,
      // LEVER 4: Menu Focus
      speedRating: 'Instant',
      ingredientSharing: 'Low',
      menuDecision: 'Workhorse',
    },
  })

  await prisma.product.upsert({
    where: { id: 6 },
    update: {},
    create: {
      id: 6,
      name: 'Iced Coffee',
      price: 55,
      categoryId: 2,
      quantity: 100,
      trackStock: false,
      image: '',
      // LEVER 1: Unit Economics
      prepTime: 2,
      overheadAllocation: 3,
      // LEVER 4: Menu Focus
      speedRating: 'Fast',
      ingredientSharing: 'Low',
      menuDecision: 'Puzzle', // High margin but low sales - needs promotion
    },
  })

  console.log('Created sample products with 10-Lever fields')

  // ═══════════════════════════════════════════════════════════════════════════════
  // VENDORS - Sample suppliers
  // ═══════════════════════════════════════════════════════════════════════════════

  await prisma.vendor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Metro Supermarket',
      category: 'Food - General',
      paymentTerms: 'COD',
      notes: 'Daily grocery runs',
    },
  })

  await prisma.vendor.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Meat Supplier Co.',
      category: 'Food - Protein',
      paymentTerms: 'Net 7',
      notes: 'Delivers Tuesdays and Fridays',
    },
  })

  await prisma.vendor.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Beverage Distributor',
      category: 'Beverage',
      paymentTerms: 'Net 15',
      notes: 'Gatorade, Pocari wholesale',
    },
  })

  console.log('Created sample vendors')

  // ═══════════════════════════════════════════════════════════════════════════════
  // INGREDIENTS - Common kitchen items
  // ═══════════════════════════════════════════════════════════════════════════════

  const ingredients = [
    // Proteins
    { name: 'Ground Beef', category: 'Protein', unit: 'kg', costPerUnit: 280, vendorId: 2 },
    { name: 'Tocino (Pork)', category: 'Protein', unit: 'kg', costPerUnit: 220, vendorId: 2 },
    { name: 'Eggs', category: 'Protein', unit: 'each', costPerUnit: 8, vendorId: 1 },
    { name: 'Bacon Bits', category: 'Protein', unit: 'kg', costPerUnit: 350, vendorId: 2 },
    // Produce & Dry Goods
    { name: 'Garlic Rice', category: 'Dry Goods', unit: 'kg', costPerUnit: 55, vendorId: 1 },
    { name: 'Potatoes (Fries)', category: 'Produce', unit: 'kg', costPerUnit: 45, vendorId: 1 },
    { name: 'Onions', category: 'Produce', unit: 'kg', costPerUnit: 60, vendorId: 1 },
    { name: 'Cheese (shredded)', category: 'Dairy', unit: 'kg', costPerUnit: 380, vendorId: 1 },
    // Condiments
    { name: 'Mushroom Gravy', category: 'Condiments', unit: 'liter', costPerUnit: 120, vendorId: 1 },
    { name: 'Sour Cream', category: 'Condiments', unit: 'kg', costPerUnit: 280, vendorId: 1 },
    // Beverages (for cost tracking)
    { name: 'Gatorade (wholesale)', category: 'Beverage', unit: 'each', costPerUnit: 28, vendorId: 3 },
    { name: 'Pocari (wholesale)', category: 'Beverage', unit: 'each', costPerUnit: 30, vendorId: 3 },
    { name: 'Coffee Beans', category: 'Beverage', unit: 'kg', costPerUnit: 450, vendorId: 1 },
    { name: 'Milk', category: 'Dairy', unit: 'liter', costPerUnit: 85, vendorId: 1 },
  ]

  for (let i = 0; i < ingredients.length; i++) {
    await prisma.ingredient.upsert({
      where: { id: i + 1 },
      update: {},
      create: { id: i + 1, ...ingredients[i] },
    })
  }

  console.log(`Created ${ingredients.length} ingredients`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // RECIPE ITEMS - Link products to ingredients for cost calculation
  // ═══════════════════════════════════════════════════════════════════════════════

  // Burger Steak recipe (productId: 1)
  const burgerRecipe = [
    { productId: 1, ingredientId: 1, quantity: 0.15 },  // 150g ground beef
    { productId: 1, ingredientId: 3, quantity: 1 },     // 1 egg
    { productId: 1, ingredientId: 5, quantity: 0.15 },  // 150g garlic rice
    { productId: 1, ingredientId: 7, quantity: 0.03 },  // 30g onions
    { productId: 1, ingredientId: 9, quantity: 0.05 },  // 50ml gravy
  ]

  // Tocilog recipe (productId: 2)
  const tocilogRecipe = [
    { productId: 2, ingredientId: 2, quantity: 0.12 },  // 120g tocino
    { productId: 2, ingredientId: 3, quantity: 1 },     // 1 egg
    { productId: 2, ingredientId: 5, quantity: 0.15 },  // 150g garlic rice
  ]

  // Loaded Fries recipe (productId: 3)
  const loadedFriesRecipe = [
    { productId: 3, ingredientId: 6, quantity: 0.2 },   // 200g potatoes
    { productId: 3, ingredientId: 4, quantity: 0.03 },  // 30g bacon bits
    { productId: 3, ingredientId: 8, quantity: 0.05 },  // 50g cheese
    { productId: 3, ingredientId: 10, quantity: 0.03 }, // 30g sour cream
  ]

  // Gatorade (productId: 4)
  const gatoradeRecipe = [
    { productId: 4, ingredientId: 11, quantity: 1 },    // 1 bottle wholesale
  ]

  // Pocari (productId: 5)
  const pocariRecipe = [
    { productId: 5, ingredientId: 12, quantity: 1 },    // 1 bottle wholesale
  ]

  // Iced Coffee (productId: 6)
  const icedCoffeeRecipe = [
    { productId: 6, ingredientId: 13, quantity: 0.02 }, // 20g coffee beans
    { productId: 6, ingredientId: 14, quantity: 0.05 }, // 50ml milk
  ]

  const allRecipes = [
    ...burgerRecipe,
    ...tocilogRecipe,
    ...loadedFriesRecipe,
    ...gatoradeRecipe,
    ...pocariRecipe,
    ...icedCoffeeRecipe,
  ]

  for (const recipe of allRecipes) {
    await prisma.recipeItem.upsert({
      where: {
        productId_ingredientId: {
          productId: recipe.productId,
          ingredientId: recipe.ingredientId,
        },
      },
      update: { quantity: recipe.quantity },
      create: recipe,
    })
  }

  console.log(`Created ${allRecipes.length} recipe items`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // SAMPLE CUSTOMER with 10-Lever fields
  // ═══════════════════════════════════════════════════════════════════════════════

  await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Walk-in Customer',
      phone: '',
      email: '',
      customerType: 'Walk-in',
      visitCount: 0,
      lifetimeSpend: 0,
      isRegular: false,
    },
  })

  await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Juan Dela Cruz',
      phone: '09171234567',
      email: 'juan@email.com',
      customerType: 'Pickleball Player',
      trafficSource: 'Court Regular',
      visitCount: 12,
      lifetimeSpend: 1250,
      avgTicket: 104.17,
      usualOrder: 'Tocilog + Gatorade',
      isRegular: true,
      firstVisit: new Date('2026-01-10'),
      lastVisit: new Date('2026-01-24'),
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
  console.log('  - 1 admin user (admin/admin)')
  console.log('  - Settings with 10-Lever benchmark targets')
  console.log('  - 12 industry benchmarks')
  console.log('  - 2 categories (Food, Beverages)')
  console.log('  - 6 products with true cost fields')
  console.log('  - 3 vendors')
  console.log('  - 14 ingredients')
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
