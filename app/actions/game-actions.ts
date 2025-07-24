"use server"


import { getCurrentUser } from "./auth"
import { prisma } from "@/lib/prisma"
import { GameState, GamePhase, Card, Team, Player, Bet, Bets, CardColor } from "@/lib/game-types"
import { validateGameState, safeObjectCast, isObject, isArray } from "@/lib/type-guards"

// Internal event type for broadcasting (more flexible than the strict GameEvent type)
interface InternalGameEvent {
  type: string
  roomId: string
  userId?: string
  data?: any
  timestamp: Date
}

// Type for room with extended fields
interface RoomWithGameData {
  gamePhase?: string | null
  currentRound?: number | null
  currentTurn?: string | null
  dealerUserId?: string | null
  starterUserId?: string | null
  trumpColor?: string | null
  highestBetUserId?: string | null
  highestBetValue?: number | null
  highestBetTrump?: boolean | null
  playerTeams?: unknown
  playerSeats?: unknown
  playerReady?: unknown
  playerBets?: unknown
  playedCards?: unknown
  playerHands?: unknown
  tricksWon?: unknown
  gameScores?: unknown
}

// Helper function to safely cast JSON to expected type with validation
function safeJsonCast<T>(value: unknown, fallback: T): T {
  return safeObjectCast(value, (v): v is T => {
    // Basic validation - check if it's an object for object types
    if (typeof fallback === 'object' && fallback !== null) {
      return isObject(v) || isArray(v)
    }
    return typeof v === typeof fallback
  }, fallback)
}

// Broadcast game event to all players in room
export async function broadcastGameEvent(event: InternalGameEvent): Promise<void> {
  // Store event in database for persistence
  await storeGameEvent(event)

  // Emit to event store for real-time SSE updates
  const { eventStore } = await import("@/lib/events")
  const sseEvent = {
    type: event.type as any, // Preserve the actual event type
    roomId: event.roomId,
    ...(event.userId && { playerId: event.userId }),
    ...(event.data && event.data)
  }

  console.log('📡 Broadcasting to SSE:', event.type, 'for room:', event.roomId)
  eventStore.emit(sseEvent)

  // Note: Removed revalidatePath to prevent SSE connection closure
  // Real-time updates are handled via SSE, not page revalidation

  // Log for debugging
  console.log('Game Event:', event)
}

// Get room data with members
export async function getRoomData(roomId: string) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: true }
        }
      }
    })

    return room
  } catch (error) {
    console.error("Failed to get room data:", error)
    return null
  }
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
    const roomData = room as RoomWithGameData
    const playerTeams = safeJsonCast<Record<string, Team>>(roomData.playerTeams, {})
    const playerSeats = safeJsonCast<Record<string, number>>(roomData.playerSeats, {})
    const playerReady = safeJsonCast<Record<string, boolean>>(roomData.playerReady, {})

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
    if (roomData.highestBetUserId && roomData.highestBetValue !== null) {
      highestBet = {
        playerId: roomData.highestBetUserId,
        betValue: Bets.SEVEN, // Default bet value since it's not stored separately
        value: roomData.highestBetValue,
        trump: roomData.highestBetTrump || false,
        timestamp: new Date()
      }
    }

    const gameState = {
      phase: (roomData.gamePhase as GamePhase) || GamePhase.TEAM_SELECTION,
      round: roomData.currentRound || 1,
      currentTurn: roomData.currentTurn || '',
      dealer: roomData.dealerUserId || '',
      starter: roomData.starterUserId || '',
      trump: roomData.trumpColor as CardColor | undefined,
      highestBet,
      players,
      bets: safeJsonCast<Record<string, Bet>>(roomData.playerBets, {}),
      playedCards: safeJsonCast<Record<string, Card>>(roomData.playedCards, {}),
      playerHands: safeJsonCast<Record<string, Card[]>>(roomData.playerHands, {}),
      wonTricks: safeJsonCast<Record<string, number>>(roomData.tricksWon, {}),
      scores: safeJsonCast<Record<string, number>>(roomData.gameScores, {}),
      turnOrder
    }

    // Validate the constructed game state
    const validatedState = validateGameState(gameState)
    if (!validatedState) {
      console.error("Invalid game state constructed from database data")
      return null
    }

    return validatedState
  } catch (error) {
    console.error("Failed to get room game state:", error)
    return null
  }
}

