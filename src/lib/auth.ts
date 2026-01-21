import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })

        if (!user) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) {
          return null
        }

        // Update login status
        await prisma.user.update({
          where: { id: user.id },
          data: { status: `Logged In_${new Date().toISOString()}` },
        })

        return {
          id: String(user.id),
          name: user.fullname,
          username: user.username,
          permProducts: user.permProducts,
          permCategories: user.permCategories,
          permTransactions: user.permTransactions,
          permUsers: user.permUsers,
          permSettings: user.permSettings,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.username = user.username
        token.permProducts = user.permProducts
        token.permCategories = user.permCategories
        token.permTransactions = user.permTransactions
        token.permUsers = user.permUsers
        token.permSettings = user.permSettings
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.permProducts = token.permProducts as boolean
        session.user.permCategories = token.permCategories as boolean
        session.user.permTransactions = token.permTransactions as boolean
        session.user.permUsers = token.permUsers as boolean
        session.user.permSettings = token.permSettings as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
