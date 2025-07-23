"use client"

import { useState, useEffect } from "react"
import { GameState, GamePhase, Team } from "@/lib/game-types"
import GamePhases from "./game-phases"
import GameTester from "./game-tester"
import GameInitializer from "./game-initializer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import GameEventsPanel from "@/components/game-events-panel"
import { useGameState } from "@/hooks/use-game-state"
import { getRoomData } from "../../actions/game-actions"
import { Users, Wifi, WifiOff, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { resetGameAction } from "../../actions/game-actions"

interface GameWrapperProps {
  roomId: string
  currentUserId: string
  initialGameState?: GameState | null
  playerCount: number
}

interface RoomMember {
  user: {
    id: string
    name: string
  }
}

interface Room {
  id: string
  name: string
  members: RoomMember[]
}

export default function GameWrapper({ roomId, currentUserId, initialGameState, playerCount: initialPlayerCount }: GameWrapperProps) {
  // Live room data state
  const [roomData, setRoomData] = useState<Room | null>(null)
  const [playerCount, setPlayerCount] = useState(initialPlayerCount)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetBanner, setShowResetBanner] = useState(false)
  const { toast } = useToast()

  // Use game state hook for live updates
  const { gameState: liveGameState, isConnected, sendGameEvent, refreshGameState } = useGameState({
    roomId,
    initialGameState,
    onGameEvent: (event) => {
      // Handle player join/leave events to update player count
      if (event.type === 'PLAYER_JOINED' || event.type === 'PLAYER_LEFT') {
        fetchRoomData()
      }

      // Show toast notifications for team selection events from other players
      if (event.data?.playerId && event.data.playerId !== currentUserId) {
        switch (event.type) {
          case 'TEAM_SELECTED':
            if (event.data.autoAssigned) {
              toast({
                title: "🎯 Teams Auto-Assigned",
                description: "Teams have been automatically assigned!",
                variant: "default",
              })
            } else if (event.data.teamsBalanced) {
              toast({
                title: "🎉 Teams Complete!",
                description: `${event.data.playerName} completed the teams!`,
                variant: "default",
              })
            } else {
              toast({
                title: "👥 Team Selection",
                description: `${event.data.playerName} joined Team ${event.data.team}`,
                variant: "default",
              })
            }
            break
          case 'BETTING_PHASE_STARTED':
            if (event.data.teamsComplete) {
              toast({
                title: "🎲 Betting Started!",
                description: "Teams are complete. Time to place bets!",
                variant: "default",
              })
            }
            break
          case 'GAME_RESET':
            // Show prominent banner for reset
            setShowResetBanner(true)
            setTimeout(() => setShowResetBanner(false), 4000)

            toast({
              title: "🔄 GAME RESET!",
              description: event.data.message || "Game has been reset by the host.",
              variant: "default",
              duration: 6000, // Show longer for reset
            })
            break
          case 'BET_PLACED':
            const betDisplay = event.data.betValue === 'SKIP' ? 'Skip' : `${event.data.betValue} tricks`
            const trumpText = event.data.trump ? ' (Trump)' : (event.data.trump === false ? ' (No Trump)' : '')
            const remainingText = event.data.betsRemaining > 0 ? ` • ${event.data.betsRemaining} left` : ''

            toast({
              title: "🎯 Bet Placed",
              description: `${event.data.playerName}: ${betDisplay}${trumpText}${remainingText}`,
              variant: "default",
            })
            break
          case 'BETTING_COMPLETE':
            toast({
              title: "🎲 All Bets Placed!",
              description: `Highest bet: ${event.data.highestBet} tricks. Starting card phase...`,
              variant: "default",
              duration: 5000,
            })
            break
          case 'GAME_STATE_UPDATED':
            if (event.data.reset) {
              toast({
                title: "🔄 Game Reset",
                description: event.data.message || "Game has been reset by the host.",
                variant: "default",
              })
            }
            break
        }
      }
    }
  })

  // Fetch room data to get live player count
  const fetchRoomData = async () => {
    try {
      const room = await getRoomData(roomId)
      if (room) {
        setRoomData(room)
        setPlayerCount(room.members.length)
      }
    } catch (error) {
      console.error("Failed to fetch room data:", error)
    }
  }

  // Load initial room data
  useEffect(() => {
    fetchRoomData()
  }, [roomId])

  // Handle reset game action
  const handleResetGame = async () => {
    if (isResetting) return

    // Confirm reset action
    const confirmed = window.confirm(
      "Are you sure you want to reset the game? This will:\n\n" +
      "• Clear all team assignments\n" +
      "• Reset all bets and cards\n" +
      "• Return to team selection phase\n" +
      "• Keep all players in the room\n\n" +
      "This action cannot be undone."
    )

    if (!confirmed) return

    setIsResetting(true)

    try {
      const result = await resetGameAction(roomId)
      if (result.success) {
        // Show reset banner for the person who initiated it
        setShowResetBanner(true)
        setTimeout(() => setShowResetBanner(false), 4000)

        // Show success toast with more details
        const playerCount = Object.keys(result.gameState?.players || {}).length
        const phase = result.gameState?.phase

        toast({
          title: "🔄 Game Reset Successfully!",
          description: `Game reset to ${phase === 'waiting' ? 'waiting phase' : 'team selection phase'}. ${playerCount}/4 players in room.`,
          variant: "default",
          duration: 5000,
        })

        console.log('✅ Game reset completed:', result.gameState)
      } else {
        toast({
          title: "❌ Reset Failed",
          description: result.error || "Failed to reset game",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Reset game error:", error)
      toast({
        title: "❌ Reset Error",
        description: "An error occurred while resetting the game",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

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

  // Use live game state if available, otherwise fall back to initial or default
  const gameState = liveGameState || initialGameState || createDefaultGameState()

  const handleGameStateUpdate = (newGameState: GameState) => {
    // The live game state will be updated via SSE, but we can also trigger a refresh
    sendGameEvent('GAME_STATE_UPDATED', { gameState: newGameState })
  }

  // Show different UI based on phase and player count
  const currentPhase = gameState?.phase as string
  const isWaitingForPlayers = playerCount < 4 || currentPhase === GamePhase.WAITING || currentPhase === 'waiting'

  // Debug logging
  console.log('🎮 Game Wrapper Debug:', {
    playerCount,
    gameStateExists: !!gameState,
    gamePhase: gameState?.phase,
    isWaitingForPlayers,
    liveGameStateExists: !!liveGameState,
    initialGameStateExists: !!initialGameState,
    usingLiveState: !!liveGameState,
    currentTurn: gameState?.currentTurn,
    betsCount: Object.keys(gameState?.bets || {}).length
  })

  return (
    <div className="space-y-6">
      {/* Reset Banner */}
      {showResetBanner && (
        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 text-center animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-600 animate-spin" />
            <span className="text-red-800 font-bold text-lg">🔄 GAME RESET!</span>
            <RotateCcw className="h-5 w-5 text-red-600 animate-spin" />
          </div>
          <p className="text-red-700 text-sm mt-1">Game has been reset to initial state</p>
        </div>
      )}

      {/* Live Player Status and Start Game Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Room Players
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={playerCount === 4 ? "default" : "secondary"}>
                {playerCount}/4 Players
              </Badge>
              {isConnected ? (
                <Badge variant="outline" className="text-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              <Button
                onClick={() => {
                  console.log('🔄 Manual refresh triggered')
                  refreshGameState()
                }}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                🔄 Refresh
              </Button>
              <Button
                onClick={handleResetGame}
                disabled={isResetting}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset Game
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Player Status Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  i < playerCount ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className={`text-sm ${
                  i < playerCount ? 'text-green-700 font-medium' : 'text-gray-500'
                }`}>
                  Player {i + 1} {i < playerCount ? '✓' : 'waiting...'}
                </span>
              </div>
            ))}
          </div>

          {/* Game Status Section */}
          {isWaitingForPlayers ? (
            <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-600 mb-2">
                <strong>Waiting Phase:</strong> {playerCount < 4 ? `Need ${4 - playerCount} more player${4 - playerCount !== 1 ? 's' : ''} to join` : 'Ready to move to team selection'}
              </p>
              {playerCount === 4 && (
                <p className="text-green-600 font-medium">
                  ✅ 4 players ready! Game will automatically move to team selection.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Share the room link with your friends to invite them!
              </p>
            </div>
          ) : (
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 font-medium">
                🎮 Game in progress - {currentPhase} phase
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Use the Game Interface tab below to participate
              </p>
            </div>
          )}

          {playerCount < 4 && (
            <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-600">
                Waiting for {4 - playerCount} more player{4 - playerCount !== 1 ? 's' : ''} to join...
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Share the room link with your friends to invite them!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="game" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="game">Game Interface</TabsTrigger>
          <TabsTrigger value="events">Game Events</TabsTrigger>
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

        <TabsContent value="events" className="space-y-6">
          <GameEventsPanel roomId={roomId} />
        </TabsContent>

        <TabsContent value="tester" className="space-y-6">
          <GameTester
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
