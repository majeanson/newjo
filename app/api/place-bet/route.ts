import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/app/actions/auth"
import { getRoomGameState, saveRoomGameState, broadcastGameEvent } from "@/app/actions/game-actions"
import { placeBet, areAllBetsPlaced, getHighestBet, dealCards } from "@/lib/game-logic"
import { GamePhase, Bets } from "@/lib/game-types"
import {
  createSuccessResponse,
  createErrorResponse,
  getHttpStatusCode,
  GameActionResponse
} from "@/lib/api-types"

export async function POST(request: NextRequest) {
  try {
    const { roomId, betValue, trump, playerId } = await request.json()

    // Use provided playerId (for simulator) or get from session (for real users)
    let userId = playerId
    if (!userId) {
      const user = await getCurrentUser()
      if (!user) {
        const response = createErrorResponse("Not authenticated", "UNAUTHORIZED")
        return NextResponse.json(response, { status: getHttpStatusCode(response) })
      }
      userId = user.id
    }

    const gameState = await getRoomGameState(roomId)
    if (!gameState) {
      const response = createErrorResponse("Game not found", "NOT_FOUND")
      return NextResponse.json(response, { status: getHttpStatusCode(response) })
    }

    if (gameState.phase !== GamePhase.BETS) {
      const response = createErrorResponse("Not in betting phase", "INVALID_PHASE")
      return NextResponse.json(response, { status: getHttpStatusCode(response) })
    }

    if (gameState.currentTurn !== userId) {
      const response = createErrorResponse("Not your turn", "INVALID_TURN")
      return NextResponse.json(response, { status: getHttpStatusCode(response) })
    }

    const newGameState = placeBet(gameState, userId, betValue, trump)

    console.log('🎯 Bet placed by:', userId, 'Bet:', betValue, 'Trump:', trump)
    console.log('🎯 Current bets:', Object.keys(newGameState.bets).length, '/', newGameState.turnOrder.length)

    // Check if all bets are placed
    if (areAllBetsPlaced(newGameState)) {
      console.log('🎯 All bets are placed! Moving to cards phase...')
      const allBets = Object.values(newGameState.bets)
      const highestBet = getHighestBet(allBets)

      if (highestBet) {
        newGameState.highestBet = highestBet
        newGameState.currentTurn = highestBet.playerId // Highest better starts
        newGameState.starter = highestBet.playerId
      }

      // Deal cards to all players
      const gameStateWithCards = dealCards(newGameState)

      // Move to cards phase
      gameStateWithCards.phase = GamePhase.CARDS

      // Return the game state with cards dealt
      await saveRoomGameState(roomId, gameStateWithCards)

      // Small delay to ensure database write is committed
      await new Promise(resolve => setTimeout(resolve, 50))

      // Broadcast that all bets are complete and cards phase started
      console.log('🎯 Broadcasting betting_complete event for room:', roomId)
      await broadcastGameEvent({
        type: 'BETTING_COMPLETE',
        roomId,
        userId,
        data: {
          phase: 'cards',
          highestBet: highestBet?.value,
          highestBetter: highestBet?.playerId,
          trump: highestBet?.trump,
          allBetsComplete: true
        },
        timestamp: new Date()
      })
      console.log('✅ betting_complete event broadcasted')

      return NextResponse.json({ success: true, gameState: gameStateWithCards })
    }

    await saveRoomGameState(roomId, newGameState)

    // Small delay to ensure database write is committed
    await new Promise(resolve => setTimeout(resolve, 50))

    // Check SSE listener count before broadcasting
    const { eventStore } = await import("@/lib/events")
    const listenerCount = eventStore.getListenerCount(roomId)
    console.log('🎯 Broadcasting bet_placed event for:', userId, 'SSE listeners:', listenerCount)
    
    // Debug all listeners
    eventStore.logAllListeners()
    
    await broadcastGameEvent({
      type: 'BETS_CHANGED',
      roomId,
      userId,
      data: {
        bets: newGameState.bets,           // Only the bets object
        currentTurn: newGameState.currentTurn,  // Only the current turn
        phase: newGameState.phase          // Only the phase (in case it changes)
      },
      timestamp: new Date()
    })
    console.log('✅ bet_placed event broadcasted')

    // Note: No revalidatePath to prevent SSE connection closure
    // Real-time updates are handled via SSE events

    const responseData: GameActionResponse = {
      gameState: newGameState,
      actionType: 'BET_PLACED',
      playerId: userId,
      playerName: newGameState.players[userId]?.name || 'Unknown',
      success: true
    }

    const response = createSuccessResponse(responseData, "Bet placed successfully")
    return NextResponse.json(response)
  } catch (error) {
    console.error("Failed to place bet:", error)
    const response = createErrorResponse("Failed to place bet", "INTERNAL_ERROR")
    return NextResponse.json(response, { status: getHttpStatusCode(response) })
  }
}