// Save game state to room
export async function saveRoomGameState(roomId: string, gameState: GameState): Promise<void> {
  try {
    // Extract team assignments
    const playerTeams: Record<string, string> = {}
    const playerSeats: Record<string, number> = {}
    const playerReady: Record<string, boolean> = {}
    
    Object.values(gameState.players).forEach((player: Player) => {
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

    // Note: Specific actions will broadcast their own events
    // Removed automatic GAME_STATE_UPDATED to prevent event spam
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
        type: 'PLAYER_JOINED',
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
  team: Team,
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

    if (gameState.phase !== GamePhase.TEAM_SELECTION) {
      return { success: false, error: "Not in team selection phase" }
    }

    // Check if player exists in game state
    if (!gameState.players[userId]) {
      return { success: false, error: "Player not found in game" }
    }

    // Check team capacity
    const teamCount = Object.values(gameState.players).filter((p: Player) => p.team === team).length
    if (teamCount >= 2) {
      return { success: false, error: "Team is full" }
    }

    // Update player team
    gameState.players[userId].team = team

    // Check if teams are balanced (2v2)
    const teamACount = Object.values(gameState.players).filter((p: Player) => p.team === Team.A).length
    const teamBCount = Object.values(gameState.players).filter((p: Player) => p.team === Team.B).length

    if (teamACount === 2 && teamBCount === 2) {
      // Automatically assign seats in A1, B2, A3, B4 pattern
      const teamAPlayers = Object.values(gameState.players).filter((p: Player) => p.team === Team.A)
      const teamBPlayers = Object.values(gameState.players).filter((p: Player) => p.team === Team.B)

      // Assign seats: A1, B2, A3, B4
      teamAPlayers[0].seatPosition = 0  // A1
      teamBPlayers[0].seatPosition = 1  // B2
      teamAPlayers[1].seatPosition = 2  // A3
      teamBPlayers[1].seatPosition = 3  // B4

      // Set up turn order based on seat positions (0, 1, 2, 3)
      gameState.turnOrder = [
        teamAPlayers[0].id,  // A1 (seat 0)
        teamBPlayers[0].id,  // B2 (seat 1)
        teamAPlayers[1].id,  // A3 (seat 2)
        teamBPlayers[1].id   // B4 (seat 3)
      ]

      // Set random dealer and starter for betting
      const randomIndex = Math.floor(Math.random() * gameState.turnOrder.length)
      gameState.dealer = gameState.turnOrder[randomIndex]
      gameState.starter = gameState.turnOrder[(randomIndex + 1) % gameState.turnOrder.length]
      gameState.currentTurn = gameState.starter

      // Skip seat selection and go directly to betting
      gameState.phase = GamePhase.BETS
    }

    await saveRoomGameState(roomId, gameState)

    // Small delay to ensure database write is committed
    await new Promise(resolve => setTimeout(resolve, 50))

    // Broadcast granular team change event to all players
    console.log('🎯 About to broadcast TEAMS_CHANGED event for room:', roomId, 'user:', userId)
    const broadcastResult = await broadcastGameEvent({
      type: 'TEAMS_CHANGED',
      roomId,
      userId,
      data: {
        players: gameState.players,           // Only the players object
        phase: gameState.phase,              // Only the phase
        teamsBalanced: teamACount === 2 && teamBCount === 2,
        playerId: userId,
        playerName: gameState.players[userId]?.name,
        team,
        teamACount,
        teamBCount
      },
      timestamp: new Date()
    })
    console.log('🎯 TEAMS_CHANGED broadcast result:', broadcastResult)

    // If teams are now balanced and moved to betting, broadcast that too
    if (teamACount === 2 && teamBCount === 2) {
      await broadcastGameEvent({
        type: 'BETTING_PHASE_STARTED',
        roomId,
        data: {
          phase: 'bets',
          turnOrder: gameState.turnOrder,
          currentTurn: gameState.currentTurn,
          dealer: gameState.dealer,
          starter: gameState.starter,
          teamsComplete: true
        },
        timestamp: new Date()
      })
    }

    console.log(`✅ Team selection broadcasted: ${gameState.players[userId]?.name} joined Team ${team}`)
    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to select team:", error)
    return { success: false, error: "Failed to select team" }
  }
}

// Force initialize game (for existing rooms with 4 players)
export async function forceInitializeGame(roomId: string): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
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

    if (room.members.length < 4) {
      return { success: false, error: "Need 4 players to start game" }
    }

    // Create initial game state with appropriate phase based on player count
    const players: Record<string, Player> = {}
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
      phase: room.members.length < 4 ? GamePhase.WAITING : GamePhase.TEAM_SELECTION,
      round: 1,
      currentTurn: room.members[0].userId,
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

    // Save game state to database using correct schema fields
    await prisma.room.update({
      where: { id: roomId },
      data: {
        gamePhase: gameState.phase,
        currentRound: 1,
        currentTurn: room.members[0].userId,
        dealerUserId: room.members[0].userId,
        starterUserId: room.members[0].userId,
        playerTeams: {},
        playerSeats: {},
        playerReady: {},
        playerHands: {},
        playedCards: {},
        playerBets: {},
        tricksWon: {},
        gameScores: {},
        roundHistory: []
      }
    })

    console.log(`🎮 Force initialized game for room ${roomId} with ${room.members.length} players`)
    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to force initialize game:", error)
    return { success: false, error: "Failed to initialize game" }
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
    const players: Record<string, Player> = {}
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
      phase: room.members.length < 4 ? GamePhase.WAITING : GamePhase.TEAM_SELECTION,
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
      type: 'GAME_STATE_UPDATED',
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

// Reset game action - resets all game data back to initial state
export async function resetGameAction(roomId: string): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })
    if (!room) {
      return { success: false, error: "Room not found" }
    }

    // Create fresh initial game state
    const players: Record<string, Player> = {}
    room.members.forEach(member => {
      players[member.userId] = {
        id: member.userId,
        name: member.user.name || "Unknown",
        team: undefined,
        seatPosition: undefined,
        isReady: false
      }
    })

    const gameState: GameState = {
      phase: room.members.length < 4 ? GamePhase.WAITING : GamePhase.TEAM_SELECTION,
      round: 1,
      currentTurn: room.members[0].userId,
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

    // Broadcast multiple events for maximum visibility

    // 1. Main reset event
    await broadcastGameEvent({
      type: 'GAME_RESET',
      roomId,
      data: {
        phase: gameState.phase,
        message: `🔄 Game has been reset! ${room.members.length < 4 ? 'Waiting for more players to join.' : 'Ready for team selection.'}`,
        playerCount: room.members.length,
        newPhase: gameState.phase,
        resetBy: 'host'
      },
      timestamp: new Date()
    })

    // 2. Game state updated event for UI refresh
    await broadcastGameEvent({
      type: 'GAME_STATE_UPDATED',
      roomId,
      data: {
        phase: gameState.phase,
        message: 'Game state refreshed after reset',
        reset: true,
        forceRefresh: true
      },
      timestamp: new Date()
    })

    console.log(`🔄 Game reset broadcasted for room ${roomId} with ${room.members.length} players`)
    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to reset game:", error)
    return { success: false, error: "Failed to reset game" }
  }
}

