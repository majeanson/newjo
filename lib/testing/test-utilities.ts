/**
 * Testing Utilities
 * 
 * This file contains utilities for testing the real-time game system
 * including mock factories, test helpers, and assertion utilities.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GameState, GamePhase, Team, Bets, Card, CardColor, Player, Bet } from '../game-types'
import { GameEvent } from '../events'

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Create a mock player
 */
export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  const id = overrides.id || `player_${Math.random().toString(36).substring(7)}`
  
  return {
    id,
    name: `Player ${id.slice(-4)}`,
    team: undefined,
    seatPosition: 0,
    isReady: false,
    ...overrides
  }
}

/**
 * Create a mock card
 */
export function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: `card_${Math.random().toString(36).substring(7)}`,
    color: CardColor.RED,
    value: 7,
    playerId: undefined,
    playOrder: undefined,
    trickNumber: undefined,
    ...overrides
  }
}

/**
 * Create a mock bet
 */
export function createMockBet(overrides: Partial<Bet> = {}): Bet {
  return {
    playerId: `player_${Math.random().toString(36).substring(7)}`,
    value: Bets.EIGHT,
    trump: false,
    ...overrides
  }
}

/**
 * Create a mock game state
 */
export function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  const player1 = createMockPlayer({ id: 'player1', name: 'Alice', team: Team.A })
  const player2 = createMockPlayer({ id: 'player2', name: 'Bob', team: Team.B })
  const player3 = createMockPlayer({ id: 'player3', name: 'Charlie', team: Team.A })
  const player4 = createMockPlayer({ id: 'player4', name: 'Diana', team: Team.B })

  return {
    phase: GamePhase.TEAMS,
    round: 1,
    currentTurn: 'player1',
    dealer: 'player1',
    starter: 'player2',
    trump: undefined,
    players: {
      player1,
      player2,
      player3,
      player4
    },
    bets: {},
    playedCards: {},
    playerHands: {},
    wonTricks: {},
    scores: {},
    turnOrder: ['player1', 'player2', 'player3', 'player4'],
    highestBet: undefined,
    ...overrides
  }
}

/**
 * Create a game state in betting phase
 */
export function createBettingGameState(overrides: Partial<GameState> = {}): GameState {
  const baseState = createMockGameState({
    phase: GamePhase.BETS,
    ...overrides
  })

  // Ensure teams are balanced
  Object.values(baseState.players).forEach((player, index) => {
    player.team = index % 2 === 0 ? Team.A : Team.B
  })

  return baseState
}

/**
 * Create a game state in card playing phase
 */
export function createCardGameState(overrides: Partial<GameState> = {}): GameState {
  const baseState = createBettingGameState({
    phase: GamePhase.CARDS,
    trump: CardColor.RED,
    ...overrides
  })

  // Add some bets
  baseState.bets = {
    player1: createMockBet({ playerId: 'player1', value: Bets.EIGHT, trump: false }),
    player2: createMockBet({ playerId: 'player2', value: Bets.NINE, trump: true }),
    player3: createMockBet({ playerId: 'player3', value: Bets.SEVEN, trump: false }),
    player4: createMockBet({ playerId: 'player4', value: Bets.SIX, trump: false })
  }

  baseState.highestBet = baseState.bets.player2

  // Add player hands
  baseState.playerHands = {
    player1: Array.from({ length: 8 }, (_, i) => createMockCard({ id: `p1_card_${i}` })),
    player2: Array.from({ length: 8 }, (_, i) => createMockCard({ id: `p2_card_${i}` })),
    player3: Array.from({ length: 8 }, (_, i) => createMockCard({ id: `p3_card_${i}` })),
    player4: Array.from({ length: 8 }, (_, i) => createMockCard({ id: `p4_card_${i}` }))
  }

  return baseState
}

/**
 * Create a deck of cards
 */
export function createMockDeck(): Card[] {
  const colors = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.BROWN]
  const values = [0, 1, 2, 3, 4, 5, 6, 7] // 8 values per color
  const deck: Card[] = []

  colors.forEach(color => {
    values.forEach(value => {
      deck.push(createMockCard({
        id: `${color}_${value}`,
        color,
        value
      }))
    })
  })

  return deck
}

// ============================================================================
// Mock Events
// ============================================================================

/**
 * Create a mock game event
 */
export function createMockEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    type: 'CONNECTED',
    roomId: 'test_room',
    timestamp: new Date(),
    ...overrides
  } as GameEvent
}

/**
 * Create a sequence of mock events
 */
