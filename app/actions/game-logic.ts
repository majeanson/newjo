"use server"


import { getCurrentUser } from "./auth"
import { prisma } from "@/lib/prisma"
import { GameState, GamePhase, Card, Team, Player, Bet, Bets } from "@/lib/game-types"
// import { EVENT_TYPES } from "@/lib/events" // Available for future use

// Helper function to safely cast JSON to expected type
function safeJsonCast<T>(value: any, fallback: T): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T
  }
  return fallback
}

// Import the proper broadcastGameEvent function from game-actions
import { broadcastGameEvent, getRoomGameState, saveRoomGameState } from "./game-actions"

// Type for round result
interface RoundResult {
  teamAScore: number
  teamBScore: number
  bettingTeamWon: boolean
  round: number
  highestBet: Bet
}
import {
  selectTeam,
  placeBet,
  areTeamsBalanced,
  getHighestBet,
  areAllBetsPlaced,
  dealCards,
  canPlayCard,
  playCard,
  isTrickComplete,
  isRoundComplete,
  processTrickWin,
  getWinningCard,
  calculateRoundScores,
  processRoundEnd
} from "@/lib/game-logic"

// Get current game state for a room
export async function getGameState(roomId: string): Promise<GameState | null> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: true }
        }
      }
    })

    if (!room) return null

    // Build game state from room data
    const players: Record<string, Player> = {}
    const playerTeams = safeJsonCast<Record<string, Team>>(room.playerTeams, {})
    const playerSeats = safeJsonCast<Record<string, number>>(room.playerSeats, {})
    const playerReady = safeJsonCast<Record<string, boolean>>(room.playerReady, {})

    room.members.forEach(member => {
      players[member.userId] = {
        id: member.userId,
        name: member.user.name,
        team: playerTeams[member.userId],
        seatPosition: playerSeats[member.userId],
        isReady: playerReady[member.userId] || false
      }
    })

    // Build turn order from seat positions
    const turnOrder = Object.values(players)
      .filter(p => p.seatPosition !== undefined)
      .sort((a, b) => (a.seatPosition || 0) - (b.seatPosition || 0))
      .map(p => p.id)

    // Build highest bet if exists
    let highestBet: any = undefined
    if (room.highestBetUserId && room.highestBetValue !== null) {
      highestBet = {
        playerId: room.highestBetUserId,
        value: room.highestBetValue,
        trump: room.highestBetTrump || false,
        timestamp: new Date()
      }
    }

    return {
      phase: (room.gamePhase as GamePhase) || GamePhase.TEAM_SELECTION,
      round: room.currentRound || 1,
      currentTurn: room.currentTurn || '',
      dealer: room.dealerUserId || '',
      starter: room.starterUserId || '',
      trump: room.trumpColor as any,
      highestBet,
      players,
      bets: safeJsonCast<Record<string, Bet>>(room.playerBets, {}),
      playedCards: safeJsonCast<Record<string, Card>>(room.playedCards, {}),
      playerHands: safeJsonCast<Record<string, Card[]>>(room.playerHands, {}),
      wonTricks: safeJsonCast<Record<string, number>>(room.tricksWon, {}),
      scores: safeJsonCast<Record<string, number>>(room.gameScores, {}),
      turnOrder
    }
  } catch (error) {
    console.error("Failed to get game state:", error)
    return null
  }
}



