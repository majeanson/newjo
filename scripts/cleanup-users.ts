import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function cleanupUsers() {
  try {
    console.log("🧹 Cleaning up duplicate users...")

    // Delete all users and related data to start fresh
    await prisma.playedCard.deleteMany()
    await prisma.roomMember.deleteMany()
    await prisma.userSession.deleteMany()
    await prisma.room.deleteMany()
    await prisma.user.deleteMany()

    console.log("✅ All user data cleaned up!")
    console.log("Now you can run: npx prisma db push")
  } catch (error) {
    console.error("❌ Cleanup failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupUsers()