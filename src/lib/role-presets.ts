/**
 * Role preset definitions for quick permission assignment on the Users page.
 * Pure application config — no database backing needed.
 */

export interface RolePreset {
  label: string
  permissions: {
    permProducts: boolean
    permCategories: boolean
    permTransactions: boolean
    permUsers: boolean
    permSettings: boolean
    permReports: boolean
    permAuditLog: boolean
    permVoid: boolean
  }
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    label: "Cashier",
    permissions: {
      permProducts: true,
      permCategories: false,
      permTransactions: true,
      permUsers: false,
      permSettings: false,
      permReports: false,
      permAuditLog: false,
      permVoid: false,
    },
  },
  {
    label: "Manager",
    permissions: {
      permProducts: true,
      permCategories: true,
      permTransactions: true,
      permUsers: true,
      permSettings: true,
      permReports: true,
      permAuditLog: true,
      permVoid: true,
    },
  },
  {
    label: "Kitchen Staff",
    permissions: {
      permProducts: true,
      permCategories: true,
      permTransactions: false,
      permUsers: false,
      permSettings: false,
      permReports: false,
      permAuditLog: false,
      permVoid: false,
    },
  },
]
