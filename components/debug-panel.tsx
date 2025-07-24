/**
 * Debug Panel Component
 * 
 * Real-time debug panel for monitoring SSE events, game state, and system performance.
 * Only visible in development mode or when explicitly enabled.
 * 
 * @see docs/COMPONENT_DOCUMENTATION.md for complete documentation
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { GameState } from '@/lib/game-types'
import { GameEvent } from '@/lib/events'

interface DebugPanelProps {
  gameState: GameState | null
  events: GameEvent[]
  sseStatus: {
    isConnected: boolean
    connectionCount: number
    lastHeartbeat?: Date
    reconnectAttempts: number
  }
  isVisible?: boolean
  onToggle?: () => void
}

interface PerformanceMetrics {
  eventCount: number
  averageEventInterval: number
  lastEventTime?: Date
  connectionUptime: number
}

export function DebugPanel({ 
  gameState, 
  events, 
  sseStatus, 
  isVisible = false, 
  onToggle 
}: DebugPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'state' | 'events' | 'performance' | 'network'>('state')
  const [eventFilter, setEventFilter] = useState<string>('')
  const [autoScroll, setAutoScroll] = useState(true)

  // Calculate performance metrics
  const performanceMetrics = useMemo((): PerformanceMetrics => {
    const now = Date.now()
    const recentEvents = events.slice(-10)
    
    let totalInterval = 0
    for (let i = 1; i < recentEvents.length; i++) {
      const prev = new Date(recentEvents[i - 1].timestamp || 0).getTime()
      const curr = new Date(recentEvents[i].timestamp || 0).getTime()
      totalInterval += curr - prev
    }

    return {
      eventCount: events.length,
      averageEventInterval: recentEvents.length > 1 ? totalInterval / (recentEvents.length - 1) : 0,
      lastEventTime: events.length > 0 ? new Date(events[events.length - 1].timestamp || 0) : undefined,
      connectionUptime: sseStatus.lastHeartbeat ? now - sseStatus.lastHeartbeat.getTime() : 0
    }
  }, [events, sseStatus])

  // Filter events based on search
  const filteredEvents = useMemo(() => {
    if (!eventFilter) return events
    return events.filter(event => 
      event.type.toLowerCase().includes(eventFilter.toLowerCase()) ||
      (event.userId && event.userId.includes(eventFilter)) ||
      (event.roomId && event.roomId.includes(eventFilter))
    )
  }, [events, eventFilter])

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="Open Debug Panel"
      >
        🐛
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-white border-2 border-gray-300 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-2 flex justify-between items-center">
        <h3 className="font-bold">Debug Panel</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sseStatus.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <button
            onClick={onToggle}
            className="text-white hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(['state', 'events', 'performance', 'network'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-3 py-1 text-sm capitalize ${
              selectedTab === tab 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2 text-xs">
        {selectedTab === 'state' && (
          <GameStateTab gameState={gameState} />
        )}
        
        {selectedTab === 'events' && (
          <EventsTab 
            events={filteredEvents}
            eventFilter={eventFilter}
            setEventFilter={setEventFilter}
            autoScroll={autoScroll}
            setAutoScroll={setAutoScroll}
          />
        )}
        
        {selectedTab === 'performance' && (
          <PerformanceTab metrics={performanceMetrics} />
        )}
        
        {selectedTab === 'network' && (
          <NetworkTab sseStatus={sseStatus} />
        )}
      </div>
    </div>
  )
}

function GameStateTab({ gameState }: { gameState: GameState | null }) {
  if (!gameState) {
    return <div className="text-gray-500">No game state available</div>
  }

  return (
    <div className="space-y-2">
      <div><strong>Phase:</strong> {gameState.phase}</div>
      <div><strong>Round:</strong> {gameState.round}</div>
      <div><strong>Current Turn:</strong> {gameState.currentTurn}</div>
      <div><strong>Players:</strong> {Object.keys(gameState.players).length}</div>
      <div><strong>Bets:</strong> {Object.keys(gameState.bets).length}</div>
      <div><strong>Played Cards:</strong> {Object.keys(gameState.playedCards).length}</div>
      
      <details className="mt-2">
        <summary className="cursor-pointer font-semibold">Full State</summary>
        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
          {JSON.stringify(gameState, null, 2)}
        </pre>
      </details>
    </div>
  )
}

function EventsTab({ 
  events, 
  eventFilter, 
  setEventFilter, 
  autoScroll, 
  setAutoScroll 
}: {
  events: GameEvent[]
  eventFilter: string
  setEventFilter: (filter: string) => void
  autoScroll: boolean
  setAutoScroll: (autoScroll: boolean) => void
}) {
  const eventsEndRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events, autoScroll])

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Filter events..."
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="flex-1 px-2 py-1 border rounded text-xs"
        />
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>
      </div>
      
      <div className="space-y-1 max-h-64 overflow-auto">
        {events.slice(-50).map((event, index) => (
          <div key={index} className="p-1 bg-gray-50 rounded border-l-2 border-blue-300">
            <div className="flex justify-between items-start">
              <span className="font-semibold text-blue-600">{event.type}</span>
              <span className="text-gray-500 text-xs">
                {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'No timestamp'}
              </span>
            </div>
            {event.userId && (
              <div className="text-gray-600">User: {event.userId.slice(-8)}</div>
            )}
            {event.data && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs">Data</summary>
                <pre className="mt-1 p-1 bg-white rounded text-xs overflow-auto max-h-20">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
        <div ref={eventsEndRef} />
      </div>
    </div>
  )
}

function PerformanceTab({ metrics }: { metrics: PerformanceMetrics }) {
  return (
    <div className="space-y-2">
      <div><strong>Total Events:</strong> {metrics.eventCount}</div>
      <div><strong>Avg Event Interval:</strong> {metrics.averageEventInterval.toFixed(0)}ms</div>
      <div><strong>Last Event:</strong> {
        metrics.lastEventTime 
          ? metrics.lastEventTime.toLocaleTimeString() 
          : 'None'
      }</div>
      <div><strong>Connection Uptime:</strong> {(metrics.connectionUptime / 1000).toFixed(0)}s</div>
      
      <div className="mt-4">
        <strong>Memory Usage:</strong>
        <div className="text-xs text-gray-600">
          {typeof window !== 'undefined' && (window.performance as any).memory ? (
            <div>
              <div>Used: {((window.performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
              <div>Total: {((window.performance as any).memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
            </div>
          ) : (
            'Not available'
          )}
        </div>
      </div>
    </div>
  )
}

function NetworkTab({ sseStatus }: { 
  sseStatus: {
    isConnected: boolean
    connectionCount: number
    lastHeartbeat?: Date
    reconnectAttempts: number
  }
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <strong>Status:</strong>
        <span className={`px-2 py-1 rounded text-xs ${
          sseStatus.isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {sseStatus.isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div><strong>Connection Count:</strong> {sseStatus.connectionCount}</div>
      <div><strong>Reconnect Attempts:</strong> {sseStatus.reconnectAttempts}</div>
      <div><strong>Last Heartbeat:</strong> {
        sseStatus.lastHeartbeat 
          ? sseStatus.lastHeartbeat.toLocaleTimeString() 
          : 'None'
      }</div>
      
      <div className="mt-4">
        <strong>Connection Quality:</strong>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div 
            className={`h-2 rounded-full ${
              sseStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: sseStatus.isConnected ? '100%' : '0%' }}
          />
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-600">
        <div>Navigator: {navigator.userAgent.split(' ')[0]}</div>
        <div>Online: {navigator.onLine ? 'Yes' : 'No'}</div>
        <div>Connection: {(navigator as any).connection?.effectiveType || 'Unknown'}</div>
      </div>
    </div>
  )
}
