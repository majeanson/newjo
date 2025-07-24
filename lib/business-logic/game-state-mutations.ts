/**
 * Pure Game State Mutations
 * 
 * This file contains pure functions that create new game states
 * based on game actions, without any side effects.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GameState, GamePhase, Team, Bets, Card, CardColor, Player, Bet } from "../game-types"
import { 
  canJoinTeam, 
  areTeamsBalanced, 
  isValidBet, 
  getHighestBet, 
  canPlayCard, 
  isTrickComplete, 
  getTrickWinner,
  isRoundComplete,
  calculateRoundScores
} from "./game-rules"

// ============================================================================
// Team Phase Mutations
// ============================================================================

/**
 * Add a player to the game
 */
export function addPlayer(gameState: GameState, player: Player): GameState {
  return {
    ...gameState,
    players: {
      ...gameState.players,
      [player.id]: player
    }
  }
}

/**
 * Remove a player from the game
 */
export function removePlayer(gameState: GameState, playerId: string): GameState {
  const newPlayers = { ...gameState.players }
  delete newPlayers[playerId]
  
  // Clean up related data
  const newBets = { ...gameState.bets }
  delete newBets[playerId]
  
  const newPlayerHands = { ...gameState.playerHands }
  delete newPlayerHands[playerId]
  
  const newPlayedCards = { ...gameState.playedCards }
  delete newPlayedCards[playerId]
  
  const newWonTricks = { ...gameState.wonTricks }
  delete newWonTricks[playerId]
  
  const newScores = { ...gameState.scores }
  delete newScores[playerId]

  return {
    ...gameState,
    players: newPlayers,
    bets: newBets,
    playerHands: newPlayerHands,
    playedCards: newPlayedCards,
    wonTricks: newWonTricks,
    scores: newScores,
    turnOrder: gameState.turnOrder.filter(id => id !== playerId)
  }
}

/**
 * Select a team for a player
 */
export function selectTeam(gameState: GameState, playerId: string, team: Team): GameState {
  const canJoin = canJoinTeam(gameState, playerId, team)
  if (!canJoin.canJoin) {
    throw new Error(canJoin.reason)
  }

  const newGameState = {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: {
        ...gameState.players[playerId],
        team
      }
    }
  }

  // Check if we can advance to betting phase
  if (areTeamsBalanced(newGameState)) {
    return {
      ...newGameState,
      phase: GamePhase.BETS,
      currentTurn: newGameState.turnOrder[0] || Object.keys(newGameState.players)[0]
    }
  }

  return newGameState
}

/**
 * Set player ready status
 */
export function setPlayerReady(gameState: GameState, playerId: string, isReady: boolean): GameState {
  return {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: {
        ...gameState.players[playerId],
        isReady
      }
    }
  }
}

// ============================================================================
// Betting Phase Mutations
// ============================================================================

/**
 * Place a bet for a player
 */
export function placeBet(gameState: GameState, playerId: string, betValue: Bets, trump: boolean): GameState {
  const validation = isValidBet(gameState, playerId, betValue, trump)
  if (!validation.isValid) {
    throw new Error(validation.reason)
  }

  const bet: Bet = {
    playerId,
    value: betValue,
    trump
  }

  const newGameState = {
    ...gameState,
    bets: {
      ...gameState.bets,
      [playerId]: bet
    }
  }

  // Update highest bet
  const highestBet = getHighestBet(newGameState)
  newGameState.highestBet = highestBet

  // Move to next player
  const currentIndex = newGameState.turnOrder.indexOf(playerId)
  const nextIndex = (currentIndex + 1) % newGameState.turnOrder.length
  newGameState.currentTurn = newGameState.turnOrder[nextIndex]

  // Check if all bets are placed
  if (Object.keys(newGameState.bets).length === Object.keys(newGameState.players).length) {
    newGameState.phase = GamePhase.CARDS
    newGameState.currentTurn = newGameState.starter
    
    // Set trump color if highest bet has trump
    if (highestBet?.trump) {
      // In a real game, the trump color would be determined by the highest bidder
      // For now, we'll use a default color
      newGameState.trump = CardColor.RED
    }
  }

  return newGameState
}

// ============================================================================
// Card Phase Mutations
// ============================================================================

/**
 * Deal cards to all players
 */
export function dealCards(gameState: GameState, deck: Card[]): GameState {
  const playerIds = Object.keys(gameState.players)
  const cardsPerPlayer = 8
  const newPlayerHands: Record<string, Card[]> = {}

  playerIds.forEach((playerId, index) => {
    const startIndex = index * cardsPerPlayer
    newPlayerHands[playerId] = deck.slice(startIndex, startIndex + cardsPerPlayer)
  })

  return {
    ...gameState,
    playerHands: newPlayerHands
  }
}

/**
 * Play a card
 */
