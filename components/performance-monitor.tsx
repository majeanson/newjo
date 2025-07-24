/**
 * Performance Monitor Component
 * 
 * Real-time performance monitoring dashboard for the game system.
 * Tracks SSE connections, database performance, and system health.
 * 
 * @see docs/COMPONENT_DOCUMENTATION.md for complete documentation
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { GameEvent } from '@/lib/events'

interface PerformanceMetrics {
  sseConnections: number
  activeRooms: number
  totalEvents: number
  averageEventLatency: number
  memoryUsage?: {
    used: number
    total: number
    limit: number
  }
  networkStats: {
    bytesReceived: number
    bytesSent: number
    connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
  }
  systemHealth: {
    cpu: number
    memory: number
    database: 'healthy' | 'degraded' | 'error'
    uptime: number
  }
}

interface PerformanceMonitorProps {
  events: GameEvent[]
  isVisible?: boolean
  onToggle?: () => void
  refreshInterval?: number
}

export function PerformanceMonitor({ 
  events, 
  isVisible = false, 
  onToggle,
  refreshInterval = 5000 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    sseConnections: 0,
    activeRooms: 0,
    totalEvents: 0,
    averageEventLatency: 0,
    networkStats: {
      bytesReceived: 0,
      bytesSent: 0,
      connectionQuality: 'offline'
    },
    systemHealth: {
      cpu: 0,
      memory: 0,
      database: 'healthy',
      uptime: 0
    }
  })

  const [historicalData, setHistoricalData] = useState<Array<{
    timestamp: number
    eventCount: number
    latency: number
    memoryUsage: number
  }>>([])

  // Calculate real-time metrics from events
  const calculatedMetrics = useMemo(() => {
    const now = Date.now()
    const recentEvents = events.filter(e => 
      e.timestamp && (now - new Date(e.timestamp).getTime()) < 60000 // Last minute
    )

    const latencies = recentEvents.map(e => {
      if (!e.timestamp) return 0
      return now - new Date(e.timestamp).getTime()
    })

    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
      : 0

    const uniqueRooms = new Set(events.map(e => e.roomId)).size

    return {
      totalEvents: events.length,
      averageEventLatency: averageLatency,
      activeRooms: uniqueRooms,
      recentEventCount: recentEvents.length
    }
  }, [events])

  // Fetch system metrics periodically
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // In a real app, this would fetch from an API endpoint
        const response = await fetch('/api/system/metrics')
        if (response.ok) {
          const data = await response.json()
          setMetrics(prev => ({
            ...prev,
            ...data,
            ...calculatedMetrics
          }))
        }
      } catch (error) {
        console.error('Failed to fetch system metrics:', error)
        // Use calculated metrics as fallback
        setMetrics(prev => ({
          ...prev,
          ...calculatedMetrics
        }))
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [calculatedMetrics, refreshInterval])

  // Update historical data
  useEffect(() => {
    const now = Date.now()
    setHistoricalData(prev => {
      const newData = [...prev, {
        timestamp: now,
        eventCount: calculatedMetrics.totalEvents,
        latency: calculatedMetrics.averageEventLatency,
        memoryUsage: metrics.memoryUsage?.used || 0
      }].slice(-60) // Keep last 60 data points (5 minutes at 5s intervals)
      
      return newData
    })
  }, [metrics, calculatedMetrics])

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
        title="Open Performance Monitor"
      >
        📊
      </button>
    )
  }

  return (
    <div className="fixed top-0 right-0 w-96 h-screen bg-white border-l-2 border-gray-300 shadow-xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
        <h3 className="font-bold">Performance Monitor</h3>
        <button
          onClick={onToggle}
          className="text-white hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <SystemHealthOverview health={metrics.systemHealth} />
        <SSEMetrics 
          connections={metrics.sseConnections}
          rooms={metrics.activeRooms}
          events={metrics.totalEvents}
          latency={metrics.averageEventLatency}
        />
        <NetworkStats stats={metrics.networkStats} />
        <MemoryUsage usage={metrics.memoryUsage} />
        <PerformanceChart data={historicalData} />
        <EventBreakdown events={events} />
      </div>
    </div>
  )
}

function SystemHealthOverview({ health }: { health: PerformanceMetrics['systemHealth'] }) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <h4 className="font-semibold mb-2">System Health</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-600">Database:</span>
          <span className={`ml-2 font-medium ${getHealthColor(health.database)}`}>
            {health.database}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Uptime:</span>
          <span className="ml-2 font-medium">{formatUptime(health.uptime)}</span>
        </div>
        <div>
          <span className="text-gray-600">CPU:</span>
          <span className="ml-2 font-medium">{health.cpu.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-600">Memory:</span>
          <span className="ml-2 font-medium">{health.memory.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

function SSEMetrics({ connections, rooms, events, latency }: {
  connections: number
  rooms: number
  events: number
  latency: number
}) {
  return (
    <div className="bg-blue-50 p-3 rounded-lg">
      <h4 className="font-semibold mb-2 text-blue-800">SSE Metrics</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-blue-600">Connections:</span>
          <span className="ml-2 font-bold text-blue-800">{connections}</span>
        </div>
        <div>
          <span className="text-blue-600">Active Rooms:</span>
          <span className="ml-2 font-bold text-blue-800">{rooms}</span>
        </div>
        <div>
          <span className="text-blue-600">Total Events:</span>
          <span className="ml-2 font-bold text-blue-800">{events}</span>
        </div>
        <div>
          <span className="text-blue-600">Avg Latency:</span>
          <span className="ml-2 font-bold text-blue-800">{latency.toFixed(0)}ms</span>
        </div>
      </div>
    </div>
  )
}

function NetworkStats({ stats }: { stats: PerformanceMetrics['networkStats'] }) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'poor': return 'text-yellow-600'
      case 'offline': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="bg-green-50 p-3 rounded-lg">
      <h4 className="font-semibold mb-2 text-green-800">Network</h4>
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-green-600">Quality:</span>
          <span className={`ml-2 font-medium capitalize ${getQualityColor(stats.connectionQuality)}`}>
            {stats.connectionQuality}
          </span>
        </div>
        <div>
          <span className="text-green-600">Received:</span>
          <span className="ml-2 font-medium">{formatBytes(stats.bytesReceived)}</span>
        </div>
        <div>
          <span className="text-green-600">Sent:</span>
          <span className="ml-2 font-medium">{formatBytes(stats.bytesSent)}</span>
        </div>
      </div>
    </div>
  )
}

function MemoryUsage({ usage }: { usage?: PerformanceMetrics['memoryUsage'] }) {
  if (!usage) {
    return (
      <div className="bg-purple-50 p-3 rounded-lg">
        <h4 className="font-semibold mb-2 text-purple-800">Memory</h4>
        <p className="text-sm text-gray-600">Not available</p>
      </div>
    )
  }

  const usagePercent = (usage.used / usage.total) * 100
  const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + ' MB'

  return (
    <div className="bg-purple-50 p-3 rounded-lg">
      <h4 className="font-semibold mb-2 text-purple-800">Memory Usage</h4>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{formatMB(usage.used)} / {formatMB(usage.total)}</span>
          <span className="font-medium">{usagePercent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-purple-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function PerformanceChart({ data }: { 
  data: Array<{ timestamp: number; eventCount: number; latency: number; memoryUsage: number }> 
}) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-semibold mb-2">Performance Chart</h4>
        <p className="text-sm text-gray-600">No data available</p>
      </div>
    )
  }

  const maxLatency = Math.max(...data.map(d => d.latency))
  const maxEvents = Math.max(...data.map(d => d.eventCount))

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <h4 className="font-semibold mb-2">Performance Trends</h4>
      <div className="h-24 flex items-end justify-between gap-1">
        {data.slice(-20).map((point, index) => {
          const latencyHeight = maxLatency > 0 ? (point.latency / maxLatency) * 80 : 0
          const eventHeight = maxEvents > 0 ? (point.eventCount / maxEvents) * 80 : 0
          
          return (
            <div key={index} className="flex flex-col items-center gap-1 flex-1">
              <div 
                className="bg-red-400 w-full rounded-t"
                style={{ height: `${latencyHeight}px` }}
                title={`Latency: ${point.latency.toFixed(0)}ms`}
              />
              <div 
                className="bg-blue-400 w-full rounded-b"
                style={{ height: `${eventHeight}px` }}
                title={`Events: ${point.eventCount}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>🔴 Latency</span>
        <span>🔵 Events</span>
      </div>
    </div>
  )
}

function EventBreakdown({ events }: { events: GameEvent[] }) {
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5) // Top 5 event types
  }, [events])

  return (
    <div className="bg-yellow-50 p-3 rounded-lg">
      <h4 className="font-semibold mb-2 text-yellow-800">Event Breakdown</h4>
      <div className="space-y-1">
        {eventCounts.map(([type, count]) => (
          <div key={type} className="flex justify-between text-sm">
            <span className="text-yellow-700">{type}</span>
            <span className="font-medium text-yellow-800">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
