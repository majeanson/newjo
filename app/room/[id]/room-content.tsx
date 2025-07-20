"use client"

import { useActionState, useEffect, useState } from "react"
import { drawCardAction } from "../../actions/game"
import { useGameEvents } from "@/hooks/use-game-events"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Users, Shuffle, ArrowLeft, Wifi, WifiOff, Home } from "lucide-react"
import Link from "next/link"

type User = {
  id: string
  name: string
}

type RoomMember = {
  user: User
}

type PlayedCard = {
  id: string
  card: string
  playedAt: Date
  user: User
}

type Room = {
  id: string
  name: string
  hostId: string
  host: User
  members: RoomMember[]
}

interface RoomContentProps {
  room: Room
  currentUser: User
}

export default function RoomContent({ room: initialRoom, currentUser }: RoomContentProps) {
  const [drawState, drawAction, isDrawing] = useActionState(drawCardAction, null)
  const [cardToPlay, setCardToPlay] = useState("")
  const [lastDrawnCard, setLastDrawnCard] = useState<string | null>(null)
  const [deckCount, setDeckCount] = useState(32) // Default deck size
  const [recentPlays, setRecentPlays] = useState<
    Array<{ card: string; playerName: string; playerId: string; timestamp: Date }>
  >([])

  const { events, isConnected } = useGameEvents(initialRoom.id)
  const isHost = initialRoom.hostId === currentUser.id

  // Handle real-time events
  useEffect(() => {
    events.forEach((event) => {
      switch (event.type) {
        case "CARD_DRAWN":
          setLastDrawnCard(event.card)
          setDeckCount(event.remainingCards)
          break

        case "CARD_PLAYED":
          setRecentPlays((prev) => [
            {
              card: event.card,
              playerName: event.playerName,
              playerId: event.playerId,
              timestamp: new Date(),
            },
            ...prev.slice(0, 9),
          ])
          break

        case "PLAYER_JOINED":
          // Handle player joined
          break

        case "PLAYER_LEFT":
          // Handle player left
          break
      }
    })
  }, [events])

  useEffect(() => {
    if (drawState?.success && drawState.card) {
      setLastDrawnCard(drawState.card)
    }
  }, [drawState])

  const handlePlayCard = async () => {
    if (!cardToPlay.trim()) return

    // TODO: Implement with new game actions
    console.log("Playing card:", cardToPlay.trim())
    setCardToPlay("")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-4">
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
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{initialRoom.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{initialRoom.name}</h1>
              <p className="text-gray-600">Host: {initialRoom.host.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center">
              {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant="secondary">
              <Users className="w-4 h-4 mr-1" />
              {initialRoom.members.length} members
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Game Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Host Controls */}
            {isHost && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shuffle className="w-5 h-5 mr-2" />
                    Host Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <form action={drawAction} className="flex-1">
                      <input type="hidden" name="roomId" value={initialRoom.id} />
                      <Button type="submit" disabled={isDrawing || deckCount === 0}>
                        {isDrawing ? "Drawing..." : `Draw Card (${deckCount} left)`}
                      </Button>
                    </form>
                  </div>

                  {lastDrawnCard && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 mb-2">Last drawn card:</p>
                      <div className="text-2xl font-bold text-center p-4 bg-white rounded border-2 border-blue-200">
                        {lastDrawnCard}
                      </div>
                    </div>
                  )}

                  {drawState?.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-500 text-sm">{drawState.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Play Card */}
            <Card>
              <CardHeader>
                <CardTitle>Play a Card</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    value={cardToPlay}
                    onChange={(e) => setCardToPlay(e.target.value)}
                    placeholder="Enter card (e.g., A♠, K♥, 10♦)"
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handlePlayCard()}
                  />
                  <Button onClick={handlePlayCard} disabled={!cardToPlay.trim()}>
                    Play Card
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Format: Value + Suit (A♠, 2♥, 10♦, J♣, Q♠, K♥)</p>
              </CardContent>
            </Card>

            {/* Recent Plays */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Recent Plays
                  <Badge variant="outline" className="text-xs">
                    Live Updates {isConnected ? "🟢" : "🔴"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentPlays.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No cards played yet</p>
                  ) : (
                    recentPlays.map((play, index) => (
                      <div
                        key={`${play.playerId}-${play.timestamp.getTime()}-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-in slide-in-from-top-2 duration-300"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-xl font-bold">{play.card}</div>
                          <div>
                            <p className="font-medium">{play.playerName}</p>
                            <p className="text-xs text-gray-500">{play.timestamp.toLocaleTimeString()}</p>
                          </div>
                        </div>
                        {play.playerId === currentUser.id && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Room Members */}
          <Card>
            <CardHeader>
              <CardTitle>Room Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {initialRoom.members.map((member) => (
                  <div key={member.user.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="font-medium">{member.user.name}</span>
                    <div className="flex items-center space-x-2">
                      {member.user.id === initialRoom.hostId && (
                        <Badge variant="secondary" className="text-xs">
                          Host
                        </Badge>
                      )}
                      {member.user.id === currentUser.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}




