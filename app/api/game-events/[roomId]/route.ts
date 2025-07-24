import type { NextRequest } from "next/server"
import { eventStore } from "@/lib/events"

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  console.log('🔌 SSE connection requested for room:', roomId)

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      console.log('🔌 SSE stream started for room:', roomId)

      // Send connection message
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`))
        console.log('✅ SSE CONNECTED message sent for room:', roomId)
      } catch (error) {
        console.error('❌ Error sending CONNECTED message:', error)
      }

      // Subscribe to real events for this room
      const unsubscribe = eventStore.subscribe(roomId, (event) => {
        try {
          console.log('📡 SSE sending event to room:', roomId, 'event:', event.type)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (error) {
          console.error("❌ Error sending event to room:", roomId, error)
        }
      })
      console.log('✅ SSE subscribed to events for room:', roomId)
      console.log('✅ SSE client connected and subscribed to room:', roomId)

      // Log current listener count after connection
      const listenerCount = eventStore.getListenerCount(roomId)
      console.log('📊 SSE listeners after connection:', listenerCount)

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          if (!controller.desiredSize || controller.desiredSize <= 0) {
            console.log('🔌 SSE stream closed, stopping heartbeat for room:', roomId)
            clearInterval(heartbeat)
            return
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "HEARTBEAT" })}\n\n`))
        } catch (error) {
          console.error('❌ SSE heartbeat error for room:', roomId, error)
          clearInterval(heartbeat)
        }
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        console.log('🔌 SSE connection closed for room:', roomId)
        const remainingListeners = eventStore.getListenerCount(roomId)
        console.log('📊 Remaining SSE listeners after disconnect:', remainingListeners)
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