// Update game state when players join/leave
export async function updateGamePlayersAction(roomId: string): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })
    if (!room) {
      return { success: false, error: "Room not found" }
    }

    // Get current game state
    let gameState = await getRoomGameState(roomId)

    // If no game state exists, create one
    if (!gameState) {
      const players: Record<string, Player> = {}
      room.members.forEach(member => {
        players[member.userId] = {
          id: member.userId,
          name: member.user.name || "Unknown",
          team: undefined,
          seatPosition: undefined,
          isReady: false
        }
      })

      gameState = {
        phase: room.members.length < 4 ? GamePhase.WAITING : GamePhase.TEAM_SELECTION,
        round: 1,
        currentTurn: room.members[0].userId,
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
    } else {
      // Update existing game state with new players
      const existingPlayerIds = Object.keys(gameState.players)
      const currentMemberIds = room.members.map(m => m.userId)

      // Add new players
      room.members.forEach(member => {
        if (!gameState!.players[member.userId]) {
          gameState!.players[member.userId] = {
            id: member.userId,
            name: member.user.name || "Unknown",
            team: undefined,
            seatPosition: undefined,
            isReady: false
          }
        }
      })

      // Remove players who left (only if game hasn't started)
      if (gameState.phase === GamePhase.TEAM_SELECTION) {
        existingPlayerIds.forEach(playerId => {
          if (!currentMemberIds.includes(playerId)) {
            delete gameState!.players[playerId]
            delete gameState!.bets[playerId]
          }
        })

        // Update turn order
        gameState.turnOrder = room.members.map(m => m.userId)
        if (!currentMemberIds.includes(gameState.currentTurn)) {
          gameState.currentTurn = room.members[0]?.userId || ""
        }
      }
    }

    // Check if we should move from WAITING to TEAM_SELECTION with 4 players
    const playerCount = Object.keys(gameState.players).length
    if (playerCount === 4 && gameState.phase === GamePhase.WAITING) {
      console.log(`🎮 Moving to team selection with 4 players in room ${roomId}`)
      gameState.phase = GamePhase.TEAM_SELECTION

      await broadcastGameEvent({
        type: 'GAME_STATE_UPDATED',
        roomId,
        data: {
          phase: gameState.phase,
          message: '4 players ready! Time to select teams.',
          playerCount: 4
        },
        timestamp: new Date()
      })

      console.log(`✅ Moved to team selection phase`)
    }

    await saveRoomGameState(roomId, gameState)

    await broadcastGameEvent({
      type: 'GAME_STATE_UPDATED',
      roomId,
      data: {
        phase: gameState.phase,
        players: playerCount,
        autoStarted: playerCount === 4 && gameState.phase === GamePhase.BETS
      },
      timestamp: new Date()
    })

    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to update game players:", error)
    return { success: false, error: "Failed to update game players" }
  }
}

