/**
 * Runtime Type Guards for Game State Validation
 * 
 * This file contains type guards and validation functions to ensure
 * data integrity at runtime, especially when dealing with data from
 * external sources like databases, APIs, or user input.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GamePhase, Team, Bets, GameState, Player, Bet, Card, CardColor } from "./game-types"
import { BaseEventData, TeamEventData, BettingEventData, CardEventData, RoundEventData } from "./events"


// ============================================================================
// Basic Type Guards
// ============================================================================

/**
 * Check if value is a valid GamePhase
 */
export function isGamePhase(value: any): value is GamePhase {
  return Object.values(GamePhase).includes(value)
}

/**
 * Check if value is a valid Team
 */
export function isTeam(value: any): value is Team {
  return Object.values(Team).includes(value)
}

/**
 * Check if value is a valid Bets value
 */
export function isBets(value: any): value is Bets {
  return Object.values(Bets).includes(value)
}

/**
 * Check if value is a valid CardColor
 */
export function isCardColor(value: any): value is CardColor {
  return Object.values(CardColor).includes(value)
}

/**
 * Check if value is a string
 */
export function isString(value: any): value is string {
  return typeof value === 'string'
}

/**
 * Check if value is a number
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Check if value is an object (not null, not array)
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Check if value is an array
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value)
}

// ============================================================================
// Game Entity Type Guards
// ============================================================================

/**
 * Check if value is a valid Card
 */
export function isCard(value: any): value is Card {
  return (
    isObject(value) &&
    isString(value.id) &&
    isCardColor(value.color) &&
    isNumber(value.value) &&
    value.value >= 0 && value.value <= 7 &&
    (value.playerId === undefined || isString(value.playerId)) &&
    (value.playOrder === undefined || isNumber(value.playOrder)) &&
    (value.trickNumber === undefined || isNumber(value.trickNumber))
  )
}

/**
 * Check if value is a valid Bet
 */
export function isBet(value: any): value is Bet {
  const logError = (field: string, expected: string, actual: any) => {
    console.error(`🔍 Bet validation failed:`, {
      field,
      expected,
      actual: typeof actual === 'object' ? JSON.stringify(actual, null, 2) : actual,
      actualType: typeof actual,
      fullValue: typeof value === 'object' ? JSON.stringify(value, null, 2) : value
    })
  }

  if (!isObject(value)) {
    logError('root', 'object', value)
    return false
  }

  if (!isString(value.playerId)) {
    logError('playerId', 'string', value.playerId)
    return false
  }

  if (!isBets(value.betValue)) {
    logError('value', 'valid Bets enum value', value.betValue)
    return false
  }

  if (!isBoolean(value.trump)) {
    logError('trump', 'boolean', value.trump)
    return false
  }

  return true
}

/**
 * Check if value is a valid Player
 */
export function isPlayer(value: any): value is Player {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.name) &&
    (value.team === undefined || isTeam(value.team)) &&
    (value.seatPosition === undefined || isNumber(value.seatPosition)) &&
    isBoolean(value.isReady)
  )
}

// ============================================================================
// Game State Type Guards
// ============================================================================

/**
 * Check if value is a valid GameState
 */
export function isGameState(value: any): value is GameState {
  const logError = (field: string, expected: string, actual: any) => {
    console.error(`🔍 GameState validation failed:`, {
      field,
      expected,
      actual: typeof actual === 'object' ? JSON.stringify(actual, null, 2) : actual,
      actualType: typeof actual,
      fullValue: typeof value === 'object' ? JSON.stringify(value, null, 2) : value
    })
  }

  if (!isObject(value)) {
    logError('root', 'object', value)
    return false
  }

  // Required fields
  if (!isGamePhase(value.phase)) {
    logError('phase', 'valid GamePhase', value.phase)
    return false
  }
  if (!isNumber(value.round)) {
    logError('round', 'number', value.round)
    return false
  }
  if (!isString(value.currentTurn)) {
    logError('currentTurn', 'string', value.currentTurn)
    return false
  }
  if (!isString(value.dealer)) {
    logError('dealer', 'string', value.dealer)
    return false
  }
  if (!isString(value.starter)) {
    logError('starter', 'string', value.starter)
    return false
  }

  // Optional fields
  if (value.trump && !isCardColor(value.trump)) {
    logError('trump', 'valid CardColor or undefined', value.trump)
    return false
  }
  if (value.highestBet !== undefined && !isBet(value.highestBet)) {
    logError('highestBet', 'valid Bet or undefined', value.highestBet)
    return false
  }

  // Object fields
  if (!isObject(value.players)) {
    logError('players', 'object', value.players)
    return false
  }
  if (!isObject(value.bets)) {
    logError('bets', 'object', value.bets)
    return false
  }
  if (!isObject(value.playedCards)) {
    logError('playedCards', 'object', value.playedCards)
    return false
  }
  if (!isObject(value.playerHands)) {
    logError('playerHands', 'object', value.playerHands)
    return false
  }
  if (!isObject(value.wonTricks)) {
    logError('wonTricks', 'object', value.wonTricks)
    return false
  }
  if (!isObject(value.scores)) {
    logError('scores', 'object', value.scores)
    return false
  }

  // Array fields
  if (!isArray(value.turnOrder)) {
    logError('turnOrder', 'array', value.turnOrder)
    return false
  }

  // Validate nested objects
  for (const [playerId, player] of Object.entries(value.players)) {
    if (!isPlayer(player)) {
      logError(`players.${playerId}`, 'valid Player', player)
      return false
    }
  }

  for (const [playerId, bet] of Object.entries(value.bets)) {
    if (!isBet(bet)) {
      logError(`bets.${playerId}`, 'valid Bet', bet)
      return false
    }
  }

  for (const [playerId, card] of Object.entries(value.playedCards)) {
    if (!isCard(card)) {
      logError(`playedCards.${playerId}`, 'valid Card', card)
      return false
    }
  }

  for (const [playerId, hand] of Object.entries(value.playerHands)) {
    if (!isArray(hand)) {
      logError(`playerHands.${playerId}`, 'array', hand)
      return false
    }
    for (const [cardIndex, card] of hand.entries()) {
      if (!isCard(card)) {
        logError(`playerHands.${playerId}[${cardIndex}]`, 'valid Card', card)
        return false
      }
    }
  }

  for (const [playerId, score] of Object.entries(value.wonTricks)) {
    if (!isNumber(score)) {
      logError(`wonTricks.${playerId}`, 'number', score)
      return false
    }
  }

  for (const [playerId, score] of Object.entries(value.scores)) {
    if (!isNumber(score)) {
      logError(`scores.${playerId}`, 'number', score)
      return false
    }
  }

  for (const [index, playerId] of value.turnOrder.entries()) {
    if (!isString(playerId)) {
      logError(`turnOrder[${index}]`, 'string', playerId)
      return false
    }
  }

  return true
}

