/**
 * Pure Game Rules and Business Logic
 * 
 * This file contains pure functions that implement the core game rules
 * without any side effects like database operations or event broadcasting.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GameState, GamePhase, Team, Bets, Card, CardColor, Player, Bet } from "../game-types"

// ============================================================================
// Game State Validation Rules
// ============================================================================

/**
 * Check if a game state is valid according to game rules
 */
export function validateGameStateRules(gameState: GameState): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check player count
  const playerCount = Object.keys(gameState.players).length
  if (playerCount < 2 || playerCount > 4) {
    errors.push(`Invalid player count: ${playerCount}. Must be 2-4 players.`)
  }

  // Check team balance (for 4 players)
  if (playerCount === 4) {
    const teamA = Object.values(gameState.players).filter(p => p.team === Team.A).length
    const teamB = Object.values(gameState.players).filter(p => p.team === Team.B).length
    
    if (teamA !== 2 || teamB !== 2) {
      errors.push(`Unbalanced teams: Team A has ${teamA}, Team B has ${teamB}. Both teams must have 2 players.`)
    }
  }

  // Check current turn validity
  if (!gameState.players[gameState.currentTurn]) {
    errors.push(`Current turn player ${gameState.currentTurn} does not exist.`)
  }

  // Check dealer and starter validity
  if (!gameState.players[gameState.dealer]) {
    errors.push(`Dealer ${gameState.dealer} does not exist.`)
  }
  
  if (!gameState.players[gameState.starter]) {
    errors.push(`Starter ${gameState.starter} does not exist.`)
  }

  // Phase-specific validations
  switch (gameState.phase) {
    case GamePhase.BETS:
      errors.push(...validateBettingPhase(gameState))
      break
    case GamePhase.CARDS:
      errors.push(...validateCardPhase(gameState))
      break
  }

  return { isValid: errors.length === 0, errors }
}

function validateBettingPhase(gameState: GameState): string[] {
  const errors: string[] = []
  
  // Check if all required players have bet
  const playerCount = Object.keys(gameState.players).length
  const betCount = Object.keys(gameState.bets).length
  
  if (betCount > playerCount) {
    errors.push(`Too many bets: ${betCount} bets for ${playerCount} players.`)
  }

  // Validate individual bets
  for (const [playerId, bet] of Object.entries(gameState.bets)) {
    if (!gameState.players[playerId]) {
      errors.push(`Bet exists for non-existent player: ${playerId}`)
    }
    
    if (!Object.values(Bets).includes(bet.value)) {
      errors.push(`Invalid bet value: ${bet.value}`)
    }
  }

  return errors
}

function validateCardPhase(gameState: GameState): string[] {
  const errors: string[] = []
  
  // Check played cards
  const playedCardCount = Object.keys(gameState.playedCards).length
  const playerCount = Object.keys(gameState.players).length
  
  if (playedCardCount > playerCount) {
    errors.push(`Too many played cards: ${playedCardCount} for ${playerCount} players.`)
  }

  // Validate card ownership
  for (const [playerId, card] of Object.entries(gameState.playedCards)) {
    if (!gameState.players[playerId]) {
      errors.push(`Card played by non-existent player: ${playerId}`)
    }
  }

  return errors
}

// ============================================================================
// Team Management Rules
// ============================================================================

/**
 * Check if a player can join a specific team
 */
export function canJoinTeam(gameState: GameState, playerId: string, team: Team): { canJoin: boolean; reason?: string } {
  if (gameState.phase !== GamePhase.TEAMS) {
    return { canJoin: false, reason: 'Team selection is only allowed during team phase' }
  }

  if (!gameState.players[playerId]) {
    return { canJoin: false, reason: 'Player does not exist' }
  }

  const currentTeamCount = Object.values(gameState.players).filter(p => p.team === team).length
  const maxTeamSize = Math.floor(Object.keys(gameState.players).length / 2)

  if (currentTeamCount >= maxTeamSize) {
    return { canJoin: false, reason: `Team ${team} is full` }
  }

  return { canJoin: true }
}

