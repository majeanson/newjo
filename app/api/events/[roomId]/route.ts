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


