/**
 * Database Repository Pattern
 * 
 * This file implements the repository pattern for all database operations
 * providing a clean abstraction layer over Prisma with type safety.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { prisma } from "@/lib/prisma"
import { GameState, Player } from "@/lib/game-types"
import { validateGameState } from "@/lib/type-guards"

// ============================================================================
// Base Repository Interface
// ============================================================================

export interface BaseRepository<T, K = string> {
  findById(id: K): Promise<T | null>
  findMany(filter?: Partial<T>): Promise<T[]>
  create(data: Omit<T, 'id'>): Promise<T>
  update(id: K, data: Partial<T>): Promise<T>
  delete(id: K): Promise<boolean>
  exists(id: K): Promise<boolean>
}

// ============================================================================
// Room Repository
// ============================================================================

export interface RoomData {
  id: string
  gamePhase: string | null
  currentRound: number | null
  currentTurn: string | null
  dealerUserId: string | null
  starterUserId: string | null
  trumpColor: string | null
  playerHands: any
  playedCards: any
  playerBets: any
  playerTeams: any
  playerSeats: any
  playerReady: any
  wonTricks: any
  gameScores: any
  highestBetUserId: string | null
  highestBetValue: number | null
  highestBetTrump: boolean | null
  members: Array<{
    userId: string
    user: { name: string | null }
  }>
}

export class RoomRepository implements BaseRepository<RoomData> {
  async findById(id: string): Promise<RoomData | null> {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    })

    return room as RoomData | null
  }

  async findMany(filter?: Partial<RoomData>): Promise<RoomData[]> {
    const rooms = await prisma.room.findMany({
      where: filter,
      include: {
        members: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    })

    return rooms as RoomData[]
  }

  async create(data: Omit<RoomData, 'id' | 'members'>): Promise<RoomData> {
    const room = await prisma.room.create({
      data,
      include: {
        members: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    })

    return room as RoomData
  }

  async update(id: string, data: Partial<RoomData>): Promise<RoomData> {
    const room = await prisma.room.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    })

    return room as RoomData
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.room.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  }

  async exists(id: string): Promise<boolean> {
    const count = await prisma.room.count({ where: { id } })
    return count > 0
  }

  // Room-specific methods
  async getGameState(roomId: string): Promise<GameState | null> {
    const roomData = await this.findById(roomId)
    if (!roomData) return null

    // Convert room data to game state
    const gameState = this.convertToGameState(roomData)
    return validateGameState(gameState)
  }

  async saveGameState(roomId: string, gameState: GameState): Promise<void> {
    const roomData = this.convertFromGameState(gameState)
    await this.update(roomId, roomData)
  }

  private convertToGameState(roomData: RoomData): GameState {
    // Implementation would convert room data to game state
    // This is a simplified version
    return {
      phase: roomData.gamePhase as any,
      round: roomData.currentRound || 1,
      currentTurn: roomData.currentTurn || '',
      dealer: roomData.dealerUserId || '',
      starter: roomData.starterUserId || '',
      trump: roomData.trumpColor as any,
      players: {},
      bets: roomData.playerBets || {},
      playedCards: roomData.playedCards || {},
      playerHands: roomData.playerHands || {},
      wonTricks: roomData.wonTricks || {},
      scores: roomData.gameScores || {},
      turnOrder: [],
      highestBet: roomData.highestBetUserId ? {
        playerId: roomData.highestBetUserId,
        value: roomData.highestBetValue as any,
        trump: roomData.highestBetTrump || false
      } : undefined
    }
  }

  private convertFromGameState(gameState: GameState): Partial<RoomData> {
    return {
      gamePhase: gameState.phase,
      currentRound: gameState.round,
      currentTurn: gameState.currentTurn,
      dealerUserId: gameState.dealer,
      starterUserId: gameState.starter,
      trumpColor: gameState.trump,
      playerHands: gameState.playerHands as any,
      playedCards: gameState.playedCards as any,
      playerBets: gameState.bets as any,
      wonTricks: gameState.wonTricks as any,
      gameScores: gameState.scores as any,
      highestBetUserId: gameState.highestBet?.playerId,
      highestBetValue: gameState.highestBet?.value as any,
      highestBetTrump: gameState.highestBet?.trump
    }
  }
}

// ============================================================================
// User Repository
// ============================================================================

export interface UserData {
  id: string
  name: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
}

export class UserRepository implements BaseRepository<UserData> {
  async findById(id: string): Promise<UserData | null> {
    return await prisma.user.findUnique({ where: { id } }) as UserData | null
  }

  async findMany(filter?: Partial<UserData>): Promise<UserData[]> {
    return await prisma.user.findMany({ where: filter }) as UserData[]
  }

  async create(data: Omit<UserData, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserData> {
    return await prisma.user.create({ data }) as UserData
  }

  async update(id: string, data: Partial<UserData>): Promise<UserData> {
    return await prisma.user.update({ where: { id }, data }) as UserData
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  }

  async exists(id: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { id } })
    return count > 0
  }

  // User-specific methods
  async findByEmail(email: string): Promise<UserData | null> {
    return await prisma.user.findUnique({ where: { email } }) as UserData | null
  }

  async getUserRooms(userId: string): Promise<RoomData[]> {
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            members: {
              include: {
                user: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    })

    return memberships.map(m => m.room) as RoomData[]
  }
}

// ============================================================================
// Repository Factory
// ============================================================================

export class RepositoryFactory {
  private static roomRepository: RoomRepository
  private static userRepository: UserRepository

  static getRoomRepository(): RoomRepository {
    if (!this.roomRepository) {
      this.roomRepository = new RoomRepository()
    }
    return this.roomRepository
  }

  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository()
    }
    return this.userRepository
  }
}

// ============================================================================
// Global Repository Instances
// ============================================================================

export const roomRepository = RepositoryFactory.getRoomRepository()
export const userRepository = RepositoryFactory.getUserRepository()
