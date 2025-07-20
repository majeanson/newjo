"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

// Test users for multi-tab testing
const TEST_USERS = [
  { id: "test-player1", name: "Alice" },
  { id: "test-player2", name: "Bob" },
  { id: "test-player3", name: "Charlie" },
  { id: "test-player4", name: "Diana" }
]

// Create or get test user
async function ensureTestUser(userId: string, userName: string) {
  try {
    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      // Create new test user
      user = await prisma.user.create({
        data: {
          id: userId,
          name: userName
        }
      })
    }

    return user
  } catch (error) {
    console.error("Failed to ensure test user:", error)
    throw error
  }
}

// Switch to test user
export async function switchToTestUser(userId: string, userName: string) {
  try {
    // Ensure the test user exists
    const user = await ensureTestUser(userId, userName)

    // Generate a unique session ID
    const sessionId = `test-session-${userId}-${Date.now()}`

    // Create a session for this user
    const session = await prisma.userSession.create({
      data: {
        sessionId,
        userId: user.id,
        lastSeen: new Date()
      }
    })

    // Set the session cookie
    const cookieStore = await cookies()
    cookieStore.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return { success: true, user }
  } catch (error) {
    console.error("Failed to switch user:", error)
    return { success: false, error: "Failed to switch user" }
  }
}

// Get current test user (use existing auth system)
export async function getCurrentTestUser() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("sessionId")?.value

    if (!sessionId) {
      return null
    }

    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    })

    if (!session) {
      return null
    }

    return session.user
  } catch (error) {
    console.error("Failed to get current test user:", error)
    return null
  }
}

// Auto-join room for testing
export async function autoJoinRoom(roomId: string) {
  try {
    const user = await getCurrentTestUser()
    if (!user) {
      return { success: false, error: "No user session" }
    }

    // Check if user is already a member
    const existingMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.id
        }
      }
    })

    if (!existingMember) {
      // Add user to room
      await prisma.roomMember.create({
        data: {
          roomId,
          userId: user.id
        }
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to auto-join room:", error)
    return { success: false, error: "Failed to join room" }
  }
}

// Create test room (simpler version for testing)
export async function createTestRoom(roomName: string) {
  try {
    const user = await getCurrentTestUser()
    if (!user) {
      return { success: false, error: "No user session" }
    }

    const room = await prisma.room.create({
      data: {
        name: roomName,
        hostId: user.id,
      },
      include: {
        host: true,
        members: {
          include: { user: true }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    return { success: true, room }
  } catch (error) {
    console.error("Failed to create test room:", error)
    return { success: false, error: "Failed to create test room" }
  }
}

// Clear test session (sign out)
export async function clearTestSession() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete("sessionId")
    return { success: true }
  } catch (error) {
    console.error("Failed to clear session:", error)
    return { success: false, error: "Failed to sign out" }
  }
}
