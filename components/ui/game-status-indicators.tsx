/**
 * Game Status Indicators Component
 * 
 * Displays real-time status indicators for connections, players, and game state.
 * Provides visual feedback for system health and game progress.
 * 
 * @see docs/COMPONENT_DOCUMENTATION.md for complete documentation
 */

'use client'

import React from 'react'
import { GameState, GamePhase } from '@/lib/game-types'

interface GameStatusIndicatorsProps {
  gameState: GameState | null
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  playerCount: number
  sseMetrics?: {
    listenerCount: number
    connectionCount: number
    lastHeartbeat?: Date
    eventCount: number
  }
  className?: string
}

export function GameStatusIndicators({
  gameState,
  connectionStatus,
  playerCount,
  sseMetrics,
  className = ''
}: GameStatusIndicatorsProps) {
  return (
    <div className={`flex items-center gap-4 p-3 bg-gray-50 rounded-lg border ${className}`}>
      <ConnectionIndicator status={connectionStatus} />
      <PlayerCountIndicator count={playerCount} />
      {gameState && <GamePhaseIndicator phase={gameState.phase} />}
      {gameState && <ScoreIndicator gameState={gameState} />}
      {sseMetrics && <SSEMetricsIndicator metrics={sseMetrics} />}
    </div>
  )
}

function ConnectionIndicator({ status }: { status: 'connected' | 'disconnected' | 'reconnecting' }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          icon: '🟢',
          textColor: 'text-green-700'
        }
      case 'disconnected':
        return {
          color: 'bg-red-500',
          text: 'Disconnected',
          icon: '🔴',
          textColor: 'text-red-700'
        }
      case 'reconnecting':
        return {
          color: 'bg-yellow-500',
          text: 'Reconnecting...',
          icon: '🟡',
          textColor: 'text-yellow-700'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${config.color} ${status === 'reconnecting' ? 'animate-pulse' : ''}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  )
}

function PlayerCountIndicator({ count }: { count: number }) {
  const getCountColor = () => {
    if (count >= 4) return 'text-green-700'
    if (count >= 2) return 'text-yellow-700'
    return 'text-red-700'
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-600">👥</span>
      <span className={`text-sm font-medium ${getCountColor()}`}>
        {count}/4 Players
      </span>
    </div>
  )
}

function GamePhaseIndicator({ phase }: { phase: GamePhase }) {
  const getPhaseConfig = () => {
    switch (phase) {
      case GamePhase.TEAMS:
        return {
          text: 'Team Selection',
          icon: '👥',
          color: 'bg-blue-100 text-blue-700'
        }
      case GamePhase.BETS:
        return {
          text: 'Betting',
          icon: '💰',
          color: 'bg-yellow-100 text-yellow-700'
        }
      case GamePhase.CARDS:
        return {
          text: 'Playing Cards',
          icon: '🃏',
          color: 'bg-green-100 text-green-700'
        }
      case GamePhase.TRICK_SCORING:
        return {
          text: 'Trick Scoring',
          icon: '🏆',
          color: 'bg-purple-100 text-purple-700'
        }
      case GamePhase.ROUND_SCORING:
        return {
          text: 'Round Scoring',
          icon: '📊',
          color: 'bg-indigo-100 text-indigo-700'
        }
      default:
        return {
          text: 'Unknown',
          icon: '❓',
          color: 'bg-gray-100 text-gray-700'
        }
    }
  }

  const config = getPhaseConfig()

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.color}`}>
      <span>{config.icon}</span>
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  )
}

function ScoreIndicator({ gameState }: { gameState: GameState }) {
  const teamAScore = Object.entries(gameState.scores)
    .filter(([playerId]) => gameState.players[playerId]?.team === 'A')
    .reduce((sum, [, score]) => sum + score, 0)

  const teamBScore = Object.entries(gameState.scores)
    .filter(([playerId]) => gameState.players[playerId]?.team === 'B')
    .reduce((sum, [, score]) => sum + score, 0)

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm">
        <span className="font-medium text-blue-600">Team A: {teamAScore}</span>
      </div>
      <div className="text-gray-400">vs</div>
      <div className="text-sm">
        <span className="font-medium text-red-600">Team B: {teamBScore}</span>
      </div>
    </div>
  )
}

function SSEMetricsIndicator({ metrics }: {
  metrics: {
    listenerCount: number
    connectionCount: number
    lastHeartbeat?: Date
    eventCount: number
  }
}) {
  const timeSinceHeartbeat = metrics.lastHeartbeat 
    ? Date.now() - metrics.lastHeartbeat.getTime()
    : null

  const isHealthy = timeSinceHeartbeat ? timeSinceHeartbeat < 60000 : false // Less than 1 minute

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <div className="flex items-center gap-1">
        <span>📡</span>
        <span>{metrics.connectionCount} conn</span>
      </div>
      <div className="flex items-center gap-1">
        <span>👂</span>
        <span>{metrics.listenerCount} listeners</span>
      </div>
      <div className="flex items-center gap-1">
        <span>📨</span>
        <span>{metrics.eventCount} events</span>
      </div>
      <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-400' : 'bg-red-400'}`} />
    </div>
  )
}

// Additional status components for specific use cases

export function TurnIndicator({ 
  currentTurn, 
  currentUserId, 
  playerName 
}: { 
  currentTurn: string
  currentUserId: string
  playerName?: string 
}) {
  const isMyTurn = currentTurn === currentUserId

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
      isMyTurn 
        ? 'bg-green-100 text-green-700 border-2 border-green-300' 
        : 'bg-gray-100 text-gray-600'
    }`}>
      <span>{isMyTurn ? '⭐' : '⏳'}</span>
      <span className="font-medium">
        {isMyTurn ? "Your Turn" : `${playerName || 'Player'}'s Turn`}
      </span>
    </div>
  )
}

export function TrumpIndicator({ trump }: { trump?: string }) {
  if (!trump) return null

  const getTrumpConfig = () => {
    switch (trump.toLowerCase()) {
      case 'red':
        return { color: 'text-red-600', symbol: '♥️' }
      case 'blue':
        return { color: 'text-blue-600', symbol: '♠️' }
      case 'green':
        return { color: 'text-green-600', symbol: '♣️' }
      case 'brown':
        return { color: 'text-yellow-600', symbol: '♦️' }
      default:
        return { color: 'text-gray-600', symbol: '🃏' }
    }
  }

  const config = getTrumpConfig()

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-lg">
      <span className="text-sm font-medium text-gray-700">Trump:</span>
      <span className={`text-lg ${config.color}`}>{config.symbol}</span>
      <span className={`text-sm font-medium capitalize ${config.color}`}>{trump}</span>
    </div>
  )
}

export function RoundIndicator({ round, maxRounds = 10 }: { round: number, maxRounds?: number }) {
  const progress = (round / maxRounds) * 100

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Round {round}/{maxRounds}</span>
      <div className="w-24 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function HighestBetIndicator({ 
  highestBet 
}: { 
  highestBet?: { value: string, trump: boolean, playerName?: string } 
}) {
  if (!highestBet) {
    return (
      <div className="text-sm text-gray-500">
        No bets placed yet
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-200 rounded-lg">
      <span className="text-sm text-gray-700">Highest:</span>
      <span className="font-bold text-purple-700">{highestBet.value}</span>
      {highestBet.trump && <span className="text-yellow-600">👑</span>}
      {highestBet.playerName && (
        <span className="text-sm text-gray-600">by {highestBet.playerName}</span>
      )}
    </div>
  )
}
