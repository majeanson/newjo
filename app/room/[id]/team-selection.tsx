"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Crown } from "lucide-react"
import { GameState, Team } from "@/lib/game-types"
import { selectTeamAction, autoAssignTeamsAction, forceAutoStartAction } from "../../actions/game-actions"
import { useToast } from "@/hooks/use-toast"

interface TeamSelectionProps {
  roomId: string
  gameState: GameState
  currentUserId: string
  onGameStateUpdate: (newGameState: GameState) => void
}

export default function TeamSelection({ roomId, gameState, currentUserId, onGameStateUpdate }: TeamSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const currentPlayer = gameState.players[currentUserId]
  const teamAPlayers = Object.values(gameState.players).filter(p => p.team === Team.A)
  const teamBPlayers = Object.values(gameState.players).filter(p => p.team === Team.B)
  const unassignedPlayers = Object.values(gameState.players).filter(p => !p.team)
  const teamsAreAssigned = teamAPlayers.length === 2 && teamBPlayers.length === 2

  // Debug logging
  console.log('🎯 Team Selection Debug:', {
    teamACount: teamAPlayers.length,
    teamBCount: teamBPlayers.length,
    unassignedCount: unassignedPlayers.length,
    teamsAreAssigned,
    gamePhase: gameState.phase,
    allPlayers: Object.values(gameState.players).map(p => ({ name: p.name, team: p.team, seat: p.seatPosition }))
  })

  const handleTeamSelect = async (team: Team) => {
    if (isSelecting) return

    setIsSelecting(true)
    setError(null)

    try {
      const result = await selectTeamAction(roomId, team, currentUserId)

      if (result.success) {
        // Don't update local state - SSE will handle the update
        console.log('🎯 Team selection successful, waiting for SSE update')

        // Show success toast
        toast({
          title: `✅ Joined Team ${team}`,
          description: `You're now on Team ${team}. Waiting for other players...`,
          variant: "default",
        })

        // Add fallback refresh for development environments where SSE might be unreliable
        setTimeout(() => {
          console.log('🔄 Team selection fallback: triggering refresh')
          // Server actions use the old format, not the new API response format
          if (onGameStateUpdate && result.gameState) {
            onGameStateUpdate(result.gameState)
          }
        }, 1000) // 1 second fallback
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

  const handleAutoAssign = async () => {
    if (isSelecting) return

    setIsSelecting(true)
    setError(null)

    try {
      const result = await autoAssignTeamsAction(roomId)

      if (result.success) {
        // Don't update local state - SSE will handle the update
        console.log('🎯 Auto-assign successful, waiting for SSE update')

        // Show success toast
        toast({
          title: "🎯 Teams Auto-Assigned!",
          description: "Teams have been assigned in A1, B2, A3, B4 pattern. Check your seat assignment!",
          variant: "default",
        })
      } else {
        setError(result.error || "Failed to auto-assign teams")
      }
    } catch (error) {
      console.error("Auto-assign error:", error)
      setError("Failed to auto-assign teams")
    } finally {
      setIsSelecting(false)
    }
  }

  const handleProceedToBetting = async () => {
    if (isSelecting) return

    setIsSelecting(true)
    setError(null)

    try {
      const result = await forceAutoStartAction(roomId)

      if (result.success) {
        // Don't update local state - SSE will handle the update
        console.log('🎯 Force start successful, waiting for SSE update')

        // Show success toast
        toast({
          title: "🎲 Betting Phase Started!",
          description: "Teams are set! Time to place your bets.",
          variant: "default",
        })
      } else {
        setError(result.error || "Failed to start betting")
      }
    } catch (error) {
      console.error("Proceed to betting error:", error)
      setError("Failed to start betting")
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

        {/* Auto-start indicator */}
        {Object.keys(gameState.players).length < 4 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 text-center">
              🎮 <strong>{Object.keys(gameState.players).length}/4 players</strong> - Game will auto-start when 4 players join!
            </p>
          </div>
        )}

        {Object.keys(gameState.players).length === 4 && !teamsAreAssigned && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 text-center font-semibold mb-3">
              ✅ 4 players online! Ready to auto-assign teams and start the game.
            </p>
            <div className="text-center">
              <Button
                onClick={handleAutoAssign}
                disabled={isSelecting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSelecting ? "Auto-assigning..." : "🎮 Auto-assign Teams"}
              </Button>
              <p className="text-xs text-green-600 mt-2">
                Teams will be auto-assigned (A1, B2, A3, B4) and seats will be shown!
              </p>
            </div>
          </div>
        )}

        {Object.keys(gameState.players).length === 4 && teamsAreAssigned && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 text-center font-semibold mb-3">
              🎯 Teams Assigned! Check the seat assignments below.
            </p>
            <div className="text-center">
              <Button
                onClick={handleProceedToBetting}
                disabled={isSelecting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSelecting ? "Starting Betting..." : "🎲 Proceed to Betting Phase"}
              </Button>
              <p className="text-xs text-blue-600 mt-2">
                Ready to start the betting round!
              </p>
            </div>
          </div>
        )}

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

        {/* Seat Assignment Display */}
        {teamsAreAssigned && (
          <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-green-50">
            <h4 className="font-bold text-center mb-4 text-gray-800">🪑 Seat Assignments</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.values(gameState.players)
                .sort((a, b) => (a.seatPosition || 0) - (b.seatPosition || 0))
                .map((player, index) => (
                  <div key={player.id} className={`text-center p-3 rounded-lg border-2 ${
                    player.team === Team.A ? 'bg-red-100 border-red-300' : 'bg-blue-100 border-blue-300'
                  }`}>
                    <div className="font-bold text-lg">
                      Seat {(player.seatPosition || 0) + 1}
                    </div>
                    <div className={`text-sm font-medium ${
                      player.team === Team.A ? 'text-red-700' : 'text-blue-700'
                    }`}>
                      Team {player.team}
                    </div>
                    <div className="font-medium mt-1">{player.name}</div>
                    {player.id === currentUserId && (
                      <div className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded mt-1">
                        You
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                🎯 Pattern: A1 → B2 → A3 → B4 (alternating teams)
              </p>
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

          {!teamsAreAssigned && teamAPlayers.length === 2 && teamBPlayers.length === 2 && (
            <p className="text-green-600 font-semibold">
              ✓ Teams are ready! Seats assigned automatically (A1, B2, A3, B4). Moving to betting...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
