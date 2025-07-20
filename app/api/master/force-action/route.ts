import { NextRequest, NextResponse } from "next/server"
import { eventStore } from "@/lib/events"
import { getCurrentUser } from "@/app/actions/auth"

export async function POST(request: NextRequest) {
  try {
    const { roomId, action, masterId } = await request.json()
    
    // Verify master user (you might want additional authorization)
    const user = await getCurrentUser()
    if (!user || user.id !== masterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Execute master actions
    switch (action) {
      case 'FORCE_DRAW':
        const cards = ["A♠", "K♥", "Q♦", "J♣", "10♠", "9♥", "8♦", "7♣"]
        const randomCard = cards[Math.floor(Math.random() * cards.length)]
        
        eventStore.emit({
          type: "CARD_DRAWN",
          roomId,
          card: randomCard,
          remainingCards: 45
        })
        break

      case 'RESET_GAME':
        eventStore.emit({
          type: "ROOM_UPDATED",
          roomId
        })
        break

      case 'SHUFFLE_DECK':
        // Emit custom event for deck shuffle
        eventStore.emit({
          type: "ROOM_UPDATED",
          roomId
        })
        break

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Master action failed:", error)
    return NextResponse.json({ error: "Action failed" }, { status: 500 })
  }
}