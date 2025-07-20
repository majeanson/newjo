import { prisma } from "./prisma"

export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}

export async function getCurrentUser(): Promise<User | null> {
  // This will be handled by auth actions
  return null
}

export async function getRooms(): Promise<Room[]> {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        host: true,
        members: {
          include: {
            user: true
          }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return rooms
  } catch (error) {
    console.error("Failed to get rooms:", error)
    return []
  }
}

export async function getRoomData(roomId: string) {
  return await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      host: true,
      members: {
        include: {
          user: true
        }
      }
    }
  })
}

export async function createUser(name: string): Promise<User> {
  try {
    const user = await prisma.user.create({
      data: { name }
    })
    return user
  } catch (error) {
    console.error("Failed to create user:", error)
    throw new Error("Failed to create user")
  }
}

export async function createRoom(name: string, hostId: string): Promise<Room> {
  try {
    const room = await prisma.room.create({
      data: {
        name,
        hostId,
      },
      include: {
        host: true,
        members: {
          include: {
            user: true
          }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    // Add host as first member
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: hostId
      }
    })

    return room
  } catch (error) {
    console.error("Failed to create room:", error)
    throw new Error("Failed to create room")
  }
}

export async function joinRoom(roomId: string, userId: string): Promise<boolean> {
  try {
    // Check if user is already a member
    const existingMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      }
    })

    if (existingMember) {
      // User is already a member, return success
      return true
    }

    await prisma.roomMember.create({
      data: {
        roomId,
        userId
      }
    })
    return true
  } catch (error) {
    console.error("Failed to join room:", error)
    return false
  }
}

// playCard function removed - now handled by game-actions.ts

// Types (matching Prisma schema)
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
  createdAt: Date
  updatedAt: Date
  host: User
  members: Array<{ user: User }>
  _count?: { members: number }
}



