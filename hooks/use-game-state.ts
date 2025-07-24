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
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now())
  const [fallbackActive, setFallbackActive] = useState(false)

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
    console.log('🎮 useGameState useEffect triggered for room:', roomId)
    console.log('🎮 Current gameState phase:', gameState?.phase)
    console.log('🎮 Current URL:', window.location.href)
    if (!roomId) {
      console.log('❌ No roomId provided, skipping SSE connection')
      return
    }

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      try {
        console.log('🔌 Connecting to SSE for room:', roomId)
        console.log('🔌 SSE URL:', `/api/game-events/${roomId}`)
        console.log('🔌 Current location:', window.location.href)
        console.log('🔌 NODE_ENV:', process.env.NODE_ENV)
        eventSource = new EventSource(`/api/game-events/${roomId}`)
        console.log('🔌 EventSource created:', eventSource)
        console.log('🔌 EventSource readyState:', eventSource.readyState)
        console.log('🔌 EventSource url:', eventSource.url)

        eventSource.onopen = () => {
          console.log('✅ SSE connected successfully for room:', roomId)
          console.log('✅ SSE readyState:', eventSource.readyState)
          setIsConnected(true)
          setError(null)
          setReconnectAttempts(0) // Reset attempts on successful connection
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

            // Handle granular updates for specific events
            if (data.type === 'BETS_CHANGED') {
              console.log('🎯 Handling BETS_CHANGED event with granular update')
              if (gameState && data) {
                const updatedGameState = {
                  ...gameState,
                  bets: data.bets || gameState.bets,
                  currentTurn: data.currentTurn || gameState.currentTurn,
                  phase: data.phase || gameState.phase
                }
                console.log('🎯 Updated game state with new bets:', updatedGameState)
                setGameState(updatedGameState)
                return // Skip the full refresh
              }
            }

            // Handle granular updates for specific events
            if (data.type === 'BETS_CHANGED') {
              console.log('🎯 Granular betting update received, updating local state')
              setGameState(prevState => {
                if (!prevState) return prevState
                return {
                  ...prevState,
                  bets: data.bets,
                  currentTurn: data.currentTurn,
                  phase: data.phase
                }
              })
            } else if (data.type === 'TEAMS_CHANGED') {
              console.log('🎯 Granular team update received, updating local state')
              setGameState(prevState => {
                if (!prevState) return prevState
                return {
                  ...prevState,
                  players: data.players,
                  phase: data.phase
                }
              })
            } else if (data.type === 'CARDS_CHANGED') {
              console.log('🎯 Granular card update received, updating local state')
              console.log('🃏 Played cards from SSE:', data.playedCards)
              console.log('🎯 Current turn from SSE:', data.currentTurn)
              setGameState(prevState => {
                if (!prevState) return prevState
                const newState = {
                  ...prevState,
                  playedCards: data.playedCards,
                  currentTurn: data.currentTurn,
                  phase: data.phase,
                  playerHands: data.playerHands || prevState.playerHands
                }
                console.log('🔄 Updated game state with played cards:', Object.keys(newState.playedCards))
                return newState
              })
            } else if (data.type === 'TRICK_CHANGED') {
              console.log('🎯 Granular trick update received, updating local state')
              console.log('🏆 Trick winner from SSE:', data.winnerName)
              console.log('🎯 Won tricks from SSE:', data.wonTricks)
              setGameState(prevState => {
                if (!prevState) return prevState
                return {
                  ...prevState,
                  playedCards: data.playedCards,      // Cleared played cards
                  currentTurn: data.currentTurn,      // Winner starts next trick
                  phase: data.phase,                  // Might change to TRICK_SCORING
                  wonTricks: data.wonTricks           // Updated trick scores
                }
              })
            } else if (data.type === 'ROUND_CHANGED') {
              console.log('🎯 Granular round update received, updating local state')
              console.log('🎮 New round from SSE:', data.round)
              console.log('🏆 Updated scores from SSE:', data.scores)
              setGameState(prevState => {
                if (!prevState) return prevState
                return {
                  ...prevState,
                  phase: data.phase,                  // New phase (BETS)
                  round: data.round,                  // New round number
                  scores: data.scores,                // Updated scores
                  bets: data.bets,                   // Cleared bets
                  currentTurn: data.currentTurn       // New turn order
                }
              })
            } else {
              // Only refresh on specific game events that need full state refresh
              const stateChangingEvents = ['BETTING_COMPLETE', 'BETTING_PHASE_STARTED', 'TEAM_SELECTED', 'GAME_RESET', 'GAME_STATE_UPDATED']

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
          console.error('❌ SSE readyState:', eventSource?.readyState)
          console.error('❌ SSE url:', eventSource?.url)

          setIsConnected(false)
          setError('Connection lost')

          // Close the connection and attempt reconnect after delay
          if (eventSource) {
            console.log('🔌 Closing failed SSE connection')
            eventSource.close()
          }

          // Aggressive reconnection for development
          if (!reconnectTimeout && reconnectAttempts < 20) {
            setReconnectAttempts(prev => prev + 1)
            const delay = 500 // Fast reconnection in development
            reconnectTimeout = setTimeout(() => {
              console.log(`🔄 Attempting SSE reconnect... (attempt ${reconnectAttempts + 1}/20)`)
              reconnectTimeout = null
              connect()
            }, delay)
          } else if (reconnectAttempts >= 20) {
            console.error('❌ Max SSE reconnect attempts reached, using fallback only')
            setError('Using fallback refresh mode')
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
    sendGameEvent,
    reconnect
  }
}
