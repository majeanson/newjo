"use client"

import { useState, useEffect } from "react"

interface GameEvent {
  type: string
  card?: string
  playerName?: string
  playerId?: string
  remainingCards?: number
  timestamp?: Date
  data?: any
}

export function useGameEvents(roomId: string) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!roomId) return

    let eventSource: EventSource | null = null

    const connect = () => {
      try {
        console.log('🔌 Connecting to SSE for room events:', roomId)
        eventSource = new EventSource(`/api/game-events/${roomId}`)

        eventSource.onopen = () => {
          console.log('✅ SSE connected successfully for events')
          setIsConnected(true)
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Handle different event types
            if (data.type === "CONNECTED") {
              console.log('SSE connected to room events:', roomId)
              return
            }

            if (data.type === "HEARTBEAT") {
              // Keep connection alive
              return
            }

            // Add the event to our events list
            const gameEvent: GameEvent = {
              type: data.type,
              card: data.card,
              playerName: data.playerName,
              playerId: data.playerId,
              remainingCards: data.remainingCards,
              timestamp: new Date(),
              data: data
            }

            setEvents(prev => [...prev, gameEvent])

            console.log('Game event received:', data.type, data)
          } catch (error) {
            console.error('Error parsing SSE event:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('❌ SSE connection error:', error)
          setIsConnected(false)

          // Close the connection
          if (eventSource) {
            eventSource.close()
          }

          // Attempt reconnect after delay (only in production)
          if (process.env.NODE_ENV === 'production') {
            setTimeout(() => {
              console.log('🔄 Attempting SSE reconnect...')
              connect()
            }, 3000)
          }
        }
      } catch (error) {
        console.error('Failed to create SSE connection:', error)
        setIsConnected(false)
      }
    }

    // Initial connection
    connect()

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        console.log('🔌 Closing SSE connection for events')
        eventSource.close()
      }
    }
  }, [roomId])

  return {
    events,
    isConnected
  }
}
