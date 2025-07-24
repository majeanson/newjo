import { NextRequest, NextResponse } from "next/server"
import { getRoomGameState, resetGameAction } from "@/app/actions/game-actions"
import {
  createSuccessResponse,
  createErrorResponse,
  getHttpStatusCode,
  GameStateResponse
} from "@/lib/api-types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, roomId } = body

    switch (action) {
      case 'getGameState':
        try {
          const gameState = await getRoomGameState(roomId)
          if (gameState) {
            const responseData: GameStateResponse = {
              gameState,
              roomExists: true,
              playerCount: Object.keys(gameState.players).length,
              isPlayerInRoom: true
            }
            const response = createSuccessResponse(responseData, "Game state retrieved successfully")
            return NextResponse.json(response)
          } else {
            const response = createErrorResponse("Game state not found", "NOT_FOUND")
            return NextResponse.json(response, { status: getHttpStatusCode(response) })
          }
        } catch (error) {
          console.error('Failed to get game state:', error)
          const response = createErrorResponse("Failed to get game state", "INTERNAL_ERROR")
          return NextResponse.json(response, { status: getHttpStatusCode(response) })
        }

      case 'resetGame':
        try {
          const result = await resetGameAction(roomId)
          // resetGameAction returns the old format, so we need to convert it
          if (result.success && result.gameState) {
            const responseData: GameStateResponse = {
              gameState: result.gameState,
              roomExists: true,
              playerCount: Object.keys(result.gameState.players).length,
              isPlayerInRoom: true
            }
            const response = createSuccessResponse(responseData, "Game reset successfully")
            return NextResponse.json(response)
          } else {
            const response = createErrorResponse(result.error || "Failed to reset game", "INTERNAL_ERROR")
            return NextResponse.json(response, { status: getHttpStatusCode(response) })
          }
        } catch (error) {
          console.error('Failed to reset game:', error)
          const response = createErrorResponse("Failed to reset game", "INTERNAL_ERROR")
          return NextResponse.json(response, { status: getHttpStatusCode(response) })
        }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" })
    }
  } catch (error) {
    console.error('Simulator route error:', error)
    return NextResponse.json({ success: false, error: "Internal server error" })
  }
}
