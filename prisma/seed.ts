import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user (password: admin)
  const hashedPassword = await bcrypt.hash('admin', 10)

  const admin = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
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
      status: '',
    },
  })

  // Create default settings
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      appMode: 'Point of Sale',
      storeName: 'My Store',
      addressLine1: '',
      addressLine2: '',
      phone: '',
      taxNumber: '',
      currencySymbol: '$',
      taxPercentage: 0,
      chargeTax: false,
      receiptFooter: 'Thank you for your purchase!',
      logo: '',
    },
  })

  // Create sample categories
  const category1 = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Food' },
  })

  const category2 = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Beverages' },
  })

  // Create sample products
  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Burger',
      price: 8.99,
      categoryId: 1,
      quantity: 50,
      trackStock: true,
      image: '',
    },
  })

  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Fries',
      price: 3.99,
      categoryId: 1,
      quantity: 100,
      trackStock: true,
      image: '',
    },
  })

  await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Cola',
      price: 2.50,
      categoryId: 2,
      quantity: 200,
      trackStock: true,
      image: '',
    },
  })

  console.log('Database seeded successfully!')
  console.log({ admin, settings, category1, category2 })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
