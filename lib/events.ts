// Event types for the game
export type GameEvent =
  | { type: "CARD_DRAWN"; roomId: string; card: string; remainingCards: number }
  | { type: "CARD_PLAYED"; roomId: string; card: string; playerName: string; playerId: string }
  | { type: "PLAYER_JOINED"; roomId: string; playerName: string; playerId: string }
  | { type: "PLAYER_LEFT"; roomId: string; playerName: string; playerId: string }
  | { type: "ROOM_UPDATED"; roomId: string }
  | { type: "bet_placed"; roomId: string; playerId?: string; betValue?: string; trump?: boolean; playerName?: string; betsRemaining?: number }
  | { type: "betting_complete"; roomId: string; playerId?: string; phase?: string; highestBet?: number; highestBetter?: string; trump?: boolean; allBetsComplete?: boolean }
  | { type: "game_state_updated"; roomId: string; playerId?: string; [key: string]: any }

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
}

export const eventStore = new EventStore()