export function createEventSequence(events: Array<Partial<GameEvent>>): GameEvent[] {
  return events.map((event, index) => createMockEvent({
    timestamp: new Date(Date.now() + index * 1000),
    ...event
  }))
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Simulate a complete betting round
 */
export function simulateBettingRound(gameState: GameState): GameState {
  const newState = { ...gameState }
  
  // Add bets for all players
  Object.keys(newState.players).forEach((playerId, index) => {
    newState.bets[playerId] = createMockBet({
      playerId,
      value: [Bets.SIX, Bets.SEVEN, Bets.EIGHT, Bets.NINE][index] || Bets.SIX,
      trump: index === 1 // Second player bids trump
    })
  })

  // Set highest bet
  newState.highestBet = newState.bets[Object.keys(newState.players)[1]]
  newState.phase = GamePhase.CARDS
  newState.trump = CardColor.RED

  return newState
}

/**
 * Simulate playing a card
 */
export function simulateCardPlay(gameState: GameState, playerId: string, cardIndex: number = 0): GameState {
  const newState = { ...gameState }
  const playerHand = newState.playerHands[playerId] || []
  
  if (playerHand.length === 0) {
    throw new Error(`Player ${playerId} has no cards`)
  }

  const card = playerHand[cardIndex]
  const playOrder = Object.keys(newState.playedCards).length + 1

  // Remove card from hand
  newState.playerHands[playerId] = playerHand.filter((_, i) => i !== cardIndex)

  // Add to played cards
  newState.playedCards[playerId] = {
    ...card,
    playerId,
    playOrder,
    trickNumber: newState.round
  }

  // Move to next player
  const currentIndex = newState.turnOrder.indexOf(playerId)
  const nextIndex = (currentIndex + 1) % newState.turnOrder.length
  newState.currentTurn = newState.turnOrder[nextIndex]

  return newState
}

/**
 * Simulate a complete trick
 */
export function simulateCompleteTrick(gameState: GameState): GameState {
  let newState = { ...gameState }

  // Play a card for each player
  newState.turnOrder.forEach((playerId, index) => {
    if (Object.keys(newState.playedCards).length < 4) {
      newState = simulateCardPlay(newState, playerId, 0)
    }
  })

  // Determine winner (simplified - first player wins)
  const winner = newState.turnOrder[0]
  newState.wonTricks[winner] = (newState.wonTricks[winner] || 0) + 1

  // Clear played cards
  newState.playedCards = {}
  newState.currentTurn = winner

  return newState
}

// ============================================================================
// Assertion Utilities
// ============================================================================

/**
 * Assert that a game state is valid
 */
export function assertValidGameState(gameState: GameState): void {
  if (!gameState) {
    throw new Error('Game state is null or undefined')
  }

  if (!Object.values(GamePhase).includes(gameState.phase)) {
    throw new Error(`Invalid game phase: ${gameState.phase}`)
  }

  if (typeof gameState.round !== 'number' || gameState.round < 1) {
    throw new Error(`Invalid round: ${gameState.round}`)
  }

  if (!gameState.players[gameState.currentTurn]) {
    throw new Error(`Current turn player ${gameState.currentTurn} does not exist`)
  }

  const playerCount = Object.keys(gameState.players).length
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`Invalid player count: ${playerCount}`)
  }
}

/**
 * Assert that teams are balanced
 */
export function assertBalancedTeams(gameState: GameState): void {
  const teamA = Object.values(gameState.players).filter(p => p.team === Team.A).length
  const teamB = Object.values(gameState.players).filter(p => p.team === Team.B).length
  const expectedSize = Object.keys(gameState.players).length / 2

  if (teamA !== expectedSize || teamB !== expectedSize) {
    throw new Error(`Teams are not balanced: Team A has ${teamA}, Team B has ${teamB}`)
  }
}

/**
 * Assert that an event is valid
 */
export function assertValidEvent(event: GameEvent): void {
  if (!event.type) {
    throw new Error('Event must have a type')
  }

  if (!event.roomId) {
    throw new Error('Event must have a roomId')
  }

  if (!event.timestamp) {
    throw new Error('Event must have a timestamp')
  }
}

// ============================================================================
// Performance Testing Utilities
// ============================================================================

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T,
  label?: string
): Promise<{ result: T; executionTime: number }> {
  const start = performance.now()
  const result = await fn()
  const executionTime = performance.now() - start

  if (label) {
    console.log(`${label}: ${executionTime.toFixed(2)}ms`)
  }

  return { result, executionTime }
}

/**
 * Generate load test data
 */
export function generateLoadTestData(playerCount: number, eventCount: number): {
  gameState: GameState
  events: GameEvent[]
} {
  const players: Record<string, Player> = {}
  
  for (let i = 0; i < playerCount; i++) {
    const player = createMockPlayer({
      id: `load_player_${i}`,
      name: `LoadPlayer${i}`,
      team: i % 2 === 0 ? Team.A : Team.B
    })
    players[player.id] = player
  }

  const gameState = createMockGameState({ players })

  const events = Array.from({ length: eventCount }, (_, i) => 
    createMockEvent({
      type: ['CONNECTED', 'TEAMS_CHANGED', 'BETS_CHANGED', 'CARDS_CHANGED'][i % 4] as any,
      roomId: 'load_test_room',
      userId: `load_player_${i % playerCount}`,
      timestamp: new Date(Date.now() + i * 100)
    })
  )

  return { gameState, events }
}
