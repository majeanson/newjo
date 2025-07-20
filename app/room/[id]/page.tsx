import { getCurrentUser } from "../../actions/auth"
import { redirect } from "next/navigation"
import { getRoomData } from "../../actions/game"
import RoomContent from "./room-content"

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <RoomContent room={room} currentUser={user} />
    </div>
  )
}


