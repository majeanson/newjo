"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./auth"
import { prisma } from "@/lib/prisma"
import { GameState, GamePhase, Card, Team, Player } from "@/lib/game-types"
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

    // Parse game state from room data or create initial state
    const gameData = room.currentDeck as any // This will store our game state
    
    if (gameData && gameData.gameState) {
      return gameData.gameState as GameState
    }

    // Create initial game state
    const players: Record<string, Player> = {}
    room.members.forEach(member => {
      players[member.userId] = {
        id: member.userId,
        name: member.user.name,
        isReady: false
      }
    })

    return {
      phase: GamePhase.TEAM_SELECTION,
      round: 1,
      currentTurn: '',
      dealer: '',
      starter: '',
      players,
      bets: {},
      playedCards: {},
      playerHands: {},
      wonTricks: {},
      scores: {},
      turnOrder: []
    }
  } catch (error) {
    console.error("Failed to get game state:", error)
    return null
  }
}

// Save game state to database
async function saveGameState(roomId: string, gameState: GameState): Promise<void> {
  await prisma.room.update({
    where: { id: roomId },
    data: {
      currentDeck: { gameState } as any
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
    
    // Check if we can move to seat selection
    if (areTeamsBalanced(newGameState)) {
      newGameState.phase = GamePhase.SEAT_SELECTION
    }

    await saveGameState(roomId, newGameState)
    revalidatePath(`/room/${roomId}`)

    return { success: true, gameState: newGameState }
  } catch (error) {
    console.error("Failed to select team:", error)
    return { success: false, error: "Failed to select team" }
  }
}

// Seat selection action
export async function selectPlayerSeat(
  roomId: string, 
  seatPosition: number
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

    if (gameState.phase !== GamePhase.SEAT_SELECTION) {
      return { success: false, error: "Not in seat selection phase" }
    }

    const newGameState = selectSeat(gameState, user.id, seatPosition)
    
    // Check if we can move to betting phase
    if (areSeatsSelected(newGameState)) {
      newGameState.phase = GamePhase.BETS
      newGameState.turnOrder = generateTurnOrder(newGameState)
      
      // Set random dealer and starter
      const randomIndex = Math.floor(Math.random() * newGameState.turnOrder.length)
      newGameState.dealer = newGameState.turnOrder[randomIndex]
      newGameState.starter = newGameState.turnOrder[(randomIndex + 1) % newGameState.turnOrder.length]
      newGameState.currentTurn = newGameState.starter
      
      // Deal cards
      const gameStateWithCards = dealCards(newGameState)
      await saveGameState(roomId, gameStateWithCards)
      revalidatePath(`/room/${roomId}`)
      return { success: true, gameState: gameStateWithCards }
    }

    await saveGameState(roomId, newGameState)
    revalidatePath(`/room/${roomId}`)

    return { success: true, gameState: newGameState }
  } catch (error) {
    console.error("Failed to select seat:", error)
    return { success: false, error: "Failed to select seat" }
  }
}

// Betting action
export async function placeBetAction(
  roomId: string, 
  betValue: number, 
  trump: boolean
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

    if (gameState.phase !== GamePhase.BETS) {
      return { success: false, error: "Not in betting phase" }
    }

    if (gameState.currentTurn !== user.id) {
      return { success: false, error: "Not your turn" }
    }

    const newGameState = placeBet(gameState, user.id, betValue, trump)
    
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
): Promise<{ success: boolean; error?: string; gameState?: GameState; roundResult?: any }> {
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
