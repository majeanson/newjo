import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixGamePhases() {
  try {
    console.log('🔧 Fixing game phases in database...')
    
    // Update all rooms with uppercase TEAM_SELECTION to lowercase team_selection
    const result = await prisma.room.updateMany({
      where: {
        gamePhase: 'TEAM_SELECTION'
      },
      data: {
        gamePhase: 'team_selection'
      }
    })
    
    console.log(`✅ Updated ${result.count} rooms with correct phase values`)
    
    // Also fix any other uppercase phases
    const phases = [
      { from: 'WAITING', to: 'waiting' },
      { from: 'BETS', to: 'bets' },
      { from: 'CARDS', to: 'cards' },
      { from: 'TRICK_SCORING', to: 'trick_scoring' },
      { from: 'ROUND_END', to: 'round_end' },
      { from: 'GAME_END', to: 'game_end' }
    ]
    
    for (const phase of phases) {
      const result = await prisma.room.updateMany({
        where: { gamePhase: phase.from },
        data: { gamePhase: phase.to }
      })
      if (result.count > 0) {
        console.log(`✅ Updated ${result.count} rooms from ${phase.from} to ${phase.to}`)
      }
    }
    
    console.log('🎉 All game phases fixed!')
    
  } catch (error) {
    console.error('❌ Error fixing game phases:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixGamePhases()
