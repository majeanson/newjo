"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Armchair, Users } from "lucide-react"
import { GameState, Team } from "@/lib/game-types"

interface SeatSelectionProps {
  roomId: string
  gameState: GameState
  currentUserId: string
  onGameStateUpdate: (newGameState: GameState) => void
}

// Mock seat selection action - replace with real action
async function selectSeatAction(roomId: string, seatPosition: number) {
  // This would be implemented in game-actions.ts
  console.log(`Selecting seat ${seatPosition} in room ${roomId}`)
  return { success: true, gameState: null }
}

export default function SeatSelection({ roomId, gameState, currentUserId, onGameStateUpdate }: SeatSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPlayer = gameState.players[currentUserId]
  
  // Create seat layout (0-3 positions)
  const seats = Array.from({ length: 4 }, (_, i) => {
    const player = Object.values(gameState.players).find(p => p.seatPosition === i)
    return { position: i, player }
  })

  const handleSeatSelect = async (seatPosition: number) => {
    if (isSelecting) return
    
    setIsSelecting(true)
    setError(null)

    try {
      const result = await selectSeatAction(roomId, seatPosition)
      
      if (result.success && result.gameState) {
        onGameStateUpdate(result.gameState)
      } else {
        setError(result.error || "Failed to select seat")
      }
    } catch (error) {
      console.error("Seat selection error:", error)
      setError("Failed to select seat")
    } finally {
      setIsSelecting(false)
    }
  }

  const getTeamColor = (team?: Team) => {
    switch (team) {
      case Team.A: return "bg-red-100 border-red-300 text-red-800"
      case Team.B: return "bg-blue-100 border-blue-300 text-blue-800"
      default: return "bg-gray-100 border-gray-300 text-gray-800"
    }
  }

  const getSeatLabel = (position: number) => {
    const labels = ["North", "East", "South", "West"]
    return labels[position]
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Armchair className="h-6 w-6" />
          Select Your Seat
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose your seat position at the table. This determines turn order.
        </p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Team Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-red-50 rounded border">
            <h4 className="font-semibold text-red-700 mb-2">Team A</h4>
            <div className="space-y-1">
              {Object.values(gameState.players)
                .filter(p => p.team === Team.A)
                .map(player => (
                  <div key={player.id} className="text-sm">
                    {player.name}
                    {player.id === currentUserId && " (You)"}
                    {player.seatPosition !== undefined && ` - Seat ${player.seatPosition + 1}`}
                  </div>
                ))}
            </div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded border">
            <h4 className="font-semibold text-blue-700 mb-2">Team B</h4>
            <div className="space-y-1">
              {Object.values(gameState.players)
                .filter(p => p.team === Team.B)
                .map(player => (
                  <div key={player.id} className="text-sm">
                    {player.name}
                    {player.id === currentUserId && " (You)"}
                    {player.seatPosition !== undefined && ` - Seat ${player.seatPosition + 1}`}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Seat Layout - Table View */}
        <div className="relative">
          <div className="w-64 h-64 mx-auto relative">
            {/* Table */}
            <div className="absolute inset-8 bg-green-100 border-4 border-green-300 rounded-full flex items-center justify-center">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-green-700 font-medium">Game Table</p>
              </div>
            </div>

            {/* Seats positioned around the table */}
            {seats.map(({ position, player }) => {
              const isCurrentPlayer = player?.id === currentUserId
              const isOccupied = !!player
              const canSelect = !isOccupied && currentPlayer?.seatPosition === undefined

              // Position seats around the circle
              const angle = (position * 90) - 90 // Start from top, go clockwise
              const radius = 120
              const x = Math.cos((angle * Math.PI) / 180) * radius
              const y = Math.sin((angle * Math.PI) / 180) * radius

              return (
                <div
                  key={position}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`
                  }}
                >
                  <Button
                    onClick={() => handleSeatSelect(position)}
                    disabled={isSelecting || !canSelect}
                    variant={isCurrentPlayer ? "default" : isOccupied ? "secondary" : "outline"}
                    className={`w-20 h-20 flex flex-col p-2 ${
                      player ? getTeamColor(player.team) : ""
                    }`}
                  >
                    <Armchair className="h-4 w-4 mb-1" />
                    <div className="text-xs text-center">
                      <div className="font-semibold">Seat {position + 1}</div>
                      <div className="text-xs">{getSeatLabel(position)}</div>
                    </div>
                  </Button>
                  
                  {player && (
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                      <Badge variant={isCurrentPlayer ? "default" : "secondary"} className="text-xs">
                        {player.name}
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Seat Selection Grid (Alternative view) */}
        <div className="grid grid-cols-2 gap-4">
          {seats.map(({ position, player }) => {
            const isCurrentPlayer = player?.id === currentUserId
            const isOccupied = !!player
            const canSelect = !isOccupied && currentPlayer?.seatPosition === undefined

            return (
              <Button
                key={position}
                onClick={() => handleSeatSelect(position)}
                disabled={isSelecting || !canSelect}
                variant={isCurrentPlayer ? "default" : isOccupied ? "secondary" : "outline"}
                className={`h-16 flex flex-col justify-center ${
                  player ? getTeamColor(player.team) : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Armchair className="h-4 w-4" />
                  <span className="font-semibold">Seat {position + 1}</span>
                  <span className="text-xs">({getSeatLabel(position)})</span>
                </div>
                
                {player ? (
                  <Badge variant={isCurrentPlayer ? "secondary" : "outline"} className="text-xs">
                    {player.name}
                    {isCurrentPlayer && " (You)"}
                  </Badge>
                ) : (
                  <span className="text-xs text-gray-500">Available</span>
                )}
              </Button>
            )
          })}
        </div>

        {/* Progress */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            {Object.values(gameState.players).filter(p => p.seatPosition !== undefined).length}/4 players seated
          </p>
          
          {Object.values(gameState.players).every(p => p.seatPosition !== undefined) && (
            <p className="text-green-600 font-semibold">
              ✓ All players seated! Moving to betting phase...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
