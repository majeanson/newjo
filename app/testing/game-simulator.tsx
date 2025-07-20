"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GameState, GamePhase, Team, CardColor } from "@/lib/game-types"
import TeamSelection from "../room/[id]/team-selection"
import SeatSelection from "../room/[id]/seat-selection"
import BettingPhase from "../room/[id]/betting-phase"
import CardGame from "../room/[id]/card-game"
import { Users, Play, RotateCcw } from "lucide-react"

const MOCK_ROOM_ID = "simulator-room"

const TEST_PLAYERS = [
  { id: "alice", name: "Alice", color: "bg-red-100 border-red-300 text-red-800" },
  { id: "bob", name: "Bob", color: "bg-blue-100 border-blue-300 text-blue-800" },
  { id: "charlie", name: "Charlie", color: "bg-green-100 border-green-300 text-green-800" },
  { id: "diana", name: "Diana", color: "bg-purple-100 border-purple-300 text-purple-800" }
]

export default function GameSimulator() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState())
  const [activePlayer, setActivePlayer] = useState<string>("alice")

  function createInitialGameState(): GameState {
    const players: Record<string, any> = {}
    TEST_PLAYERS.forEach(player => {
      players[player.id] = {
        id: player.id,
        name: player.name,
        team: undefined,
        seatPosition: undefined,
        isReady: false
      }
    })

    return {
      phase: GamePhase.TEAM_SELECTION,
      round: 1,
      currentTurn: "alice",
      dealer: "alice",
      starter: "alice",
      trump: undefined,
      highestBet: undefined,
      players,
      bets: {},
      playedCards: {},
      playerHands: {},
      wonTricks: {},
      scores: {},
      turnOrder: TEST_PLAYERS.map(p => p.id)
    }
  }

  const handleGameStateUpdate = (newGameState: GameState) => {
    setGameState(newGameState)
  }

  const resetGame = () => {
    setGameState(createInitialGameState())
    setActivePlayer("alice")
  }

  const setPhase = (phase: GamePhase) => {
    const newGameState = { ...gameState, phase }
    
    // Add mock data based on phase
    if (phase === GamePhase.SEAT_SELECTION) {
      newGameState.players.alice.team = Team.A
      newGameState.players.bob.team = Team.B
      newGameState.players.charlie.team = Team.A
      newGameState.players.diana.team = Team.B
    }
    
    if (phase === GamePhase.BETS) {
      newGameState.players.alice.team = Team.A
      newGameState.players.bob.team = Team.B
      newGameState.players.charlie.team = Team.A
      newGameState.players.diana.team = Team.B
      newGameState.players.alice.seatPosition = 0
      newGameState.players.bob.seatPosition = 1
      newGameState.players.charlie.seatPosition = 2
      newGameState.players.diana.seatPosition = 3
    }
    
    if (phase === GamePhase.CARDS) {
      newGameState.players.alice.team = Team.A
      newGameState.players.bob.team = Team.B
      newGameState.players.charlie.team = Team.A
      newGameState.players.diana.team = Team.B
      newGameState.players.alice.seatPosition = 0
      newGameState.players.bob.seatPosition = 1
      newGameState.players.charlie.seatPosition = 2
      newGameState.players.diana.seatPosition = 3
      
      // Add mock cards for each player
      newGameState.playerHands = {
        alice: [
          { id: "a1", color: CardColor.RED, value: 5, playerId: "alice", trickNumber: 0, playOrder: 0 },
          { id: "a2", color: CardColor.BLUE, value: 3, playerId: "alice", trickNumber: 0, playOrder: 0 },
          { id: "a3", color: CardColor.GREEN, value: 7, playerId: "alice", trickNumber: 0, playOrder: 0 },
        ],
        bob: [
          { id: "b1", color: CardColor.RED, value: 2, playerId: "bob", trickNumber: 0, playOrder: 0 },
          { id: "b2", color: CardColor.BLUE, value: 6, playerId: "bob", trickNumber: 0, playOrder: 0 },
          { id: "b3", color: CardColor.BROWN, value: 1, playerId: "bob", trickNumber: 0, playOrder: 0 },
        ],
        charlie: [
          { id: "c1", color: CardColor.GREEN, value: 4, playerId: "charlie", trickNumber: 0, playOrder: 0 },
          { id: "c2", color: CardColor.RED, value: 0, playerId: "charlie", trickNumber: 0, playOrder: 0 },
          { id: "c3", color: CardColor.BLUE, value: 7, playerId: "charlie", trickNumber: 0, playOrder: 0 },
        ],
        diana: [
          { id: "d1", color: CardColor.BROWN, value: 3, playerId: "diana", trickNumber: 0, playOrder: 0 },
          { id: "d2", color: CardColor.GREEN, value: 2, playerId: "diana", trickNumber: 0, playOrder: 0 },
          { id: "d3", color: CardColor.RED, value: 6, playerId: "diana", trickNumber: 0, playOrder: 0 },
        ]
      }
      
      newGameState.highestBet = {
        playerId: "alice",
        value: 3,
        trump: false,
        timestamp: new Date()
      }
    }
    
    setGameState(newGameState)
  }

  const getPlayerColor = (playerId: string) => {
    return TEST_PLAYERS.find(p => p.id === playerId)?.color || "bg-gray-100"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              4-Player Game Simulator
            </div>
            <div className="flex gap-2">
              <Button onClick={resetGame} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Game
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <span className="text-sm text-gray-600">Phase:</span>
              <Badge variant="default">{gameState.phase}</Badge>
            </div>
            <div>
              <span className="text-sm text-gray-600">Round:</span>
              <Badge variant="outline">{gameState.round}</Badge>
            </div>
            <div>
              <span className="text-sm text-gray-600">Current Turn:</span>
              <Badge variant="secondary">{gameState.players[gameState.currentTurn]?.name}</Badge>
            </div>
            <div>
              <span className="text-sm text-gray-600">Active View:</span>
              <Badge variant="default">{TEST_PLAYERS.find(p => p.id === activePlayer)?.name}</Badge>
            </div>
          </div>

          {/* Quick Phase Switcher */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setPhase(GamePhase.TEAM_SELECTION)} variant="outline" size="sm">
              Team Selection
            </Button>
            <Button onClick={() => setPhase(GamePhase.SEAT_SELECTION)} variant="outline" size="sm">
              Seat Selection
            </Button>
            <Button onClick={() => setPhase(GamePhase.BETS)} variant="outline" size="sm">
              Betting
            </Button>
            <Button onClick={() => setPhase(GamePhase.CARDS)} variant="outline" size="sm">
              Card Game
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Player Tabs */}
      <Tabs value={activePlayer} onValueChange={setActivePlayer}>
        <TabsList className="grid w-full grid-cols-4">
          {TEST_PLAYERS.map((player) => (
            <TabsTrigger key={player.id} value={player.id} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${player.color.split(' ')[0]}`} />
              {player.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {TEST_PLAYERS.map((player) => (
          <TabsContent key={player.id} value={player.id} className="space-y-4">
            <Card className={`border-2 ${player.color.split(' ')[1]}`}>
              <CardHeader>
                <CardTitle className={`${player.color} p-2 rounded text-center`}>
                  {player.name}'s View
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Game Phase Component */}
                {gameState.phase === GamePhase.TEAM_SELECTION && (
                  <TeamSelection
                    roomId={MOCK_ROOM_ID}
                    gameState={gameState}
                    currentUserId={player.id}
                    onGameStateUpdate={handleGameStateUpdate}
                  />
                )}

                {gameState.phase === GamePhase.SEAT_SELECTION && (
                  <SeatSelection
                    roomId={MOCK_ROOM_ID}
                    gameState={gameState}
                    currentUserId={player.id}
                    onGameStateUpdate={handleGameStateUpdate}
                  />
                )}

                {gameState.phase === GamePhase.BETS && (
                  <BettingPhase
                    roomId={MOCK_ROOM_ID}
                    gameState={gameState}
                    currentUserId={player.id}
                    onGameStateUpdate={handleGameStateUpdate}
                  />
                )}

                {gameState.phase === GamePhase.CARDS && (
                  <CardGame
                    roomId={MOCK_ROOM_ID}
                    gameState={gameState}
                    currentUserId={player.id}
                    onGameStateUpdate={handleGameStateUpdate}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Game State Debug */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Game State Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {TEST_PLAYERS.map((player) => {
              const playerState = gameState.players[player.id]
              return (
                <div key={player.id} className={`p-2 rounded ${player.color}`}>
                  <div className="font-medium">{player.name}</div>
                  <div>Team: {playerState.team || "None"}</div>
                  <div>Seat: {playerState.seatPosition !== undefined ? playerState.seatPosition + 1 : "None"}</div>
                  <div>Cards: {gameState.playerHands[player.id]?.length || 0}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
