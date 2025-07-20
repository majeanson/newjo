"use client"



import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GamePhase, GameState } from "@/lib/game-types"
import { useGameState } from "@/hooks/use-game-state"
import { Button } from "@/components/ui/button"
import { Play, Users } from "lucide-react"
import TeamSelection from "./team-selection"
import BettingPhase from "./betting-phase"
import CardGame from "./card-game"
import { forceAutoStartAction } from "../../actions/game-actions"

interface GamePhasesProps {
  roomId: string
  gameState: GameState
  currentUserId: string
}

export default function GamePhases({ roomId, gameState: initialGameState, currentUserId }: GamePhasesProps) {
  // Use real-time game state with live updates
  const { gameState: liveGameState, isConnected } = useGameState({
    roomId,
    initialGameState,
    onGameEvent: (event) => {
      console.log('Game event received:', event)
    }
  })

  // Use live game state if available, fallback to initial
  const gameState = liveGameState || initialGameState
  const currentPlayer = gameState.players[currentUserId]
  const isMyTurn = gameState.currentTurn === currentUserId

  const handleGameStateUpdate = (newGameState: GameState) => {
    // The real-time system will handle updates automatically
    // This is mainly for immediate UI feedback
    console.log('Game state updated locally:', newGameState)
  }

  // Handle start game for waiting phase
  const handleStartGame = async () => {
    try {
      const result = await forceAutoStartAction(roomId)
      if (result.success && result.gameState) {
        handleGameStateUpdate(result.gameState)
      }
    } catch (error) {
      console.error("Start game error:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Game Status Header */}
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">
            Game Status - Round {gameState.round}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Phase</p>
              <Badge variant="default">{gameState.phase}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Players</p>
              <Badge variant="outline">{Object.keys(gameState.players).length}/4</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Turn</p>
              <Badge variant={isMyTurn ? "default" : "secondary"}>
                {isMyTurn ? "Your Turn" : gameState.players[gameState.currentTurn]?.name || "Waiting"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Connection</p>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Live" : "Offline"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Dealer</p>
              <Badge variant="outline">
                {gameState.players[gameState.dealer]?.name || "Not Set"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase-specific content */}
      <div className="w-full">
        {gameState.phase === GamePhase.WAITING && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
                <Users className="h-6 w-6" />
                Waiting for Players
              </h2>
              <p className="text-gray-600 mb-6">
                {Object.keys(gameState.players).length === 4
                  ? "All players ready!"
                  : `Need ${4 - Object.keys(gameState.players).length} more player${4 - Object.keys(gameState.players).length !== 1 ? 's' : ''} to start the game.`
                }
              </p>

              {/* Player Count Display */}
              <div className="mb-6">
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${
                        i < Object.keys(gameState.players).length ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm ${
                        i < Object.keys(gameState.players).length ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        Player {i + 1} {i < Object.keys(gameState.players).length ? '✓' : 'waiting...'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Game Button */}
              {Object.keys(gameState.players).length === 4 && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">🎮 Ready to Start!</h3>
                    <p className="text-sm text-green-700">
                      All 4 players have joined. Teams will be auto-assigned (A1, B2, A3, B4) and the game will begin!
                    </p>
                  </div>

                  <Button
                    onClick={handleStartGame}
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    🎮 Start Game Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {gameState.phase === GamePhase.TEAM_SELECTION && (
          <TeamSelection
            roomId={roomId}
            gameState={gameState}
            currentUserId={currentUserId}
            onGameStateUpdate={handleGameStateUpdate}
          />
        )}



        {gameState.phase === GamePhase.BETS && (
          <BettingPhase
            roomId={roomId}
            gameState={gameState}
            currentUserId={currentUserId}
            onGameStateUpdate={handleGameStateUpdate}
          />
        )}

        {gameState.phase === GamePhase.CARDS && (
          <CardGame
            roomId={roomId}
            gameState={gameState}
            currentUserId={currentUserId}
            onGameStateUpdate={handleGameStateUpdate}
          />
        )}

        {gameState.phase === GamePhase.TRICK_SCORING && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-8">
              <h2 className="text-xl font-semibold mb-4">Round Complete</h2>
              <p className="text-gray-600 mb-4">Scores calculated automatically. Starting next round...</p>
              <div className="text-sm text-gray-500 mt-4">
                <p>Round scoring is processed automatically when all cards are played.</p>
                <p>The next betting round will begin shortly.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Debug Info */}
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-xs text-gray-500 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>Room ID: {roomId}</div>
            <div>Current User: {currentPlayer?.name}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
