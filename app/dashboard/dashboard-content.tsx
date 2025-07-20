"use client"

import { useActionState } from "react"
import { createRoom, joinRoom } from "../actions/rooms"
import { signOut } from "../actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Users, Plus, LogOut, Home, TestTube, Monitor } from "lucide-react"
import Link from "next/link"

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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">
                  <Home className="w-4 h-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}!</h1>
            <p className="text-gray-600">Create a room or join an existing one</p>
          </div>
          <div className="flex gap-2">
            <Link href="/simulator">
              <Button variant="default">
                <Monitor className="w-4 h-4 mr-2" />
                Game Simulator
              </Button>
            </Link>
            <Link href="/testing">
              <Button variant="outline">
                <TestTube className="w-4 h-4 mr-2" />
                Multi-Tab Testing
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Create New Room
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createAction} className="space-y-4">
                <Input name="roomName" placeholder="Enter room name" required disabled={isCreating} />
                {createState?.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-500 text-sm">{createState.error}</p>
                  </div>
                )}
                <Button type="submit" disabled={isCreating} className="w-full">
                  {isCreating ? "Creating..." : "Create Room"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Available Rooms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Available Rooms ({rooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {rooms.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No active rooms</p>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{room.name}</h3>
                        <p className="text-sm text-gray-500">
                          Host: {room.host.name} • {room._count.members} members
                        </p>
                      </div>
                      <form action={joinAction}>
                        <input type="hidden" name="roomId" value={room.id} />
                        <Button type="submit" size="sm" disabled={isJoining}>
                          {isJoining ? "Joining..." : "Join"}
                        </Button>
                      </form>
                    </div>
                  ))
                )}
              </div>
              {joinState?.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-4">
                  <p className="text-red-500 text-sm">{joinState.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

