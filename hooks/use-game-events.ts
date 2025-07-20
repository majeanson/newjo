"use client"

import { useEffect, useRef, useState } from "react"

export type GameEvent =
  | { type: "CARD_DRAWN"; roomId: string; card: string; remainingCards: number }
  | { type: "CARD_PLAYED"; roomId: string; card: string; playerName: string; playerId: string }
  | { type: "PLAYER_JOINED"; roomId: string; playerName: string; playerId: string }
  | { type: "PLAYER_LEFT"; roomId: string; playerName: string; playerId: string }

export function useGameEvents(roomId: string) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!roomId) return

    // In preview mode, simulate connection and some events
    setIsConnected(true)

    // Simulate some events for demo purposes
    const simulateEvents = () => {
      const demoEvents: GameEvent[] = [
        {
          type: "PLAYER_JOINED",
          roomId,
          playerName: "Demo Player",
          playerId: "demo1",
        },
        {
          type: "CARD_DRAWN",
          roomId,
          card: "K♥",
          remainingCards: 45,
        },
      ]

      setTimeout(() => {
        setEvents(demoEvents)
      }, 2000)
    }

    simulateEvents()

    // Try to connect to real SSE if available
    try {
      const eventSource = new EventSource(`/api/events/${roomId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "HEARTBEAT" || data.type === "CONNECTED") {
            return
          }
          setEvents((prev) => [...prev, data])
        } catch (error) {
          console.error("Error parsing SSE data:", error)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
      }
    } catch (error) {
      // SSE not available in preview, use mock connection
      console.log("SSE not available, using mock events")
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      setIsConnected(false)
    }
  }, [roomId])

  const clearEvents = () => setEvents([])

  return {
    events,
    isConnected,
    clearEvents,
  }
}
