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
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

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
        console.log('🔍 API Response structure:', result)

        // Handle new standardized API response format
        const gameState = result.success && result.data ? result.data.gameState : result.gameState

        if (gameState) {
          console.log('✅ Game state refreshed:', {
            phase: gameState.phase,
            round: gameState.round,
            currentTurn: gameState.currentTurn,
            betsCount: Object.keys(gameState.bets || {}).length,
            playersCount: Object.keys(gameState.players || {}).length
          })

          // Force state update by creating a new object reference
          const newGameState = { ...gameState }
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

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered')
    setIsConnected(false)
    setError('Reconnecting...')
    setReconnectAttempts(0) // Reset attempts for manual reconnect
    // The useEffect will handle the actual reconnection
  }, [])

  // Connect to Server-Sent Events for real-time updates
  useEffect(() => {
    if (!roomId) {
      return
    }

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/game-events/${roomId}`)

        eventSource.onopen = () => {
          console.log('🎯 SSE connection opened for room:', roomId)
          setIsConnected(true)
          setError(null)
          setReconnectAttempts(0)
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('🎯 SSE message received:', data)

            // Handle different event types (same as simulator)
            if (data.type === "CONNECTED") {
              console.log('🎯 SSE connected to room:', roomId)
              return
            }

            if (data.type === "HEARTBEAT") {
              console.log('🎯 SSE heartbeat received for room:', roomId)
              return
            }

            // Handle specific event types
            console.log('🎮 Game event received:', data.type, data)

            // Handle granular updates for specific events
            // Note: Events have a nested 'data' structure, so we access data.data
            const eventData = data.data || data

            if (data.type === 'TEAMS_CHANGED') {
              console.log('🎯 Granular team update received, updating local state', eventData)
              console.log('🎯 Event data structure:', {
                hasPlayers: !!eventData.players,
                hasPhase: !!eventData.phase,
                playersCount: eventData.players ? Object.keys(eventData.players).length : 0,
                phase: eventData.phase
              })

              setGameState(prevState => {
                console.log('🔍 TEAMS_CHANGED - Previous state:', prevState ? 'exists' : 'null')
                if (!prevState) {
                  console.log('⚠️ No previous state, triggering full refresh')
                  setTimeout(() => refreshGameState(), 100)
                  return prevState
                }

                const newState = {
                  ...prevState,
                  players: eventData.players || prevState.players,
                  phase: eventData.phase || prevState.phase
                }
                console.log('✅ Updated state with team changes:', {
                  oldPlayers: Object.keys(prevState.players || {}),
                  newPlayers: Object.keys(newState.players || {}),
                  oldPhase: prevState.phase,
                  newPhase: newState.phase,
                  stateChanged: JSON.stringify(prevState) !== JSON.stringify(newState)
                })
                console.log('🔍 Returning new state to trigger re-render')
                return newState
              })
            } else if (data.type === 'BETS_CHANGED') {
              console.log('🎯 Granular betting update received, updating local state', eventData)
              setGameState(prevState => {
                if (!prevState) {
                  console.log('⚠️ No previous state, triggering full refresh')
                  setTimeout(() => refreshGameState(), 100)
                  return prevState
                }

                const newState = {
                  ...prevState,
                  bets: eventData.bets || prevState.bets,
                  currentTurn: eventData.currentTurn || prevState.currentTurn,
                  phase: eventData.phase || prevState.phase
                }
                console.log('✅ Updated state with bet changes:', {
                  betsCount: Object.keys(newState.bets || {}).length,
                  currentTurn: newState.currentTurn,
                  phase: newState.phase
                })
                return newState
              })
            } else if (data.type === 'CARDS_CHANGED') {
              console.log('🎯 Granular card update received, updating local state', eventData)
              setGameState(prevState => {
                if (!prevState) {
                  setTimeout(() => refreshGameState(), 100)
                  return prevState
                }
                return {
                  ...prevState,
                  playedCards: eventData.playedCards || prevState.playedCards,
                  currentTurn: eventData.currentTurn || prevState.currentTurn,
                  phase: eventData.phase || prevState.phase,
                  playerHands: eventData.playerHands || prevState.playerHands
                }
              })
            } else if (data.type === 'TRICK_CHANGED') {
              console.log('🎯 Granular trick update received, updating local state', eventData)
              setGameState(prevState => {
                if (!prevState) {
                  setTimeout(() => refreshGameState(), 100)
                  return prevState
                }
                return {
                  ...prevState,
                  playedCards: eventData.playedCards || prevState.playedCards,
                  currentTurn: eventData.currentTurn || prevState.currentTurn,
                  phase: eventData.phase || prevState.phase,
                  wonTricks: eventData.wonTricks || prevState.wonTricks
                }
              })
            } else if (data.type === 'ROUND_CHANGED') {
              console.log('🎯 Granular round update received, updating local state', eventData)
              setGameState(prevState => {
                if (!prevState) {
                  setTimeout(() => refreshGameState(), 100)
                  return prevState
                }
                return {
                  ...prevState,
                  phase: eventData.phase || prevState.phase,
                  round: eventData.round || prevState.round,
                  scores: eventData.scores || prevState.scores,
                  bets: eventData.bets || prevState.bets,
                  currentTurn: eventData.currentTurn || prevState.currentTurn
                }
              })
            } else {
              // Only refresh on specific game events that need full state refresh
              const stateChangingEvents = ['BETTING_COMPLETE', 'BETTING_PHASE_STARTED', 'GAME_RESET', 'GAME_STATE_UPDATED']

              if (stateChangingEvents.includes(data.type)) {
                console.log('🔄 Full state refresh triggered by event:', data.type)
                setTimeout(() => {
                  refreshGameState()
                }, 200)
              } else {
                console.log('ℹ️ Unhandled event type:', data.type)
              }
            }

            // Call custom event handler if provided
            if (onGameEventRef.current) {
              onGameEventRef.current(data)
            }
          } catch (error) {
            console.error('Error parsing SSE event:', error)
          }
        }

        eventSource.onerror = () => {
          setIsConnected(false)
          setError('Connection lost')

          if (eventSource) {
            eventSource.close()
          }

          // Aggressive reconnection for development
          if (!reconnectTimeout && reconnectAttempts < 20) {
            setReconnectAttempts(prev => prev + 1)
            const delay = 500 // Fast reconnection in development
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null
              connect()
            }, delay)
          } else if (reconnectAttempts >= 20) {
            setError('Connection failed after multiple attempts')
          }
        }
      } catch (error) {

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
    sendGameEvent,
    reconnect
  }
}
