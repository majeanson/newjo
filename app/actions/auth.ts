"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("sessionId")?.value

  if (!sessionId) {
    return null
  }

  try {
    // Clean up expired sessions (older than 5 minutes)
    await prisma.userSession.deleteMany({
      where: {
        lastSeen: {
          lt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }
      }
    })

    // Find and update current session
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    })

    if (session) {
      // Update last seen
      await prisma.userSession.update({
        where: { sessionId },
        data: { lastSeen: new Date() }
      })

      return session.user
    }

    return null
  } catch {
    // Remove 'error' parameter if not used
  }
}

export async function signIn(_prevState: { error?: string } | null, formData: FormData) {
  const name = formData.get("name") as string

  if (!name || name.trim().length === 0) {
    return { error: "Name is required" }
  }

  try {
    // Check if user already has an active session
    const existingUser = await prisma.user.findFirst({
      where: { name: name.trim() },
      include: {
        sessions: {
          where: {
            lastSeen: {
              gt: new Date(Date.now() - 5 * 60 * 1000) // Active in last 5 minutes
            }
          }
        }
      }
    })

    let user: any
    let sessionId: string

    if (existingUser && existingUser.sessions.length > 0) {
      // User has active session, use existing user and session
      user = existingUser
      sessionId = existingUser.sessions[0].sessionId

      // Update last seen
      await prisma.userSession.update({
        where: { sessionId },
        data: { lastSeen: new Date() }
      })
    } else {
      // Create new user or get existing user without active session
      user = await prisma.user.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() }
      })

      // Create new session
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionId,
          lastSeen: new Date()
        }
      })
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return { success: true, redirectTo: "/dashboard" }
  } catch (error: any) {
    console.error("Sign in error:", error)
    return { error: "Failed to sign in. Please try again." }
  }
}

export async function signOut() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("sessionId")?.value

  if (sessionId) {
    try {
      // Delete session from database
      await prisma.userSession.delete({
        where: { sessionId }
      })
    } catch {
      // Remove 'error' parameter if not used
    }
  }

  // Clear cookie
  cookieStore.delete("sessionId")
  redirect("/")
}










