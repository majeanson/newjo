"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Coins, Crown, Clock } from "lucide-react"
import { GameState, Team } from "@/lib/game-types"

interface BettingPhaseProps {
  roomId: string
  gameState: GameState
  currentUserId: string
  onGameStateUpdate: (newGameState: GameState) => void
}

// Mock betting action - replace with real action
async function placeBetAction(roomId: string, value: number, trump: boolean) {
  console.log(`Placing bet: ${value} (trump: ${trump}) in room ${roomId}`)
  return { success: true, gameState: null }
}

export default function BettingPhase({ roomId, gameState, currentUserId, onGameStateUpdate }: BettingPhaseProps) {
  const [betValue, setBetValue] = useState(0)
  const [isTrump, setIsTrump] = useState(false)
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPlayer = gameState.players[currentUserId]
  const isMyTurn = gameState.currentTurn === currentUserId
  const playerBet = gameState.bets[currentUserId]
  const allBets = Object.values(gameState.bets)
  const highestBet = gameState.highestBet

  const handlePlaceBet = async () => {
    if (isPlacing || !isMyTurn) return
    
    setIsPlacing(true)
    setError(null)

    try {
      const result = await placeBetAction(roomId, betValue, isTrump)
      
      if (result.success && result.gameState) {
        onGameStateUpdate(result.gameState)
        setBetValue(0)
        setIsTrump(false)
      } else {
        setError(result.error || "Failed to place bet")
      }
    } catch (error) {
      console.error("Betting error:", error)
      setError("Failed to place bet")
    } finally {
      setIsPlacing(false)
    }
  }

  const getPlayerTeamColor = (playerId: string) => {
    const player = gameState.players[playerId]
    switch (player?.team) {
      case Team.A: return "text-red-600"
      case Team.B: return "text-blue-600"
      default: return "text-gray-600"
    }
  }

  const getBetDisplay = (bet: any) => {
    if (bet.value === 0) return "Skip"
    return `${bet.value}${bet.trump ? " (Trump)" : ""}`
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Coins className="h-6 w-6" />
          Betting Phase - Round {gameState.round}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Players bid on how many tricks they think they can win. Highest bidder starts the round.
        </p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}
        {isMyTurn && (
          <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-2 rounded">
            <Clock className="h-4 w-4" />
            <span className="font-semibold">{`It's your turn to bet!`}</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Highest Bet */}
        {highestBet && (
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">Current Highest Bet</span>
            </div>
            <div className="text-lg font-bold text-yellow-900">
              {getBetDisplay(highestBet)} by {gameState.players[highestBet.playerId]?.name}
            </div>
          </div>
        )}

        {/* Betting Order */}
        <div className="space-y-3">
          <h3 className="font-semibold text-center">Betting Order:</h3>
          <div className="grid gap-3">
            {gameState.turnOrder.map((playerId, index) => {
              const player = gameState.players[playerId]
              const bet = gameState.bets[playerId]
              const isCurrentTurn = gameState.currentTurn === playerId
              const isCurrentUser = playerId === currentUserId

              return (
                <div
                  key={playerId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCurrentTurn 
                      ? "bg-green-50 border-green-300 ring-2 ring-green-200" 
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className={`font-medium ${getPlayerTeamColor(playerId)}`}>
                        {player.name}
                        {isCurrentUser && " (You)"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Team {player.team} • Seat {(player.seatPosition || 0) + 1}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCurrentTurn && !bet && (
                      <Badge variant="default" className="animate-pulse">
                        <Clock className="h-3 w-3 mr-1" />
                        Betting...
                      </Badge>
                    )}
                    
                    {bet ? (
                      <Badge 
                        variant={bet.value === 0 ? "secondary" : "default"}
                        className={bet.trump ? "bg-yellow-500 text-yellow-900" : ""}
                      >
                        {getBetDisplay(bet)}
                      </Badge>
                    ) : !isCurrentTurn ? (
                      <Badge variant="outline">Waiting...</Badge>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Betting Interface */}
        {isMyTurn && !playerBet && (
          <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
            <h3 className="font-semibold mb-4 text-center text-green-800">Place Your Bet</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="bet-value" className="text-sm font-medium">
                  Bet Value (0 to skip, 1-8 to bet)
                </Label>
                <Input
                  id="bet-value"
                  type="number"
                  min="0"
                  max="8"
                  value={betValue}
                  onChange={(e) => setBetValue(parseInt(e.target.value) || 0)}
                  className="mt-1"
                  placeholder="Enter your bet..."
                />
                <p className="text-xs text-gray-600 mt-1">
                  Bet 0 to skip your turn, or 1-8 for the number of tricks you think you can win.
                </p>
              </div>
              
              {betValue > 0 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trump"
                    checked={isTrump}
                    onCheckedChange={(checked) => setIsTrump(checked as boolean)}
                  />
                  <Label htmlFor="trump" className="text-sm">
                    With Trump (higher priority if tied)
                  </Label>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={handlePlaceBet}
                  disabled={isPlacing}
                  className="flex-1"
                  size="lg"
                >
                  {isPlacing ? "Placing..." : 
                   betValue === 0 ? "Skip Turn" : 
                   `Bet ${betValue}${isTrump ? " (Trump)" : ""}`}
                </Button>
                
                <Button 
                  onClick={() => {
                    setBetValue(0)
                    setIsTrump(false)
                  }}
                  variant="outline"
                  disabled={isPlacing}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Your Bet Display */}
        {playerBet && (
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Your Bet</h3>
            <Badge variant="default" className="text-lg px-4 py-2">
              {getBetDisplay(playerBet)}
            </Badge>
          </div>
        )}

        {/* Progress */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            {allBets.length}/{gameState.turnOrder.length} players have bet
          </p>
          
          {allBets.length === gameState.turnOrder.length && (
            <p className="text-green-600 font-semibold">
              ✓ All bets placed! Starting card game...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
