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

  // Connect to Server-Sent Events
  useEffect(() => {
    if (!roomId) return

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/game-events/${roomId}`)
        
        eventSource.onopen = () => {
          console.log('Game events connected')
          setIsConnected(true)
          setError(null)
        }

        eventSource.onmessage = (event) => {
          try {
            const gameEvent: GameEvent = JSON.parse(event.data)

            // Handle different event types
            switch (gameEvent.type) {
              case 'connected':
                console.log('SSE connected to room:', roomId)
                break
              case 'game_state':
                console.log('Received initial game state')
                setGameState(gameEvent.data)
                break
              case 'game_event':
                console.log('Received game event:', gameEvent.data)
                // Handle specific game events
                if (gameEvent.data?.type === 'game_state_updated') {
                  refreshGameState()
                }
                break
              case 'heartbeat':
                // Keep connection alive - no action needed
                break
              default:
                console.log('Unknown SSE event:', gameEvent)
            }

            // Call custom event handler
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

          // Only attempt to reconnect if the connection was actually closed
          // and we're not already trying to reconnect
          if (eventSource?.readyState === EventSource.CLOSED && !reconnectTimeout) {
            console.log('SSE connection closed, will reconnect in 5 seconds...')
            reconnectTimeout = setTimeout(() => {
              console.log('Attempting SSE reconnect...')
              reconnectTimeout = null
              connect()
            }, 5000)
          }
        }
      } catch (error) {
        console.error('Failed to connect to game events:', error)
        setError('Failed to connect')
      }
    }

    connect()

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [roomId, onGameEvent])

  // Refresh game state manually
  const refreshGameState = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/state`)
      if (response.ok) {
        const newGameState = await response.json()
        setGameState(newGameState)
      }
    } catch (error) {
      console.error('Failed to refresh game state:', error)
    }
  }, [roomId])

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
