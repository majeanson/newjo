import GameSimulator from "./game-simulator"
import Navigation, { BottomNavigation } from "@/components/navigation"

export default function TestingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Navigation */}
      <Navigation
        title="🧪 Game Simulator"
        showBack={true}
        backUrl="/"
      />

      <div className="px-4 py-6 pb-20 md:pb-6 max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-3">🎮</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Game Simulator
          </h1>
          <p className="text-gray-600">
            Test game mechanics with dummy players
          </p>
        </div>

        <GameSimulator />
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  )
}
