import {
  GamePhase,
  CardColor,
  Team,
  Card,
  Bet,
  GameState,
  Bets,
  BetsNumericValue,
  CARDS_PER_PLAYER,
  MAX_PLAYERS,
  CARD_VALUES,
  CARD_COLORS,
  BONHOMME_ROUGE_POINTS,
  BONHOMME_BRUN_POINTS,
  BASE_TRICK_POINTS
} from './game-types'

// Team and seat selection logic
export function canSelectTeam(gameState: GameState, playerId: string, team: Team): boolean {
  const players = Object.values(gameState.players)
  const teamACount = players.filter(p => p.team === Team.A).length
  const teamBCount = players.filter(p => p.team === Team.B).length
  
  // Each team can have max 2 players
  if (team === Team.A && teamACount >= 2) return false
  if (team === Team.B && teamBCount >= 2) return false
  
  return true
}

export function selectTeam(gameState: GameState, playerId: string, team: Team): GameState {
  if (!canSelectTeam(gameState, playerId, team)) {
    throw new Error('Cannot select this team')
  }
  
  return {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: {
        ...gameState.players[playerId],
        team
      }
    }
  }
}

export function canSelectSeat(gameState: GameState, playerId: string, seatPosition: number): boolean {
  if (seatPosition < 0 || seatPosition >= MAX_PLAYERS) return false
  
  const players = Object.values(gameState.players)
  const seatTaken = players.some(p => p.seatPosition === seatPosition)
  
  return !seatTaken
}

export function selectSeat(gameState: GameState, playerId: string, seatPosition: number): GameState {
  if (!canSelectSeat(gameState, playerId, seatPosition)) {
    throw new Error('Seat is already taken')
  }
  
  return {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: {
        ...gameState.players[playerId],
        seatPosition
      }
    }
  }
}

// Check if all players are ready for next phase
export function areAllPlayersReady(gameState: GameState): boolean {
  const players = Object.values(gameState.players)
  return players.length === MAX_PLAYERS && players.every(p => p.isReady)
}

export function areTeamsBalanced(gameState: GameState): boolean {
  const players = Object.values(gameState.players)
  const teamACount = players.filter(p => p.team === Team.A).length
  const teamBCount = players.filter(p => p.team === Team.B).length
  
  return teamACount === 2 && teamBCount === 2
}

export function areSeatsSelected(gameState: GameState): boolean {
  const players = Object.values(gameState.players)
  return players.every(p => p.seatPosition !== undefined)
}

// Generate turn order based on seat positions
export function generateTurnOrder(gameState: GameState): string[] {
  const players = Object.values(gameState.players)
  return players
    .sort((a, b) => (a.seatPosition || 0) - (b.seatPosition || 0))
    .map(p => p.id)
}

// Betting logic
export function canPlaceBet(
  gameState: GameState,
  playerId: string,
  bet: Omit<Bet, 'playerId' | 'timestamp'>
): boolean {
  // Must be player's turn
  if (gameState.currentTurn !== playerId) {
    return false
  }

  // Must be in betting phase
  if (gameState.phase !== GamePhase.BETS) {
    return false
  }

  // Player must not have already bet
  if (gameState.bets[playerId]) {
    return false
  }

  // Bet must be valid
  if (!bet || !bet.betValue) {
    return false
  }

  // Get all existing bets (excluding nulls)
  const existingBets = Object.values(gameState.bets).filter((b): b is Bet => b !== null && b !== undefined)
  const highestBet = existingBets.length > 0 ? getHighestBet(existingBets) : null

  // Skip bet validation
  if (bet.betValue === Bets.SKIP) {
    return validateSkipBet(existingBets, gameState.turnOrder || [], playerId, gameState.bets)
  }

  // Regular bet validation
  return validateRegularBet(bet, highestBet)
}

/**
 * Validates if a skip bet is allowed
 */
