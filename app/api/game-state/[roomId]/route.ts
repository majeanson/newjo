import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/app/actions/auth"
import { getRoomGameState } from "@/app/actions/game-actions"

// GET /api/game-state/[roomId] - Get current game state for a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { roomId } = await params

    // Get current game state
    const gameState = await getRoomGameState(roomId)
    
    if (!gameState) {
      return NextResponse.json({ 
        success: false, 
        error: "No game state found",
        gameState: null 
      })
    }

    // Check if user is a player in this game
    if (!gameState.players[user.id]) {
      return new NextResponse("Forbidden - Not a player in this game", { status: 403 })
    }

    return NextResponse.json({ 
      success: true, 
      gameState 
    })
  } catch (error) {
    console.error("Game state fetch error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
