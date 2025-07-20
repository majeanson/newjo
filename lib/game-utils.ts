// Standard deck of cards
export const CARD_SUITS = ["♠", "♥", "♦", "♣"] as const
export const CARD_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const

export function createDeck(): string[] {
  const deck: string[] = []
  for (const suit of CARD_SUITS) {
    for (const value of CARD_VALUES) {
      deck.push(`${value}${suit}`)
    }
  }
  return shuffleDeck(deck)
}

export function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function drawCard(deck: string[]): { card: string | null; remainingDeck: string[] } {
  if (deck.length === 0) {
    return { card: null, remainingDeck: [] }
  }
  const [card, ...remainingDeck] = deck
  return { card, remainingDeck }
}
