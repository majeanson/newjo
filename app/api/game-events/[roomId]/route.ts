import type { NextRequest } from "next/server"
import { eventStore } from "@/lib/events"

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`))

      // Subscribe to real events for this room
      const unsubscribe = eventStore.subscribe(roomId, (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (error) {
          console.error("Error sending event:", error)
        }
      })

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "HEARTBEAT" })}\n\n`))
        } catch (error) {
          console.log(error);
          clearInterval(heartbeat)
        }
      }, 30000)

      // Cleanup when connection closes
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch (error) {
          console.log(error);
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
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
