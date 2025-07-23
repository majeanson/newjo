"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { GameState } from "@/lib/game-types"

interface GameEvent {
  type: string
  data?: any
  timestamp: string
}

interface UseGameStateOptions {
  roomId: string
  initialGameState?: GameState | null
  onGameEvent?: (event: GameEvent) => void
}

export function useGameState({ roomId, initialGameState, onGameEvent }: UseGameStateOptions) {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState || null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use ref to avoid recreating SSE connection when onGameEvent changes
  const onGameEventRef = useRef(onGameEvent)
  onGameEventRef.current = onGameEvent

  // Refresh game state manually
  const refreshGameState = useCallback(async () => {
    try {
      console.log('🔄 Refreshing game state for room:', roomId)
      // Add cache busting to ensure fresh data
      const response = await fetch(`/api/game-state/${roomId}?t=${Date.now()}`)
      if (response.ok) {
        const result = await response.json()
        if (result.gameState) {
          console.log('✅ Game state refreshed:', {
            phase: result.gameState.phase,
            round: result.gameState.round,
            currentTurn: result.gameState.currentTurn,
            betsCount: Object.keys(result.gameState.bets || {}).length,
            playersCount: Object.keys(result.gameState.players || {}).length
          })

          // Force state update by creating a new object reference
          const newGameState = { ...result.gameState }
          setGameState(newGameState)
          console.log('✅ State updated in hook with new reference')
        } else {
          console.log('❌ No game state in response:', result)
        }
      } else {
        console.log('❌ Failed to fetch game state:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to refresh game state:', error)
      setError('Failed to refresh game state')
    }
  }, [roomId])

  // Connect to Server-Sent Events for real-time updates
  useEffect(() => {
    if (!roomId) return

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      try {
        console.log('🔌 Connecting to SSE for room:', roomId)
        eventSource = new EventSource(`/api/game-events/${roomId}`)

        eventSource.onopen = () => {
          console.log('✅ SSE connected successfully')
          setIsConnected(true)
          setError(null)
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Handle different event types (same as simulator)
            if (data.type === "CONNECTED") {
              console.log('SSE connected to room:', roomId)
              return
            }

            if (data.type === "HEARTBEAT") {
              // Keep connection alive
              return
            }

            // Handle specific event types
            console.log('🎮 Game event received:', data.type, data)

            // Only refresh on specific game events that change state
            const stateChangingEvents = ['BET_PLACED', 'BETTING_COMPLETE', 'TEAM_SELECTED', 'GAME_RESET']

            if (stateChangingEvents.includes(data.type)) {
              console.log(`🔄 State-changing event received (${data.type}), refreshing game state`)
              // Small delay to ensure database is updated before fetching
              setTimeout(() => {
                console.log(`🔄 Executing delayed refresh for event: ${data.type}`)
                refreshGameState()
              }, 200)
            } else if (data.type !== 'CONNECTED' && data.type !== 'HEARTBEAT') {
              console.log(`⏭️ Non-state-changing event: ${data.type}`)
            }

            // Call custom event handler if provided
            if (onGameEventRef.current) {
              onGameEventRef.current(data)
            }
          } catch (error) {
            console.error('Error parsing SSE event:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('❌ SSE connection error:', error)
          setIsConnected(false)
          setError('Connection lost')

          // Close the connection and attempt reconnect after delay
          if (eventSource) {
            eventSource.close()
          }

          // Only reconnect if not in development hot reload
          if (!reconnectTimeout && process.env.NODE_ENV === 'production') {
            reconnectTimeout = setTimeout(() => {
              console.log('🔄 Attempting SSE reconnect...')
              reconnectTimeout = null
              connect()
            }, 3000)
          }
        }
      } catch (error) {
        console.error('Failed to create SSE connection:', error)
        setError('Failed to connect')
        setIsConnected(false)
      }
    }

    // Initial connection
    connect()

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        console.log('🔌 Closing SSE connection')
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [roomId]) // Only depend on roomId to prevent reconnections

  // Initial game state refresh on mount
  useEffect(() => {
    if (roomId) {
      console.log('🎮 Initial game state refresh for room:', roomId)
      refreshGameState()
    }
  }, [roomId]) // Only depend on roomId, not refreshGameState to avoid loops

  // Remove aggressive polling - rely on SSE events instead

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
    sendGameEvent
  }
}