// Auto-assign teams and show assignments (doesn't immediately move to betting)
export async function autoAssignTeamsAction(roomId: string): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const gameState = await getRoomGameState(roomId)
    if (!gameState) {
      return { success: false, error: "No game state found" }
    }

    const playerCount = Object.keys(gameState.players).length
    if (playerCount !== 4) {
      return { success: false, error: `Need exactly 4 players, found ${playerCount}` }
    }

    if (gameState.phase !== GamePhase.TEAM_SELECTION) {
      return { success: false, error: "Not in team selection phase" }
    }

    console.log(`🎮 Auto-assigning teams for 4 players in room ${roomId}`)

    // Auto-assign teams and seats (A1, B2, A3, B4 pattern)
    const playerIds = Object.keys(gameState.players)
    playerIds.forEach((playerId, index) => {
      gameState.players[playerId].team = index % 2 === 0 ? Team.A : Team.B
      gameState.players[playerId].seatPosition = index
    })

    // Stay in team selection to show assignments, don't move to betting yet
    await saveRoomGameState(roomId, gameState)

    // Small delay to ensure database write is committed
    await new Promise(resolve => setTimeout(resolve, 50))

    // Broadcast granular team change event for auto-assignment
    await broadcastGameEvent({
      type: 'TEAMS_CHANGED',
      roomId,
      data: {
        players: gameState.players,           // Only the players object
        phase: gameState.phase,              // Only the phase
        teamsBalanced: true,
        autoAssigned: true,
        teamAssignments: Object.values(gameState.players).map(player => ({
          playerId: player.id,
          playerName: player.name,
          team: player.team,
          seatPosition: player.seatPosition
        })),
        seatPattern: 'A1, B2, A3, B4'
      },
      timestamp: new Date()
    })

    console.log(`✅ Teams auto-assigned: A1, B2, A3, B4 - showing assignments`)
    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to auto-assign teams:", error)
    return { success: false, error: "Failed to auto-assign teams" }
  }
}

// Force auto-start for existing 4-player rooms stuck in team selection
export async function forceAutoStartAction(roomId: string): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
  try {
    const gameState = await getRoomGameState(roomId)
    if (!gameState) {
      return { success: false, error: "No game state found" }
    }

    const playerCount = Object.keys(gameState.players).length
    if (playerCount !== 4) {
      return { success: false, error: `Need exactly 4 players, found ${playerCount}` }
    }

    if (gameState.phase !== GamePhase.TEAM_SELECTION && gameState.phase !== GamePhase.WAITING) {
      return { success: false, error: "Game already started" }
    }

    console.log(`🎮 Force auto-starting game with 4 players in room ${roomId}`)

    // Auto-assign teams and seats (A1, B2, A3, B4 pattern)
    const playerIds = Object.keys(gameState.players)
    playerIds.forEach((playerId, index) => {
      gameState.players[playerId].team = index % 2 === 0 ? Team.A : Team.B
      gameState.players[playerId].seatPosition = index
    })

    // Move to betting phase
    gameState.phase = GamePhase.BETS
    gameState.currentTurn = playerIds[0] // First player starts betting

    await saveRoomGameState(roomId, gameState)

    // Small delay to ensure database write is committed
    await new Promise(resolve => setTimeout(resolve, 50))

    // Check SSE listener count before broadcasting
    const { eventStore } = await import("@/lib/events")
    const listenerCount = eventStore.getListenerCount(roomId)
    console.log('🎯 Broadcasting teams_changed event for force start, SSE listeners:', listenerCount)

    // Debug all listeners
    eventStore.logAllListeners()

    // Broadcast granular team change event for force start
    await broadcastGameEvent({
      type: 'TEAMS_CHANGED',
      roomId,
      data: {
        players: gameState.players,           // Only the players object
        phase: gameState.phase,              // Only the phase (now 'bets')
        teamsBalanced: true,
        autoAssigned: true,
        forceStarted: true,
        teamAssignments: Object.values(gameState.players).map(player => ({
          playerId: player.id,
          playerName: player.name,
          team: player.team,
          seatPosition: player.seatPosition
        })),
        seatPattern: 'A1, B2, A3, B4'
      },
      timestamp: new Date()
    })

    // Then broadcast betting phase start
    await broadcastGameEvent({
      type: 'BETTING_PHASE_STARTED',
      roomId,
      data: {
        phase: gameState.phase,
        players: playerCount,
        forceStarted: true,
        turnOrder: gameState.turnOrder,
        currentTurn: gameState.currentTurn,
        dealer: gameState.dealer,
        starter: gameState.starter
      },
      timestamp: new Date()
    })

    console.log(`✅ Game force-started: Teams assigned, moved to betting phase`)
    return { success: true, gameState }
  } catch (error) {
    console.error("Failed to force auto-start:", error)
    return { success: false, error: "Failed to force auto-start" }
  }
}

