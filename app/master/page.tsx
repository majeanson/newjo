import { getCurrentUser } from "../actions/auth"
import { redirect } from "next/navigation"
import MasterControl from "./master-control"

export default async function MasterPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/")
  }

  return <MasterControl user={user} />
}