"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

import { clearOldGameEvents } from "@/app/actions/game-actions"

// Use a flexible event interface for the UI
interface GameEvent {
  type: string
  roomId: string
  userId?: string
  data?: any
  timestamp: Date
}
import { Clock, Trash2, Activity, Users, Trophy, AlarmClockCheck, RotateCcw } from "lucide-react"
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
  events?: GameEvent[] // Optional events prop to avoid duplicate SSE connections
}

export default function GameEventsPanel({ roomId, className = "", events: externalEvents }: GameEventsPanelProps) {
  const [localEvents, setLocalEvents] = useState<GameEvent[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Use external events if provided, otherwise use local events from SSE
  const events = externalEvents || localEvents

  // Only create SSE connection if no external events are provided
  useEffect(() => {
    if (externalEvents) {
      console.log('🎮 GameEventsPanel: Using external events, skipping SSE connection')
      return // Don't create SSE connection if events are provided externally
    }

    let eventSource: EventSource | null = null

    try {
      console.log('🔌 GameEventsPanel: Creating SSE connection for room:', roomId)
      eventSource = new EventSource(`/api/game-events/${roomId}`)

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

          setLocalEvents(prev => [...prev, gameEvent])

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
        console.log('🔌 GameEventsPanel: Closing SSE connection')
        eventSource.close()
      }
    }
  }, [roomId, externalEvents])



  const clearEvents = async () => {
    setIsClearing(true)
    try {
      const result = await clearOldGameEvents(roomId)
      if (result.success) {
        // Only clear local events if we're managing them
        if (!externalEvents) {
          setLocalEvents([])
        }
      }
    } catch (error) {
      console.error("Failed to clear events:", error)
    } finally {
      setIsClearing(false)
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'TEAM_SELECTED':
      case 'PLAYER_JOINED':
      case 'PLAYER_LEFT':
      case 'PLAYER_READY_CHANGED':
      case 'TEAM_SELECTED':
        return <Users className="h-4 w-4" />
      case 'BET_PLACED':
      case 'BETTING_COMPLETE':
      case 'BETTING_PHASE_STARTED':
        return <Activity className="h-4 w-4" />
      case 'CARDS_CHANGED':
      case 'TRICK_COMPLETE':
      case 'TRICK_CHANGED':
        return <AlarmClockCheck className="h-4 w-4" />
      case 'ROUND_COMPLETE':
      case 'ROUND_CHANGED':
      case 'ROUND_SCORING_COMPLETE':
        return <Trophy className="h-4 w-4" />
      case 'GAME_RESET':
        return <RotateCcw className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'TEAM_SELECTED':
      case 'TEAMS_CHANGED':
      case 'PLAYER_JOINED':
      case 'BETTING_PHASE_STARTED':
        return "bg-blue-50 border-blue-200"
      case 'BET_PLACED':
      case 'BETS_CHANGED':
      case 'BETTING_COMPLETE':
        return "bg-green-50 border-green-200"
      case 'CARDS_CHANGED':
      case 'TRICK_COMPLETE':
      case 'TRICK_CHANGED':
        return "bg-purple-50 border-purple-200"
      case 'ROUND_COMPLETE':
      case 'ROUND_CHANGED':
      case 'ROUND_SCORING_COMPLETE':
        return "bg-yellow-50 border-yellow-200"
      case 'GAME_RESET':
        return "bg-red-50 border-red-200"
      case 'PLAYER_LEFT':
        return "bg-red-50 border-red-200"
      case 'PLAYER_READY_CHANGED':
        return "bg-orange-50 border-orange-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const formatEventMessage = (event: GameEvent) => {
    const playerName = event.data?.playerName || "Unknown Player"

    switch (event.type) {
      case 'TEAM_SELECTED':
        if (event.data?.autoAssigned) {
          return `🎯 Teams auto-assigned! ${event.data?.seatPattern || 'A1, B2, A3, B4'}`
        } else if (event.data?.teamsBalanced) {
          return `✅ ${playerName} joined Team ${event.data?.team} - Teams complete!`
        } else {
          return `👥 ${playerName} joined Team ${event.data?.team}`
        }
      case 'TEAMS_CHANGED':
        if (event.data?.autoAssigned) {
          return `🎯 Teams auto-assigned! ${event.data?.seatPattern || 'A1, B2, A3, B4'}`
        } else if (event.data?.teamsBalanced) {
          return `✅ ${playerName} joined Team ${event.data?.team} - Teams complete!`
        } else {
          return `👥 ${playerName} joined Team ${event.data?.team}`
        }
      case 'BETTING_PHASE_STARTED':
        return "Betting phase started - all teams are balanced!"
      case 'PLAYER_READY_CHANGED':
        return `${playerName} is ${event.data?.ready ? 'ready' : 'not ready'}`
      case 'BET_PLACED':
        const betDisplay = event.data?.betValue === 'SKIP' ? 'Skip' : `${event.data?.betValue} tricks`
        const trumpDisplay = event.data?.trump ? ' (Trump)' : (event.data?.trump === false ? ' (No Trump)' : '')
        return `🎯 ${playerName} bet: ${betDisplay}${trumpDisplay}`
      case 'BETS_CHANGED':
        return `🎯 ${playerName} placed a bet`
      case 'BETTING_COMPLETE':
        return `🎲 All bets placed! Highest: ${event.data?.highestBet} tricks. Cards phase starting...`
      case 'CARDS_CHANGED':
        return `🃏 ${playerName} played ${event.data?.card}`
      case 'TRICK_COMPLETE':
        return `Trick won by ${event.data?.winnerName}`
      case 'TRICK_CHANGED':
        return `🏆 ${event.data?.winnerName} won the trick`
      case 'ROUND_CHANGED':
        return `🎮 Round ${event.data?.completedRound} complete! Starting round ${event.data?.round}`
      case 'ROUND_COMPLETE':
        return `Round ${event.data?.round} completed`
      case 'ROUND_SCORING_COMPLETE':
        return `Round scoring complete - starting round ${event.data?.newRound}`
      case 'GAME_RESET':
        return `🔄 GAME RESET! ${event.data?.message || 'Game has been reset to initial state.'}`
      case 'GAME_STATE_UPDATED':
        if (event.data?.reset) {
          return `🔄 Game reset! ${event.data?.message || 'Back to initial state.'}`
        }
        return event.data?.message || "Game state updated"
      case 'PLAYER_JOINED':
        return `${playerName} joined the game`
      case 'PLAYER_LEFT':
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
