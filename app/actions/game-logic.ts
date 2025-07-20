"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./auth"
import { prisma } from "@/lib/prisma"
import { GameState, GamePhase, Card, Team, Player, Bet } from "@/lib/game-types"

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
  selectSeat,
  placeBet,
  areTeamsBalanced,
  areSeatsSelected,
  generateTurnOrder,
  getHighestBet,
  areAllBetsPlaced,
  dealCards,
  canPlayCard,
  playCard,
  isTrickComplete,
  isRoundComplete,
  processTrickWin,
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
    const playerTeams = (room.playerTeams as Record<string, Team>) || {}
    const playerSeats = (room.playerSeats as Record<string, number>) || {}
    const playerReady = (room.playerReady as Record<string, boolean>) || {}

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
      bets: (room.playerBets as Record<string, any>) || {},
      playedCards: (room.playedCards as Record<string, Card>) || {},
      playerHands: (room.playerHands as Record<string, Card[]>) || {},
      wonTricks: (room.tricksWon as Record<string, number>) || {},
      scores: (room.gameScores as Record<string, number>) || {},
      turnOrder
    }
  } catch (error) {
    console.error("Failed to get game state:", error)
    return null
  }
}

// Save game state to database
async function saveGameState(roomId: string, gameState: GameState): Promise<void> {
  // Extract team assignments
  const playerTeams: Record<string, string> = {}
  const playerSeats: Record<string, number> = {}
  const playerReady: Record<string, boolean> = {}

  Object.values(gameState.players).forEach(player => {
    if (player.team) playerTeams[player.id] = player.team
    if (player.seatPosition !== undefined) playerSeats[player.id] = player.seatPosition
    playerReady[player.id] = player.isReady
  })

  await prisma.room.update({
    where: { id: roomId },
    data: {
      gamePhase: gameState.phase,
      currentRound: gameState.round,
      currentTurn: gameState.currentTurn || null,
      dealerUserId: gameState.dealer || null,
      starterUserId: gameState.starter || null,
      trumpColor: gameState.trump || null,

      // JSON fields
      playerHands: gameState.playerHands as object,
      playedCards: gameState.playedCards as object,
      playerBets: gameState.bets as object,
      playerTeams: playerTeams as object,
      playerSeats: playerSeats as object,
      playerReady: playerReady as object,
      tricksWon: gameState.wonTricks as object,
      gameScores: gameState.scores as object,

      // Highest bet
      highestBetUserId: gameState.highestBet?.playerId || null,
      highestBetValue: gameState.highestBet?.value || null,
      highestBetTrump: gameState.highestBet?.trump || null,
    }
  })
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

    const gameState = await getGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    if (gameState.phase !== GamePhase.TEAM_SELECTION) {
      return { success: false, error: "Not in team selection phase" }
    }

    const newGameState = selectTeam(gameState, user.id, team)
    
    // Check if we can move to betting (auto-assign seats)
    if (areTeamsBalanced(newGameState)) {
      // Auto-assign seats in A1, B2, A3, B4 pattern
      const teamAPlayers = Object.values(newGameState.players).filter(p => p.team === Team.A)
      const teamBPlayers = Object.values(newGameState.players).filter(p => p.team === Team.B)

      teamAPlayers[0].seatPosition = 0  // A1
      teamBPlayers[0].seatPosition = 1  // B2
      teamAPlayers[1].seatPosition = 2  // A3
      teamBPlayers[1].seatPosition = 3  // B4

      newGameState.phase = GamePhase.BETS
    }

    await saveGameState(roomId, newGameState)
    revalidatePath(`/room/${roomId}`)

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
  betValue: number,
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

    const gameState = await getGameState(roomId)
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
    
    // Check if all bets are placed
    if (areAllBetsPlaced(newGameState)) {
      const allBets = Object.values(newGameState.bets)
      const highestBet = getHighestBet(allBets)
      
      if (highestBet) {
        newGameState.highestBet = highestBet
        newGameState.currentTurn = highestBet.playerId // Highest better starts
        newGameState.starter = highestBet.playerId
      }
      
      newGameState.phase = GamePhase.CARDS
    }

    await saveGameState(roomId, newGameState)
    revalidatePath(`/room/${roomId}`)

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

    const gameState = await getGameState(roomId)
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

    await saveGameState(roomId, newGameState)
    revalidatePath(`/room/${roomId}`)

    return { success: true, gameState: newGameState }
  } catch (error) {
    console.error("Failed to set ready state:", error)
    return { success: false, error: "Failed to set ready state" }
  }
}

// Card playing actions
export async function playCardAction(
  roomId: string,
  cardId: string
): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const gameState = await getGameState(roomId)
    if (!gameState) {
      return { success: false, error: "Game not found" }
    }

    if (gameState.phase !== GamePhase.CARDS) {
      return { success: false, error: "Not in card playing phase" }
    }

    if (gameState.currentTurn !== user.id) {
      return { success: false, error: "Not your turn" }
    }

    // Find the card in player's hand
    const playerHand = gameState.playerHands[user.id] || []
    const card = playerHand.find(c => c.id === cardId)

    if (!card) {
      return { success: false, error: "Card not found in your hand" }
    }

    if (!canPlayCard(gameState, user.id, card)) {
      return { success: false, error: "Cannot play this card" }
    }

    let newGameState = playCard(gameState, user.id, card)

    // Check if trick is complete
    if (isTrickComplete(newGameState)) {
      // Process trick win after a short delay for UI
      newGameState = processTrickWin(newGameState)

      // Check if round is complete
      if (isRoundComplete(newGameState)) {
        newGameState.phase = GamePhase.TRICK_SCORING
      }
    }

    await saveGameState(roomId, newGameState)
    revalidatePath(`/room/${roomId}`)

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

    await saveGameState(roomId, newGameState)
    revalidatePath(`/room/${roomId}`)

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