// Team selection action
export async function selectPlayerTeam(
  roomId: string, 
  team: Team
): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const gameState = await getRoomGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    if (gameState.phase !== GamePhase.TEAM_SELECTION) {
      return { success: false, error: "Not in team selection phase" }
    }

    const newGameState = selectTeam(gameState, user.id, team)

    // Check if we can move to betting (auto-assign seats)
    const teamsBalanced = areTeamsBalanced(newGameState)
    if (teamsBalanced) {
      // Auto-assign seats in A1, B2, A3, B4 pattern
      const teamAPlayers = Object.values(newGameState.players).filter(p => p.team === Team.A)
      const teamBPlayers = Object.values(newGameState.players).filter(p => p.team === Team.B)

      teamAPlayers[0].seatPosition = 0  // A1
      teamBPlayers[0].seatPosition = 1  // B2
      teamAPlayers[1].seatPosition = 2  // A3
      teamBPlayers[1].seatPosition = 3  // B4

      newGameState.phase = GamePhase.BETS
    }

    await saveRoomGameState(roomId, newGameState)

    // Broadcast team selection event
    await broadcastGameEvent({
      type: 'TEAM_SELECTED',
      roomId,
      userId: user.id,
      data: {
        team,
        playerName: newGameState.players[user.id]?.name,
        teamsBalanced,
        phase: newGameState.phase
      },
      timestamp: new Date()
    })

    // If teams are balanced and betting phase started, broadcast that too
    if (teamsBalanced) {
      await broadcastGameEvent({
        type: 'BETTING_PHASE_STARTED',
        roomId,
        userId: user.id,
        data: {
          phase: 'bets',
          turnOrder: newGameState.turnOrder,
          currentTurn: newGameState.currentTurn
        },
        timestamp: new Date()
      })
    }

    // Note: Removed revalidatePath to prevent SSE connection closure
    // Real-time updates are handled via SSE events

    return { success: true, gameState: newGameState }
  } catch (error) {
    console.error("Failed to select team:", error)
    return { success: false, error: "Failed to select team" }
  }
}

// Note: Seat selection is now automatic when teams are complete

// Betting action
export async function placeBetAction(
  roomId: string,
  betValue: Bets,
  trump: boolean,
  playerId?: string
): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    // Use provided playerId (for simulator) or get from session (for real users)
    let userId = playerId
    if (!userId) {
      const user = await getCurrentUser()
      if (!user) {
        return { success: false, error: "Not authenticated" }
      }
      userId = user.id
    }

    const gameState = await getRoomGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    if (gameState.phase !== GamePhase.BETS) {
      return { success: false, error: "Not in betting phase" }
    }

    if (gameState.currentTurn !== userId) {
      return { success: false, error: "Not your turn" }
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

      // Note: Removed revalidatePath to prevent SSE connection closure
      // Real-time updates are handled via SSE events
      return { success: true, gameState: gameStateWithCards }
    }

    await saveRoomGameState(roomId, newGameState)

    // Small delay to ensure database write is committed
    await new Promise(resolve => setTimeout(resolve, 50))

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

    // Note: Removed revalidatePath to prevent SSE connection closure
    // Real-time updates are handled via SSE events

    return { success: true, gameState: newGameState }
  } catch (error) {
    console.error("Failed to place bet:", error)
    return { success: false, error: "Failed to place bet" }
  }
}

// Ready up action
export async function setPlayerReady(
  roomId: string, 
  ready: boolean
): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const gameState = await getRoomGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    const newGameState = {
      ...gameState,
      players: {
        ...gameState.players,
        [user.id]: {
          ...gameState.players[user.id],
          isReady: ready
        }
      }
    }

    await saveRoomGameState(roomId, newGameState)

    // Broadcast ready state change event
    await broadcastGameEvent({
      type: 'PLAYER_READY_CHANGED',
      roomId,
      userId: user.id,
      data: {
        ready,
        playerName: newGameState.players[user.id]?.name,
        allReady: Object.values(newGameState.players).every((p: Player) => p.isReady)
      },
      timestamp: new Date()
    })

    // Note: Removed revalidatePath to prevent SSE connection closure
    // Real-time updates are handled via SSE events

    return { success: true, gameState: newGameState }
  } catch (error) {
    console.error("Failed to set ready state:", error)
    return { success: false, error: "Failed to set ready state" }
  }
}

