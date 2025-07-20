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

  return <RoomContent room={room} currentUser={user} />
}


