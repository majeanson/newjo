"use server"

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

// Dummy players for simulator (permanent in database)
const DUMMY_PLAYERS = [
  { id: "dummy-alice", name: "Alice (Dummy)" },
  { id: "dummy-bob", name: "Bob (Dummy)" },
  { id: "dummy-charlie", name: "Charlie (Dummy)" },
  { id: "dummy-diana", name: "Diana (Dummy)" }
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

    // Initialize game state for the test room
    const { initializeGame } = await import("./game-actions")
    const gameResult = await initializeGame(room.id)
    if (gameResult.success) {
      console.log(`✅ Game initialized for test room ${room.id}`)
    } else {
      console.log(`⚠️ Game initialization failed for test room: ${gameResult.error}`)
    }

    return { success: true, room }
  } catch (error) {
    console.error("Failed to create test room:", error)
    return { success: false, error: "Failed to create test room" }
  }
}

// Create dummy players for simulator
export async function ensureDummyPlayers() {
  try {
    for (const player of DUMMY_PLAYERS) {
      await prisma.user.upsert({
        where: { id: player.id },
        update: { name: player.name },
        create: {
          id: player.id,
          name: player.name
        }
      })
    }
    console.log("✅ Dummy players ensured in database")
    return { success: true }
  } catch (error) {
    console.error("Failed to ensure dummy players:", error)
    return { success: false, error: "Failed to create dummy players" }
  }
}

// Create simulator room with dummy players
export async function createSimulatorRoom() {
  try {
    // Ensure dummy players exist
    await ensureDummyPlayers()

    // Create or get simulator room
    const SIMULATOR_ROOM_ID = "simulator-room-fixed"

    let room = await prisma.room.findUnique({
      where: { id: SIMULATOR_ROOM_ID },
      include: {
        members: true
      }
    })

    if (!room) {
      // Create new simulator room
      room = await prisma.room.create({
        data: {
          id: SIMULATOR_ROOM_ID,
          name: "Simulator Room",
          hostId: DUMMY_PLAYERS[0].id
        },
        include: {
          members: true
        }
      })
    }

    // Ensure all dummy players are members
    for (const player of DUMMY_PLAYERS) {
      const existingMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: player.id
          }
        }
      })

      if (!existingMember) {
        await prisma.roomMember.create({
          data: {
            roomId: room.id,
            userId: player.id
          }
        })
      }
    }

    // Initialize game state for the room
    const { initializeGame } = await import("./game-actions")
    const gameResult = await initializeGame(room.id)

    console.log(`✅ Simulator room ready: ${room.id}`)
    return { success: true, roomId: room.id, gameState: gameResult.gameState }
  } catch (error) {
    console.error("Failed to create simulator room:", error)
    return { success: false, error: "Failed to create simulator room" }
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
