import { getCurrentUser } from "../../actions/auth"
import { redirect } from "next/navigation"
import { getRoomData } from "../../actions/game"
import RoomContent from "./room-content"
import GamePhases from "./game-phases"
import { GamePhase, GameState, Team } from "@/lib/game-types"

interface RoomPageProps {
  params: Promise<{ id: string }>
}

// Mock game state for testing - we'll replace this with real data later
function createMockGameState(_roomId: string, userId: string): GameState {
  return {
    phase: GamePhase.CARDS,
    round: 1,
    currentTurn: userId,
    dealer: userId,
    starter: userId,
    trump: undefined,
    highestBet: {
      playerId: userId,
      value: 3,
      trump: false,
      timestamp: new Date()
    },
    players: {
      [userId]: {
        id: userId,
        name: "You",
        team: Team.A,
        seatPosition: 0,
        isReady: true
      },
      "player2": {
        id: "player2",
        name: "Player 2",
        team: Team.B,
        seatPosition: 1,
        isReady: true
      },
      "player3": {
        id: "player3",
        name: "Player 3",
        team: Team.A,
        seatPosition: 2,
        isReady: true
      },
      "player4": {
        id: "player4",
        name: "Player 4",
        team: Team.B,
        seatPosition: 3,
        isReady: true
      }
    },
    bets: {},
    playedCards: {},
    playerHands: {
      [userId]: [
        { id: "1", color: "red" as any, value: 5, playerId: userId, trickNumber: 0, playOrder: 0 },
        { id: "2", color: "blue" as any, value: 3, playerId: userId, trickNumber: 0, playOrder: 0 },
        { id: "3", color: "green" as any, value: 7, playerId: userId, trickNumber: 0, playOrder: 0 },
        { id: "4", color: "yellow" as any, value: 2, playerId: userId, trickNumber: 0, playOrder: 0 },
        { id: "5", color: "brown" as any, value: 0, playerId: userId, trickNumber: 0, playOrder: 0 },
      ]
    },
    wonTricks: {
      [userId]: 2,
      "player2": 1,
      "player3": 0,
      "player4": 1
    },
    scores: {
      [userId]: 5,
      "player2": 3,
      "player3": 5,
      "player4": 3
    },
    turnOrder: [userId, "player2", "player3", "player4"]
  }
}

export default async function RoomPage({ params }: RoomPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  const { id } = await params
  const room = await getRoomData(id)

  if (!room) {
    redirect("/dashboard")
  }

  // For testing, create a mock game state
  const mockGameState = createMockGameState(id, user.id)

  return (
    <div className="container mx-auto p-4 space-y-6">
      <GamePhases
        roomId={id}
        gameState={mockGameState}
        currentUserId={user.id}
      />
      <div className="mt-8 pt-8 border-t">
        <h2 className="text-lg font-semibold mb-4">Original Room Content (for reference):</h2>
        <RoomContent room={room} currentUser={user} />
      </div>
    </div>
  )
}