// Store game event in database for persistence
async function storeGameEvent(event: InternalGameEvent): Promise<void> {
  try {
    // For now, we'll store events in the room's roundHistory as a simple solution
    // In a production app, you'd want a dedicated events table
    const room = await prisma.room.findUnique({
      where: { id: event.roomId }
    })

    if (!room) return

    const existingHistory = safeJsonCast<Array<unknown>>(room.roundHistory, [])
    const eventRecord = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: event.type,
      userId: event.userId,
      data: event.data,
      timestamp: event.timestamp.toISOString()
    }

    const updatedHistory = [...existingHistory, eventRecord]

    // Keep only the last 200 events to prevent database bloat
    const trimmedHistory = updatedHistory.slice(-200)

    await prisma.room.update({
      where: { id: event.roomId },
      data: {
        roundHistory: trimmedHistory as object
      }
    })
  } catch (error) {
    console.error("Failed to store game event:", error)
  }
}

// Get game events (for real-time updates) - Server Action
export async function getGameEvents(roomId: string, since?: Date): Promise<{ success: boolean; events?: InternalGameEvent[]; error?: string }> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    })

    if (!room) {
      return { success: false, error: "Room not found" }
    }

    const history = safeJsonCast<Array<{
      id: string
      type: string
      userId?: string
      data?: any
      timestamp: string
    }>>(room.roundHistory, [])

    // Filter events since the specified date
    const sinceTime = since?.getTime() || 0
    const filteredEvents = history.filter(event => {
      const eventTime = new Date(event.timestamp).getTime()
      return eventTime > sinceTime
    })

    // Convert back to InternalGameEvent format
    const events = filteredEvents.map(event => ({
      type: event.type,
      roomId,
      userId: event.userId,
      data: event.data,
      timestamp: new Date(event.timestamp)
    }))

    return { success: true, events }
  } catch (error) {
    console.error("Failed to get game events:", error)
    return { success: false, error: "Failed to get game events" }
  }
}

// Get recent game events (last 50 events) - Server Action
export async function getRecentGameEvents(roomId: string): Promise<{ success: boolean; events?: InternalGameEvent[]; error?: string }> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    })

    if (!room) {
      return { success: false, error: "Room not found" }
    }

    const history = safeJsonCast<Array<{
      id: string
      type: string
      userId?: string
      data?: any
      timestamp: string
    }>>(room.roundHistory, [])

    // Get the last 50 events, sorted by timestamp (most recent first)
    const recentEvents = history
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50)

    // Convert back to InternalGameEvent format
    const events = recentEvents.map(event => ({
      type: event.type,
      roomId,
      userId: event.userId,
      data: event.data,
      timestamp: new Date(event.timestamp)
    }))

    return { success: true, events }
  } catch (error) {
    console.error("Failed to get recent game events:", error)
    return { success: false, error: "Failed to get recent game events" }
  }
}

// Clear old game events (keep only last 100 events) - Server Action
export async function clearOldGameEvents(roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    })

    if (!room) {
      return { success: false, error: "Room not found" }
    }

    const history = safeJsonCast<Array<{
      id: string
      type: string
      userId?: string
      data?: any
      timestamp: string
    }>>(room.roundHistory, [])

    // Keep only the last 100 events
    if (history.length > 100) {
      const recentEvents = history
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100)

      await prisma.room.update({
        where: { id: roomId },
        data: {
          roundHistory: recentEvents as object
        }
      })

      console.log(`🧹 Cleaned up old events for room ${roomId}: ${history.length} -> ${recentEvents.length}`)
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to clear old game events:", error)
    return { success: false, error: "Failed to clear old game events" }
  }
}
