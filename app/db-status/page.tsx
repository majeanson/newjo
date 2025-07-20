import Link from "next/link"

export default async function DatabaseStatus() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Status</h1>

        {/* Preview Mode Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">🎮 Preview Mode Active</h2>
          <p className="text-blue-800 mb-4">
            {`You're viewing the app in preview mode with mock data. All features are functional for demonstration.`}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-blue-700">✅ Mock user authentication</p>
              <p className="text-blue-700">✅ Sample rooms and players</p>
            </div>
            <div className="space-y-2">
              <p className="text-blue-700">✅ Simulated card game mechanics</p>
              <p className="text-blue-700">✅ Real-time event simulation</p>
            </div>
          </div>
        </div>

        {/* Mock Database Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Mock Database Status</h2>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-green-700">Mock Database Connected</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium">Mock Tables</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>✅ users (3 sample users)</p>
                <p>✅ rooms (2 sample rooms)</p>
                <p>✅ room_members (mock memberships)</p>
                <p>✅ played_cards (sample card plays)</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Mock Data</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>👤 Alice, Bob, Charlie (users)</p>
                <p>🏠 Poker Night, Quick Game (rooms)</p>
                <p>🃏 Full deck simulation</p>
                <p>⚡ Real-time event simulation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Available */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Available Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Authentication</h3>
              <p className="text-sm text-gray-600 mb-2">Simple name-based sign-in system</p>
              <div className="text-xs text-green-600">✅ Fully functional</div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Room Management</h3>
              <p className="text-sm text-gray-600 mb-2">Create and join game rooms</p>
              <div className="text-xs text-green-600">✅ Mock implementation</div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Card Game Mechanics</h3>
              <p className="text-sm text-gray-600 mb-2">Draw cards (host) and play cards (all players)</p>
              <div className="text-xs text-green-600">✅ Simulated with random cards</div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Real-time Updates</h3>
              <p className="text-sm text-gray-600 mb-2">Live multiplayer events via Server-Sent Events</p>
              <div className="text-xs text-green-600">✅ Demo events every few seconds</div>
            </div>
          </div>
        </div>

        {/* Try It Out */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">🚀 Try the Demo!</h3>
          <p className="text-green-700 mb-4">Experience the full multiplayer card game:</p>
          <div className="space-y-2">
            <p className="text-green-700">
              1.{" "}
              <Link href="/" className="underline font-medium">
                Sign in
              </Link>{" "}
              with any name (e.g., &quot;Player1&quot;)
            </p>
            <p className="text-green-700">2. View the dashboard with sample rooms</p>
            <p className="text-green-700">3. Join &quot;Poker Night&quot; to see the game interface</p>
            <p className="text-green-700">4. Test card drawing and playing features</p>
            <p className="text-green-700">5. Watch for real-time event notifications</p>
          </div>

          <div className="mt-4 p-3 bg-green-100 rounded">
            <p className="text-green-800 text-sm">
              <strong>Tip:</strong> Open multiple browser tabs and sign in with different names to simulate multiplayer
              gameplay!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}