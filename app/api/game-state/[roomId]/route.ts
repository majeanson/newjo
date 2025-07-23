import { NextRequest, NextResponse } from "next/server"
import { getRoomGameState } from "@/app/actions/game-actions"

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    
    console.log(`🎮 API: Getting game state for room ${roomId}`)
    
    const gameState = await getRoomGameState(roomId)
    
    if (gameState) {
      console.log(`✅ API: Game state found for room ${roomId}, phase: ${gameState.phase}`)
      return NextResponse.json({ 
        success: true, 
        gameState 
      })
    } else {
      console.log(`❌ API: No game state found for room ${roomId}`)
      return NextResponse.json({ 
        success: false, 
        error: "Game state not found" 
      }, { status: 404 })
    }
  } catch (error) {
    console.error(`❌ API: Error getting game state for room:`, error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to get game state" 
    }, { status: 500 })
  }
}
