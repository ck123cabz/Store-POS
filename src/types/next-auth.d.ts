import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      permProducts: boolean
      permCategories: boolean
      permTransactions: boolean
      permUsers: boolean
      permSettings: boolean
      permReports: boolean
      permAuditLog: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    username: string
    permProducts: boolean
    permCategories: boolean
    permTransactions: boolean
    permUsers: boolean
    permSettings: boolean
    permReports: boolean
    permAuditLog: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    username: string
    permProducts: boolean
    permCategories: boolean
    permTransactions: boolean
    permUsers: boolean
    permSettings: boolean
    permReports: boolean
    permAuditLog: boolean
  }
}
