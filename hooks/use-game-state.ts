"use client"

import { useState, useEffect, useCallback } from "react"
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

  // Refresh game state manually
  const refreshGameState = useCallback(async () => {
    try {
      console.log('🔄 Refreshing game state for room:', roomId)
      const response = await fetch(`/api/game-state/${roomId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.gameState) {
          console.log('✅ Game state refreshed:', result.gameState.phase, 'Round:', result.gameState.round)
          setGameState(result.gameState)
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
            console.log('Game event received:', data.type, data)

            if (data.type === 'bet_placed') {
              console.log('🎯 Bet placed event received, refreshing game state')
              refreshGameState()
            } else if (data.type === 'betting_complete') {
              console.log('🎯 Betting complete event received, refreshing game state')
              refreshGameState()
            } else {
              // Any other event means game state changed - refresh it
              console.log('🎯 Other game event received, refreshing state')
              refreshGameState()
            }

            // Call custom event handler if provided
            if (onGameEvent) {
              onGameEvent(data)
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
  }, [roomId, refreshGameState, onGameEvent])

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
