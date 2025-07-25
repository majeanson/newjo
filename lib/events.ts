/**
 * Unified Real-Time Event System
 *
 * This file contains all TypeScript interfaces and types for the real-time
 * game state management system. All SSE events and data structures are
 * properly typed here for maximum type safety and maintainability.
 *
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GamePhase, Team, Bets } from "./game-types"

// ============================================================================
// Base Event Data Interfaces
// ============================================================================

/**
 * Base interface for all event data
 */
export interface BaseEventData {
  timestamp?: Date
  userId?: string
  playerName?: string
  playerId?: string
}

/**
 * Team selection event data
 */
export interface TeamEventData extends BaseEventData {
  team?: Team
  teamsBalanced?: boolean
  phase?: GamePhase
  teamACount?: number
  teamBCount?: number
}

/**
 * Betting event data
 */
export interface BettingEventData extends BaseEventData {
  betValue?: Bets
  trump?: boolean
  betsRemaining?: number
  highestBet?: number
  highestBetter?: string
  allBetsComplete?: boolean
  turnOrder?: string[]
  currentTurn?: string
}

/**
 * Card playing event data
 */
export interface CardEventData extends BaseEventData {
  card?: string
  cardsInTrick?: number
  winner?: string
  winnerName?: string
  remainingCards?: number
}

/**
 * Round completion event data
 */
export interface RoundEventData extends BaseEventData {
  round?: number
  newRound?: number
  completedRound?: number
  scores?: Record<string, number>
  roundResult?: {
    teamAScore: number
    teamBScore: number
    bettingTeamWon: boolean
  }
}

/**
 * General game state event data
 */
export interface GameStateEventData extends BaseEventData {
  phase?: GamePhase
  players?: number
  autoStarted?: boolean
  forceStarted?: boolean
  message?: string
}

// ============================================================================
// Granular Update Event Data (for atomic state changes)
// ============================================================================

/**
 * Teams changed event - updates only team-related fields
 */
export interface TeamsChangedData extends TeamEventData {
  players: Record<string, any>  // Updated players with team assignments
  phase: GamePhase              // Current phase
}

/**
 * Bets changed event - updates only betting-related fields
 */
export interface BetsChangedData extends BettingEventData {
  bets: Record<string, any>     // Updated bets
  currentTurn: string           // Next player's turn
  phase: GamePhase              // Current phase
}

/**
 * Cards changed event - updates only card-related fields
 */
export interface CardsChangedData extends CardEventData {
  playedCards: Record<string, any>    // Updated played cards
  currentTurn: string                 // Next player's turn
  phase: GamePhase                    // Current phase
  playerHands: Record<string, any[]>  // Updated player hands
}

/**
 * Trick changed event - updates only trick-related fields
 */
export interface TrickChangedData extends CardEventData {
  playedCards: Record<string, any>    // Cleared played cards (empty object)
  currentTurn: string                 // Winner starts next trick
  phase: GamePhase                    // Current phase (might change to TRICK_SCORING)
  wonTricks: Record<string, number>   // Updated trick scores
}

/**
 * Round changed event - updates only round-related fields
 */
export interface RoundChangedData extends RoundEventData {
  phase: GamePhase                    // New phase (usually BETS)
  round: number                       // New round number
  scores: Record<string, number>      // Updated total scores
  bets: Record<string, any>          // Cleared bets (empty object)
  currentTurn: string                 // New turn order
}

// ============================================================================
// Complete SSE Event Type Union
// ============================================================================

/**
 * All possible SSE events that can be sent to clients
 * Each event must include roomId and typed data
 */
export type GameEvent =
  // System Events
  | { type: "CONNECTED"; roomId?: string }
  | { type: "HEARTBEAT"; roomId?: string }
  | { type: "ROOM_UPDATED"; roomId: string; data: GameStateEventData }

  // Player Events
  | { type: "PLAYER_JOINED"; roomId: string; userId?: string; data: BaseEventData }
  | { type: "PLAYER_LEFT"; roomId: string; userId?: string; data: BaseEventData }
  | { type: "PLAYER_READY_CHANGED"; roomId: string; userId?: string; data: BaseEventData & { ready: boolean; allReady: boolean } }

  // Team Events (Granular)
  | { type: "TEAMS_CHANGED"; roomId: string; userId?: string; data: TeamsChangedData }
  | { type: "TEAM_SELECTED"; roomId: string; userId?: string; data: TeamEventData }
  | { type: "BETTING_PHASE_STARTED"; roomId: string; userId?: string; data: BettingEventData }

  // Betting Events (Granular)
  | { type: "BETS_CHANGED"; roomId: string; userId?: string; data: BetsChangedData }
  | { type: "BET_PLACED"; roomId: string; userId?: string; data: BettingEventData }
  | { type: "BETTING_COMPLETE"; roomId: string; userId?: string; data: BettingEventData }

  // Card Events (Granular)
  | { type: "CARDS_CHANGED"; roomId: string; userId?: string; data: CardsChangedData }
  | { type: "TRICK_CHANGED"; roomId: string; userId?: string; data: TrickChangedData }
  | { type: "TRICK_COMPLETE"; roomId: string; userId?: string; data: CardEventData }

  // Round Events (Granular)
  | { type: "ROUND_CHANGED"; roomId: string; userId?: string; data: RoundChangedData }
  | { type: "ROUND_COMPLETE"; roomId: string; userId?: string; data: RoundEventData }
  | { type: "ROUND_SCORING_COMPLETE"; roomId: string; userId?: string; data: RoundEventData }

  // Game State Events
  | { type: "GAME_STATE_UPDATED"; roomId: string; data: GameStateEventData }
  | { type: "GAME_RESET"; roomId: string; data: GameStateEventData }

