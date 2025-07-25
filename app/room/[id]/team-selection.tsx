"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Crown } from "lucide-react"
import { GameState, Team } from "@/lib/game-types"
import { selectTeamAction, autoAssignTeamsAction, forceAutoStartAction } from "../../actions/game-actions"
import { useToast } from "@/hooks/use-toast"
import CollapsibleInfo from "@/components/collapsible-info"

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
    <div className="w-full space-y-3">
      {/* Compact Header */}
      <div className="text-center p-3 bg-white/80 backdrop-blur rounded-lg border border-purple-200">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="text-lg">👥</div>
          <span className="font-semibold text-purple-700 text-sm">Choose Your Team</span>
        </div>
        <p className="text-xs text-gray-600">
          Pick Team A or B! Each needs 2 players 🎯
        </p>

        {/* Compact status indicators */}
        {Object.keys(gameState.players).length < 4 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
            <p className="text-xs text-blue-700 text-center">
              🎮 {Object.keys(gameState.players).length}/4 players - Auto-start when full!
            </p>
          </div>
        )}

        {Object.keys(gameState.players).length === 4 && !teamsAreAssigned && (
          <div className="bg-green-50 border border-green-200 rounded p-2 mt-2 text-center">
            <p className="text-xs text-green-700 font-semibold mb-2">
              ✅ 4 players ready!
            </p>
            <Button
              onClick={handleAutoAssign}
              disabled={isSelecting}
              size="sm"
              className="bg-green-600 hover:bg-green-700 h-8 text-xs"
            >
              {isSelecting ? "🔄 Auto-assigning..." : "🎮 Auto-assign Teams"}
            </Button>
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
      </div>

      {/* Compact Team Selection */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          {/* Team A - Compact */}
          <div className="border-2 border-red-200 rounded-lg p-3 bg-gradient-to-r from-red-50 to-pink-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-lg">🔴</div>
                <span className="font-bold text-red-700 text-sm">Team A</span>
                <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                  {teamAPlayers.length}/2
                </Badge>
              </div>
            </div>

            {/* Compact player list */}
            <div className="space-y-1 mb-3 min-h-[60px]">
              {teamAPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between bg-white/60 p-2 rounded text-xs">
                  <span className="font-medium text-gray-900 truncate">{player.name}</span>
                  {player.id === currentUserId && (
                    <Badge className="bg-red-600 text-white text-xs">You</Badge>
                  )}
                </div>
              ))}

              {Array.from({ length: 2 - teamAPlayers.length }).map((_, i) => (
                <div key={i} className="flex items-center justify-center bg-white/30 p-2 rounded border-dashed border border-red-300">
                  <span className="text-red-400 text-xs">Waiting...</span>
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
              size="sm"
              className={`w-full h-8 text-xs font-semibold rounded transition-all ${
                currentPlayer?.team === Team.A
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border border-red-300 text-red-700 hover:bg-red-50 bg-white"
              }`}
            >
              {isSelecting ? "🔄 Joining..." :
               currentPlayer?.team === Team.A ? "✅ On Team A!" :
               teamAPlayers.length >= 2 ? "😔 Full" : "🚀 Join A"}
            </Button>
          </div>

          {/* Team B - Compact */}
          <div className="border-2 border-blue-200 rounded-lg p-3 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-lg">🔵</div>
                <span className="font-bold text-blue-700 text-sm">Team B</span>
                <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                  {teamBPlayers.length}/2
                </Badge>
              </div>
            </div>

            {/* Compact player list */}
            <div className="space-y-1 mb-3 min-h-[60px]">
              {teamBPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between bg-white/60 p-2 rounded text-xs">
                  <span className="font-medium text-gray-900 truncate">{player.name}</span>
                  {player.id === currentUserId && (
                    <Badge className="bg-blue-600 text-white text-xs">You</Badge>
                  )}
                </div>
              ))}

              {Array.from({ length: 2 - teamBPlayers.length }).map((_, i) => (
                <div key={i} className="flex items-center justify-center bg-white/30 p-2 rounded border-dashed border border-blue-300">
                  <span className="text-blue-400 text-xs">Waiting...</span>
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
              size="sm"
              className={`w-full h-8 text-xs font-semibold rounded transition-all ${
                currentPlayer?.team === Team.B
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border border-blue-300 text-blue-700 hover:bg-blue-50 bg-white"
              }`}
            >
              {isSelecting ? "🔄 Joining..." :
               currentPlayer?.team === Team.B ? "✅ On Team B!" :
               teamBPlayers.length >= 2 ? "😔 Full" : "🚀 Join B"}
            </Button>
          </div>
        </div>

        {/* Compact Unassigned Players */}
        {unassignedPlayers.length > 0 && (
          <CollapsibleInfo title="Unassigned Players" variant="info">
            <div className="flex flex-wrap gap-1">
              {unassignedPlayers.map(player => (
                <Badge key={player.id} variant="secondary" className="text-xs">
                  {player.name}
                  {player.id === currentUserId && " (You)"}
                </Badge>
              ))}
            </div>
          </CollapsibleInfo>
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

        {/* Compact Team Status */}
        {(teamAPlayers.length === 2 || teamBPlayers.length === 2) && (
          <CollapsibleInfo title="Team Status" variant="stats" defaultOpen={true}>
            <div className="flex justify-center items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${teamAPlayers.length === 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Team A {teamAPlayers.length === 2 ? '✓' : `${teamAPlayers.length}/2`}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${teamBPlayers.length === 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Team B {teamBPlayers.length === 2 ? '✓' : `${teamBPlayers.length}/2`}</span>
              </div>
            </div>

            {!teamsAreAssigned && teamAPlayers.length === 2 && teamBPlayers.length === 2 && (
              <p className="text-green-600 font-semibold text-xs text-center mt-2">
                ✓ Teams ready! Moving to betting...
              </p>
            )}
          </CollapsibleInfo>
        )}
      </div>
    </div>
  )
}
