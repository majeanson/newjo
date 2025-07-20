"use client"

import { useState } from "react"
import { GameState, GamePhase, Team, CardColor } from "@/lib/game-types"
import GamePhases from "./game-phases"
import GameTester from "./game-tester"
import GameInitializer from "./game-initializer"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface GameWrapperProps {
  roomId: string
  currentUserId: string
  initialGameState?: GameState | null
  playerCount: number
}

export default function GameWrapper({ roomId, currentUserId, initialGameState, playerCount }: GameWrapperProps) {
  // Create a default game state if none provided
  const createDefaultGameState = (): GameState => ({
    phase: GamePhase.TEAM_SELECTION,
    round: 1,
    currentTurn: currentUserId,
    dealer: currentUserId,
    starter: currentUserId,
    trump: undefined,
    highestBet: undefined,
    players: {
      [currentUserId]: {
        id: currentUserId,
        name: "You",
        team: undefined,
        seatPosition: undefined,
        isReady: false
      },
      "player2": {
        id: "player2",
        name: "Alice",
        team: undefined,
        seatPosition: undefined,
        isReady: false
      },
      "player3": {
        id: "player3",
        name: "Bob",
        team: undefined,
        seatPosition: undefined,
        isReady: false
      },
      "player4": {
        id: "player4",
        name: "Charlie",
        team: undefined,
        seatPosition: undefined,
        isReady: false
      }
    },
    bets: {},
    playedCards: {},
    playerHands: {},
    wonTricks: {},
    scores: {},
    turnOrder: [currentUserId, "player2", "player3", "player4"]
  })

  const [gameState, setGameState] = useState<GameState>(
    initialGameState || createDefaultGameState()
  )

  const handleGameStateUpdate = (newGameState: GameState) => {
    setGameState(newGameState)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="game" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="game">Game Interface</TabsTrigger>
          <TabsTrigger value="tester">Testing Panel</TabsTrigger>
        </TabsList>

        <TabsContent value="game" className="space-y-6">
          {gameState ? (
            <GamePhases
              roomId={roomId}
              gameState={gameState}
              currentUserId={currentUserId}
            />
          ) : (
            <GameInitializer
              roomId={roomId}
              playerCount={playerCount}
              onGameInitialized={handleGameStateUpdate}
            />
          )}
        </TabsContent>
        
        <TabsContent value="tester" className="space-y-6">
          <GameTester
            roomId={roomId}
            currentUserId={currentUserId}
            onGameStateUpdate={handleGameStateUpdate}
          />
          
          {/* Current Game State Display */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Current Game State:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Phase:</span>
                  <div className="font-medium">{gameState.phase}</div>
                </div>
                <div>
                  <span className="text-gray-600">Round:</span>
                  <div className="font-medium">{gameState.round}</div>
                </div>
                <div>
                  <span className="text-gray-600">Current Turn:</span>
                  <div className="font-medium">
                    {gameState.players[gameState.currentTurn]?.name || "None"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Players:</span>
                  <div className="font-medium">{Object.keys(gameState.players).length}/4</div>
                </div>
              </div>
              
              <div className="mt-4">
                <span className="text-gray-600 text-sm">Teams:</span>
                <div className="flex gap-4 mt-1">
                  <div className="text-sm">
                    <span className="text-red-600 font-medium">Team A:</span>
                    {Object.values(gameState.players)
                      .filter(p => p.team === Team.A)
                      .map(p => p.name)
                      .join(", ") || "None"}
                  </div>
                  <div className="text-sm">
                    <span className="text-blue-600 font-medium">Team B:</span>
                    {Object.values(gameState.players)
                      .filter(p => p.team === Team.B)
                      .map(p => p.name)
                      .join(", ") || "None"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