/**
 * Check if teams are balanced and ready for next phase
 */
export function areTeamsBalanced(gameState: GameState): boolean {
  const playerCount = Object.keys(gameState.players).length
  if (playerCount < 2) return false

  const teamA = Object.values(gameState.players).filter(p => p.team === Team.A).length
  const teamB = Object.values(gameState.players).filter(p => p.team === Team.B).length

  // For 4 players: 2v2, for 2 players: 1v1
  const expectedTeamSize = playerCount / 2
  return teamA === expectedTeamSize && teamB === expectedTeamSize
}

// ============================================================================
// Betting Rules
// ============================================================================

/**
 * Check if a bet is valid
 */
export function isValidBet(gameState: GameState, playerId: string, betValue: Bets, trump: boolean): { isValid: boolean; reason?: string } {
  if (gameState.phase !== GamePhase.BETS) {
    return { isValid: false, reason: 'Betting is only allowed during betting phase' }
  }

  if (gameState.currentTurn !== playerId) {
    return { isValid: false, reason: 'Not your turn to bet' }
  }

  if (gameState.bets[playerId]) {
    return { isValid: false, reason: 'You have already placed a bet' }
  }

  // Check if bet is higher than current highest
  if (gameState.highestBet) {
    const currentBetValue = Object.values(Bets).indexOf(gameState.highestBet.value)
    const newBetValue = Object.values(Bets).indexOf(betValue)
    
    if (newBetValue < currentBetValue) {
      return { isValid: false, reason: 'Bet must be higher than current highest bet' }
    }
    
    if (newBetValue === currentBetValue && !trump && gameState.highestBet.trump) {
      return { isValid: false, reason: 'Must bid trump or higher value' }
    }
  }

  return { isValid: true }
}

/**
 * Check if all bets are placed
 */
export function areAllBetsPlaced(gameState: GameState): boolean {
  const playerCount = Object.keys(gameState.players).length
  const betCount = Object.keys(gameState.bets).length
  return betCount === playerCount
}

/**
 * Get the highest bet
 */
export function getHighestBet(gameState: GameState): Bet | null {
  if (Object.keys(gameState.bets).length === 0) return null

  let highest: Bet | null = null
  
  for (const bet of Object.values(gameState.bets)) {
    if (!highest) {
      highest = bet
      continue
    }
    
    const currentValue = Object.values(Bets).indexOf(highest.value)
    const newValue = Object.values(Bets).indexOf(bet.value)
    
    if (newValue > currentValue || (newValue === currentValue && bet.trump && !highest.trump)) {
      highest = bet
    }
  }
  
  return highest
}

// ============================================================================
// Card Playing Rules
// ============================================================================

/**
 * Check if a card can be played
 */
export function canPlayCard(gameState: GameState, playerId: string, card: Card): { canPlay: boolean; reason?: string } {
  if (gameState.phase !== GamePhase.CARDS) {
    return { canPlay: false, reason: 'Card playing is only allowed during card phase' }
  }

  if (gameState.currentTurn !== playerId) {
    return { canPlay: false, reason: 'Not your turn to play' }
  }

  const playerHand = gameState.playerHands[playerId] || []
  const hasCard = playerHand.some(c => c.id === card.id)
  
  if (!hasCard) {
    return { canPlay: false, reason: 'You do not have this card' }
  }

  // Check if player must follow suit
  const playedCards = Object.values(gameState.playedCards)
  if (playedCards.length > 0) {
    const firstCard = playedCards.find(c => c.playOrder === 1)
    if (firstCard) {
      const hasFirstCardColor = playerHand.some(c => c.color === firstCard.color)
      
      if (hasFirstCardColor && card.color !== firstCard.color && card.color !== gameState.trump) {
        return { canPlay: false, reason: `Must follow suit (${firstCard.color}) or play trump` }
      }
    }
  }

  return { canPlay: true }
}

/**
 * Check if a trick is complete
 */
