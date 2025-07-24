/**
 * Event Broadcasting Utilities
 * 
 * This file contains reusable utilities for broadcasting different types
 * of game events with proper validation and error handling.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GamePhase, Team, Bets } from "./game-types"
import { broadcastGameEvent, createGameEvent } from "./events"

// ============================================================================
// Team Event Broadcasting
// ============================================================================

/**
 * Broadcast team selection change
 */
export async function broadcastTeamChange(
  roomId: string,
  userId: string,
  playerName: string,
  team: Team,
  players: Record<string, any>,
  phase: GamePhase,
  teamsBalanced: boolean,
  teamACount: number,
  teamBCount: number
): Promise<boolean> {
  const event = createGameEvent('TEAMS_CHANGED', roomId, {
    players,
    phase,
    teamsBalanced,
    playerId: userId,
    playerName,
    team,
    teamACount,
    teamBCount
  }, userId)

  return await broadcastGameEvent(event)
}

/**
 * Broadcast betting phase start
 */
export async function broadcastBettingPhaseStart(
  roomId: string,
  turnOrder: string[],
  currentTurn: string
): Promise<boolean> {
  const event = createGameEvent('BETTING_PHASE_STARTED', roomId, {
    turnOrder,
    currentTurn,
    allBetsComplete: false
  })

  return await broadcastGameEvent(event)
}

// ============================================================================
// Betting Event Broadcasting
// ============================================================================

/**
 * Broadcast bet placement
 */
export async function broadcastBetChange(
  roomId: string,
  userId: string,
  playerName: string,
  bets: Record<string, any>,
  currentTurn: string,
  phase: GamePhase
): Promise<boolean> {
  const event = createGameEvent('BETS_CHANGED', roomId, {
    bets,
    currentTurn,
    phase,
    playerName,
    playerId: userId
  }, userId)

  return await broadcastGameEvent(event)
}

/**
 * Broadcast betting completion
 */
export async function broadcastBettingComplete(
  roomId: string,
  highestBet: any,
  allBetsComplete: boolean
): Promise<boolean> {
  const event = createGameEvent('BETTING_COMPLETE', roomId, {
    highestBet,
    allBetsComplete
  })

  return await broadcastGameEvent(event)
}

// ============================================================================
// Card Event Broadcasting
// ============================================================================

/**
 * Broadcast card play
 */
export async function broadcastCardChange(
  roomId: string,
  userId: string,
  playerName: string,
  playedCards: Record<string, any>,
  currentTurn: string,
  phase: GamePhase,
  playerHands: Record<string, any[]>,
  card: string,
  cardsInTrick: number
): Promise<boolean> {
  const event = createGameEvent('CARDS_CHANGED', roomId, {
    playedCards,
    currentTurn,
    phase,
    playerHands,
    card,
    playerName,
    cardsInTrick
  }, userId)

  return await broadcastGameEvent(event)
}

/**
 * Broadcast trick completion
 */
export async function broadcastTrickChange(
  roomId: string,
  userId: string,
  playedCards: Record<string, any>,
  currentTurn: string,
  phase: GamePhase,
  wonTricks: Record<string, number>,
  winner: string,
  winnerName: string
): Promise<boolean> {
  const event = createGameEvent('TRICK_CHANGED', roomId, {
    playedCards,
    currentTurn,
    phase,
    wonTricks,
    winner,
    winnerName
  }, userId)

  return await broadcastGameEvent(event)
}

// ============================================================================
// Round Event Broadcasting
// ============================================================================

/**
 * Broadcast round completion
 */
export async function broadcastRoundChange(
  roomId: string,
  userId: string,
  phase: GamePhase,
  round: number,
  scores: Record<string, number>,
  bets: Record<string, any>,
  currentTurn: string,
  roundScores?: any,
  completedRound?: number
): Promise<boolean> {
  const event = createGameEvent('ROUND_CHANGED', roomId, {
    phase,
    round,
    scores,
    bets,
    currentTurn,
    roundScores,
    completedRound
  }, userId)

  return await broadcastGameEvent(event)
}

// ============================================================================
// Game State Event Broadcasting
// ============================================================================

/**
 * Broadcast game reset
 */
export async function broadcastGameReset(
  roomId: string,
  phase: GamePhase,
  players: number,
  message?: string
): Promise<boolean> {
  const event = createGameEvent('GAME_RESET', roomId, {
    phase,
    players,
    message: message || 'Game has been reset'
  })

  return await broadcastGameEvent(event)
}

/**
 * Broadcast general game state update
 */
export async function broadcastGameStateUpdate(
  roomId: string,
  phase: GamePhase,
  players: number,
  message?: string
): Promise<boolean> {
  const event = createGameEvent('GAME_STATE_UPDATED', roomId, {
    phase,
    players,
    message
  })

  return await broadcastGameEvent(event)
}

// ============================================================================
// Batch Broadcasting Utilities
// ============================================================================

/**
 * Broadcast multiple events in sequence
 */
export async function broadcastEventBatch(events: Array<{
  type: string
  roomId: string
  data?: any
  userId?: string
}>): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const eventData of events) {
    try {
      const event = createGameEvent(eventData.type, eventData.roomId, eventData.data, eventData.userId)
      const result = await broadcastGameEvent(event)
      
      if (result) {
        success++
      } else {
        failed++
        errors.push(`Failed to broadcast ${eventData.type}`)
      }
    } catch (error) {
      failed++
      errors.push(`Error broadcasting ${eventData.type}: ${error}`)
    }
  }

  return { success, failed, errors }
}

/**
 * Broadcast to multiple rooms
 */
export async function broadcastToMultipleRooms(
  roomIds: string[],
  eventType: string,
  data?: any,
  userId?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const events = roomIds.map(roomId => ({
    type: eventType,
    roomId,
    data,
    userId
  }))

  return await broadcastEventBatch(events)
}

// ============================================================================
// Event Broadcasting with Retry Logic
// ============================================================================

/**
 * Broadcast event with retry logic
 */
export async function broadcastWithRetry(
  eventType: string,
  roomId: string,
  data?: any,
  userId?: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<boolean> {
  let attempts = 0
  
  while (attempts < maxRetries) {
    try {
      const event = createGameEvent(eventType, roomId, data, userId)
      const result = await broadcastGameEvent(event)
      
      if (result) {
        return true
      }
      
      attempts++
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
      }
    } catch (error) {
      attempts++
      if (attempts >= maxRetries) {
        console.error(`Failed to broadcast ${eventType} after ${maxRetries} attempts:`, error)
        return false
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
    }
  }
  
  return false
}
