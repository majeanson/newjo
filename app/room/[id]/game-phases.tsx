"use client"

import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { GamePhase, Team, GameState } from "@/lib/game-types"

interface GamePhasesProps {
  roomId: string
  gameState: GameState
  currentUserId: string
}

export default function GamePhases({ roomId, gameState, currentUserId }: GamePhasesProps) {
  const currentPlayer = gameState.players[currentUserId]
  const isMyTurn = gameState.currentTurn === currentUserId

  // For now, just display the game state
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Game Phase: {gameState.phase}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Players:</h3>
          <div className="space-y-2">
            {Object.values(gameState.players).map(player => (
              <div key={player.id} className="flex justify-between items-center">
                <span>{player.name}</span>
                <div className="flex gap-2">
                  {player.team && <Badge variant="outline">Team {player.team}</Badge>}
                  {player.seatPosition !== undefined && <Badge variant="secondary">Seat {player.seatPosition + 1}</Badge>}
                  {player.isReady && <Badge variant="default">Ready</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {gameState.phase === GamePhase.TEAM_SELECTION && (
          <div>
            <p className="text-sm text-gray-600">Players need to select teams (2 players per team)</p>
          </div>
        )}

        {gameState.phase === GamePhase.SEAT_SELECTION && (
          <div>
            <p className="text-sm text-gray-600">Players need to select their seats</p>
          </div>
        )}

        {gameState.phase === GamePhase.BETS && (
          <div>
            <p className="text-sm text-gray-600">Betting phase - players place their bets</p>
            {isMyTurn && <p className="text-green-600 font-semibold">It's your turn to bet!</p>}
          </div>
        )}

        {gameState.phase === GamePhase.CARDS && (
          <div>
            <p className="text-sm text-gray-600">Card playing phase</p>
            {gameState.highestBet && (
              <p className="text-sm">
                Highest bet: {gameState.highestBet.value} by {gameState.players[gameState.highestBet.playerId]?.name}
              </p>
            )}
            {isMyTurn && <p className="text-green-600 font-semibold">It's your turn to play!</p>}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Room ID: {roomId} | Current User: {currentPlayer?.name}
        </div>
      </CardContent>
    </Card>
  )
}
