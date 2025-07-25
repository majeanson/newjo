"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GameState, Card as GameCard } from "@/lib/game-types"
import { playCardAction } from "@/app/actions/game-logic"

interface CardGameProps {
  roomId: string
  gameState: GameState
  currentUserId: string
  onGameStateUpdate: (newGameState: GameState) => void
  trickComplete?: {
    winner: string
    winnerName: string
    timestamp: number
  } | null
}



export default function CardGame({ roomId, gameState, currentUserId, onGameStateUpdate, trickComplete }: CardGameProps) {
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trickWinner, setTrickWinner] = useState<{
    winner: string
    winnerName: string
    points: number
    winningCard?: GameCard
  } | null>(null)
  const [showTrickResult, setShowTrickResult] = useState(false)

  const isMyTurn = gameState.currentTurn === currentUserId
  const playerHand = gameState.playerHands[currentUserId] || []
  const playedCards = Object.values(gameState.playedCards)
  const highestBet = gameState.highestBet

  // Debug logging for played cards
  console.log('🃏 CardGame render - played cards:', playedCards.length, playedCards)
  console.log('🎯 CardGame render - current turn:', gameState.currentTurn, 'isMyTurn:', isMyTurn)

  // Handle TRICK_COMPLETE events via props from the main SSE system
  useEffect(() => {
    if (trickComplete) {
      console.log('🏆 CardGame received TRICK_COMPLETE via props:', trickComplete)

      setTrickWinner({
        winner: trickComplete.winner,
        winnerName: trickComplete.winnerName,
        points: 1,
        winningCard: undefined
      })
      setShowTrickResult(true)

      // Hide after 3 seconds
      setTimeout(() => {
        setShowTrickResult(false)
        setTrickWinner(null)
      }, 3000)
    }
  }, [trickComplete])



  const handleCardSelect = (card: GameCard) => {
    if (!isMyTurn || isPlaying) return
    setSelectedCard(card)
  }

  const handlePlayCard = async () => {
    if (!selectedCard || !isMyTurn || isPlaying) return

    setIsPlaying(true)
    setError(null)

    try {
      const result = await playCardAction(roomId, selectedCard.id, currentUserId)

      if (result.success) {
        // Don't update local state - SSE will handle the update
        console.log('🎯 Card play successful, waiting for SSE update')
        setSelectedCard(null)

        // Add fallback refresh for development environments where SSE might be unreliable
        setTimeout(() => {
          console.log('🔄 Card play fallback: triggering refresh')
          // Server actions use the old format, not the new API response format
          if (onGameStateUpdate && result.gameState) {
            onGameStateUpdate(result.gameState)
          }
        }, 1000) // 1 second fallback
      } else {
        setError("Failed to play card")
      }
    } catch (error) {
      console.error('Failed to play card:', error)
      setError("Failed to play card")
    } finally {
      setIsPlaying(false)
    }
  }

  const getCardColor = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-100 border-red-300 text-red-800'
      case 'blue': return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'green': return 'bg-green-100 border-green-300 text-green-800'
      case 'brown': return 'bg-amber-100 border-amber-300 text-amber-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Card Game - Round {gameState.round}</span>
          {gameState.trump && (
            <Badge variant="outline" className="text-lg">
              Trump: {gameState.trump}
            </Badge>
          )}
        </CardTitle>
        {highestBet && (
          <p className="text-sm text-gray-600">
            {`Highest bet: ${highestBet.value} by ${gameState.players[highestBet.playerId]?.name}`}
            {highestBet.trump && " (with trump)"}
          </p>
        )}
        {isMyTurn && (
          <p className="text-sm text-green-600 font-semibold">{`It's your turn!`}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Trick */}
        <div>
          <h3 className="font-semibold mb-3">Current Trick:</h3>

          {/* Trick Winner Message */}
          {showTrickResult && trickWinner && (
            <div className="mb-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-lg text-center">
              <div className="text-lg font-bold text-orange-800">
                🏆 {trickWinner.winnerName} wins the trick!
              </div>
              <div className="text-sm text-orange-700">
                +{trickWinner.points} points
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center min-h-[100px] items-center">
            {playedCards.length === 0 ? (
              <p className="text-gray-500">No cards played yet</p>
            ) : (
              playedCards
                .sort((a, b) => (a.playOrder || 0) - (b.playOrder || 0))
                .map(card => {
                  const isWinningCard = trickWinner?.winningCard?.id === card.id
                  return (
                    <div key={card.id} className="text-center">
                      <div className={`p-3 rounded-lg border-2 min-w-[80px] transition-all duration-500 ${
                        isWinningCard
                          ? `${getCardColor(card.color)} ring-4 ring-yellow-400 shadow-lg transform scale-110 animate-pulse`
                          : getCardColor(card.color)
                      }`}>
                        <div className="font-bold text-lg">{card.value}</div>
                        <div className="text-sm capitalize">{card.color}</div>
                        {isWinningCard && (
                          <div className="text-xs text-yellow-600 font-bold mt-1">WINNER!</div>
                        )}
                      </div>
                      <p className="text-xs mt-1">{gameState.players[card.playerId]?.name}</p>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        {/* Player's Hand */}
        <div>
          <h3 className="font-semibold mb-3">Your Hand ({playerHand.length} cards):</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {playerHand.map(card => (
              <button
                key={card.id}
                onClick={() => handleCardSelect(card)}
                disabled={!isMyTurn || isPlaying}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedCard?.id === card.id
                    ? `${getCardColor(card.color)} ring-2 ring-blue-500 transform scale-105`
                    : `${getCardColor(card.color)} hover:scale-105`
                } ${!isMyTurn || isPlaying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-bold text-lg">{card.value}</div>
                <div className="text-sm capitalize">{card.color}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Play Card Button */}
        {selectedCard && isMyTurn && (
          <div className="text-center">
            <Button 
              onClick={handlePlayCard}
              disabled={isPlaying}
              size="lg"
              className="px-8"
            >
              {isPlaying ? "Playing..." : `Play ${selectedCard.color} ${selectedCard.value}`}
            </Button>
          </div>
        )}

        {/* Scores */}
        <div>
          <h3 className="font-semibold mb-3">Tricks Won This Round:</h3>
          <div className="grid grid-cols-2 gap-4">
            {gameState.turnOrder.map(playerId => {
              const player = gameState.players[playerId]
              const tricks = gameState.wonTricks[playerId] || 0
              const isCurrentTurn = gameState.currentTurn === playerId
              return (
                <div key={playerId} className={`flex justify-between items-center p-2 rounded ${
                  isCurrentTurn ? 'bg-blue-50 border border-blue-200' : ''
                }`}>
                  <span className="flex items-center gap-2">
                    {player.name}
                    {player.team && <Badge variant="outline">Team {player.team}</Badge>}
                    {isCurrentTurn && <Badge variant="default" className="text-xs">Turn</Badge>}
                  </span>
                  <Badge variant="secondary">{tricks} tricks</Badge>
                </div>
              )
            })}
          </div>
        </div>

        {/* Game Scores */}
        {Object.keys(gameState.scores).length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Game Scores:</h3>
            <div className="grid grid-cols-2 gap-4">
              {gameState.turnOrder.map(playerId => {
                const player = gameState.players[playerId]
                const score = gameState.scores[playerId] || 0
                return (
                  <div key={playerId} className="flex justify-between items-center">
                    <span>{player.name}</span>
                    <Badge variant={score >= 0 ? "default" : "destructive"}>{score}</Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
