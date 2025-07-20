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

export function useGameState({ roomId, initialGameState }: UseGameStateOptions) {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState || null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Use simple polling for now instead of SSE to avoid connection issues
  useEffect(() => {
    if (!roomId) return

    // Set connected immediately for polling approach
    setIsConnected(true)
    setError(null)

    // Refresh game state every 5 seconds
    const pollInterval = setInterval(() => {
      refreshGameState()
    }, 5000)

    // Initial load
    refreshGameState()

    // Cleanup on unmount
    return () => {
      clearInterval(pollInterval)
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
    sendGameEvent
  }
}
