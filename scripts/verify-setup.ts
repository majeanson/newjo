import { config } from "dotenv"
import { resolve } from "path"
import { PrismaClient } from "@prisma/client"

// Try multiple ways to load environment variables
console.log("🔍 Loading environment variables...")
console.log("Current working directory:", process.cwd())

// Load from .env.local
const envPath = resolve(process.cwd(), ".env.local")
console.log("Looking for .env.local at:", envPath)

config({ path: ".env.local" })
config({ path: resolve(process.cwd(), ".env.local") })

// Check if variables are loaded
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)
console.log("DATABASE_URL preview:", process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + "..." : "NOT FOUND")

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found!")
  console.log("Please check that .env.local exists in the project root")
  process.exit(1)
}

const prisma = new PrismaClient()

async function verifySetup() {
  console.log("🔄 Verifying database setup...")

  try {
    await prisma.$connect()
    console.log("✅ Database connection successful!")

    const tables = (await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `) as Array<{ table_name: string }>

    console.log("📋 Database tables:")
    tables.forEach((table) => {
      console.log(`  - ${table.table_name}`)
    })

    console.log("\n🎉 Database setup verification complete!")
  } catch (error) {
    console.error("❌ Setup verification failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

verifySetup()

