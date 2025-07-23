"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GameState, GamePhase, Team, CardColor, Bets } from "@/lib/game-types"
import TeamSelection from "../room/[id]/team-selection"
import BettingPhase from "../room/[id]/betting-phase"
import CardGame from "../room/[id]/card-game"
import { Users, RotateCcw, Zap } from "lucide-react"
import { forceInitializeGame, getRoomGameState } from "../actions/game-actions"
import { createSimulatorRoom } from "../actions/testing"
import GameEventsPanel from "@/components/game-events-panel"

// Fixed simulator room ID
const SIMULATOR_ROOM_ID = "simulator-room-fixed"

// Dummy players (permanent in database)
const DUMMY_PLAYERS = [
  { id: "dummy-alice", name: "Alice", color: "bg-red-100 border-red-300 text-red-800" },
  { id: "dummy-bob", name: "Bob", color: "bg-blue-100 border-blue-300 text-blue-800" },
  { id: "dummy-charlie", name: "Charlie", color: "bg-green-100 border-green-300 text-green-800" },
  { id: "dummy-diana", name: "Diana", color: "bg-purple-100 border-purple-300 text-purple-800" }
]

export default function GameSimulator() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState())
  const [activePlayer, setActivePlayer] = useState<string>("dummy-alice")

  const [roomId, setRoomId] = useState<string>(SIMULATOR_ROOM_ID)
  const [isForceInitializing, setIsForceInitializing] = useState(false)
  const [isInitializingRoom, setIsInitializingRoom] = useState(false)

  function createInitialGameState(): GameState {
    const players: Record<string, any> = {}
    DUMMY_PLAYERS.forEach(player => {
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
      currentTurn: "dummy-alice",
      dealer: "dummy-alice",
      starter: "dummy-alice",
      trump: undefined,
      highestBet: undefined,
      players,
      bets: {},
      playedCards: {},
      playerHands: {},
      wonTricks: {},
      scores: {},
      turnOrder: DUMMY_PLAYERS.map(p => p.id)
    }
  }

  const handleGameStateUpdate = (newGameState: GameState) => {
    setGameState(newGameState)

    // Auto-switch to the current turn player's view for seamless testing
    if (newGameState.currentTurn && newGameState.currentTurn !== activePlayer) {
      setActivePlayer(newGameState.currentTurn)
    }
  }

  // Load current game state when simulator loads
  const loadCurrentGameState = async () => {
    try {
      const response = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGameState', roomId })
      })

      const result = await response.json()
      if (result.success && result.gameState) {
        setGameState(result.gameState)
        // Set active player to current turn if available
        if (result.gameState.currentTurn) {
          setActivePlayer(result.gameState.currentTurn)
        }
      }
    } catch (error) {
      console.error('Failed to load game state:', error)
    }
  }

  // Load current game state when component mounts
  useEffect(() => {
    loadCurrentGameState()
  }, [])
  const resetGame = async () => {
    try {
      const response = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetGame', roomId })
      })

      const result = await response.json()
      if (result.success && result.gameState) {
        setGameState(result.gameState)
        setActivePlayer("dummy-alice")
      }
    } catch (error) {
      console.error('Failed to reset game:', error)
      // Fallback to local reset
      setGameState(createInitialGameState())
      setActivePlayer("dummy-alice")
    }
  }

  const handleInitializeSimulatorRoom = async () => {
    setIsInitializingRoom(true)
    try {
      const result = await createSimulatorRoom()
      if (result.success && result.roomId) {
        setRoomId(result.roomId)
        if (result.gameState) {
          setGameState(result.gameState)
        }
        console.log("✅ Simulator room initialized with dummy players")
      } else {
        console.error("❌ Simulator room initialization failed:", result.error)
        alert(`Failed to initialize simulator room: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Simulator room initialization error:", error)
      alert("Failed to initialize simulator room")
    } finally {
      setIsInitializingRoom(false)
    }
  }

  const handleForceInitialize = async () => {
    setIsForceInitializing(true)
    try {
      const result = await forceInitializeGame(roomId)
      if (result.success) {
        // Fetch the real game state from database after initialization
        const realGameState = await getRoomGameState(roomId)
        if (realGameState) {
          setGameState(realGameState)
          console.log("✅ Force initialized game from simulator")
        } else {
          // Fallback to the returned game state
          if (result.gameState) {
            setGameState(result.gameState)
          }
        }
      } else {
        console.error("❌ Force initialization failed:", result.error)
        alert(`Failed to force initialize: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Force initialization error:", error)
      alert("Failed to force initialize game")
    } finally {
      setIsForceInitializing(false)
    }
  }

  const setPhase = (phase: GamePhase) => {
    const newGameState = { ...gameState, phase }
    
    // Add mock data based on phase
    if (phase === GamePhase.BETS) {
      // Set teams and seats in A1, B2, A3, B4 pattern
      newGameState.players["dummy-alice"].team = Team.A
      newGameState.players["dummy-alice"].seatPosition = 0  // A1

      newGameState.players["dummy-bob"].team = Team.B
      newGameState.players["dummy-bob"].seatPosition = 1    // B2

      newGameState.players["dummy-charlie"].team = Team.A
      newGameState.players["dummy-charlie"].seatPosition = 2 // A3

      newGameState.players["dummy-diana"].team = Team.B
      newGameState.players["dummy-diana"].seatPosition = 3   // B4

      // Set up proper turn order and current turn
      newGameState.turnOrder = ["dummy-alice", "dummy-bob", "dummy-charlie", "dummy-diana"]
      newGameState.dealer = "dummy-alice"
      newGameState.starter = "dummy-bob"
      newGameState.currentTurn = "dummy-alice"  // Start betting with Alice
    }
    
    if (phase === GamePhase.CARDS) {
      // Set teams and seats in A1, B2, A3, B4 pattern
      newGameState.players["dummy-alice"].team = Team.A
      newGameState.players["dummy-alice"].seatPosition = 0  // A1

      newGameState.players["dummy-bob"].team = Team.B
      newGameState.players["dummy-bob"].seatPosition = 1    // B2

      newGameState.players["dummy-charlie"].team = Team.A
      newGameState.players["dummy-charlie"].seatPosition = 2 // A3

      newGameState.players["dummy-diana"].team = Team.B
      newGameState.players["dummy-diana"].seatPosition = 3   // B4

      // Set up proper turn order and current turn
      newGameState.turnOrder = ["dummy-alice", "dummy-bob", "dummy-charlie", "dummy-diana"]
      newGameState.dealer = "dummy-alice"
      newGameState.starter = "dummy-bob"
      newGameState.currentTurn = "dummy-alice"

      // Add mock cards for each player
      newGameState.playerHands = {
        "dummy-alice": [
          { id: "a1", color: CardColor.RED, value: 5, playerId: "dummy-alice", trickNumber: 0, playOrder: 0 },
          { id: "a2", color: CardColor.BLUE, value: 3, playerId: "dummy-alice", trickNumber: 0, playOrder: 0 },
          { id: "a3", color: CardColor.GREEN, value: 7, playerId: "dummy-alice", trickNumber: 0, playOrder: 0 },
        ],
        "dummy-bob": [
          { id: "b1", color: CardColor.RED, value: 2, playerId: "dummy-bob", trickNumber: 0, playOrder: 0 },
          { id: "b2", color: CardColor.BLUE, value: 6, playerId: "dummy-bob", trickNumber: 0, playOrder: 0 },
          { id: "b3", color: CardColor.BROWN, value: 1, playerId: "dummy-bob", trickNumber: 0, playOrder: 0 },
        ],
        "dummy-charlie": [
          { id: "c1", color: CardColor.GREEN, value: 4, playerId: "dummy-charlie", trickNumber: 0, playOrder: 0 },
          { id: "c2", color: CardColor.RED, value: 0, playerId: "dummy-charlie", trickNumber: 0, playOrder: 0 },
          { id: "c3", color: CardColor.BLUE, value: 7, playerId: "dummy-charlie", trickNumber: 0, playOrder: 0 },
        ],
        "dummy-diana": [
          { id: "d1", color: CardColor.BROWN, value: 3, playerId: "dummy-diana", trickNumber: 0, playOrder: 0 },
          { id: "d2", color: CardColor.GREEN, value: 2, playerId: "dummy-diana", trickNumber: 0, playOrder: 0 },
          { id: "d3", color: CardColor.RED, value: 6, playerId: "dummy-diana", trickNumber: 0, playOrder: 0 },
        ]
      }

      newGameState.highestBet = {
        playerId: "dummy-alice",
        betValue: Bets.SEVEN,
        value: 3,
        trump: false,
        timestamp: new Date()
      }
    }
    
    setGameState(newGameState)
  }



  return (
    <div className="space-y-6">
      {/* Setup Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">📋 Setup Required</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="space-y-3">
            <p><strong>Automatic Setup:</strong></p>
            <p className="text-sm">
              The simulator now uses permanent dummy players in the database.
              Click the button below to create/initialize the simulator room automatically.
            </p>
            <Button
              onClick={handleInitializeSimulatorRoom}
              disabled={isInitializingRoom}
              className="w-full"
            >
              {isInitializingRoom ? "Initializing..." : "Initialize Simulator Room"}
            </Button>
            <p className="text-xs bg-blue-100 p-2 rounded">
              <strong>Current Room ID:</strong> <code>{roomId}</code><br/>
              <strong>Dummy Players:</strong> Alice, Bob, Charlie, Diana (permanent in database)
            </p>
          </div>
        </CardContent>
      </Card>

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
              <Button
                onClick={handleForceInitialize}
                disabled={isForceInitializing}
                variant="default"
                size="sm"
              >
                {isForceInitializing ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Force Starting...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Force Start Real Room
                  </>
                )}
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
              <Badge variant={activePlayer === gameState.currentTurn ? "default" : "outline"}>
                {DUMMY_PLAYERS.find(p => p.id === activePlayer)?.name}
                {activePlayer === gameState.currentTurn && " 🎯"}
              </Badge>
            </div>
          </div>

          {/* Quick Phase Switcher */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setPhase(GamePhase.TEAM_SELECTION)} variant="outline" size="sm">
              Team Selection
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
          {DUMMY_PLAYERS.map((player) => (
            <TabsTrigger key={player.id} value={player.id} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${player.color.split(' ')[0]}`} />
              {player.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {DUMMY_PLAYERS.map((player) => (
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
                    roomId={roomId}
                    gameState={gameState}
                    currentUserId={player.id}
                    onGameStateUpdate={handleGameStateUpdate}
                  />
                )}



                {gameState.phase === GamePhase.BETS && (
                  <BettingPhase
                    roomId={roomId}
                    gameState={gameState}
                    currentUserId={player.id}
                    onGameStateUpdate={handleGameStateUpdate}
                  />
                )}

                {gameState.phase === GamePhase.CARDS && (
                  <CardGame
                    roomId={roomId}
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
            {DUMMY_PLAYERS.map((player) => {
              const playerState = gameState.players[player.id]
              return (
                <div key={player.id} className={`p-2 rounded ${player.color}`}>
                  <div className="font-medium">{player.name}</div>
                  <div>Team: {playerState?.team || "None"}</div>
                  <div>Seat: {playerState?.seatPosition !== undefined ? playerState.seatPosition + 1 : "None"}</div>
                  <div>Cards: {gameState.playerHands[player.id]?.length || 0}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Game Events Panel */}
      <GameEventsPanel roomId={roomId} className="w-full" />
    </div>
  )
}
