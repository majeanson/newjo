import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { userId, name, sessionId } = await request.json()
    
    // Create or get user
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name }
    })

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId,
        expiresAt
      }
    })

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to create user session:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}