export function isTrickComplete(gameState: GameState): boolean {
  const playerCount = Object.keys(gameState.players).length
  const playedCardCount = Object.keys(gameState.playedCards).length
  return playedCardCount === playerCount
}

/**
 * Determine the winner of a trick
 */
export function getTrickWinner(gameState: GameState): string | null {
  const playedCards = Object.values(gameState.playedCards)
  if (playedCards.length === 0) return null

  const firstCard = playedCards.find(c => c.playOrder === 1)
  if (!firstCard) return null

  let winningCard = firstCard
  
  for (const card of playedCards) {
    // Trump beats non-trump
    if (card.color === gameState.trump && winningCard.color !== gameState.trump) {
      winningCard = card
    }
    // Higher trump beats lower trump
    else if (card.color === gameState.trump && winningCard.color === gameState.trump) {
      if (card.value > winningCard.value) {
        winningCard = card
      }
    }
    // Higher card of same suit beats lower card (if no trump played)
    else if (card.color === firstCard.color && winningCard.color === firstCard.color && winningCard.color !== gameState.trump) {
      if (card.value > winningCard.value) {
        winningCard = card
      }
    }
  }
  
  return winningCard.playerId || null
}

// ============================================================================
// Round and Scoring Rules
// ============================================================================

/**
 * Check if a round is complete
 */
export function isRoundComplete(gameState: GameState): boolean {
  // A round is complete when all cards have been played
  const totalCards = Object.keys(gameState.players).length * 8 // 8 cards per player
  const playedCards = Object.values(gameState.playerHands).reduce((sum, hand) => sum + (8 - hand.length), 0)
  return playedCards === totalCards
}

/**
 * Calculate round scores
 */
export function calculateRoundScores(gameState: GameState): {
  teamAScore: number
  teamBScore: number
  bettingTeamWon: boolean
} {
  const teamATricks = Object.entries(gameState.wonTricks)
    .filter(([playerId]) => gameState.players[playerId]?.team === Team.A)
    .reduce((sum, [, tricks]) => sum + tricks, 0)
    
  const teamBTricks = Object.entries(gameState.wonTricks)
    .filter(([playerId]) => gameState.players[playerId]?.team === Team.B)
    .reduce((sum, [, tricks]) => sum + tricks, 0)

  const bettingTeam = gameState.highestBet ? gameState.players[gameState.highestBet.playerId]?.team : null
  const bettingTeamTricks = bettingTeam === Team.A ? teamATricks : teamBTricks
  const requiredTricks = gameState.highestBet ? Object.values(Bets).indexOf(gameState.highestBet.value) + 6 : 6

  const bettingTeamWon = bettingTeamTricks >= requiredTricks

  return {
    teamAScore: bettingTeamWon && bettingTeam === Team.A ? 1 : (bettingTeam === Team.B ? 0 : teamATricks > teamBTricks ? 1 : 0),
    teamBScore: bettingTeamWon && bettingTeam === Team.B ? 1 : (bettingTeam === Team.A ? 0 : teamBTricks > teamATricks ? 1 : 0),
    bettingTeamWon
  }
}

/**
 * Check if the game is complete
 */
export function isGameComplete(gameState: GameState): boolean {
  const maxScore = Math.max(...Object.values(gameState.scores))
  return maxScore >= 5 // Game ends when a team reaches 5 points
}

/**
 * Get the winning team
 */
export function getWinningTeam(gameState: GameState): Team | null {
  if (!isGameComplete(gameState)) return null
  
  const teamAScore = Object.entries(gameState.scores)
    .filter(([playerId]) => gameState.players[playerId]?.team === Team.A)
    .reduce((sum, [, score]) => sum + score, 0)
    
  const teamBScore = Object.entries(gameState.scores)
    .filter(([playerId]) => gameState.players[playerId]?.team === Team.B)
    .reduce((sum, [, score]) => sum + score, 0)

  return teamAScore > teamBScore ? Team.A : Team.B
}