export function playCard(gameState: GameState, playerId: string, card: Card): GameState {
  const validation = canPlayCard(gameState, playerId, card)
  if (!validation.canPlay) {
    throw new Error(validation.reason)
  }

  // Remove card from player's hand
  const newPlayerHands = {
    ...gameState.playerHands,
    [playerId]: gameState.playerHands[playerId].filter(c => c.id !== card.id)
  }

  // Add card to played cards with play order
  const playOrder = Object.keys(gameState.playedCards).length + 1
  const playedCard = {
    ...card,
    playerId,
    playOrder,
    trickNumber: gameState.round
  }

  const newPlayedCards = {
    ...gameState.playedCards,
    [playerId]: playedCard
  }

  let newGameState = {
    ...gameState,
    playerHands: newPlayerHands,
    playedCards: newPlayedCards
  }

  // Move to next player
  const currentIndex = newGameState.turnOrder.indexOf(playerId)
  const nextIndex = (currentIndex + 1) % newGameState.turnOrder.length
  newGameState.currentTurn = newGameState.turnOrder[nextIndex]

  // Check if trick is complete
  if (isTrickComplete(newGameState)) {
    newGameState = processTrickCompletion(newGameState)
  }

  return newGameState
}

/**
 * Process trick completion
 */
export function processTrickCompletion(gameState: GameState): GameState {
  const winner = getTrickWinner(gameState)
  if (!winner) {
    throw new Error("Cannot determine trick winner")
  }

  // Update won tricks
  const newWonTricks = {
    ...gameState.wonTricks,
    [winner]: (gameState.wonTricks[winner] || 0) + 1
  }

  // Clear played cards
  const newPlayedCards: Record<string, Card> = {}

  let newGameState = {
    ...gameState,
    wonTricks: newWonTricks,
    playedCards: newPlayedCards,
    currentTurn: winner // Winner starts next trick
  }

  // Check if round is complete
  if (isRoundComplete(newGameState)) {
    newGameState = processRoundCompletion(newGameState)
  }

  return newGameState
}

/**
 * Process round completion
 */
export function processRoundCompletion(gameState: GameState): GameState {
  const roundResult = calculateRoundScores(gameState)
  
  // Update scores
  const newScores = { ...gameState.scores }
  Object.keys(gameState.players).forEach(playerId => {
    const player = gameState.players[playerId]
    if (player.team === Team.A) {
      newScores[playerId] = (newScores[playerId] || 0) + roundResult.teamAScore
    } else if (player.team === Team.B) {
      newScores[playerId] = (newScores[playerId] || 0) + roundResult.teamBScore
    }
  })

  // Reset for next round
  const newGameState = {
    ...gameState,
    scores: newScores,
    round: gameState.round + 1,
    phase: GamePhase.BETS,
    bets: {},
    playedCards: {},
    playerHands: {},
    wonTricks: {},
    highestBet: undefined,
    trump: undefined
  }

  // Rotate dealer and starter
  const dealerIndex = newGameState.turnOrder.indexOf(gameState.dealer)
  const newDealerIndex = (dealerIndex + 1) % newGameState.turnOrder.length
  newGameState.dealer = newGameState.turnOrder[newDealerIndex]
  
  const starterIndex = newGameState.turnOrder.indexOf(gameState.starter)
  const newStarterIndex = (starterIndex + 1) % newGameState.turnOrder.length
  newGameState.starter = newGameState.turnOrder[newStarterIndex]
  
  newGameState.currentTurn = newGameState.starter

  return newGameState
}

// ============================================================================
// Game Management Mutations
// ============================================================================

/**
 * Reset the game to initial state
 */
export function resetGame(gameState: GameState): GameState {
  return {
    ...gameState,
    phase: GamePhase.TEAMS,
    round: 1,
    bets: {},
    playedCards: {},
    playerHands: {},
    wonTricks: {},
    scores: {},
    highestBet: undefined,
    trump: undefined,
    players: Object.fromEntries(
      Object.entries(gameState.players).map(([id, player]) => [
        id,
        { ...player, team: undefined, isReady: false }
      ])
    )
  }
}

/**
 * Start a new round
 */
export function startNewRound(gameState: GameState): GameState {
  return {
    ...gameState,
    phase: GamePhase.BETS,
    bets: {},
    playedCards: {},
    playerHands: {},
    wonTricks: {},
    highestBet: undefined,
    trump: undefined,
    currentTurn: gameState.starter
  }
}

/**
 * Force start the game (skip team selection)
 */
export function forceStartGame(gameState: GameState): GameState {
  const playerIds = Object.keys(gameState.players)
  
  // Auto-assign teams
  const newPlayers = { ...gameState.players }
  playerIds.forEach((playerId, index) => {
    newPlayers[playerId] = {
      ...newPlayers[playerId],
      team: index % 2 === 0 ? Team.A : Team.B,
      isReady: true
    }
  })

  return {
    ...gameState,
    players: newPlayers,
    phase: GamePhase.BETS,
    currentTurn: gameState.turnOrder[0] || playerIds[0]
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a deep copy of game state
 */
export function cloneGameState(gameState: GameState): GameState {
  return JSON.parse(JSON.stringify(gameState))
}

/**
 * Apply multiple mutations in sequence
 */
export function applyMutations(
  gameState: GameState, 
  mutations: Array<(state: GameState) => GameState>
): GameState {
  return mutations.reduce((state, mutation) => mutation(state), gameState)
}
