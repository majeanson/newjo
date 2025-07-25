"use client"

import { useActionState } from "react"
import { createRoom, joinRoom } from "../actions/rooms"
import { signOut } from "../actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Plus, LogOut, Gamepad2, Sparkles } from "lucide-react"
import Link from "next/link"
import Navigation, { BottomNavigation } from "@/components/navigation"

type User = {
  id: string
  name: string
}

type Room = {
  id: string
  name: string
  host: User
  _count?: { members: number }
  createdAt: Date
}

interface DashboardContentProps {
  user: User
  rooms: Room[]
}

export default function DashboardContent({ user, rooms }: DashboardContentProps) {
  const [createState, createAction, isCreating] = useActionState(createRoom, null)
  const [joinState, joinAction, isJoining] = useActionState(joinRoom, null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-100">
      {/* Navigation */}
      <Navigation
        title="🎮 Dashboard"
        showBack={true}
        backUrl="/"
      />

      <div className="px-4 py-6 pb-20 md:pb-6 max-w-4xl mx-auto">{/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gamepad2 className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
            <Sparkles className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-gray-600">Manage your game rooms and join new games</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/testing">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 bg-blue-50/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🧪</div>
                <h3 className="font-semibold text-blue-900">Simulator</h3>
                <p className="text-xs text-blue-700">Test with bots</p>
              </CardContent>
            </Card>
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => signOut()}
            className="h-auto p-4 flex flex-col items-center gap-2 border-0 bg-red-50/80 backdrop-blur hover:bg-red-100"
          >
            <LogOut className="w-6 h-6 text-red-600" />
            <span className="text-red-900 font-semibold">Sign Out</span>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Room */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="text-2xl">➕</div>
                <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  Create New Room
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createAction} className="space-y-4">
                <Input
                  name="roomName"
                  placeholder="My Awesome Game Room ✨"
                  required
                  disabled={isCreating}
                  className="h-12 text-lg border-2 border-green-200 focus:border-green-400 rounded-xl"
                />
                {createState?.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-500 text-sm">{createState.error}</p>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl shadow-lg"
                >
                  {isCreating ? "🔄 Creating..." : "🚀 Create Room"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Available Rooms */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="text-2xl">🎮</div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Available Rooms ({rooms.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {rooms.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎯</div>
                    <p className="text-gray-500">No active rooms</p>
                    <p className="text-sm text-gray-400 mt-1">Create one to get started!</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 border-2 border-purple-200 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 shadow-sm">
                      <div>
                        <h3 className="font-semibold text-gray-900">{room.name}</h3>
                        <p className="text-sm text-gray-600">
                          🎮 Host: {room.host.name} • 👥 {room._count?.members || 0} players
                        </p>
                      </div>
                      <form action={joinAction}>
                        <input type="hidden" name="roomId" value={room.id} />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isJoining}
                          className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2"
                        >
                          {isJoining ? "🔄 Joining..." : "🚀 Join"}
                        </Button>
                      </form>
                    </div>
                  ))
                )}
              </div>
              {joinState?.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                  <p className="text-red-500 text-sm">{joinState.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  )
}

