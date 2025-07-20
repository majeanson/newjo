import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("sessionId")?.value

    if (sessionId) {
      try {
        // Delete session from database
        await prisma.userSession.delete({
          where: { sessionId }
        })
      } catch (error) {
        console.error("Error deleting session:", error)
      }
    }

    // Clear cookie
    cookieStore.delete("sessionId")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to sign out:", error)
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 })
  }
}
