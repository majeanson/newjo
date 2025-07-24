import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/app/actions/auth"
import { getRoomGameState, saveRoomGameState, broadcastGameEvent } from "@/app/actions/game-actions"
import { placeBet, areAllBetsPlaced, getHighestBet, dealCards } from "@/lib/game-logic"
import { GamePhase, Bets } from "@/lib/game-types"

export async function POST(request: NextRequest) {
  try {
    const { roomId, betValue, trump, playerId } = await request.json()

    // Use provided playerId (for simulator) or get from session (for real users)
    let userId = playerId
    if (!userId) {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
      }
      userId = user.id
    }

    const gameState = await getRoomGameState(roomId)
    if (!gameState) {
      return NextResponse.json({ success: false, error: "Game not found" }, { status: 404 })
    }

    if (gameState.phase !== GamePhase.BETS) {
      return NextResponse.json({ success: false, error: "Not in betting phase" }, { status: 400 })
    }

    if (gameState.currentTurn !== userId) {
      return NextResponse.json({ success: false, error: "Not your turn" }, { status: 400 })
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
      type: 'BET_PLACED',
      roomId,
      userId,
      data: {
        betValue,
        trump,
        playerName: newGameState.players[userId]?.name,
        betsRemaining: newGameState.turnOrder.length - Object.keys(newGameState.bets).length,
        nextPlayer: newGameState.players[newGameState.currentTurn]?.name,
        totalBets: Object.keys(newGameState.bets).length,
        totalPlayers: newGameState.turnOrder.length
      },
      timestamp: new Date()
    })
    console.log('✅ bet_placed event broadcasted')

    // Note: No revalidatePath to prevent SSE connection closure
    // Real-time updates are handled via SSE events

    return NextResponse.json({ success: true, gameState: newGameState })
  } catch (error) {
    console.error("Failed to place bet:", error)
    return NextResponse.json({ success: false, error: "Failed to place bet" }, { status: 500 })
  }
}
