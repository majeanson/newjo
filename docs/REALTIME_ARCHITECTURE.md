# Real-Time Game State Management Architecture

## Overview

This system provides real-time, granular updates for multiplayer game state using Server-Sent Events (SSE) with atomic state changes. Each game action triggers specific, typed events that update only the relevant parts of the game state across all connected clients.

## Core Principles

### 1. Granular Updates
- **Never send full game state** - only send the specific data that changed
- **Atomic operations** - each event represents a single, complete state change
- **Typed events** - all events have strict TypeScript interfaces

### 2. Event-Driven Architecture
- **Server Actions** → **Database Update** → **SSE Broadcast** → **Client State Update**
- Each game action follows this exact pattern
- No direct state mutations on the client side

### 3. Global EventStore Singleton
- Single EventStore instance shared across all server contexts using `globalThis`
- Ensures SSE connections persist across serverless function invocations
- Connection registry tracks active SSE streams

## Architecture Components

### 1. EventStore (`lib/events.ts`)

```typescript
// Global singleton using globalThis for serverless compatibility
declare global {
  var __eventStore: EventStore | undefined
}

class EventStore {
  private listeners: Map<string, Set<(event: GameEvent) => void>>
  private connectionRegistry: Map<string, Set<string>>
  
  // Register SSE connection
  registerConnection(roomId: string, connectionId: string)
  
  // Subscribe to events for a room
  subscribe(roomId: string, callback: (event: GameEvent) => void)
  
  // Broadcast event to all listeners
  emit(event: GameEvent)
}
```

### 2. Game Events (`lib/events.ts`)

All events follow strict TypeScript interfaces:

```typescript
type GameEvent = 
  // Team Events
  | { type: "TEAMS_CHANGED"; roomId: string; data: { players: any; phase: string; ... } }
  
  // Betting Events  
  | { type: "BETS_CHANGED"; roomId: string; data: { bets: any; currentTurn: string; phase: string } }
  
  // Card Events
  | { type: "CARDS_CHANGED"; roomId: string; data: { playedCards: any; currentTurn: string; phase: string; playerHands: any } }
  
  // Trick Events
  | { type: "TRICK_CHANGED"; roomId: string; data: { playedCards: any; currentTurn: string; wonTricks: any; winner: string } }
  
  // Round Events
  | { type: "ROUND_CHANGED"; roomId: string; data: { phase: string; round: number; scores: any; bets: any } }
```

### 3. SSE Endpoint (`app/api/game-events/[roomId]/route.ts`)

```typescript
export async function GET(request: NextRequest, { params }) {
  const { roomId } = await params
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  
  const stream = new ReadableStream({
    start(controller) {
      // Register connection
      eventStore.registerConnection(roomId, connectionId)
      
      // Subscribe to events
      const unsubscribe = eventStore.subscribe(roomId, (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      })
      
      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        eventStore.unregisterConnection(roomId, connectionId)
        unsubscribe()
      })
    }
  })
}
```

### 4. Client State Hook (`hooks/use-game-state.ts`)

```typescript
export function useGameState({ roomId, initialGameState, onGameEvent }) {
  const [gameState, setGameState] = useState(initialGameState)
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/game-events/${roomId}`)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      // Handle granular updates
      if (data.type === 'CARDS_CHANGED') {
        setGameState(prev => ({
          ...prev,
          playedCards: data.playedCards,
          currentTurn: data.currentTurn,
          phase: data.phase,
          playerHands: data.playerHands
        }))
      }
      // ... other event types
    }
  }, [roomId])
}
```

## Database Integration

### Schema Design (`prisma/schema.prisma`)

```prisma
model Room {
  id            String  @id @default(cuid())
  
  // Game State Fields
  gamePhase     String?
  currentRound  Int?
  currentTurn   String?
  dealerUserId  String?
  starterUserId String?
  trumpColor    String?
  
  // JSON State Fields (for complex objects)
  playerHands   Json?   // Record<string, Card[]>
  playedCards   Json?   // Record<string, Card>
  playerBets    Json?   // Record<string, Bet>
  playerTeams   Json?   // Record<string, string>
  wonTricks     Json?   // Record<string, number>
  gameScores    Json?   // Record<string, number>
  
  // Highest Bet Fields
  highestBetUserId  String?
  highestBetValue   Int?
  highestBetTrump   Boolean?
}
```

### State Persistence Pattern

All game actions follow this pattern:

```typescript
export async function gameAction(roomId: string, ...params) {
  // 1. Get current state
  const gameState = await getRoomGameState(roomId)
  
  // 2. Apply game logic
  const newGameState = applyGameLogic(gameState, ...params)
  
  // 3. Save to database
  await saveRoomGameState(roomId, newGameState)
  
  // 4. Broadcast granular event
  await broadcastGameEvent({
    type: 'SPECIFIC_CHANGED',
    roomId,
    userId,
    data: {
      // Only the fields that changed
      specificField: newGameState.specificField,
      currentTurn: newGameState.currentTurn,
      phase: newGameState.phase
    },
    timestamp: new Date()
  })
}
```

## Adding New Game States

### Step 1: Define Event Type

Add to `lib/events.ts`:

```typescript
type GameEvent = 
  // ... existing events
  | { type: "NEW_STATE_CHANGED"; roomId: string; data: NewStateEventData }

interface NewStateEventData {
  newField: any
  currentTurn: string
  phase: string
  // Only include fields that this event updates
}

