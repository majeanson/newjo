"use client"

import { GameState, GamePhase } from "@/lib/game-types"
import GamePhases from "./game-phases"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useGameState } from "@/hooks/use-game-state"
import Navigation, { BottomNavigation } from "@/components/navigation"
import CollapsibleInfo, { QuickGameInfo } from "@/components/collapsible-info"
import { Wifi, WifiOff } from "lucide-react"
import { useMemo, useState } from "react"

interface GameWrapperProps {
  roomId: string
  currentUserId: string
  initialGameState?: GameState | null
  playerCount: number
}

// Create default game state outside component to prevent re-creation
const DEFAULT_GAME_STATE: GameState = {
  phase: GamePhase.WAITING,
  round: 1,
  currentTurn: '',
  dealer: '',
  starter: '',
  players: {},
  bets: {},
  playedCards: {},
  playerHands: {},
  wonTricks: {},
  scores: {},
  turnOrder: []
}

export default function GameWrapper({ roomId, currentUserId, initialGameState, playerCount: initialPlayerCount }: GameWrapperProps) {
  const playerCount = initialPlayerCount
  const [lastTrickComplete, setLastTrickComplete] = useState<{
    winner: string
    winnerName: string
    timestamp: number
  } | null>(null)

  // Use game state hook for live updates with build safety
  const { gameState: liveGameState, isConnected, refreshGameState, reconnect } = useGameState({
    roomId,
    initialGameState,
    onGameEvent: (event) => {
      // Handle TRICK_COMPLETE events and pass them to child components
      if (event.type === 'TRICK_COMPLETE') {
        console.log('🏆 GameWrapper received TRICK_COMPLETE event:', event)
        setLastTrickComplete({
          winner: event.data?.winner || '',
          winnerName: event.data?.winnerName || '',
          timestamp: Date.now()
        })
      }
    }
  })

  // Use live game state if available, otherwise fall back to initial or default
  const gameState = liveGameState || initialGameState || DEFAULT_GAME_STATE

  // Show different UI based on phase and player count
  const currentPhase = gameState?.phase as string
  const isWaitingForPlayers = playerCount < 4 || currentPhase === GamePhase.WAITING || currentPhase === 'waiting'

  // Memoize current player name to prevent unnecessary re-renders
  const currentPlayerName = useMemo(() => {
    return gameState.players[gameState.currentTurn]?.name
  }, [gameState.players, gameState.currentTurn])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <Navigation 
        title={`🎮 Room ${roomId.slice(-6)}`}
        showBack={true}
        backUrl="/dashboard"
      />
      
      <div className="px-3 py-3 pb-16 md:pb-6 max-w-md mx-auto space-y-3">
        {/* Quick Game Info - Always visible */}
        <QuickGameInfo
          phase={gameState.phase}
          round={gameState.round}
          currentPlayer={currentPlayerName}
          playerCount={playerCount}
        />

        {/* Connection Status - Compact */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>

          {!isConnected && (
            <Button
              onClick={() => reconnect()}
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-200 hover:bg-orange-50 h-7 text-xs"
            >
              🔌 Reconnect
            </Button>
          )}
        </div>

        {/* Collapsible Player Details */}
        <CollapsibleInfo title="Player Details" variant="stats">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-white/50">
                <div className={`w-2 h-2 rounded-full ${
                  i < playerCount ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className={`text-xs ${
                  i < playerCount ? 'text-green-700 font-medium' : 'text-gray-500'
                }`}>
                  Player {i + 1} {i < playerCount ? '✓' : '...'}
                </span>
              </div>
            ))}
          </div>

          {playerCount < 4 && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
              <p className="text-yellow-800 text-xs">
                💡 Need {4 - playerCount} more player{4 - playerCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </CollapsibleInfo>

        {/* Game Status - Compact */}
        {isWaitingForPlayers && (
          <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="text-lg mb-1">⏳</div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">
              {playerCount < 4 ? 'Waiting for Players' : 'Ready to Start!'}
            </h3>
            <p className="text-gray-600 text-xs">
              {playerCount < 4
                ? `Need ${4 - playerCount} more to start`
                : 'All players ready!'
              }
            </p>
          </div>
        )}

        {/* Game Interface */}
        {gameState ? (
          <GamePhases
            roomId={roomId}
            gameState={gameState}
            currentUserId={currentUserId}
            onRefreshNeeded={refreshGameState}
            trickComplete={lastTrickComplete}
          />
        ) : (
          <div className="text-center p-4 bg-white/80 backdrop-blur rounded-lg border border-gray-200">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Game Loading...</h3>
            <p className="text-xs text-gray-600">
              Setting up room...
            </p>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  )
}
