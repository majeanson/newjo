"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Play } from "lucide-react"
import { GameState } from "@/lib/game-types"
import { forceAutoStartAction } from "../../actions/game-actions"

interface WaitingPhaseProps {
  roomId: string
  gameState: GameState
  currentUserId: string
  onGameStateUpdate: (gameState: GameState) => void
}

export default function WaitingPhase({ roomId, gameState, currentUserId, onGameStateUpdate }: WaitingPhaseProps) {
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playerCount = Object.keys(gameState.players).length
  const canStart = playerCount === 4

  const handleStartGame = async () => {
    if (isStarting || !canStart) return
    
    setIsStarting(true)
    setError(null)

    try {
      const result = await forceAutoStartAction(roomId)
      
      if (result.success && result.gameState) {
        onGameStateUpdate(result.gameState)
      } else {
        setError(result.error || "Failed to start game")
      }
    } catch (error) {
      console.error("Start game error:", error)
      setError("Failed to start game")
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Users className="h-6 w-6" />
          Waiting for Players
        </CardTitle>
        <p className="text-sm text-gray-600">
          {canStart ? "All players ready!" : `Need ${4 - playerCount} more player${4 - playerCount !== 1 ? 's' : ''} to start the game.`}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Player Count Display */}
        <div className="text-center">
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

        {/* Start Game Section */}
        {canStart ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">🎮 Ready to Start!</h3>
              <p className="text-sm text-green-700">
                All 4 players have joined. Teams will be auto-assigned (A1, B2, A3, B4) and the game will begin!
              </p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <Button
              onClick={handleStartGame}
              disabled={isStarting}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isStarting ? (
                <>
                  Starting Game...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  🎮 Start Game Now
                </>
              )}
            </Button>
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
      </CardContent>
    </Card>
  )
}
