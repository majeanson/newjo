"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Crown } from "lucide-react"
import { GameState, Team } from "@/lib/game-types"
import { selectTeamAction } from "../../actions/game-actions"

interface TeamSelectionProps {
  roomId: string
  gameState: GameState
  currentUserId: string
  onGameStateUpdate: (newGameState: GameState) => void
}

export default function TeamSelection({ roomId, gameState, currentUserId, onGameStateUpdate }: TeamSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPlayer = gameState.players[currentUserId]
  const teamAPlayers = Object.values(gameState.players).filter(p => p.team === Team.A)
  const teamBPlayers = Object.values(gameState.players).filter(p => p.team === Team.B)
  const unassignedPlayers = Object.values(gameState.players).filter(p => !p.team)

  const handleTeamSelect = async (team: Team) => {
    if (isSelecting) return
    
    setIsSelecting(true)
    setError(null)

    try {
      const result = await selectTeamAction(roomId, team, currentUserId)
      
      if (result.success && result.gameState) {
        onGameStateUpdate(result.gameState)
      } else {
        setError(result.error || "Failed to select team")
      }
    } catch (error) {
      console.error("Team selection error:", error)
      setError("Failed to select team")
    } finally {
      setIsSelecting(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Users className="h-6 w-6" />
          Select Your Team
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose your team to start the game. Each team needs exactly 2 players.
        </p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Team Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A */}
          <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-red-700 flex items-center justify-center gap-2">
                <Crown className="h-5 w-5" />
                Team A
              </h3>
              <p className="text-sm text-red-600">
                {teamAPlayers.length}/2 players
              </p>
            </div>

            <div className="space-y-3 mb-4 min-h-[120px]">
              {teamAPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between bg-white p-3 rounded border">
                  <span className="font-medium">{player.name}</span>
                  {player.id === currentUserId && (
                    <Badge variant="default">You</Badge>
                  )}
                </div>
              ))}
              
              {Array.from({ length: 2 - teamAPlayers.length }).map((_, i) => (
                <div key={i} className="flex items-center justify-center bg-white/50 p-3 rounded border-dashed border-2 border-red-200">
                  <span className="text-gray-400">Empty slot</span>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => handleTeamSelect(Team.A)}
              disabled={
                isSelecting || 
                teamAPlayers.length >= 2 || 
                currentPlayer?.team === Team.A
              }
              variant={currentPlayer?.team === Team.A ? "default" : "outline"}
              className="w-full"
              size="lg"
            >
              {isSelecting ? "Selecting..." : 
               currentPlayer?.team === Team.A ? "✓ Selected" : 
               teamAPlayers.length >= 2 ? "Team Full" : "Join Team A"}
            </Button>
          </div>

          {/* Team B */}
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-blue-700 flex items-center justify-center gap-2">
                <Crown className="h-5 w-5" />
                Team B
              </h3>
              <p className="text-sm text-blue-600">
                {teamBPlayers.length}/2 players
              </p>
            </div>

            <div className="space-y-3 mb-4 min-h-[120px]">
              {teamBPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between bg-white p-3 rounded border">
                  <span className="font-medium">{player.name}</span>
                  {player.id === currentUserId && (
                    <Badge variant="default">You</Badge>
                  )}
                </div>
              ))}
              
              {Array.from({ length: 2 - teamBPlayers.length }).map((_, i) => (
                <div key={i} className="flex items-center justify-center bg-white/50 p-3 rounded border-dashed border-2 border-blue-200">
                  <span className="text-gray-400">Empty slot</span>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => handleTeamSelect(Team.B)}
              disabled={
                isSelecting || 
                teamBPlayers.length >= 2 || 
                currentPlayer?.team === Team.B
              }
              variant={currentPlayer?.team === Team.B ? "default" : "outline"}
              className="w-full"
              size="lg"
            >
              {isSelecting ? "Selecting..." : 
               currentPlayer?.team === Team.B ? "✓ Selected" : 
               teamBPlayers.length >= 2 ? "Team Full" : "Join Team B"}
            </Button>
          </div>
        </div>

        {/* Unassigned Players */}
        {unassignedPlayers.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-2 text-gray-700">Waiting for Team Selection:</h4>
            <div className="flex flex-wrap gap-2">
              {unassignedPlayers.map(player => (
                <Badge key={player.id} variant="secondary">
                  {player.name}
                  {player.id === currentUserId && " (You)"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-4 mb-2">
            <div className={`w-3 h-3 rounded-full ${teamAPlayers.length === 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm">Team A Complete</span>
            <div className={`w-3 h-3 rounded-full ${teamBPlayers.length === 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm">Team B Complete</span>
          </div>
          
          {teamAPlayers.length === 2 && teamBPlayers.length === 2 && (
            <p className="text-green-600 font-semibold">
              ✓ Teams are ready! Seats assigned automatically (A1, B2, A3, B4). Moving to betting...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
