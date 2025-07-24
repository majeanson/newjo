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
  | { type: "BETTING_PHASE_STARTED"; roomId: string; data: BettingEventData }

  // Betting Events
  | { type: "BET_PLACED"; roomId: string; data: BettingEventData }
  | { type: "BETTING_COMPLETE"; roomId: string; data: BettingEventData }

  // Card Events
  | { type: "CARD_PLAYED"; roomId: string; data: CardEventData }
  | { type: "TRICK_COMPLETE"; roomId: string; data: CardEventData }

  // Round Events
  | { type: "ROUND_COMPLETE"; roomId: string; data: RoundEventData }
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
  BETTING_PHASE_STARTED: "BETTING_PHASE_STARTED" as const,

  // Betting
  BET_PLACED: "BET_PLACED" as const,
  BETTING_COMPLETE: "BETTING_COMPLETE" as const,

  // Cards
  CARD_PLAYED: "CARD_PLAYED" as const,
  TRICK_COMPLETE: "TRICK_COMPLETE" as const,

  // Rounds
  ROUND_COMPLETE: "ROUND_COMPLETE" as const,
  ROUND_SCORING_COMPLETE: "ROUND_SCORING_COMPLETE" as const,

  // Game State
  GAME_STATE_UPDATED: "GAME_STATE_UPDATED" as const,
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

// In-memory event store (in production, use Redis or similar)
class EventStore {
  private listeners: Map<string, Set<(event: GameEvent) => void>> = new Map()

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
    console.log(`📡 EventStore.emit: ${event.type} for room ${event.roomId}, listeners: ${roomListeners?.size || 0}`)

    if (roomListeners) {
      roomListeners.forEach((callback) => {
        try {
          callback(event)
        } catch (error) {
          console.error("Error in event listener:", error)
        }
      })
    } else {
      console.log(`⚠️ No listeners for room ${event.roomId}`)
    }
  }

  getListenerCount(roomId: string): number {
    return this.listeners.get(roomId)?.size || 0
  }

  // Debug method to log all active rooms and their listener counts
  logAllListeners(): void {
    console.log('📊 SSE Listener Status:')
    if (this.listeners.size === 0) {
      console.log('  No active rooms')
      return
    }

    for (const [roomId, listeners] of this.listeners.entries()) {
      console.log(`  Room ${roomId}: ${listeners.size} listeners`)
    }
  }
}

export const eventStore = new EventStore()
