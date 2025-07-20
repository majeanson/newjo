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
        let closed = false

        const sendEvent = (data: any) => {
          if (closed) return
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(message))
          } catch (error) {
            console.error('Error sending SSE event:', error)
            if (!closed) {
              closed = true
              controller.close()
            }
          }
        }

        // Send initial connection message
        sendEvent({
          type: 'connected',
          timestamp: new Date().toISOString()
        })

        // Send initial game state
        sendEvent({
          type: 'game_state',
          data: gameState,
          timestamp: new Date().toISOString()
        })

        // Subscribe to real-time events for this room
        const unsubscribe = eventStore.subscribe(roomId, (event) => {
          sendEvent({
            type: 'game_event',
            data: event,
            timestamp: new Date().toISOString()
          })
        })

        // Set up periodic heartbeat (every 30 seconds)
        const heartbeat = setInterval(() => {
          sendEvent({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })
        }, 30000)

        // Clean up on close
        const cleanup = () => {
          if (closed) return
          closed = true
          clearInterval(heartbeat)
          unsubscribe()
          try {
            controller.close()
          } catch (error) {
            // Controller already closed
          }
        }

        request.signal.addEventListener('abort', cleanup)

        // Also cleanup if the controller errors
        controller.error = cleanup
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
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
