import { NextRequest, NextResponse } from "next/server"
import { getRoomGameState, resetGameAction } from "@/app/actions/game-actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, roomId } = body

    switch (action) {
      case 'getGameState':
        try {
          const gameState = await getRoomGameState(roomId)
          if (gameState) {
            return NextResponse.json({ success: true, gameState })
          } else {
            return NextResponse.json({ success: false, error: "Game state not found" })
          }
        } catch (error) {
          console.error('Failed to get game state:', error)
          return NextResponse.json({ success: false, error: "Failed to get game state" })
        }

      case 'resetGame':
        try {
          const result = await resetGameAction(roomId)
          return NextResponse.json(result)
        } catch (error) {
          console.error('Failed to reset game:', error)
          return NextResponse.json({ success: false, error: "Failed to reset game" })
        }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" })
    }
  } catch (error) {
    console.error('Simulator route error:', error)
    return NextResponse.json({ success: false, error: "Internal server error" })
  }
}
