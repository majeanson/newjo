import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await request.json()
    
    const cookieStore = await cookies()
    
    // Set the cookies to match the localStorage session
    cookieStore.set("userId", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    
    cookieStore.set("userName", session.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to sync session:", error)
    return NextResponse.json({ error: "Failed to sync session" }, { status: 500 })
  }
}