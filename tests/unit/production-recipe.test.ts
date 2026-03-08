import { describe, test, expect } from "vitest"
import { calculateProductionCostPerBaseUnit, calculateWeightedAvgCost } from "@/lib/ingredient-utils"

describe("Production Recipe Calculations", () => {
  describe("full production cycle cost flow", () => {
    test("tocino example: pork + sugar + soy → sticks with correct cost", () => {
      // Setup: define input costs
      const porkCostPerG = 0.35      // ₱0.35/g = ₱350/kg
      const sugarCostPerG = 0.05     // ₱0.05/g = ₱50/kg
      const soyCostPerMl = 0.08      // ₱0.08/mL

      const inputs = [
        { baseQuantity: 1000, avgCostPerBaseUnit: porkCostPerG },   // 1kg pork
        { baseQuantity: 200, avgCostPerBaseUnit: sugarCostPerG },   // 200g sugar
        { baseQuantity: 100, avgCostPerBaseUnit: soyCostPerMl },    // 100mL soy
      ]
      const batchYield = 20  // 20 sticks per batch

      // Act
      const costPerStick = calculateProductionCostPerBaseUnit(inputs, batchYield)

      // Assert: (350 + 10 + 8) / 20 = 18.4
      expect(costPerStick).toBeCloseTo(18.4)

      // Simulate adding 20 sticks to existing stock of 5 sticks @ ₱15/stick
      const newAvgCost = calculateWeightedAvgCost(5, 15, 20, costPerStick)
      // (5*15 + 20*18.4) / 25 = (75 + 368) / 25 = 17.72
      expect(newAvgCost).toBeCloseTo(17.72)
    })

    test("multiple batches multiply input requirements", () => {
      const inputs = [
        { baseQuantity: 500, avgCostPerBaseUnit: 0.30 },  // 500g per batch
      ]
      const batchYield = 10
      const batchCount = 3

      // Per batch cost: (500 * 0.30) / 10 = 15 per unit
      const costPerUnit = calculateProductionCostPerBaseUnit(inputs, batchYield)
      expect(costPerUnit).toBeCloseTo(15)

      // Total produced: 10 * 3 = 30 units
      const totalProduced = batchYield * batchCount
      expect(totalProduced).toBe(30)

      // Total input used: 500 * 3 = 1500g
      const totalInputUsed = inputs[0].baseQuantity * batchCount
      expect(totalInputUsed).toBe(1500)
    })

    test("cost cascading: raw → prepared → menu product", () => {
      // Level 1: Pork → Tocino Sticks
      const tocinoInputs = [
        { baseQuantity: 1000, avgCostPerBaseUnit: 0.35 },  // 1kg pork
        { baseQuantity: 200, avgCostPerBaseUnit: 0.05 },   // 200g sugar
      ]
      const tocinoBatchYield = 20
      const tocinoCostPerStick = calculateProductionCostPerBaseUnit(tocinoInputs, tocinoBatchYield)
      // (350 + 10) / 20 = 18
      expect(tocinoCostPerStick).toBeCloseTo(18)

      // Level 2: Tocino Meal uses 3 sticks + rice
      const mealIngredients = [
        { baseQuantity: 3, avgCostPerBaseUnit: tocinoCostPerStick },  // 3 tocino sticks
        { baseQuantity: 200, avgCostPerBaseUnit: 0.04 },              // 200g rice
      ]
      const mealFoodCost = mealIngredients.reduce(
        (sum, i) => sum + i.baseQuantity * i.avgCostPerBaseUnit,
        0
      )
      // (3 * 18) + (200 * 0.04) = 54 + 8 = 62
      expect(mealFoodCost).toBeCloseTo(62)

      // Menu price ₱120 → margin 48.3%
      const price = 120
      const marginPercent = ((price - mealFoodCost) / price) * 100
      expect(marginPercent).toBeCloseTo(48.33, 1)
    })

    test("weighted avg cost blends across multiple production runs", () => {
      // First run: 20 sticks @ ₱18.4/stick
      const run1CostPerUnit = 18.4
      const run1Output = 20
      const afterRun1Avg = calculateWeightedAvgCost(0, 0, run1Output, run1CostPerUnit)
      expect(afterRun1Avg).toBeCloseTo(18.4)

      // Sell 15 sticks (stock drops to 5)
      const stockAfterSales = 5

      // Second run with cheaper pork: 20 sticks @ ₱16/stick
      const run2CostPerUnit = 16
      const run2Output = 20
      const afterRun2Avg = calculateWeightedAvgCost(stockAfterSales, afterRun1Avg, run2Output, run2CostPerUnit)
      // (5*18.4 + 20*16) / 25 = (92 + 320) / 25 = 16.48
      expect(afterRun2Avg).toBeCloseTo(16.48)
    })
  })
})
