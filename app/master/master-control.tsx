"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useGameEvents } from "@/hooks/use-game-events"
import { Crown, Users, Eye, Text } from "lucide-react"

type User = {
  id: string
  name: string
}

type ActiveSession = {
  roomId: string
  roomName: string
  players: Array<{ id: string; name: string }>
  recentActivity: Array<{ type: string; player: string; action: string; timestamp: Date }>
}

interface MasterControlProps {
  user: User
}

export default function MasterControl({ user }: MasterControlProps) {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const { events } = useGameEvents(selectedRoom || "")

  // Mock data for demonstration
  useEffect(() => {
    const mockSessions: ActiveSession[] = [
      {
        roomId: "room1",
        roomName: "Test Game 1",
        players: [
          { id: "p1", name: "Alice" },
          { id: "p2", name: "Bob" },
          { id: "p3", name: "Charlie" },
          { id: "p4", name: "Diana" }
        ],
        recentActivity: [
          { type: "CARD_DRAWN", player: "Alice", action: "Drew K♥", timestamp: new Date() },
          { type: "CARD_PLAYED", player: "Bob", action: "Played Q♦", timestamp: new Date() }
        ]
      },
      {
        roomId: "room2",
        roomName: "Test Game 2",
        players: [
          { id: "p5", name: "Eve" },
          { id: "p6", name: "Frank" }
        ],
        recentActivity: [
          { type: "PLAYER_JOINED", player: "Frank", action: "Joined room", timestamp: new Date() }
        ]
      }
    ]
    setActiveSessions(mockSessions)
  }, [])

  const forceAction = async (roomId: string, action: string, playerId?: string) => {
    try {
      const response = await fetch('/api/master/force-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, action, playerId, masterId: user.id })
      })
      
      if (response.ok) {
        console.log(`Master forced action: ${action} in room ${roomId}`)
      }
    } catch (error) {
      console.error('Failed to force action:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Crown className="w-8 h-8 mr-3 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">Master Control Panel</h1>
            <p className="text-gray-600">Monitor and control all active game sessions</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Sessions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Active Sessions ({activeSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.roomId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{session.roomName}</h3>
                        <p className="text-sm text-gray-500">{session.players.length} players</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedRoom(session.roomId)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Monitor
                        </Button>
                       <Text className="w-4 h-4 mr-1">
                          `${window.location.origin}/room/${session.roomId}`
                        </Text>
                      </div>
                    </div>

                    {/* Players */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {session.players.map((player) => (
                        <Badge key={player.id} variant="secondary">
                          {player.name}
                        </Badge>
                      ))}
                    </div>

                    {/* Master Controls */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => forceAction(session.roomId, 'FORCE_DRAW')}
                      >
                        Force Draw
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => forceAction(session.roomId, 'RESET_GAME')}
                      >
                        Reset Game
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => forceAction(session.roomId, 'SHUFFLE_DECK')}
                      >
                        Shuffle Deck
                      </Button>
                    </div>

                    {/* Recent Activity */}
                    <div className="text-sm">
                      <p className="font-medium mb-1">Recent Activity:</p>
                      {session.recentActivity.slice(0, 3).map((activity, idx) => (
                        <p key={idx} className="text-gray-600">
                          {activity.player}: {activity.action}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Live Monitor */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Live Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedRoom ? (
                  <div className="space-y-3">
                    <p className="font-medium">Monitoring: {selectedRoom}</p>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {events.map((event, idx) => (
                        <div key={idx} className="p-2 bg-gray-100 rounded text-sm">
                          <p className="font-medium">{event.type}</p>
                          {event.type === 'CARD_DRAWN' && (
                            <p>Card: {event.card}</p>
                          )}
                          {event.type === 'CARD_PLAYED' && (
                            <p>{event.playerName} played {event.card}</p>
                          )}
                          {event.type === 'PLAYER_JOINED' && (
                            <p>{event.playerName} joined</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Select a session to monitor</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