// ============================================================================
// Event Data Type Guards
// ============================================================================

/**
 * Check if value is valid BaseEventData
 */
export function isBaseEventData(value: any): value is BaseEventData {
  if (!isObject(value)) return false
  
  if (value.timestamp !== undefined && !(value.timestamp instanceof Date)) return false
  if (value.userId !== undefined && !isString(value.userId)) return false
  if (value.playerName !== undefined && !isString(value.playerName)) return false
  if (value.playerId !== undefined && !isString(value.playerId)) return false

  return true
}

/**
 * Check if value is valid TeamEventData
 */
export function isTeamEventData(value: any): value is TeamEventData {
  if (!isObject(value)) return false

  if (value.team !== undefined && !isTeam(value.team)) return false
  if (value.teamsBalanced !== undefined && !isBoolean(value.teamsBalanced)) return false
  if (value.phase !== undefined && !isGamePhase(value.phase)) return false
  if (value.teamACount !== undefined && !isNumber(value.teamACount)) return false
  if (value.teamBCount !== undefined && !isNumber(value.teamBCount)) return false

  return true
}

/**
 * Check if value is valid BettingEventData
 */
export function isBettingEventData(value: any): value is BettingEventData {
  if (!isObject(value)) return false

  if (value.betValue !== undefined && !isBets(value.betValue)) return false
  if (value.trump !== undefined && !isBoolean(value.trump)) return false
  if (value.betsRemaining !== undefined && !isNumber(value.betsRemaining)) return false
  if (value.highestBet !== undefined && !isNumber(value.highestBet)) return false
  if (value.highestBetter !== undefined && !isString(value.highestBetter)) return false
  if (value.allBetsComplete !== undefined && !isBoolean(value.allBetsComplete)) return false
  if (value.turnOrder !== undefined && !isArray(value.turnOrder)) return false
  if (value.currentTurn !== undefined && !isString(value.currentTurn)) return false

  return true
}

/**
 * Check if value is valid CardEventData
 */
export function isCardEventData(value: any): value is CardEventData {
  if (!isObject(value)) return false

  if (value.card !== undefined && !isString(value.card)) return false
  if (value.cardsInTrick !== undefined && !isNumber(value.cardsInTrick)) return false
  if (value.winner !== undefined && !isString(value.winner)) return false
  if (value.winnerName !== undefined && !isString(value.winnerName)) return false
  if (value.remainingCards !== undefined && !isNumber(value.remainingCards)) return false

  return true
}

/**
 * Check if value is valid RoundEventData
 */
export function isRoundEventData(value: any): value is RoundEventData {
  if (!isObject(value)) return false

  if (value.round !== undefined && !isNumber(value.round)) return false
  if (value.newRound !== undefined && !isNumber(value.newRound)) return false
  if (value.completedRound !== undefined && !isNumber(value.completedRound)) return false
  if (value.scores !== undefined && !isObject(value.scores)) return false
  if (value.roundResult !== undefined && !isObject(value.roundResult)) return false

  return true
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Safely validate and cast a value to GameState
 */
export function validateGameState(value: any): GameState | null {
  return isGameState(value) ? value : null
}

/**
 * Safely validate and cast a value to a specific event data type
 */
export function validateEventData<T extends BaseEventData>(
  value: any,
  validator: (value: any) => value is T
): T | null {
  return validator(value) ? value : null
}

/**
 * Create a type-safe JSON parser with validation
 */
export function safeJsonParse<T>(
  json: string,
  validator: (value: any) => value is T,
  fallback: T
): T {
  try {
    const parsed = JSON.parse(json)
    return validator(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

/**
 * Create a type-safe object cast with validation
 */
export function safeObjectCast<T>(
  value: any,
  validator: (value: any) => value is T,
  fallback: T
): T {
  return validator(value) ? value : fallback
}
