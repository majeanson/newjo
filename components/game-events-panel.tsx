"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

import { clearOldGameEvents } from "@/app/actions/game-actions"
import { GameEvent } from "@/app/actions/game-actions"
import { Clock, Trash2, Activity, Users, Cards, Trophy } from "lucide-react"
// Simple time formatting function (replace with date-fns if available)
const formatDistanceToNow = (date: Date, options?: { addSuffix?: boolean }) => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return options?.addSuffix ? "just now" : "now"
  if (diffMinutes < 60) return options?.addSuffix ? `${diffMinutes} minutes ago` : `${diffMinutes}m`
  if (diffHours < 24) return options?.addSuffix ? `${diffHours} hours ago` : `${diffHours}h`
  return options?.addSuffix ? `${diffDays} days ago` : `${diffDays}d`
}

interface GameEventsPanelProps {
  roomId: string
  className?: string
}

export default function GameEventsPanel({ roomId, className = "" }: GameEventsPanelProps) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Listen to SSE events for real-time updates only
  useEffect(() => {
    let eventSource: EventSource | null = null

    try {
      eventSource = new EventSource(`/api/events/${roomId}`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "HEARTBEAT" || data.type === "CONNECTED") {
            return
          }

          // Add the event directly to our local state
          const gameEvent: GameEvent = {
            type: data.type,
            roomId,
            userId: data.playerId,
            data: data,
            timestamp: new Date()
          }

          setEvents(prev => [...prev, gameEvent])

          // Auto-scroll to bottom when new events arrive
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
          }, 100)
        } catch (error) {
          console.error("Error parsing SSE event:", error)
        }
      }
    } catch (error) {
      console.log("SSE not available for events panel")
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [roomId])



  const clearEvents = async () => {
    setIsClearing(true)
    try {
      const result = await clearOldGameEvents(roomId)
      if (result.success) {
        setEvents([])
      }
    } catch (error) {
      console.error("Failed to clear events:", error)
    } finally {
      setIsClearing(false)
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'team_selected':
      case 'player_joined':
      case 'player_left':
        return <Users className="h-4 w-4" />
      case 'bet_placed':
      case 'betting_complete':
      case 'betting_phase_started':
        return <Activity className="h-4 w-4" />
      case 'card_played':
      case 'trick_complete':
        return <Cards className="h-4 w-4" />
      case 'round_complete':
      case 'round_scoring_complete':
        return <Trophy className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'team_selected':
      case 'player_joined':
        return "bg-blue-50 border-blue-200"
      case 'bet_placed':
      case 'betting_complete':
        return "bg-green-50 border-green-200"
      case 'card_played':
      case 'trick_complete':
        return "bg-purple-50 border-purple-200"
      case 'round_complete':
      case 'round_scoring_complete':
        return "bg-yellow-50 border-yellow-200"
      case 'player_left':
        return "bg-red-50 border-red-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const formatEventMessage = (event: GameEvent) => {
    const playerName = event.data?.playerName || "Unknown Player"
    
    switch (event.type) {
      case 'team_selected':
        return `${playerName} selected team ${event.data?.team}`
      case 'betting_phase_started':
        return "Betting phase started - all teams are balanced!"
      case 'player_ready_changed':
        return `${playerName} is ${event.data?.ready ? 'ready' : 'not ready'}`
      case 'bet_placed':
        return `${playerName} placed bet: ${event.data?.betValue}${event.data?.trump ? ' (with trump)' : ''}`
      case 'betting_complete':
        return `All bets placed! Highest bet: ${event.data?.highestBet} by ${event.data?.highestBetter}`
      case 'card_played':
        return `${playerName} played ${event.data?.card}`
      case 'trick_complete':
        return `Trick won by ${event.data?.winnerName}`
      case 'round_complete':
        return `Round ${event.data?.round} completed`
      case 'round_scoring_complete':
        return `Round scoring complete - starting round ${event.data?.newRound}`
      case 'game_state_updated':
        return event.data?.message || "Game state updated"
      case 'player_joined':
        return `${playerName} joined the game`
      case 'player_left':
        return `${playerName} left the game`
      default:
        return `${event.type} event occurred`
    }
  }

  const EventList = ({ eventList, title }: { eventList: GameEvent[], title: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-gray-700">{title}</h4>
        <Badge variant="outline">{eventList.length} events</Badge>
      </div>
      
      <ScrollArea className="h-64" ref={scrollRef}>
        <div className="space-y-2 pr-4">
          {eventList.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No events yet</p>
            </div>
          ) : (
            eventList.map((event, index) => (
              <div
                key={`${event.timestamp.getTime()}-${index}`}
                className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatEventMessage(event)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Game Events
          </div>
          <Button
            onClick={clearEvents}
            disabled={isClearing}
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EventList eventList={events} title="Live Game Events" />
      </CardContent>
    </Card>
  )
}