// Card playing actions
export async function playCardAction(
  roomId: string,
  cardId: string,
  playerId?: string
): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    // Use provided playerId (for simulator) or get from session (for real users)
    let userId = playerId
    if (!userId) {
      const user = await getCurrentUser()
      if (!user) {
        return { success: false, error: "Not authenticated" }
      }
      userId = user.id
    }

    const gameState = await getRoomGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    if (gameState.phase !== GamePhase.CARDS) {
      return { success: false, error: "Not in card playing phase" }
    }

    if (gameState.currentTurn !== userId) {
      return { success: false, error: "Not your turn" }
    }

    // Find the card in player's hand
    const playerHand = gameState.playerHands[userId] || []
    const card = playerHand.find(c => c.id === cardId)

    if (!card) {
      return { success: false, error: "Card not found in your hand" }
    }

    if (!canPlayCard(gameState, userId, card)) {
      return { success: false, error: "Cannot play this card" }
    }

    let newGameState = playCard(gameState, userId, card)

    // Save the state immediately for the card play
    await saveRoomGameState(roomId, newGameState)

    // Small delay to ensure database write is committed
    await new Promise(resolve => setTimeout(resolve, 50))

    // Broadcast granular card change event
    await broadcastGameEvent({
      type: 'CARDS_CHANGED',
      roomId,
      userId,
      data: {
        playedCards: newGameState.playedCards,    // Only the played cards
        currentTurn: newGameState.currentTurn,    // Only the current turn
        phase: newGameState.phase,               // Only the phase
        playerHands: newGameState.playerHands,   // Updated player hands
        card: `${card.color}-${card.value}`,
        playerName: newGameState.players[userId]?.name,
        cardsInTrick: Object.keys(newGameState.playedCards).length
      },
      timestamp: new Date()
    })

    // Check if trick is complete
    if (isTrickComplete(newGameState)) {
      console.log('🎯 Trick complete! Processing trick win...')

      // First, broadcast TRICK_COMPLETE while cards are still visible
      const playedCards = Object.values(newGameState.playedCards).sort((a, b) => a.playOrder - b.playOrder)
      const winningCard = getWinningCard(playedCards, newGameState.trump)

      if (winningCard) {
        const winnerBeforeProcessing = winningCard.playerId
        await broadcastGameEvent({
          type: 'TRICK_COMPLETE',
          roomId,
          userId,
          data: {
            winner: winnerBeforeProcessing,
            winnerName: newGameState.players[winnerBeforeProcessing]?.name,
            cardsInTrick: playedCards.length,
            card: winningCard.color + '-' + winningCard.value,
            remainingCards: Object.keys(newGameState.playerHands[winnerBeforeProcessing] || {}).length
          },
          timestamp: new Date()
        })

        console.log('🏆 TRICK_COMPLETE sent, processing trick normally but delaying TRICK_CHANGED...')
      }

      // Process trick win immediately (for game logic)
      newGameState = processTrickWin(newGameState)

      // Delay the TRICK_CHANGED broadcast to let players see the winner
      setTimeout(async () => {
        console.log('🔄 Now broadcasting TRICK_CHANGED to clear cards...')

        // Broadcast granular trick change event (clears the cards)
        await broadcastGameEvent({
          type: 'TRICK_CHANGED',
          roomId,
          userId,
          data: {
            playedCards: newGameState.playedCards,    // Cleared played cards
            currentTurn: newGameState.currentTurn,    // Winner starts next trick
            phase: newGameState.phase,               // Might change to TRICK_SCORING
            wonTricks: newGameState.wonTricks,       // Updated trick scores
            winner: newGameState.currentTurn,
            winnerName: newGameState.players[newGameState.currentTurn]?.name
          },
          timestamp: new Date()
        })
      }, 2000) // 2 second delay to let players see the winner message

      // Check if round is complete
      if (isRoundComplete(newGameState)) {
        console.log('🎯 Round complete! Processing round scoring...')
        newGameState.phase = GamePhase.TRICK_SCORING

        // Automatically process round scoring
        const roundScores = calculateRoundScores(newGameState)
        console.log(`🏆 Round ${newGameState.round} complete! Processing scores:`, roundScores)

        // Process the round end to update scores and prepare next round
        newGameState = processRoundEnd(newGameState)
        console.log(`🎯 Round ${newGameState.round - 1} scored. Starting round ${newGameState.round}`)

        // Broadcast granular round change event
        await broadcastGameEvent({
          type: 'ROUND_CHANGED',
          roomId,
          userId,
          data: {
            phase: newGameState.phase,           // New phase (BETS)
            round: newGameState.round,           // New round number
            scores: newGameState.scores,         // Updated scores
            bets: newGameState.bets,            // Cleared bets
            currentTurn: newGameState.currentTurn, // New turn order
            roundScores: roundScores,           // Scores from completed round
            completedRound: newGameState.round - 1
          },
          timestamp: new Date()
        })

        // Also broadcast legacy ROUND_COMPLETE event for compatibility
        await broadcastGameEvent({
          type: 'ROUND_COMPLETE',
          roomId,
          userId,
          data: {
            round: newGameState.round - 1,
            scores: roundScores
          },
          timestamp: new Date()
        })
      }
    }

    // Save final state if there were additional changes (trick/round completion)
    await saveRoomGameState(roomId, newGameState)

    // Note: Removed revalidatePath to prevent SSE connection closure
    // Real-time updates are handled via SSE events

    return { success: true, gameState: newGameState }
  } catch (error) {
    console.error("Failed to play card:", error)
    return { success: false, error: "Failed to play card" }
  }
}

