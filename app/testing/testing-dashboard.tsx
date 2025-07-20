"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Plus, ExternalLink, Copy, Check } from "lucide-react"
import UserSwitcher from "../components/user-switcher"
import { switchToTestUser, autoJoinRoom, createTestRoom } from "../actions/testing"
import Link from "next/link"

interface TestingDashboardProps {
  currentUser?: { id: string; name: string } | null
}

export default function TestingDashboard({ currentUser }: TestingDashboardProps) {
  const [roomName, setRoomName] = useState("Test Room")
  const [testRoomId, setTestRoomId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleUserSwitch = async (userId: string, userName: string) => {
    const result = await switchToTestUser(userId, userName)
    if (result.success) {
      // Store the selected user in localStorage for persistence
      localStorage.setItem('selectedTestUser', JSON.stringify({ id: userId, name: userName }))
      window.location.reload()
    }
  }

  const handleCreateTestRoom = async () => {
    if (!currentUser || isCreating) return

    setIsCreating(true)
    try {
      const result = await createTestRoom(roomName)
      if (result.success && result.room) {
        setTestRoomId(result.room.id)
      } else {
        console.error("Failed to create room:", result.error)
      }
    } catch (error) {
      console.error("Failed to create test room:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleAutoJoinRoom = async () => {
    if (!testRoomId || isJoining) return
    
    setIsJoining(true)
    try {
      await autoJoinRoom(testRoomId)
      // Redirect to room
      window.location.href = `/room/${testRoomId}`
    } catch (error) {
      console.error("Failed to auto-join room:", error)
    } finally {
      setIsJoining(false)
    }
  }

  const copyRoomUrl = async () => {
    if (!testRoomId) return
    
    const url = `${window.location.origin}/room/${testRoomId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const testUsers = [
    { id: "test-player1", name: "Alice", color: "bg-red-100 text-red-800" },
    { id: "test-player2", name: "Bob", color: "bg-blue-100 text-blue-800" },
    { id: "test-player3", name: "Charlie", color: "bg-green-100 text-green-800" },
    { id: "test-player4", name: "Diana", color: "bg-purple-100 text-purple-800" }
  ]

  return (
    <div className="space-y-6">
      {/* User Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <UserSwitcher 
            currentUser={currentUser}
            onUserSwitch={handleUserSwitch}
          />
        </div>

        {/* Test Room Creation */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Test Room
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name..."
                />
              </div>

              <Button 
                onClick={handleCreateTestRoom}
                disabled={!currentUser || isCreating || !roomName.trim()}
                className="w-full"
              >
                {isCreating ? "Creating..." : "Create Test Room"}
              </Button>

              {testRoomId && (
                <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Room Created!</Badge>
                    <span className="text-sm text-green-700">ID: {testRoomId}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAutoJoinRoom}
                      disabled={isJoining}
                      size="sm"
                      className="flex-1"
                    >
                      {isJoining ? "Joining..." : "Join Room"}
                    </Button>
                    
                    <Button 
                      onClick={copyRoomUrl}
                      variant="outline"
                      size="sm"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Multi-Tab Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Multi-Tab Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Setup (Do this once):</h3>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  <span>Create a test room using the form above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  <span>Copy the room URL</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  <span>Open 4 browser tabs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                  <span>Navigate each tab to <code className="bg-gray-100 px-1 rounded">/testing</code></span>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-3">For Each Tab:</h3>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  <span>Switch to a different test user (Alice, Bob, Charlie, Diana)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  <span>Paste the room URL and join the room</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  <span>Once all 4 players join, start the game!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                  <span>Test team selection, betting, card playing across tabs</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Test Users Reference */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">Test Users Reference:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {testUsers.map((user) => (
                <div key={user.id} className={`p-2 rounded text-center text-sm ${user.color}`}>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs opacity-75">{user.id}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>🔗 Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/testing">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Testing Page
              </Button>
            </Link>
            {testRoomId && (
              <Link href={`/room/${testRoomId}`}>
                <Button variant="default" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Room
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
