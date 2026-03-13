import { prisma } from "@/lib/prisma"
import { cache } from "react"

/**
 * Cached server-side settings getter.
 * Uses React's cache() for per-request deduplication — multiple calls
 * within the same request only hit the database once.
 */
export const getSettings = cache(async () => {
  return (
    (await prisma.settings.findUnique({ where: { id: 1 } })) ??
    (await prisma.settings.create({ data: { id: 1 } }))
  )
})
