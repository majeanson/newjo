import { getCurrentUser } from "../../actions/auth"
import { redirect } from "next/navigation"
import { getRoomData } from "../../actions/game"
import { getRoomGameState } from "../../actions/game-actions"
import RoomContent from "./room-content"
import GameWrapper from "./game-wrapper"
interface RoomPageProps {
  params: Promise<{ id: string }>
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

  // Get real game state from database
  const gameState = await getRoomGameState(id)

  return (
    <div className="container mx-auto p-4 space-y-6">
      <GameWrapper
        roomId={id}
        currentUserId={user.id}
        initialGameState={gameState}
        playerCount={room.members.length}
      />

      {/* Only show room management if no game is active */}
      {!gameState && (
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-lg font-semibold mb-4">Room Management:</h2>
          <RoomContent room={room} currentUser={user} />
        </div>
      )}
    </div>
  )
}


