import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"
import {
  calculateCostPerBaseUnit,
  calculateTotalBaseUnits,
  calculateStockStatus,
  calculateStockRatio,
} from "@/lib/ingredient-utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Validate required fields (quantity in packages)
    if (typeof body.quantity !== "number" || body.quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      )
    }

    // Get current ingredient
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { vendor: true },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (!ingredient.isActive) {
      return NextResponse.json({ error: "Ingredient is inactive" }, { status: 400 })
    }

    const oldQuantity = Number(ingredient.quantity)
    const newQuantity = oldQuantity + body.quantity

    // Handle new unit system (costPerPackage) or legacy (costPerUnit)
    const oldCostPerPackage = Number(ingredient.costPerPackage)
    const oldPackageSize = Number(ingredient.packageSize)
    const oldCostPerUnit = Number(ingredient.costPerUnit)

    // Accept costPerPackage (new) or costPerUnit (legacy)
    let newCostPerPackage = oldCostPerPackage
    let newPackageSize = oldPackageSize
    let newCostPerUnit = oldCostPerUnit

    // New unit system: costPerPackage
    if (body.costPerPackage !== undefined) {
      newCostPerPackage = body.costPerPackage
      newCostPerUnit = newPackageSize > 0 ? newCostPerPackage / newPackageSize : 0
    }
    // Legacy: costPerUnit
    else if (body.costPerUnit !== undefined) {
      newCostPerUnit = body.costPerUnit
      newCostPerPackage = newCostPerUnit * newPackageSize
    }

    // Update package size if provided
    if (body.packageSize !== undefined && body.packageSize > 0) {
      newPackageSize = body.packageSize
      // Recalculate costPerUnit based on new package size
      newCostPerUnit = newCostPerPackage / newPackageSize
    }

    // Generate a change ID to group related history entries
    const changeId = `restock_${nanoid(10)}`

    const historyEntries: Parameters<typeof prisma.ingredientHistory.create>[0]["data"][] = [
      // Always log quantity change
      {
        ingredientId,
        ingredientName: ingredient.name,
        changeId,
        field: "quantity",
        oldValue: oldQuantity.toString(),
        newValue: newQuantity.toString(),
        source: "restock",
        reason: "restock",
        reasonNote: body.note || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      },
    ]

    // Log cost change if changed
    if (newCostPerPackage !== oldCostPerPackage) {
      historyEntries.push({
        ingredientId,
        ingredientName: ingredient.name,
        changeId,
        field: "costPerPackage",
        oldValue: oldCostPerPackage.toString(),
        newValue: newCostPerPackage.toString(),
        source: "restock",
        reason: "price_update",
        reasonNote: body.note || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    // Log package size change if changed
    if (newPackageSize !== oldPackageSize) {
      historyEntries.push({
        ingredientId,
        ingredientName: ingredient.name,
        changeId,
        field: "packageSize",
        oldValue: oldPackageSize.toString(),
        newValue: newPackageSize.toString(),
        source: "restock",
        reason: "package_update",
        reasonNote: body.note || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    // Use transaction to update ingredient and create history
    const [updatedIngredient] = await prisma.$transaction([
      // Update ingredient
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          quantity: newQuantity,
          costPerPackage: newCostPerPackage,
          costPerUnit: newCostPerUnit,
          packageSize: newPackageSize,
          lastRestockDate: new Date(),
          lastUpdated: new Date(),
        },
        include: { vendor: true },
      }),
      // Log all history entries
      ...historyEntries.map((entry) =>
        prisma.ingredientHistory.create({ data: entry })
      ),
    ])

    // Calculate computed fields
    const costPerBaseUnit = calculateCostPerBaseUnit(
      Number(updatedIngredient.costPerPackage),
      Number(updatedIngredient.packageSize)
    )
    const totalBaseUnits = calculateTotalBaseUnits(
      Number(updatedIngredient.quantity),
      Number(updatedIngredient.packageSize)
    )

    return NextResponse.json({
      ingredient: {
        id: updatedIngredient.id,
        name: updatedIngredient.name,
        baseUnit: updatedIngredient.baseUnit,
        packageUnit: updatedIngredient.packageUnit,
        packageSize: Number(updatedIngredient.packageSize),
        quantity: Number(updatedIngredient.quantity),
        totalBaseUnits,
        costPerPackage: Number(updatedIngredient.costPerPackage),
        costPerBaseUnit,
        stockStatus: calculateStockStatus(Number(updatedIngredient.quantity), updatedIngredient.parLevel),
        stockRatio: calculateStockRatio(Number(updatedIngredient.quantity), updatedIngredient.parLevel),
        lastRestockDate: updatedIngredient.lastRestockDate,
        // Legacy
        costPerUnit: Number(updatedIngredient.costPerUnit),
      },
      restockDetails: {
        previousQuantity: oldQuantity,
        addedQuantity: body.quantity,
        newQuantity,
        previousCostPerPackage: oldCostPerPackage,
        newCostPerPackage,
        costPerBaseUnit,
      },
      message: `Added ${body.quantity} ${ingredient.packageUnit}(s) to ${ingredient.name}`,
    })
  } catch (error) {
    console.error("Failed to restock ingredient:", error)
    return NextResponse.json({ error: "Failed to restock ingredient" }, { status: 500 })
  }
}
