"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./auth"
import { prisma } from "@/lib/prisma"
import { 
  GamePhase, 
  Team, 
  GameState, 
  Player,
  selectTeam,
  selectSeat,
  placeBet,
  areAllPlayersReady,
  areTeamsBalanced,
  areSeatsSelected,
  generateTurnOrder,
  getHighestBet,
  areAllBetsPlaced,
  dealCards
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