export const EVENT_TYPES = {
  // ... existing types
  NEW_STATE_CHANGED: "NEW_STATE_CHANGED" as const,
}
```

### Step 2: Update Database Schema

Add fields to `prisma/schema.prisma`:

```prisma
model Room {
  // ... existing fields
  newStateField Json?  // For complex objects
  newSimpleField String?  // For simple values
}
```

### Step 3: Update State Functions

Add to `app/actions/game-actions.ts`:

```typescript
// Update getRoomGameState to include new field
export async function getRoomGameState(roomId: string): Promise<GameState | null> {
  // ... existing code
  return {
    // ... existing fields
    newField: safeJsonCast<NewFieldType>(roomData.newStateField, defaultValue),
  }
}

// Update saveRoomGameState to persist new field
export async function saveRoomGameState(roomId: string, gameState: GameState): Promise<void> {
  await prisma.room.update({
    where: { id: roomId },
    data: {
      // ... existing fields
      newStateField: gameState.newField as object,
    }
  })
}
```

### Step 4: Create Game Action

Add to `app/actions/game-logic.ts`:

```typescript
export async function newGameAction(roomId: string, userId: string, ...params) {
  const gameState = await getRoomGameState(roomId)
  if (!gameState) return { success: false, error: "Game not found" }
  
  // Apply game logic
  const newGameState = applyNewLogic(gameState, ...params)
  
  // Save state
  await saveRoomGameState(roomId, newGameState)
  
  // Broadcast granular event
  await broadcastGameEvent({
    type: 'NEW_STATE_CHANGED',
    roomId,
    userId,
    data: {
      newField: newGameState.newField,
      currentTurn: newGameState.currentTurn,
      phase: newGameState.phase
    },
    timestamp: new Date()
  })
  
  return { success: true, gameState: newGameState }
}
```

### Step 5: Handle Client Updates

Add to `hooks/use-game-state.ts`:

```typescript
// In the SSE message handler
else if (data.type === 'NEW_STATE_CHANGED') {
  console.log('🎯 New state update received')
  setGameState(prevState => {
    if (!prevState) return prevState
    return {
      ...prevState,
      newField: data.newField,
      currentTurn: data.currentTurn,
      phase: data.phase
    }
  })
}
```

### Step 6: Update UI Components

Add event handling to `components/game-events-panel.tsx`:

```typescript
// Add icon
case 'NEW_STATE_CHANGED':
  return <NewIcon className="h-4 w-4" />

// Add color
case 'NEW_STATE_CHANGED':
  return "bg-blue-50 border-blue-200"

// Add description
case 'NEW_STATE_CHANGED':
  return `🎯 ${playerName} performed new action`
```

## Key Patterns

### ✅ DO
- Always use granular events that update only changed fields
- Follow the exact pattern: Database → SSE → Client Update
- Use TypeScript interfaces for all events
- Include `currentTurn` and `phase` in most events
- Use the global EventStore singleton
- Save state before broadcasting events

### ❌ DON'T
- Send full game state in events
- Update client state directly without SSE
- Create new EventStore instances
- Skip database persistence
- Broadcast events before saving state
- Use untyped event data

## Testing Pattern

```typescript
// 1. Perform action
const result = await gameAction(roomId, userId, params)

// 2. Verify database state
const savedState = await getRoomGameState(roomId)
expect(savedState.field).toBe(expectedValue)

// 3. Verify SSE event was sent
// (Check server logs for event broadcast)

// 4. Verify client receives update
// (Check browser console for granular update logs)
```

This architecture ensures consistent, real-time updates across all clients while maintaining data integrity and type safety.

## Code Organization

### Type Definitions
- **`lib/realtime-types.ts`**: Centralized type definitions for all SSE events and interfaces
- **`lib/events.ts`**: EventStore implementation and event broadcasting logic
- **`lib/game-types.ts`**: Core game state and entity types

### Server Actions
- **`app/actions/game-logic.ts`**: Core game logic (card playing, trick completion, round scoring)
- **`app/actions/game-actions.ts`**: Game state management (teams, betting, room management)
- **`app/api/game-events/[roomId]/route.ts`**: SSE endpoint for real-time connections

### Client Hooks
- **`hooks/use-game-state.ts`**: Main hook for managing game state and SSE connections
- **`hooks/use-game-events.ts`**: Hook for listening to game events (optional)

### UI Components
- **`components/game-events-panel.tsx`**: Displays real-time game events to users
- **`app/room/[id]/*.tsx`**: Game phase components (betting, card playing, etc.)

## Maintenance Guidelines

### When Adding New Features
1. **Always define types first** in `lib/realtime-types.ts`
2. **Follow the granular update pattern** - only send changed data
3. **Update both server and client** event handlers
4. **Test SSE events** in browser console
5. **Document new event types** in this file

### When Debugging SSE Issues
1. **Check EventStore singleton** - ensure `globalThis.__eventStore` is used
2. **Verify event broadcasting** - check server logs for event emission
3. **Check client event handling** - verify event types are handled in `use-game-state.ts`
4. **Test connection registry** - ensure connections are properly registered/unregistered

### Performance Considerations
- **Granular updates only** - never send full game state
- **Debounce rapid events** if needed
- **Clean up connections** on component unmount
- **Use connection registry** to track active SSE streams

This system has been battle-tested and provides reliable real-time updates for multiplayer games. The granular event pattern ensures minimal bandwidth usage while maintaining responsive user experience.
