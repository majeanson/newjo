"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./auth"
import { getRoomData as dbGetRoomData } from "@/lib/database"
import { eventStore } from "@/lib/events"

export async function drawCardAction(prevState: {error?: string; success?: boolean; card?: string  } | null, formData: FormData) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const roomId = (formData?.get("roomId") as string) || ""
  if (!roomId) {
    return { error: "Room ID is required" }
  }

  try {
    const room = await dbGetRoomData(roomId)
    if (!room) {
      return { error: "Room not found" }
    }

    if (room.hostId !== user.id) {
      return { error: "Only the host can draw cards" }
    }

    const cards = ["A♠", "K♥", "Q♦", "J♣", "10♠", "9♥", "8♦", "7♣", "6♠", "5♥"]
    const randomCard = cards[Math.floor(Math.random() * cards.length)]

    // Emit real-time event
    eventStore.emit({
      type: "CARD_DRAWN",
      roomId,
      card: randomCard,
      remainingCards: 45
    })

    revalidatePath(`/room/${roomId}`)
    return { success: true, card: randomCard }
  } catch (error) {
    console.error("Failed to draw card:", error)
    return { error: "Failed to draw card" }
  }
}

// playCard function moved to game-actions.ts

export async function getRoomData(roomId: string) {
  try {
    return await dbGetRoomData(roomId)
  } catch (error) {
    console.error("Failed to get room data:", error)
    return null
  }
}




