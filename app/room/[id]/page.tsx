import { getCurrentUser } from "../../actions/auth"
import { redirect } from "next/navigation"
import { getRoomData } from "../../actions/game"
import { getRoomGameState } from "../../actions/game-actions"

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
    </div>
  )
}


