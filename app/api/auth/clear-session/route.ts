import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Clear the auth cookies
    cookieStore.delete("userId")
    cookieStore.delete("userName")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to clear session:", error)
    return NextResponse.json({ error: "Failed to clear session" }, { status: 500 })
  }
}
