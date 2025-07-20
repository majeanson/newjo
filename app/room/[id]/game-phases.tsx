"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GamePhase, GameState } from "@/lib/game-types"
import TeamSelection from "./team-selection"
import BettingPhase from "./betting-phase"
import CardGame from "./card-game"

interface GamePhasesProps {
  roomId: string
  gameState: GameState
  currentUserId: string
}

export default function GamePhases({ roomId, gameState: initialGameState, currentUserId }: GamePhasesProps) {
  const [gameState, setGameState] = useState(initialGameState)
  const currentPlayer = gameState.players[currentUserId]
  const isMyTurn = gameState.currentTurn === currentUserId

  const handleGameStateUpdate = (newGameState: GameState) => {
    setGameState(newGameState)
  }

  return (
    <div className="space-y-6">
      {/* Game Status Header */}
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">
            Game Status - Round {gameState.round}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Phase</p>
              <Badge variant="default">{gameState.phase}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Players</p>
              <Badge variant="outline">{Object.keys(gameState.players).length}/4</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Turn</p>
              <Badge variant={isMyTurn ? "default" : "secondary"}>
                {isMyTurn ? "Your Turn" : gameState.players[gameState.currentTurn]?.name || "Waiting"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Dealer</p>
              <Badge variant="outline">
                {gameState.players[gameState.dealer]?.name || "Not Set"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase-specific content */}
      <div className="w-full">
        {gameState.phase === GamePhase.WAITING && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-8">
              <h2 className="text-xl font-semibold mb-4">Waiting for Players</h2>
              <p className="text-gray-600">Need 4 players to start the game.</p>
            </CardContent>
          </Card>
        )}

        {gameState.phase === GamePhase.TEAM_SELECTION && (
          <TeamSelection
            roomId={roomId}
            gameState={gameState}
            currentUserId={currentUserId}
            onGameStateUpdate={handleGameStateUpdate}
          />
        )}



        {gameState.phase === GamePhase.BETS && (
          <BettingPhase
            roomId={roomId}
            gameState={gameState}
            currentUserId={currentUserId}
            onGameStateUpdate={handleGameStateUpdate}
          />
        )}

        {gameState.phase === GamePhase.CARDS && (
          <CardGame
            roomId={roomId}
            gameState={gameState}
            currentUserId={currentUserId}
            onGameStateUpdate={handleGameStateUpdate}
          />
        )}

        {gameState.phase === GamePhase.TRICK_SCORING && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-8">
              <h2 className="text-xl font-semibold mb-4">Round Complete</h2>
              <p className="text-gray-600 mb-4">Calculating scores...</p>
              <Button
                onClick={() => {
                  console.log('Process round scoring')
                }}
              >
                Continue to Next Round
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Debug Info */}
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-xs text-gray-500 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>Room ID: {roomId}</div>
            <div>Current User: {currentPlayer?.name}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
