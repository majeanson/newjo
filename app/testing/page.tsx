import { getCurrentTestUser, switchToTestUser } from "../actions/testing"
import { redirect } from "next/navigation"
import TestingDashboard from "./testing-dashboard"

export default async function TestingPage() {
  const currentUser = await getCurrentTestUser()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Multi-Tab Testing Dashboard
          </h1>
          <p className="text-gray-600">
            Test your card game with 4 different users in separate browser tabs
          </p>
        </div>

        <TestingDashboard currentUser={currentUser} />
      </div>
    </div>
  )
}
