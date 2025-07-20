import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/app/actions/auth"
import { getRoomGameState } from "@/app/actions/game-actions"
import { eventStore } from "@/lib/events"

// GET /api/game-events/[roomId] - Server-Sent Events for real-time updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { roomId } = await params

    // Check if user is member of the room
    const gameState = await getRoomGameState(roomId)
    if (!gameState || !gameState.players[user.id]) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Create Server-Sent Events stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString()
        })}\n\n`))

        // Send initial game state
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'game_state',
          data: gameState,
          timestamp: new Date().toISOString()
        })}\n\n`))

        // Subscribe to real-time events for this room
        const unsubscribe = eventStore.subscribe(roomId, (event) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'game_event',
              data: event,
              timestamp: new Date().toISOString()
            })}\n\n`))
          } catch (error) {
            console.error('Error sending game event:', error)
          }
        })

        // Set up periodic heartbeat (every 30 seconds)
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`))
          } catch (error) {
            console.error('Heartbeat error:', error)
            clearInterval(heartbeat)
            unsubscribe()
            try {
              controller.close()
            } catch (closeError) {
              console.log('Controller already closed')
            }
          }
        }, 30000)

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          unsubscribe()
          try {
            controller.close()
          } catch (error) {
            console.log('Controller already closed')
          }
        })
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error) {
    console.error("Game events error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// POST /api/game-events/[roomId] - Send game event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { roomId } = await params
    const body = await request.json()

    // Validate event data
    if (!body.type) {
      return new NextResponse("Event type required", { status: 400 })
    }

    // Check if user is member of the room
    const gameState = await getRoomGameState(roomId)
    if (!gameState || !gameState.players[user.id]) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Process the event based on type
    switch (body.type) {
      case 'player_ready':
        // Handle player ready state change
        break
      case 'chat_message':
        // Handle chat message
        break
      default:
        return new NextResponse("Unknown event type", { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Game event post error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
