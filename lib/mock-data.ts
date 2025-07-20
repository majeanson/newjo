// Mock data for preview environment when Prisma is not available

export type User = {
  id: string
  name: string
  createdAt: Date
}

export type Room = {
  id: string
  name: string
  hostId: string
  isActive: boolean
  currentDeck: string[]
  createdAt: Date
  host: User
  members: Array<{ user: User }>
  playedCards: Array<{
    id: string
    card: string
    playedAt: Date
    user: User
  }>
  _count: { members: number }
}

// Mock users
export const mockUsers: User[] = [
  { id: "1", name: "Alice", createdAt: new Date() },
  { id: "2", name: "Bob", createdAt: new Date() },
  { id: "3", name: "Charlie", createdAt: new Date() },
]

// Mock rooms
export const mockRooms: Room[] = [
  {
    id: "room1",
    name: "Poker Night",
    hostId: "1",
    isActive: true,
    currentDeck: ["A♠", "K♥", "Q♦", "J♣", "10♠"],
    createdAt: new Date(),
    host: mockUsers[0],
    members: [{ user: mockUsers[0] }, { user: mockUsers[1] }],
    playedCards: [
      {
        id: "play1",
        card: "A♠",
        playedAt: new Date(),
        user: mockUsers[0],
      },
    ],
    _count: { members: 2 },
  },
  {
    id: "room2",
    name: "Quick Game",
    hostId: "2",
    isActive: true,
    currentDeck: ["K♠", "Q♥", "J♦", "10♣"],
    createdAt: new Date(),
    host: mockUsers[1],
    members: [{ user: mockUsers[1] }],
    playedCards: [],
    _count: { members: 1 },
  },
]

// Mock current user
export const mockCurrentUser = mockUsers[0]