function validateSkipBet(
  existingBets: Bet[],
  turnPlayerIds: string[],
  playerId: string,
  playerBets: Record<string, Bet>
): boolean {
  // Check if this is the last player to bet
  const betsPlaced = Object.keys(playerBets).filter(id => playerBets[id] !== null).length
  const isLastToBet = betsPlaced === turnPlayerIds.length - 1

  // Last player can't skip if everyone else has skipped (someone must bet)
  if (isLastToBet) {
    const hasRealBet = existingBets.some(bet => bet.betValue !== Bets.SKIP)
    if (!hasRealBet) {
      return false // Last player must bet if no one else has
    }
  }

  // All other players (including first player) can always skip
  return true
}

/**
 * Validates if a regular (non-skip) bet is allowed
 */
function validateRegularBet(bet: Omit<Bet, 'playerId' | 'timestamp'>, highestBet: Bet | null): boolean {
  // If no existing bets, any bet 7+ is valid (minimum bet is 7)
  if (!highestBet) {
    return bet.value >= 7
  }

  // Skip bets don't count as "real" bets for comparison
  if (highestBet.betValue === Bets.SKIP) {
    return bet.value >= 7
  }

  // Must bet higher than current highest
  if (bet.value > highestBet.value) {
    return true
  }

  // Same value is only allowed if upgrading from trump to no-trump
  if (bet.value === highestBet.value) {
    return !bet.trump && highestBet.trump
  }

  return false
}

/**
 * Gets all possible bet values
 */
export function getAllBets(): Omit<Bet, 'playerId' | 'timestamp'>[] {
  return Object.values(Bets).map(betValue => ({
    betValue,
    value: BetsNumericValue[betValue],
    trump: false // Skip is always no-trump, others default to no-trump (can be changed)
  }))
}

export function placeBet(gameState: GameState, playerId: string, betValue: Bets, trump: boolean): GameState {
  const bet: Bet = {
    playerId,
    betValue,
    value: BetsNumericValue[betValue],
    trump,
    timestamp: new Date()
  }
  
  if (!canPlaceBet(gameState, playerId, bet)) {
    throw new Error('Cannot place this bet')
  }
  
  const newGameState = {
    ...gameState,
    bets: {
      ...gameState.bets,
      [playerId]: bet
    }
  }
  
  // Move to next player
  const currentIndex = gameState.turnOrder.indexOf(playerId)
  const nextIndex = (currentIndex + 1) % gameState.turnOrder.length
  newGameState.currentTurn = gameState.turnOrder[nextIndex]
  
  return newGameState
}

/**
 * Finds the highest bet among all placed bets
 */
export function getHighestBet(bets: Bet[]): Bet | null {
  if (bets.length === 0) return null

  console.log('🔍 DEBUGGING getHighestBet: Input bets:', bets.map(bet => ({
    playerId: bet.playerId,
    value: bet.value,
    trump: bet.trump,
    betValue: bet.betValue
  })))

  const result = bets.reduce((highest, current) => {
    console.log('🔍 Comparing:', {
      current: { playerId: current.playerId, value: current.value, trump: current.trump },
      highest: { playerId: highest.playerId, value: highest.value, trump: highest.trump }
    })

    // Compare values first - higher value always wins
    if (current.value > highest.value) {
      console.log('🔍 Current wins: higher value')
      return current
    }
    if (current.value < highest.value) {
      console.log('🔍 Highest wins: higher value')
      return highest
    }

    // If values are equal, no-trump beats trump (7 no-trump > 7 trump)
    if (current.value === highest.value) {
      if (!current.trump && highest.trump) {
        console.log('🔍 Current wins: no-trump beats trump at same value')
        return current
      }
      if (current.trump && !highest.trump) {
        console.log('🔍 Highest wins: no-trump beats trump at same value')
        return highest
      }
    }

    // If we get here, they're equal in all aspects
    console.log('🔍 Highest wins: equal bets, keeping first one')
    return highest
  })

  console.log('🔍 DEBUGGING getHighestBet: Winner:', {
    playerId: result.playerId,
    value: result.value,
    trump: result.trump,
    betValue: result.betValue
  })

  return result
}

