import { NextRequest, NextResponse } from "next/server"
import { getRoomGameState } from "@/app/actions/game-actions"
import {
  createSuccessResponse,
  createErrorResponse,
  getHttpStatusCode,
  GameStateResponse
} from "@/lib/api-types"

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params

    const gameState = await getRoomGameState(roomId)

    if (gameState) {
      const responseData: GameStateResponse = {
        gameState,
        roomExists: true,
        playerCount: Object.keys(gameState.players).length,
        isPlayerInRoom: true // This would need user context to determine properly
      }

      const response = createSuccessResponse(responseData, "Game state retrieved successfully")
      return NextResponse.json(response)
    } else {
      const response = createErrorResponse("Game state not found", "NOT_FOUND")
      return NextResponse.json(response, { status: getHttpStatusCode(response) })
    }
  } catch (error) {
    console.error("Error getting game state:", error)
    const response = createErrorResponse("Failed to get game state", "INTERNAL_ERROR")
    return NextResponse.json(response, { status: getHttpStatusCode(response) })
  }
}
