import { getCurrentUser } from "../actions/auth"
import { getRooms } from "../actions/rooms"
import { redirect } from "next/navigation"
import DashboardContent from "./dashboard-content"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/")
  }

  const rooms = await getRooms()

  return <DashboardContent user={user} rooms={rooms} />
}

