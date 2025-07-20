import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export async function testConnection() {
  try {
    await prisma.$connect()
    console.log("✅ Database connected successfully")
    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return false
  }
}

export async function checkTables() {
  try {
    const tables = (await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `) as Array<{ table_name: string }>

    const expectedTables = ["users", "rooms", "room_members", "played_cards", "user_sessions"]
    const existingTables = tables.map((t) => t.table_name)
    const missingTables = expectedTables.filter((table) => !existingTables.includes(table))

    return {
      allTablesExist: missingTables.length === 0,
      existingTables,
      missingTables,
    }
  } catch (error) {
    console.error("Error checking tables:", error)
    return {
      allTablesExist: false,
      existingTables: [],
      missingTables: ["users", "rooms", "room_members", "played_cards", "user_sessions"],
    }
  }
}

