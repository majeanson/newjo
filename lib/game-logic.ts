import { 
  GamePhase, 
  CardColor, 
  Team, 
  Card, 
  Bet, 
  Player, 
  GameState, 
  TrickResult,
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
export function canPlaceBet(gameState: GameState, playerId: string, bet: Omit<Bet, 'playerId' | 'timestamp'>): boolean {
  if (gameState.phase !== GamePhase.BETS) return false
  if (gameState.currentTurn !== playerId) return false
  if (bet.value < 0 || bet.value > 8) return false
  
  return true
}

export function placeBet(gameState: GameState, playerId: string, betValue: number, trump: boolean): GameState {
  const bet: Bet = {
    playerId,
    value: betValue,
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

export function getHighestBet(bets: Bet[]): Bet | undefined {
  if (bets.length === 0) return undefined
  
  const nonSkipBets = bets.filter(bet => bet.value !== 0)
  if (nonSkipBets.length === 0) {
    return bets[0] // Return first bet if all are skip
  }
  
  return [...nonSkipBets].sort((a, b) => {
    if (a.value !== b.value) return b.value - a.value
    return a.trump === b.trump ? 0 : !a.trump ? -1 : 1
  })[0]
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
