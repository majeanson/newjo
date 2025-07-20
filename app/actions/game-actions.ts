"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./auth"
import { prisma } from "@/lib/prisma"
import { GameState, GamePhase, Card, Team, Player, Bet } from "@/lib/game-types"

// Type for game events
export interface GameEvent {
  type: 'game_state_updated' | 'player_joined' | 'player_left' | 'card_played' | 'bet_placed' | 'round_ended'
  roomId: string
  userId?: string
  data?: any
  timestamp: Date
}

// Broadcast game event to all players in room
async function broadcastGameEvent(event: GameEvent): Promise<void> {
  // For now, we'll use revalidatePath to trigger updates
  // In a real implementation, you'd use WebSockets or Server-Sent Events
  revalidatePath(`/room/${event.roomId}`)
  
  // You could also store events in database for history/debugging
  console.log('Game Event:', event)
}

// Get current game state from room
export async function getRoomGameState(roomId: string): Promise<GameState | null> {
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

    // Build players from room members and stored data
    const players: Record<string, Player> = {}
    const playerTeams = (room as any).playerTeams as Record<string, Team> || {}
    const playerSeats = (room as any).playerSeats as Record<string, number> || {}
    const playerReady = (room as any).playerReady as Record<string, boolean> || {}

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
    let highestBet: Bet | undefined = undefined
    if ((room as any).highestBetUserId && (room as any).highestBetValue !== null) {
      highestBet = {
        playerId: (room as any).highestBetUserId,
        value: (room as any).highestBetValue,
        trump: (room as any).highestBetTrump || false,
        timestamp: new Date()
      }
    }

    return {
      phase: ((room as any).gamePhase as GamePhase) || GamePhase.TEAM_SELECTION,
      round: (room as any).currentRound || 1,
      currentTurn: (room as any).currentTurn || '',
      dealer: (room as any).dealerUserId || '',
      starter: (room as any).starterUserId || '',
      trump: (room as any).trumpColor as any,
      highestBet,
      players,
      bets: ((room as any).playerBets as Record<string, Bet>) || {},
      playedCards: ((room as any).playedCards as Record<string, Card>) || {},
      playerHands: ((room as any).playerHands as Record<string, Card[]>) || {},
      wonTricks: ((room as any).tricksWon as Record<string, number>) || {},
      scores: ((room as any).gameScores as Record<string, number>) || {},
      turnOrder
    }
  } catch (error) {
    console.error("Failed to get room game state:", error)
    return null
  }
}

// Save game state to room
async function saveRoomGameState(roomId: string, gameState: GameState): Promise<void> {
  try {
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
        playerHands: gameState.playerHands as any,
        playedCards: gameState.playedCards as any,
        playerBets: gameState.bets as any,
        playerTeams: playerTeams as any,
        playerSeats: playerSeats as any,
        playerReady: playerReady as any,
        tricksWon: gameState.wonTricks as any,
        gameScores: gameState.scores as any,
        
        // Highest bet
        highestBetUserId: gameState.highestBet?.playerId || null,
        highestBetValue: gameState.highestBet?.value || null,
        highestBetTrump: gameState.highestBet?.trump || null,
      }
    })

    // Broadcast game state update
    await broadcastGameEvent({
      type: 'game_state_updated',
      roomId,
      data: { phase: gameState.phase, round: gameState.round },
      timestamp: new Date()
    })
  } catch (error) {
    console.error("Failed to save room game state:", error)
    throw error
  }
}

// Join game action
export async function joinGame(roomId: string): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Check if user is already a member
    const existingMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.id
        }
      }
    })

    if (!existingMember) {
      // Add user to room
      await prisma.roomMember.create({
        data: {
          roomId,
          userId: user.id
        }
      })

      // Broadcast player joined event
      await broadcastGameEvent({
        type: 'player_joined',
        roomId,
        userId: user.id,
        data: { playerName: user.name },
        timestamp: new Date()
      })
    }

    const gameState = await getRoomGameState(roomId)
    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to join game:", error)
    return { success: false, error: "Failed to join game" }
  }
}

// Select team action
export async function selectTeamAction(
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

    // Check team capacity
    const teamCount = Object.values(gameState.players).filter(p => p.team === team).length
    if (teamCount >= 2) {
      return { success: false, error: "Team is full" }
    }

    // Update player team
    gameState.players[user.id].team = team

    // Check if teams are balanced (2v2)
    const teamACount = Object.values(gameState.players).filter(p => p.team === Team.A).length
    const teamBCount = Object.values(gameState.players).filter(p => p.team === Team.B).length

    if (teamACount === 2 && teamBCount === 2) {
      gameState.phase = GamePhase.SEAT_SELECTION
    }

    await saveRoomGameState(roomId, gameState)
    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to select team:", error)
    return { success: false, error: "Failed to select team" }
  }
}

// Initialize game when 4 players join
export async function initializeGame(roomId: string): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: true }
        }
      }
    })

    if (!room) {
      return { success: false, error: "Room not found" }
    }

    if (room.members.length !== 4) {
      return { success: false, error: "Need exactly 4 players to start game" }
    }

    // Create initial game state
    const players: Record<string, any> = {}
    room.members.forEach(member => {
      players[member.userId] = {
        id: member.userId,
        name: member.user.name,
        team: undefined,
        seatPosition: undefined,
        isReady: false
      }
    })

    const gameState: GameState = {
      phase: GamePhase.TEAM_SELECTION,
      round: 1,
      currentTurn: room.members[0].userId, // First player starts
      dealer: room.members[0].userId,
      starter: room.members[0].userId,
      trump: undefined,
      highestBet: undefined,
      players,
      bets: {},
      playedCards: {},
      playerHands: {},
      wonTricks: {},
      scores: {},
      turnOrder: room.members.map(m => m.userId)
    }

    await saveRoomGameState(roomId, gameState)

    await broadcastGameEvent({
      type: 'game_state_updated',
      roomId,
      data: { phase: gameState.phase, message: 'Game initialized!' },
      timestamp: new Date()
    })

    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to initialize game:", error)
    return { success: false, error: "Failed to initialize game" }
  }
}

// Get game events (for real-time updates)
export async function getGameEvents(roomId: string, since?: Date): Promise<GameEvent[]> {
  // This would fetch events from database in a real implementation
  // For now, return empty array
  return []
}
