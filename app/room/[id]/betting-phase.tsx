"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Coins, Crown, Clock, X } from "lucide-react"
import { GameState, Team, Bets, BetsNumericValue, Bet } from "@/lib/game-types"
// Using API route instead of Server Action to prevent SSE connection closure
import { useToast } from "@/hooks/use-toast"

interface BettingPhaseProps {
  roomId: string
  gameState: GameState
  currentUserId: string
  onGameStateUpdate: (newGameState: GameState) => void
  onRefreshNeeded?: () => void
}

export default function BettingPhase({ roomId, gameState, currentUserId, onGameStateUpdate, onRefreshNeeded }: BettingPhaseProps) {
  const [selectedBet, setSelectedBet] = useState<Bets | null>(null)
  const [isTrump, setIsTrump] = useState(true)
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentBetters, setRecentBetters] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const isMyTurn = gameState.currentTurn === currentUserId
  const playerBet = gameState.bets[currentUserId]
  const allBets = Object.values(gameState.bets)
  const highestBet = gameState.highestBet

  // Track gameState changes
  useEffect(() => {
    console.log('🎯 Betting Phase - gameState prop changed:', {
      currentTurn: gameState.currentTurn,
      currentUserId,
      isMyTurn: gameState.currentTurn === currentUserId,
      playerBet: !!gameState.bets[currentUserId],
      allBetsCount: Object.keys(gameState.bets || {}).length,
      totalPlayers: gameState.turnOrder?.length || 0,
      timestamp: Date.now()
    })
  }, [gameState, currentUserId])

  // Note: Removed automatic polling that was interfering with SSE connections
  // SSE should handle real-time updates, fallback is only for emergencies

  // Track recent bet placements for visual feedback
  useEffect(() => {
    const currentBetters = new Set(Object.keys(gameState.bets))
    const newBetters = new Set([...currentBetters].filter(id => !recentBetters.has(id)))

    if (newBetters.size > 0) {
      setRecentBetters(currentBetters)
      // Clear the highlight after 3 seconds
      setTimeout(() => {
        setRecentBetters(new Set())
      }, 3000)
    }
  }, [gameState.bets, recentBetters])

  const handlePlaceBet = async () => {
    if (isPlacing || !isMyTurn || !selectedBet) return

    // Debug: About to place bet
    console.log('🎯 About to place bet for user:', currentUserId)

    setIsPlacing(true)
    setError(null)

    try {
      const response = await fetch('/api/place-bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          betValue: selectedBet,
          trump: isTrump,
          playerId: currentUserId
        })
      })

      const result = await response.json()

      if (result.success && result.gameState) {
        onGameStateUpdate(result.gameState)

        // Show success toast
        const betLabel = selectedBet === Bets.SKIP ? "Skip" : `${BetsNumericValue[selectedBet]} tricks`
        const trumpText = selectedBet !== Bets.SKIP && !isTrump ? " (No Trump)" : ""

        toast({
          title: "🎯 Bet Placed!",
          description: `You bet: ${betLabel}${trumpText}`,
          variant: "default",
        })

        setSelectedBet(null)
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

  const getBetLabel = (bet: Bets) => {
    if (bet === Bets.SKIP) return "Skip"
    return `${BetsNumericValue[bet]} tricks`
  }

  const isBetAvailable = (bet: Bets) => {
    if (bet === Bets.SKIP) return true

    if (!highestBet || highestBet.betValue === Bets.SKIP) {
      return BetsNumericValue[bet] >= 7 // Minimum bet is 7
    }

    const currentHighest = BetsNumericValue[highestBet.betValue]
    const thisBetValue = BetsNumericValue[bet]

    // Must bet higher than current highest
    if (thisBetValue > currentHighest) return true

    // Same value only allowed if upgrading from trump to no-trump
    if (thisBetValue === currentHighest && highestBet.trump && !isTrump) return true

    return false
  }

  const getPlayerTeamColor = (playerId: string) => {
    const player = gameState.players[playerId]
    switch (player?.team) {
      case Team.A: return "text-red-600"
      case Team.B: return "text-blue-600"
      default: return "text-gray-600"
    }
  }

  const getBetDisplay = (bet: Bet) => {
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
              {/* Bet Selection Grid */}
              <div>
                <div className="text-sm font-medium mb-3">Select your bet:</div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(Bets).map((bet) => (
                    <Button
                      key={bet}
                      variant={selectedBet === bet ? "default" : "outline"}
                      size="sm"
                      disabled={!isBetAvailable(bet)}
                      onClick={() => setSelectedBet(bet)}
                      className={`${
                        selectedBet === bet ? "ring-2 ring-green-500" : ""
                      } ${
                        !isBetAvailable(bet) ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {bet === Bets.SKIP ? (
                        <div className="flex items-center gap-1">
                          <X className="h-3 w-3" />
                          Skip
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="font-bold">{BetsNumericValue[bet]}</div>
                          <div className="text-xs">tricks</div>
                        </div>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Trump Selection */}
              {selectedBet && selectedBet !== Bets.SKIP && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trump"
                    checked={!isTrump}
                    onCheckedChange={(checked) => setIsTrump(!checked as boolean)}
                  />
                  <label htmlFor="trump" className="text-sm">
                    Without Trump (higher priority if tied, double the points won/loss)
                  </label>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <Button
                onClick={handlePlaceBet}
                disabled={isPlacing || !selectedBet}
                className="w-full"
              >
                {isPlacing ? "Placing Bet..." : selectedBet ? `Place Bet: ${getBetLabel(selectedBet)}${isTrump && selectedBet !== Bets.SKIP ? " (Trump)" : ""}` : "Select a bet"}
              </Button>
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

        {/* Betting Progress */}
        <div className="space-y-4">
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

          {/* Player Betting Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {gameState.turnOrder.map((playerId) => {
              const player = gameState.players[playerId]
              const playerBet = gameState.bets[playerId]
              const isCurrentTurn = gameState.currentTurn === playerId
              const isCurrentUser = playerId === currentUserId
              const isRecentBetter = recentBetters.has(playerId) && playerBet

              return (
                <div
                  key={playerId}
                  className={`p-2 rounded-lg border text-center text-sm transition-all duration-500 ${
                    isCurrentTurn
                      ? 'bg-yellow-100 border-yellow-300'
                      : playerBet
                      ? isRecentBetter
                        ? 'bg-green-200 border-green-400 shadow-lg animate-pulse'
                        : 'bg-green-100 border-green-300'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <div className="font-medium">
                    {player?.name || 'Unknown'}
                    {isCurrentUser && ' (You)'}
                  </div>
                  <div className="text-xs mt-1">
                    {isCurrentTurn && !playerBet ? (
                      <span className="text-yellow-700">🕐 Betting...</span>
                    ) : playerBet ? (
                      <span className="text-green-700">
                        ✓ {getBetDisplay(playerBet)}
                      </span>
                    ) : (
                      <span className="text-gray-500">⏳ Waiting</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