export function areAllBetsPlaced(gameState: GameState): boolean {
  const playerIds = gameState.turnOrder
  return playerIds.every(id => gameState.bets[id] !== undefined)
}

// Card dealing logic
export function createDeck(): Card[] {
  const deck: Card[] = []
  let cardId = 0
  
  for (const color of CARD_COLORS) {
    for (const value of CARD_VALUES) {
      deck.push({
        id: `${color}-${value}-${cardId++}`,
        color,
        value,
        playerId: '',
        trickNumber: 0,
        playOrder: 0
      })
    }
  }
  
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(gameState: GameState): GameState {
  const deck = shuffleDeck(createDeck())
  const playerHands: Record<string, Card[]> = {}

  // Deal cards to each player
  gameState.turnOrder.forEach((playerId, playerIndex) => {
    playerHands[playerId] = []
    for (let cardIndex = 0; cardIndex < CARDS_PER_PLAYER; cardIndex++) {
      const deckIndex = playerIndex * CARDS_PER_PLAYER + cardIndex
      const card = { ...deck[deckIndex], playerId }
      playerHands[playerId].push(card)
    }
  })

  return {
    ...gameState,
    playerHands,
    playedCards: {},
    wonTricks: gameState.turnOrder.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
  }
}

// Card playing logic
export function canPlayCard(gameState: GameState, playerId: string, card: Card): boolean {
  console.log(`🃏 canPlayCard - Player: ${playerId}, Card: ${card.color}-${card.value} (${card.id})`)

  if (gameState.phase !== GamePhase.CARDS) {
    console.log(`❌ Not in CARDS phase (current: ${gameState.phase})`)
    return false
  }

  if (gameState.currentTurn !== playerId) {
    console.log(`❌ Not player's turn (current: ${gameState.currentTurn})`)
    return false
  }

  const playerHand = gameState.playerHands[playerId] || []
  console.log(`🎯 Player hand: ${playerHand.map(c => `${c.color}-${c.value}`).join(', ')}`)

  const hasCard = playerHand.some(c => c.id === card.id)
  if (!hasCard) {
    console.log(`❌ Card not in player's hand`)
    return false
  }

  const playedCards = Object.values(gameState.playedCards).sort((a, b) => a.playOrder - b.playOrder)
  const firstCard = playedCards[0]
  console.log(`🎴 Played cards this trick (in order): ${playedCards.map(c => `${c.color}-${c.value} (${c.playOrder})`).join(', ')}`)

  // If this is the first card of the trick, any card can be played
  if (!firstCard) {
    console.log(`✅ First card of trick - any card allowed`)
    return true
  }

  // Must follow suit if possible, but trump cards can always be played
  const firstColor = firstCard.color
  const trump = gameState.trump
  console.log(`🎨 First card color (must follow): ${firstColor}`)
  console.log(`👑 Trump color: ${trump}`)

  const cardsOfFirstColor = playerHand.filter(c => c.color === firstColor)
  const hasColorInHand = cardsOfFirstColor.length > 0
  console.log(`🎯 Cards of ${firstColor} in hand: ${cardsOfFirstColor.map(c => `${c.color}-${c.value}`).join(', ')}`)
  console.log(`🔍 Has ${firstColor} in hand: ${hasColorInHand}`)
  console.log(`🎴 Trying to play: ${card.color}-${card.value}`)

  // Check if the card being played is trump
  const isPlayingTrump = trump && card.color === trump
  console.log(`👑 Playing trump card: ${isPlayingTrump}`)

  // Can play if:
  // 1. Same color as first card (following suit)
  // 2. Don't have any cards of the first color (can't follow suit)
  // 3. Playing a trump card (trump can always be played)
  const canPlay = card.color === firstColor || !hasColorInHand || isPlayingTrump
  console.log(`✅ Can play card: ${canPlay} (same color: ${card.color === firstColor}, no color in hand: ${!hasColorInHand}, trump: ${isPlayingTrump})`)

  return canPlay
}

export function playCard(gameState: GameState, playerId: string, card: Card): GameState {
  if (!canPlayCard(gameState, playerId, card)) {
    throw new Error('Cannot play this card')
  }

  const playerHand = gameState.playerHands[playerId] || []
  const newHand = playerHand.filter(c => c.id !== card.id)

  const playedCards = Object.values(gameState.playedCards)
  const playOrder = playedCards.length + 1

  const playedCard = {
    ...card,
    playOrder,
    trickNumber: gameState.round
  }

  const newGameState = {
    ...gameState,
    playerHands: {
      ...gameState.playerHands,
      [playerId]: newHand
    },
    playedCards: {
      ...gameState.playedCards,
      [playerId]: playedCard
    }
  }

  // Set trump on first card if highest bet was with trump
  if (playedCards.length === 0 && gameState.highestBet?.trump) {
    newGameState.trump = card.color
  }

  // Move to next player
  const currentIndex = gameState.turnOrder.indexOf(playerId)
  const nextIndex = (currentIndex + 1) % gameState.turnOrder.length
  newGameState.currentTurn = gameState.turnOrder[nextIndex]

  return newGameState
}

export function getWinningCard(cards: Card[], trump?: CardColor): Card | null {
  if (cards.length === 0) return null

  const leadColor = cards[0].color

  return cards.reduce((best, current) => {
    const bestIsTrump = best.color === trump
    const currentIsTrump = current.color === trump

    // Trump beats non-trump
    if (currentIsTrump && !bestIsTrump) return current
    if (!currentIsTrump && bestIsTrump) return best

    // Following lead suit beats non-lead suit (when no trump involved)
    const bestFollowsLead = best.color === leadColor
    const currentFollowsLead = current.color === leadColor

    if (currentFollowsLead && !bestFollowsLead) return current
    if (!currentFollowsLead && bestFollowsLead) return best

    // Higher value wins within same category
    return current.value > best.value ? current : best
  }, cards[0])
}

export function calculateTrickPoints(cards: Card[]): number {
  let points = BASE_TRICK_POINTS

  const hasBonhommeRouge = cards.some(c => c.color === CardColor.RED && c.value === 0)
  const hasBonhommeBrun = cards.some(c => c.color === CardColor.BROWN && c.value === 0)

  if (hasBonhommeRouge) points += BONHOMME_ROUGE_POINTS
  if (hasBonhommeBrun) points += BONHOMME_BRUN_POINTS

  return points
}

export function isTrickComplete(gameState: GameState): boolean {
  const playedCards = Object.values(gameState.playedCards)
  return playedCards.length === gameState.turnOrder.length
}

export function isRoundComplete(gameState: GameState): boolean {
  // Round is complete when all players have no cards left
  return gameState.turnOrder.every(playerId => {
    const hand = gameState.playerHands[playerId] || []
    return hand.length === 0
  })
}

export function processTrickWin(gameState: GameState): GameState {
  if (!isTrickComplete(gameState)) {
    throw new Error('Trick is not complete')
  }

  const playedCards = Object.values(gameState.playedCards).sort((a, b) => a.playOrder - b.playOrder)
  const winningCard = getWinningCard(playedCards, gameState.trump)

  if (!winningCard) {
    throw new Error('No winning card found')
  }

  const winningPlayerId = winningCard.playerId
  const points = calculateTrickPoints(playedCards)

  const newGameState = {
    ...gameState,
    wonTricks: {
      ...gameState.wonTricks,
      [winningPlayerId]: (gameState.wonTricks[winningPlayerId] || 0) + points
    },
    playedCards: {}, // Clear played cards
    currentTurn: winningPlayerId, // Winner starts next trick
    starter: winningPlayerId
  }

  // If round is complete, move to scoring phase
  if (isRoundComplete(newGameState)) {
    newGameState.phase = GamePhase.TRICK_SCORING
  }

  return newGameState
}

// Round scoring logic
export function calculateRoundScores(gameState: GameState): { teamAScore: number; teamBScore: number; bettingTeamWon: boolean } {
  if (!gameState.highestBet) {
    throw new Error('No highest bet found')
  }

  const highestBet = gameState.highestBet
  const bettingPlayerId = highestBet.playerId
  const bettingPlayerTeam = gameState.players[bettingPlayerId].team

  if (!bettingPlayerTeam) {
    throw new Error('Betting player has no team')
  }

  // Get all players in each team
  const teamAPlayers = Object.values(gameState.players).filter(p => p.team === Team.A)
  const teamBPlayers = Object.values(gameState.players).filter(p => p.team === Team.B)

  // Calculate total tricks won by each team
  const teamATricks = teamAPlayers.reduce((sum, player) => sum + (gameState.wonTricks[player.id] || 0), 0)
  const teamBTricks = teamBPlayers.reduce((sum, player) => sum + (gameState.wonTricks[player.id] || 0), 0)

  const bettingTeamTricks = bettingPlayerTeam === Team.A ? teamATricks : teamBTricks
  const defendingTeamTricks = bettingPlayerTeam === Team.A ? teamBTricks : teamATricks

  const bettingTeamWon = bettingTeamTricks >= highestBet.value

  let bettingTeamScore = 0
  let defendingTeamScore = 0

  if (bettingTeamWon) {
    // Betting team made their bet
    const extraTricks = bettingTeamTricks - highestBet.value
    bettingTeamScore = extraTricks * (highestBet.trump ? 1 : 2)
    defendingTeamScore = defendingTeamTricks
  } else {
    // Betting team failed their bet
    bettingTeamScore = -bettingTeamTricks * (highestBet.trump ? 1 : 2)
    defendingTeamScore = defendingTeamTricks
  }

  return {
    teamAScore: bettingPlayerTeam === Team.A ? bettingTeamScore : defendingTeamScore,
    teamBScore: bettingPlayerTeam === Team.B ? bettingTeamScore : defendingTeamScore,
    bettingTeamWon
  }
}

export function processRoundEnd(gameState: GameState): GameState {
  const { teamAScore, teamBScore } = calculateRoundScores(gameState)

  // Update scores
  const newScores = { ...gameState.scores }
  Object.values(gameState.players).forEach(player => {
    if (player.team === Team.A) {
      newScores[player.id] = (newScores[player.id] || 0) + teamAScore
    } else if (player.team === Team.B) {
      newScores[player.id] = (newScores[player.id] || 0) + teamBScore
    }
  })

  // Reset for next round
  const newGameState = {
    ...gameState,
    scores: newScores,
    round: gameState.round + 1,
    phase: GamePhase.BETS,
    playedCards: {},
    wonTricks: gameState.turnOrder.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
    bets: {},
    highestBet: undefined,
    trump: undefined
  }

  // Deal new cards
  const gameStateWithCards = dealCards(newGameState)

  // Set new dealer and starter (rotate)
  const currentDealerIndex = gameState.turnOrder.indexOf(gameState.dealer)
  const newDealerIndex = (currentDealerIndex + 1) % gameState.turnOrder.length
  const newStarterIndex = (newDealerIndex + 1) % gameState.turnOrder.length

  gameStateWithCards.dealer = gameState.turnOrder[newDealerIndex]
  gameStateWithCards.starter = gameState.turnOrder[newStarterIndex]
  gameStateWithCards.currentTurn = gameStateWithCards.starter

  return gameStateWithCards
}
