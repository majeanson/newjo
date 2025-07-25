"use client"

/**
 * Game State Hook - Real-time game state management
 *
 * CRITICAL: This hook uses Server-Sent Events (SSE) for real-time updates.
 * NEVER ADD POLLING - it causes infinite compilation loops and performance issues.
 * Always rely on SSE events for live updates.
 */

import { useState, useCallback, useEffect } from "react"
import { GameState } from "@/lib/game-types"
import { EVENT_TYPES } from "@/lib/events"

interface LocalGameEvent {
  type: string
  data?: any
  timestamp: string
}

interface UseGameStateOptions {
  roomId: string
  initialGameState?: GameState | null
  onGameEvent?: (event: LocalGameEvent) => void
  onTrickComplete?: (winner: string, winnerName: string) => void
}

// Events that should trigger a game state refresh
const REFRESH_TRIGGERING_EVENTS = [
  EVENT_TYPES.TEAMS_CHANGED,
  EVENT_TYPES.BETS_CHANGED,
  EVENT_TYPES.BETTING_COMPLETE,
  EVENT_TYPES.CARDS_CHANGED,
  EVENT_TYPES.TRICK_COMPLETE,
  EVENT_TYPES.TRICK_CHANGED,
  EVENT_TYPES.ROUND_CHANGED,
  EVENT_TYPES.ROUND_COMPLETE,
  EVENT_TYPES.GAME_STATE_UPDATED,
  EVENT_TYPES.GAME_RESET,
] as const

export function useGameState({ roomId, initialGameState }: UseGameStateOptions) {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState || null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Simplified - no refs needed for now

  // Refresh game state manually
  const refreshGameState = useCallback(async () => {
    try {
      console.log('🔄 Refreshing game state for room:', roomId)
      const response = await fetch(`/api/game-state/${roomId}?t=${Date.now()}`)
      if (response.ok) {
        const result = await response.json()
        const gameState = result.success && result.data ? result.data.gameState : result.gameState
        if (gameState) {
          setGameState({ ...gameState })
        }
      }
    } catch (error) {
      console.error('Failed to refresh game state:', error)
      setError('Failed to refresh game state')
    }
  }, [roomId])

  // Manual reconnect function (simplified)
  const reconnect = useCallback(() => {
    console.log('🔄 Manual refresh triggered')
    refreshGameState()
  }, [refreshGameState])

  // SSE Connection with build-safe implementation
  useEffect(() => {
    if (!roomId) return
    if (typeof window === 'undefined') return // SSR safety

    console.log('🔌 Connecting to SSE for room:', roomId)

    let eventSource: EventSource | null = null
    let mounted = true

    // Check if EventSource is available (build safety)
    if (typeof EventSource === 'undefined') {
      console.warn('EventSource not available, falling back to polling')
      setIsConnected(false)
      setError('EventSource not supported')
      return
    }

    try {
      eventSource = new EventSource(`/api/game-events/${roomId}`)

      eventSource.onopen = () => {
        if (!mounted) return
        console.log('✅ SSE Connected')
        setIsConnected(true)
        setError(null)
      }

      eventSource.onmessage = (event) => {
        if (!mounted) return

        try {
          const data = JSON.parse(event.data)

          // Skip heartbeat and connection messages
          if (data.type === "CONNECTED" || data.type === "HEARTBEAT") {
            return
          }

          console.log('📡 SSE Event received:', data.type, data)

          // Handle specific events that need immediate game state refresh
          if (REFRESH_TRIGGERING_EVENTS.includes(data.type as any)) {
            console.log('🔄 Refreshing game state due to SSE event:', data.type)
            // Small delay to ensure server state is updated
            setTimeout(() => {
              if (mounted) {
                refreshGameState()
              }
            }, 200)
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      }

      eventSource.onerror = () => {
        if (!mounted) return
        console.log('❌ SSE Connection error')
        setIsConnected(false)
        setError('Connection lost')
      }

    } catch (error) {
      console.error('Failed to create SSE connection:', error)
      setError('Failed to connect')
    }

    return () => {
      mounted = false
      if (eventSource) {
        console.log('🔌 Closing SSE connection')
        eventSource.close()
      }
      setIsConnected(false)
    }
  }, [roomId, refreshGameState])

  // Send game event
  const sendGameEvent = useCallback(async (eventType: string, data?: any) => {
    try {
      const response = await fetch(`/api/game-events/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: eventType,
          data
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send game event')
      }
    } catch (error) {
      console.error('Failed to send game event:', error)
      throw error
    }
  }, [roomId])

  return {
    gameState,
    isConnected,
    error,
    refreshGameState,
    sendGameEvent,
    reconnect
  }
}
