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
      const response = await fetch(`/api/game-state/${roomId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.gameState) {
          setGameState(result.gameState)
        }
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

    const connect = () => {
      try {
        console.log('Connecting to SSE for room:', roomId)
        eventSource = new EventSource(`/api/game-events/${roomId}`)

        eventSource.onopen = () => {
          console.log('SSE connected successfully')
          setIsConnected(true)
          setError(null)
        }

        eventSource.onmessage = (event) => {
          try {
            const gameEvent: GameEvent = JSON.parse(event.data)
            console.log('Received SSE event:', gameEvent.type)

            // Handle different event types
            switch (gameEvent.type) {
              case 'connected':
                console.log('SSE connection confirmed')
                break
              case 'game_state':
                console.log('Received initial game state via SSE')
                setGameState(gameEvent.data)
                break
              case 'game_event':
                console.log('Received game event via SSE:', gameEvent.data?.type)
                // Refresh game state when any game event occurs
                refreshGameState()
                break
              case 'heartbeat':
                // Keep connection alive
                break
              default:
                console.log('Unknown SSE event type:', gameEvent.type)
            }

            // Call custom event handler if provided
            if (onGameEvent) {
              onGameEvent(gameEvent)
            }
          } catch (error) {
            console.error('Error parsing SSE event:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error)
          setIsConnected(false)
          setError('Connection lost')

          // Close the connection to prevent automatic reconnection
          if (eventSource) {
            eventSource.close()
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
        console.log('Closing SSE connection')
        eventSource.close()
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
