import type { NextRequest } from "next/server"
import { eventStore } from "@/lib/events"

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Register this connection
      eventStore.registerConnection(roomId, connectionId)

      // Send connection message
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`))
      } catch (error) {
        console.error('Error sending CONNECTED message:', error)
      }

      // Subscribe to real events for this room
      const unsubscribe = eventStore.subscribe(roomId, (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (error) {
          console.error("Error sending event to room:", roomId, error)
        }
      })

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          if (!controller.desiredSize || controller.desiredSize <= 0) {
            clearInterval(heartbeat)
            return
          }

          // Update heartbeat tracking
          eventStore.updateConnectionHeartbeat(connectionId)

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "HEARTBEAT" })}\n\n`))
        } catch (error) {
          console.error('SSE heartbeat error:', error)
          clearInterval(heartbeat)
        }
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        eventStore.unregisterConnection(roomId, connectionId)
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch (error) {
          // Connection already closed
        }
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const body = await request.json()
    
    // Emit the event to the event store
    eventStore.emit({
      type: body.type,
      roomId,
      data: body.data,
      ...(body.playerId && { playerId: body.playerId })
    } as any)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error handling game event:", error)
    return Response.json({ success: false, error: "Failed to process event" }, { status: 500 })
  }
}
