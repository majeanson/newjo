import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function setupDatabase() {
  try {
    console.log("🔄 Setting up database...")

    // Test connection
    await prisma.$connect()
    console.log("✅ Database connection successful!")

    // Check if tables exist
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `

    console.log("📋 Existing tables:", result)

    // Create a test user to verify everything works
    const testUser = await prisma.user.upsert({
      where: { name: "Test User" },
      update: {},
      create: {
        name: "Test User",
      },
    })

    console.log("👤 Test user created/found:", testUser)

    console.log("🎉 Database setup complete!")
  } catch (error) {
    console.error("❌ Database setup failed:", error)

    if (error instanceof Error) {
      if (error.message.includes("connect")) {
        console.log("\n💡 Connection tips:")
        console.log("1. Make sure your DATABASE_URL is set in .env.local")
        console.log("2. Check your Neon database is running")
        console.log("3. Verify your connection string is correct")
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

setupDatabase()
