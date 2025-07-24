import type { NextRequest } from "next/server"
import { eventStore } from "@/lib/events"

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  console.log('🔌 SSE connection requested for room:', roomId, 'connectionId:', connectionId)

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      console.log('🔌 SSE stream started for room:', roomId, 'connectionId:', connectionId)

      // Register this connection
      console.log('🔌 About to register connection with EventStore')
      eventStore.registerConnection(roomId, connectionId)
      console.log('🔌 Connection registered successfully')

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
          console.log('📡 SSE sending event to room:', roomId, 'event:', event.type, 'connectionId:', connectionId)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (error) {
          console.error("❌ Error sending event to room:", roomId, 'connectionId:', connectionId, error)
        }
      })
      console.log('✅ SSE subscribed to events for room:', roomId, 'connectionId:', connectionId)

      // Log current counts after connection
      const listenerCount = eventStore.getListenerCount(roomId)
      const connectionCount = eventStore.getConnectionCount(roomId)
      console.log('📊 SSE listeners after connection:', listenerCount)
      console.log('📊 SSE connections after connection:', connectionCount)

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          if (!controller.desiredSize || controller.desiredSize <= 0) {
            console.log('🔌 SSE stream closed, stopping heartbeat for room:', roomId, 'connectionId:', connectionId)
            clearInterval(heartbeat)
            return
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "HEARTBEAT" })}\n\n`))
        } catch (error) {
          console.error('❌ SSE heartbeat error for room:', roomId, 'connectionId:', connectionId, error)
          clearInterval(heartbeat)
        }
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        console.log('🔌 SSE connection closed for room:', roomId, 'connectionId:', connectionId)

        // Unregister this connection
        eventStore.unregisterConnection(roomId, connectionId)

        const remainingListeners = eventStore.getListenerCount(roomId)
        const remainingConnections = eventStore.getConnectionCount(roomId)
        console.log('📊 Remaining SSE listeners after disconnect:', remainingListeners)
        console.log('📊 Remaining SSE connections after disconnect:', remainingConnections)

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