// Get player's hand
export async function getPlayerHand(
  roomId: string
): Promise<{ success: boolean; error?: string; cards?: Card[] }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const gameState = await getGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    const playerHand = gameState.playerHands[user.id] || []
    return { success: true, cards: playerHand }
  } catch (error) {
    console.error("Failed to get player hand:", error)
    return { success: false, error: "Failed to get player hand" }
  }
}

// Get current trick cards
export async function getCurrentTrick(
  roomId: string
): Promise<{ success: boolean; error?: string; playedCards?: Record<string, Card> }> {
  try {
    const gameState = await getGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    return { success: true, playedCards: gameState.playedCards }
  } catch (error) {
    console.error("Failed to get current trick:", error)
    return { success: false, error: "Failed to get current trick" }
  }
}

// Process round scoring
export async function processRoundScoring(
  roomId: string
): Promise<{ success: boolean; error?: string; gameState?: GameState; roundResult?: RoundResult }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const gameState = await getGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    if (gameState.phase !== GamePhase.TRICK_SCORING) {
      return { success: false, error: "Not in scoring phase" }
    }

    const roundResult = calculateRoundScores(gameState)
    const newGameState = processRoundEnd(gameState)

    await saveRoomGameState(roomId, newGameState)

    // Broadcast round scoring complete event
    await broadcastGameEvent({
      type: 'ROUND_SCORING_COMPLETE',
      roomId,
      userId: user.id,
      data: {
        roundResult,
        newRound: newGameState.round,
        phase: newGameState.phase,
        scores: newGameState.scores
      },
      timestamp: new Date()
    })

    // Note: Removed revalidatePath to prevent SSE connection closure
    // Real-time updates are handled via SSE events

    return {
      success: true,
      gameState: newGameState,
      roundResult: {
        ...roundResult,
        round: gameState.round,
        highestBet: gameState.highestBet
      }
    }
  } catch (error) {
    console.error("Failed to process round scoring:", error)
    return { success: false, error: "Failed to process round scoring" }
  }
}

// Get game scores
export async function getGameScores(
  roomId: string
): Promise<{ success: boolean; error?: string; scores?: Record<string, number> }> {
  try {
    const gameState = await getGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    return { success: true, scores: gameState.scores }
  } catch (error) {
    console.error("Failed to get game scores:", error)
    return { success: false, error: "Failed to get game scores" }
  }
}
