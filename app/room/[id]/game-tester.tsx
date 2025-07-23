"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GameState, GamePhase, Team, CardColor, Bets } from "@/lib/game-types"

interface GameTesterProps {
  currentUserId: string
  onGameStateUpdate: (newGameState: GameState) => void
}

export default function GameTester({ currentUserId, onGameStateUpdate }: GameTesterProps) {
  const [selectedPhase, setSelectedPhase] = useState<GamePhase>(GamePhase.TEAM_SELECTION)

  // Create mock players
  const createMockPlayers = () => ({
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
  })

  // Create mock game state for different phases
  const createMockGameState = (phase: GamePhase): GameState => {
    const baseState: GameState = {
      phase,
      round: 1,
      currentTurn: currentUserId,
      dealer: currentUserId,
      starter: currentUserId,
      trump: undefined,
      highestBet: undefined,
      players: createMockPlayers(),
      bets: {},
      playedCards: {},
      playerHands: {},
      wonTricks: {},
      scores: {},
      turnOrder: [currentUserId, "player2", "player3", "player4"]
    }

    // Customize based on phase
    switch (phase) {
      case GamePhase.TEAM_SELECTION:
        return baseState



      case GamePhase.BETS:
        baseState.players[currentUserId].team = Team.A
        baseState.players["player2"].team = Team.B
        baseState.players["player3"].team = Team.A
        baseState.players["player4"].team = Team.B
        baseState.players[currentUserId].seatPosition = 0
        baseState.players["player2"].seatPosition = 1
        baseState.players["player3"].seatPosition = 2
        baseState.players["player4"].seatPosition = 3
        return baseState

      case GamePhase.CARDS:
        baseState.players[currentUserId].team = Team.A
        baseState.players["player2"].team = Team.B
        baseState.players["player3"].team = Team.A
        baseState.players["player4"].team = Team.B
        baseState.players[currentUserId].seatPosition = 0
        baseState.players["player2"].seatPosition = 1
        baseState.players["player3"].seatPosition = 2
        baseState.players["player4"].seatPosition = 3
        
        // Add mock cards
        baseState.playerHands = {
          [currentUserId]: [
            { id: "1", color: CardColor.RED, value: 5, playerId: currentUserId, trickNumber: 0, playOrder: 0 },
            { id: "2", color: CardColor.BLUE, value: 3, playerId: currentUserId, trickNumber: 0, playOrder: 0 },
            { id: "3", color: CardColor.GREEN, value: 7, playerId: currentUserId, trickNumber: 0, playOrder: 0 },
            { id: "4", color: CardColor.BROWN, value: 2, playerId: currentUserId, trickNumber: 0, playOrder: 0 },
            { id: "5", color: CardColor.RED, value: 0, playerId: currentUserId, trickNumber: 0, playOrder: 0 },
          ]
        }
        
        baseState.highestBet = {
          playerId: currentUserId,
          betValue: Bets.SEVEN,
          value: 3,
          trump: false,
          timestamp: new Date()
        }
        
        baseState.wonTricks = {
          [currentUserId]: 2,
          "player2": 1,
          "player3": 0,
          "player4": 1
        }
        
        baseState.scores = {
          [currentUserId]: 5,
          "player2": 3,
          "player3": 5,
          "player4": 3
        }
        
        return baseState

      default:
        return baseState
    }
  }

  const handlePhaseChange = (phase: GamePhase) => {
    setSelectedPhase(phase)
    const mockGameState = createMockGameState(phase)
    onGameStateUpdate(mockGameState)
  }

  const quickActions = [
    {
      label: "Team Selection",
      phase: GamePhase.TEAM_SELECTION,
      description: "Test team selection interface"
    },

    {
      label: "Betting Phase",
      phase: GamePhase.BETS,
      description: "Test betting interface with seats assigned"
    },
    {
      label: "Card Game",
      phase: GamePhase.CARDS,
      description: "Test card playing with full game state"
    },
    {
      label: "Round Scoring",
      phase: GamePhase.TRICK_SCORING,
      description: "Test round completion and scoring"
    }
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🧪 Game Testing Panel</CardTitle>
        <p className="text-sm text-gray-600 text-center">
          Use this panel to test different game phases and functionality
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Phase Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Game Phase:</label>
          <Select value={selectedPhase} onValueChange={(value) => setSelectedPhase(value as GamePhase)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a game phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GamePhase.WAITING}>Waiting for Players</SelectItem>
              <SelectItem value={GamePhase.TEAM_SELECTION}>Team Selection</SelectItem>

              <SelectItem value={GamePhase.BETS}>Betting Phase</SelectItem>
              <SelectItem value={GamePhase.CARDS}>Card Playing</SelectItem>
              <SelectItem value={GamePhase.TRICK_SCORING}>Round Scoring</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-medium mb-3">Quick Test Actions:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.phase}
                onClick={() => handlePhaseChange(action.phase)}
                variant={selectedPhase === action.phase ? "default" : "outline"}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="font-medium">{action.label}</div>
                <div className="text-xs text-left opacity-75">{action.description}</div>
              </Button>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        <div className="text-center">
          <Button 
            onClick={() => handlePhaseChange(selectedPhase)}
            size="lg"
            className="px-8"
          >
            Apply Game State: {selectedPhase}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <p className="font-medium mb-1">Testing Instructions:</p>
          <ul className="space-y-1">
            <li>• Select a game phase to test specific functionality</li>
            <li>• Each phase includes appropriate mock data (teams, seats, cards, etc.)</li>
            <li>• Use the interactive components to test user actions</li>
            <li>• Check browser console for action logs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
