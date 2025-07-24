import { GamePhase, Team, Bets } from "./game-types"

// Unified event data interfaces for type safety
export interface BaseEventData {
  playerName?: string
  playerId?: string
}

export interface TeamEventData extends BaseEventData {
  team?: Team
  teamsBalanced?: boolean
  phase?: GamePhase
}

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

export interface CardEventData extends BaseEventData {
  card?: string
  cardsInTrick?: number
  winner?: string
  winnerName?: string
}

export interface RoundEventData extends BaseEventData {
  round?: number
  newRound?: number
  scores?: Record<string, number>
  roundResult?: any
}

export interface GameStateEventData extends BaseEventData {
  phase?: GamePhase
  players?: number
  autoStarted?: boolean
  forceStarted?: boolean
  message?: string
}

// Unified Game Event type with proper typing
export type GameEvent =
  // System Events
  | { type: "CONNECTED"; roomId: string }
  | { type: "HEARTBEAT"; roomId: string }
  | { type: "ROOM_UPDATED"; roomId: string }

  // Player Events
  | { type: "PLAYER_JOINED"; roomId: string; data: BaseEventData }
  | { type: "PLAYER_LEFT"; roomId: string; data: BaseEventData }
  | { type: "PLAYER_READY_CHANGED"; roomId: string; data: BaseEventData & { ready: boolean; allReady: boolean } }

  // Team Events
  | { type: "TEAM_SELECTED"; roomId: string; data: TeamEventData }
  | { type: "TEAMS_CHANGED"; roomId: string; data: TeamEventData & { players: any; phase: string; teamsBalanced: boolean } }
  | { type: "BETTING_PHASE_STARTED"; roomId: string; data: BettingEventData }

  // Betting Events
  | { type: "BET_PLACED"; roomId: string; data: BettingEventData }
  | { type: "BETS_CHANGED"; roomId: string; data: BettingEventData & { bets: any; currentTurn: string; phase: string } }
  | { type: "BETTING_COMPLETE"; roomId: string; data: BettingEventData }

  // Card Events
  | { type: "CARDS_CHANGED"; roomId: string; data: CardEventData & { playedCards: any; currentTurn: string; phase: string; playerHands?: any } }
  | { type: "TRICK_COMPLETE"; roomId: string; data: CardEventData }
  | { type: "TRICK_CHANGED"; roomId: string; data: CardEventData & { playedCards: any; currentTurn: string; phase: string; wonTricks: any; winner: string; winnerName: string } }

  // Round Events
  | { type: "ROUND_COMPLETE"; roomId: string; data: RoundEventData }
  | { type: "ROUND_CHANGED"; roomId: string; data: RoundEventData & { phase: string; round: number; scores: any; bets: any; currentTurn: string } }
  | { type: "ROUND_SCORING_COMPLETE"; roomId: string; data: RoundEventData }

  // Game State Events
  | { type: "GAME_STATE_UPDATED"; roomId: string; data: GameStateEventData }

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
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

// Global event store that works across serverless functions
class EventStore {
  private listeners: Map<string, Set<(event: GameEvent) => void>> = new Map()
  private connectionRegistry: Map<string, Set<string>> = new Map() // roomId -> Set of connectionIds
  private instanceId: string

  constructor() {
    this.instanceId = `EventStore_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    console.log(`🏗️ EventStore instance created: ${this.instanceId}`)
  }

  // Register a connection for a room
  registerConnection(roomId: string, connectionId: string) {
    if (!this.connectionRegistry.has(roomId)) {
      this.connectionRegistry.set(roomId, new Set())
    }
    this.connectionRegistry.get(roomId)!.add(connectionId)
    console.log(`🔌 Registered connection ${connectionId} for room ${roomId}`)
    console.log(`📊 Total connections for room ${roomId}: ${this.connectionRegistry.get(roomId)!.size}`)
  }

  // Unregister a connection for a room
  unregisterConnection(roomId: string, connectionId: string) {
    const roomConnections = this.connectionRegistry.get(roomId)
    if (roomConnections) {
      roomConnections.delete(connectionId)
      if (roomConnections.size === 0) {
        this.connectionRegistry.delete(roomId)
      }
      console.log(`🔌 Unregistered connection ${connectionId} for room ${roomId}`)
      console.log(`📊 Remaining connections for room ${roomId}: ${roomConnections.size}`)
    }
  }

  subscribe(roomId: string, callback: (event: GameEvent) => void) {
    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, new Set())
    }
    this.listeners.get(roomId)!.add(callback)

    // Return unsubscribe function
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

  emit(event: GameEvent) {
    const roomListeners = this.listeners.get(event.roomId)
    const roomConnections = this.connectionRegistry.get(event.roomId)

    console.log(`📡 EventStore.emit: ${event.type} for room ${event.roomId}`)
    console.log(`📡 Active listeners: ${roomListeners?.size || 0}`)
    console.log(`📡 Registered connections: ${roomConnections?.size || 0}`)
    console.log(`📡 EventStore instance ID: ${this.instanceId}`)
    console.log(`📡 Total rooms with listeners: ${this.listeners.size}`)
    console.log(`📡 Total rooms with connections: ${this.connectionRegistry.size}`)

    if (roomListeners && roomListeners.size > 0) {
      roomListeners.forEach((callback) => {
        try {
          callback(event)
        } catch (error) {
          console.error("Error in event listener:", error)
        }
      })
    } else {
      console.log(`⚠️ No active listeners for room ${event.roomId}`)
      if (roomConnections && roomConnections.size > 0) {
        console.log(`⚠️ But ${roomConnections.size} connections are registered - possible listener cleanup issue`)
      }
    }
  }

  getListenerCount(roomId: string): number {
    return this.listeners.get(roomId)?.size || 0
  }

  getConnectionCount(roomId: string): number {
    return this.connectionRegistry.get(roomId)?.size || 0
  }

  // Debug method to log all active rooms and their listener counts
  logAllListeners(): void {
    console.log('📊 SSE Listener Status:')
    if (this.listeners.size === 0 && this.connectionRegistry.size === 0) {
      console.log('  No active rooms or connections')
      return
    }

    // Show listeners
    for (const [roomId, listeners] of this.listeners.entries()) {
      console.log(`  Room ${roomId}: ${listeners.size} listeners`)
    }

    // Show registered connections
    for (const [roomId, connections] of this.connectionRegistry.entries()) {
      console.log(`  Room ${roomId}: ${connections.size} registered connections`)
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
