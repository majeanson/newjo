"use server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "./auth"
import { createRoom as dbCreateRoom, getRooms as dbGetRooms, joinRoom as dbJoinRoom } from "@/lib/database"

import { initializeGame } from "./game-actions"

export async function createRoom(prevState: { error?: string } | null, formData: FormData) {
  console.log("🔍 Creating room - checking user...")
  const user = await getCurrentUser()
  console.log("👤 Current user:", user ? `${user.name} (${user.id})` : "null")
  
  if (!user) {
    console.log("❌ No user found, redirecting to home")
    redirect("/")
  }

  if (!formData) {
    return { error: "Form data is missing" }
  }

  const roomName = formData.get("roomName") as string

  if (!roomName || roomName.trim().length === 0) {
    return { error: "Room name is required" }
  }

  try {
    console.log(`🏠 Creating room "${roomName}" for user ${user.id}`)
    const room = await dbCreateRoom(roomName.trim(), user.id)
    console.log(`✅ Room created: ${room.id}`)

    // Initialize game state for the room
    console.log(`🎮 Initializing game for room ${room.id}`)
    const gameResult = await initializeGame(room.id)
    if (gameResult.success) {
      console.log(`✅ Game initialized for room ${room.id}`)
    } else {
      console.log(`⚠️ Game initialization failed: ${gameResult.error}`)
    }

    // Emit real-time event for room creation
    const { broadcastGameEvent } = await import("./game-actions")
    await broadcastGameEvent({
      type: "ROOM_UPDATED",
      roomId: room.id,
      data: {
        roomName: room.name,
        created: true
      },
      timestamp: new Date()
    })

    redirect(`/room/${room.id}`)
  } catch (error) {
    // Don't log redirect errors
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("Failed to create room:", error)
    return { error: "Failed to create room" }
  }
}

export async function joinRoom(prevState: { error?: string } | null,  formData: FormData) {
  console.log("🚪 Joining room...")
  const user = await getCurrentUser()
  console.log("👤 Current user:", user ? `${user.name} (${user.id})` : "null")
  
  if (!user) {
    console.log("❌ No user found, redirecting to home")
    redirect("/")
  }

  const roomId = formData.get("roomId") as string
  console.log("🏠 Room ID:", roomId)
  
  if (!roomId) {
    return { error: "Room ID is required" }
  }

  try {
    console.log(`🚪 Attempting to join room ${roomId} for user ${user.id}`)
    const success = await dbJoinRoom(roomId, user.id)
    console.log("✅ Join result:", success)
    
    if (success) {
      // Update game state with new player
      const { updateGamePlayersAction } = await import("./game-actions")
      await updateGamePlayersAction(roomId)

      // Emit real-time event
      const { broadcastGameEvent } = await import("./game-actions")
      await broadcastGameEvent({
        type: "PLAYER_JOINED",
        roomId,
        data: {
          playerName: user.name,
          playerId: user.id
        },
        timestamp: new Date()
      })

      console.log(`🎯 Redirecting to /room/${roomId}`)
      redirect(`/room/${roomId}`)
    } else {
      return { error: "Failed to join room" }
    }
  } catch (error) {
    // Don't log redirect errors
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("Failed to join room:", error)
    return { error: "Failed to join room" }
  }
}

export async function getRooms() {
  try {
    return await dbGetRooms()
  } catch (error) {
    console.error("Failed to get rooms:", error)
    return []
  }
}