// Event type constants for consistency
export const EVENT_TYPES = {
  // System
  CONNECTED: "CONNECTED" as const,
  HEARTBEAT: "HEARTBEAT" as const,
  ROOM_UPDATED: "ROOM_UPDATED" as const,

  // Players
  PLAYER_JOINED: "PLAYER_JOINED" as const,
  PLAYER_LEFT: "PLAYER_LEFT" as const,
  PLAYER_READY_CHANGED: "PLAYER_READY_CHANGED" as const,

  // Teams
  TEAM_SELECTED: "TEAM_SELECTED" as const,
  TEAMS_CHANGED: "TEAMS_CHANGED" as const,
  BETTING_PHASE_STARTED: "BETTING_PHASE_STARTED" as const,

  // Betting
  BET_PLACED: "BET_PLACED" as const,
  BETS_CHANGED: "BETS_CHANGED" as const,
  BETTING_COMPLETE: "BETTING_COMPLETE" as const,

  // Cards
  CARDS_CHANGED: "CARDS_CHANGED" as const,
  TRICK_COMPLETE: "TRICK_COMPLETE" as const,
  TRICK_CHANGED: "TRICK_CHANGED" as const,

  // Rounds
  ROUND_COMPLETE: "ROUND_COMPLETE" as const,
  ROUND_CHANGED: "ROUND_CHANGED" as const,
  ROUND_SCORING_COMPLETE: "ROUND_SCORING_COMPLETE" as const,

  // Game State
  GAME_STATE_UPDATED: "GAME_STATE_UPDATED" as const,
  GAME_RESET: "GAME_RESET" as const,
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

// ============================================================================
// EventStore Interface
// ============================================================================

/**
 * Interface for the global EventStore singleton
 */
export interface IEventStore {
  /**
   * Register an SSE connection for a room
   */
  registerConnection(roomId: string, connectionId: string): void

  /**
   * Unregister an SSE connection for a room
   */
  unregisterConnection(roomId: string, connectionId: string): void

  /**
   * Subscribe to events for a specific room
   * Returns an unsubscribe function
   */
  subscribe(roomId: string, callback: (event: GameEvent) => void): () => void

  /**
   * Broadcast an event to all listeners of a room
   */
  emit(event: GameEvent): void

  /**
   * Get the number of active listeners for a room
   */
  getListenerCount(roomId: string): number

  /**
   * Get the number of registered connections for a room
   */
  getConnectionCount(roomId: string): number

  /**
   * Debug method to log all active rooms and their listener counts
   */
  logAllListeners(): void
}

// ============================================================================
// Game Action Result Types
// ============================================================================

/**
 * Standard result type for all game actions
 */
export interface GameActionResult {
  success: boolean
  error?: string
  gameState?: any
}

/**
 * Result type for actions that include additional data
 */
export interface ExtendedGameActionResult extends GameActionResult {
  roundResult?: {
    teamAScore: number
    teamBScore: number
    bettingTeamWon: boolean
    round: number
    highestBet: any
  }
}

// ============================================================================
// SSE Hook Types
// ============================================================================

/**
 * Props for the useGameState hook
 */
export interface UseGameStateProps {
  roomId: string
  initialGameState?: any | null
  onGameEvent?: (event: GameEvent) => void
}

/**
 * Return type for the useGameState hook
 */
export interface UseGameStateReturn {
  gameState: any | null
  isConnected: boolean
  error: string | null
  sendGameEvent: (event: GameEvent) => void
  refreshGameState: () => Promise<void>
  reconnect: () => void
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type for safely casting JSON fields from the database
 */
export type SafeJsonCast<T> = (value: any, fallback: T) => T

/**
 * Extract event type from GameEvent union
 */
export type ExtractEventType<T extends GameEvent['type']> = Extract<GameEvent, { type: T }>

/**
 * Get data type for a specific event type
 */
export type EventDataType<T extends GameEvent['type']> =
  ExtractEventType<T> extends { data: infer D } ? D : never

/**
 * Global EventStore singleton for managing SSE connections and broadcasting events
 * Uses globalThis to ensure the same instance across all server contexts
 */
class EventStore implements IEventStore {
  private listeners: Map<string, Set<(event: GameEvent) => void>> = new Map()
  private connectionRegistry: Map<string, Set<string>> = new Map()
  private connectionHealth: Map<string, {
    connectionId: string
    roomId: string
    connectedAt: Date
    lastHeartbeat: Date
    isHealthy: boolean
    errorCount: number
  }> = new Map()
  constructor() {
    // EventStore ready
  }

  registerConnection(roomId: string, connectionId: string): void {
    if (!this.connectionRegistry.has(roomId)) {
      this.connectionRegistry.set(roomId, new Set())
    }
    this.connectionRegistry.get(roomId)!.add(connectionId)

    // Track connection health
    this.connectionHealth.set(connectionId, {
      connectionId,
      roomId,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      isHealthy: true,
      errorCount: 0
    })
  }

  updateConnectionHeartbeat(connectionId: string): void {
    const health = this.connectionHealth.get(connectionId)
    if (health) {
      health.lastHeartbeat = new Date()
      health.isHealthy = true
      health.errorCount = 0
    }
  }

  unregisterConnection(roomId: string, connectionId: string): void {
    const roomConnections = this.connectionRegistry.get(roomId)
    if (roomConnections) {
      roomConnections.delete(connectionId)
      if (roomConnections.size === 0) {
        this.connectionRegistry.delete(roomId)
      }
    }

    // Remove from health tracking
    this.connectionHealth.delete(connectionId)
  }

  subscribe(roomId: string, callback: (event: GameEvent) => void): () => void {
    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, new Set())
    }
    this.listeners.get(roomId)!.add(callback)

    return () => {
      const roomListeners = this.listeners.get(roomId)
      if (roomListeners) {
        roomListeners.delete(callback)
        if (roomListeners.size === 0) {
          this.listeners.delete(roomId)
        }
      }
    }
  }

  emit(event: GameEvent): void {
    const roomListeners = this.listeners.get(event.roomId)

    if (roomListeners && roomListeners.size > 0) {
      roomListeners.forEach((callback) => {
        try {
          callback(event)
        } catch (error) {
          console.error("Error in event listener:", error)
        }
      })
    }
  }

  getListenerCount(roomId: string): number {
    return this.listeners.get(roomId)?.size || 0
  }

  getConnectionCount(roomId: string): number {
    return this.connectionRegistry.get(roomId)?.size || 0
  }

  logAllListeners(): void {
    console.log('📊 SSE Status:')
    console.log(`  Rooms with listeners: ${this.listeners.size}`)
    console.log(`  Rooms with connections: ${this.connectionRegistry.size}`)
    console.log(`  Tracked connections: ${this.connectionHealth.size}`)
  }



  getHealthStats(): {
    totalConnections: number
    healthyConnections: number
    unhealthyConnections: number
    averageConnectionAge: number
  } {
    const connections = Array.from(this.connectionHealth.values())
    const now = new Date()

    const healthy = connections.filter(c => c.isHealthy)
    const unhealthy = connections.filter(c => !c.isHealthy)

    const totalAge = connections.reduce((sum, c) => {
      return sum + (now.getTime() - c.connectedAt.getTime())
    }, 0)

    return {
      totalConnections: connections.length,
      healthyConnections: healthy.length,
      unhealthyConnections: unhealthy.length,
      averageConnectionAge: connections.length > 0 ? totalAge / connections.length : 0
    }
  }
}

// Create a global singleton instance using globalThis to ensure it persists across modules
declare global {
  var __eventStore: EventStore | undefined
}

if (!globalThis.__eventStore) {
  globalThis.__eventStore = new EventStore()
}

export const eventStore = globalThis.__eventStore

// ============================================================================
// Event Broadcasting Utilities
// ============================================================================

/**
 * Safely broadcast a game event with validation
 */
export async function broadcastGameEvent(event: any): Promise<boolean> {
  try {
    // Ensure required fields are present
    if (!event.type || !event.roomId) {
      console.error("Cannot broadcast event: missing type or roomId")
      return false
    }

    // Emit through the EventStore (which will validate)
    eventStore.emit(event)
    return true
  } catch (error) {
    console.error("Failed to broadcast event:", error)
    return false
  }
}

/**
 * Create a simple event for broadcasting
 */
export function createGameEvent(
  type: string,
  roomId: string,
  data?: any,
  userId?: string
): any {
  return {
    type,
    roomId,
    userId,
    data,
    timestamp: new Date()
  }
}
