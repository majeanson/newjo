import { prisma } from "./prisma"

// Create a new room
export async function createRoom(name: string, hostId: string) {
  try {
    const room = await prisma.room.create({
      data: {
        name,
        hostId,
        isActive: true
      },
      include: {
        host: true,
        members: {
          include: {
            user: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    })

    // Add the host as the first member
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: hostId
      }
    })

    // Return the room with updated member count
    return await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        host: true,
        members: {
          include: {
            user: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    })
  } catch (error) {
    console.error("Database error creating room:", error)
    throw new Error("Failed to create room")
  }
}

// Get all active rooms
export async function getRooms() {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        isActive: true
      },
      include: {
        host: true,
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return rooms
  } catch (error) {
    console.error("Database error getting rooms:", error)
    throw new Error("Failed to get rooms")
  }
}

// Join a room
export async function joinRoom(roomId: string, userId: string): Promise<boolean> {
  try {
    // Check if room exists and is active
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: true
      }
    })

    if (!room || !room.isActive) {
      console.log("Room not found or inactive")
      return false
    }

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
      console.log("User already a member")
      return true // Already a member, consider it success
    }

    // Check if room is full (max 4 players)
    if (room.members.length >= 4) {
      console.log("Room is full")
      return false
    }

    // Add user to room
    await prisma.roomMember.create({
      data: {
        roomId,
        userId
      }
    })

    console.log(`User ${userId} successfully joined room ${roomId}`)
    return true
  } catch (error) {
    console.error("Database error joining room:", error)
    return false
  }
}
