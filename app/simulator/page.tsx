import GameSimulator from "../testing/game-simulator"

export default function SimulatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎮 4-Player Game Simulator
          </h1>
          <p className="text-gray-600">
            Test your complete card game with all 4 players in a single screen
          </p>
        </div>

        <GameSimulator />
      </div>
    </div>
  )
}
