"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Play, Loader2 } from "lucide-react"
import { initializeGame, forceInitializeGame } from "../../actions/game-actions"
import { GameState } from "@/lib/game-types"

interface GameInitializerProps {
  roomId: string
  playerCount: number
  onGameInitialized: (gameState: GameState) => void
}

export default function GameInitializer({ roomId, playerCount, onGameInitialized }: GameInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInitializeGame = async () => {
    if (isInitializing) return

    setIsInitializing(true)
    setError(null)

    try {
      const result = await initializeGame(roomId)

      if (result.success && result.gameState) {
        onGameInitialized(result.gameState)
      } else {
        setError(result.error || "Failed to initialize game")
      }
    } catch (error) {
      console.error("Game initialization error:", error)
      setError("Failed to initialize game")
    } finally {
      setIsInitializing(false)
    }
  }

  const handleForceInitializeGame = async () => {
    if (isInitializing) return

    setIsInitializing(true)
    setError(null)

    try {
      const result = await forceInitializeGame(roomId)

      if (result.success && result.gameState) {
        onGameInitialized(result.gameState)
      } else {
        setError(result.error || "Failed to force initialize game")
      }
    } catch (error) {
      console.error("Force game initialization error:", error)
      setError("Failed to force initialize game")
    } finally {
      setIsInitializing(false)
    }
  }

  const canStartGame = playerCount === 4

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Users className="h-6 w-6" />
          Game Lobby
        </CardTitle>
        <p className="text-sm text-gray-600">
          Waiting for players to join the game
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Player Count Status */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant={canStartGame ? "default" : "secondary"} className="text-lg px-4 py-2">
              <Users className="h-4 w-4 mr-2" />
              {playerCount}/4 Players
            </Badge>
          </div>
          
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full mr-2 ${
                  i < playerCount ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className={`text-sm ${
                  i < playerCount ? 'text-green-700' : 'text-gray-500'
                }`}>
                  Player {i + 1} {i < playerCount ? '✓' : 'waiting...'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Game Start Section */}
        {canStartGame ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Ready to Start!</h3>
              <p className="text-sm text-green-700">
                All 4 players have joined. Click below to start the card game.
              </p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <Button
                onClick={handleInitializeGame}
                disabled={isInitializing}
                size="lg"
                className="w-full"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting Game...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Card Game
                  </>
                )}
              </Button>

              <Button
                onClick={handleForceInitializeGame}
                disabled={isInitializing}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Force Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Force Start Game (if stuck)
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600">
              Waiting for {4 - playerCount} more player{4 - playerCount !== 1 ? 's' : ''} to join...
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Share the room link with your friends to invite them!
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <p className="font-medium mb-1">Game Flow:</p>
          <ol className="space-y-1">
            <li>1. Team Selection (2 vs 2)</li>
            <li>2. Seat Selection (choose positions)</li>
            <li>3. Betting Phase (bid on tricks)</li>
            <li>4. Card Playing (8 cards each)</li>
            <li>5. Scoring & Next Round</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
