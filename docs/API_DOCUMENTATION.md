# API Documentation

## Overview

This document provides comprehensive documentation for all API endpoints in the real-time multiplayer card game system.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All API endpoints require authentication via session cookies. Users must be logged in to access game functionality.

## Response Format

All API responses follow a standardized format:

### Success Response
```typescript
{
  success: true,
  data: T,
  message?: string,
  timestamp: string
}
```

### Error Response
```typescript
{
  success: false,
  error: string,
  code?: string,
  details?: any,
  timestamp: string
}
```

## Endpoints

### Game State

#### GET /api/game-state/[roomId]

Get the current game state for a room.

**Parameters:**
- `roomId` (string): The unique identifier for the room

**Response:**
```typescript
{
  success: true,
  data: {
    gameState: GameState | null,
    roomExists: boolean,
    playerCount: number,
    isPlayerInRoom: boolean
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/api/game-state/room123
```

### Betting

#### POST /api/place-bet

Place a bet for the current player.

**Request Body:**
```typescript
{
  roomId: string,
  betValue: "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A",
  trump: boolean,
  playerId?: string // Optional, for simulator use
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    gameState: GameState,
    actionType: "BET_PLACED",
    playerId: string,
    playerName: string,
    success: true
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/place-bet \
  -H "Content-Type: application/json" \
  -d '{"roomId":"room123","betValue":"8","trump":true}'
```

### Card Playing

#### POST /api/play-card

Play a card for the current player.

**Request Body:**
```typescript
{
  roomId: string,
  cardId: string,
  playerId?: string // Optional, for simulator use
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    gameState: GameState,
    actionType: "CARD_PLAYED",
    playerId: string,
    playerName: string,
    success: true
  }
}
```

### Team Selection

#### POST /api/select-team

Select a team for the current player.

**Request Body:**
```typescript
{
  roomId: string,
  team: "A" | "B",
  playerId?: string // Optional, for simulator use
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    gameState: GameState,
    actionType: "TEAM_SELECTED",
    playerId: string,
    playerName: string,
    success: true
  }
}
```

### Room Management

#### POST /api/rooms

Create a new room.

**Request Body:**
```typescript
{
  name?: string,
  isPrivate?: boolean
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    roomId: string,
    roomCode: string,
    createdBy: string,
    createdAt: string
  }
}
```

#### POST /api/rooms/[roomId]/join

Join an existing room.

**Parameters:**
- `roomId` (string): The unique identifier for the room

**Response:**
```typescript
{
  success: true,
  data: {
    roomId: string,
    playerId: string,
    playerName: string,
    playerCount: number,
    gamePhase: string,
    isGameInProgress: boolean
  }
}
```

## Server-Sent Events (SSE)

### GET /api/game-events/[roomId]

Establish a Server-Sent Events connection for real-time game updates.

**Parameters:**
- `roomId` (string): The unique identifier for the room

**Event Types:**

#### CONNECTED
Sent when the SSE connection is established.
```typescript
{
  type: "CONNECTED"
}
```

#### HEARTBEAT
Sent periodically to keep the connection alive.
```typescript
{
  type: "HEARTBEAT"
}
```

#### TEAMS_CHANGED
Sent when team assignments change.
```typescript
{
  type: "TEAMS_CHANGED",
  roomId: string,
  userId: string,
  data: {
    players: Record<string, Player>,
    phase: GamePhase,
    teamsBalanced: boolean,
    teamACount: number,
    teamBCount: number
  }
}
```

#### BETS_CHANGED
Sent when betting state changes.
```typescript
{
  type: "BETS_CHANGED",
  roomId: string,
  userId: string,
  data: {
    bets: Record<string, Bet>,
    currentTurn: string,
    phase: GamePhase
  }
}
```

#### CARDS_CHANGED
Sent when cards are played.
```typescript
{
  type: "CARDS_CHANGED",
  roomId: string,
  userId: string,
  data: {
    playedCards: Record<string, Card>,
    currentTurn: string,
    phase: GamePhase,
    playerHands: Record<string, Card[]>
  }
}
```

#### TRICK_CHANGED
Sent when a trick is completed.
```typescript
{
  type: "TRICK_CHANGED",
  roomId: string,
  userId: string,
  data: {
    playedCards: Record<string, Card>, // Empty after trick
    currentTurn: string, // Winner starts next trick
    phase: GamePhase,
    wonTricks: Record<string, number>
  }
}
```

#### ROUND_CHANGED
Sent when a round is completed.
```typescript
{
  type: "ROUND_CHANGED",
  roomId: string,
  userId: string,
  data: {
    phase: GamePhase, // Usually "BETS"
    round: number,
    scores: Record<string, number>,
    bets: Record<string, Bet>, // Empty for new round
    currentTurn: string
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `INVALID_PHASE` | Action not allowed in current game phase |
| `INVALID_TURN` | Not the player's turn |
| `CONFLICT` | Resource conflict (e.g., team full) |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

## Rate Limiting

API endpoints are rate limited to 30 requests per minute per user. When the limit is exceeded, a `429` status code is returned with the error code `RATE_LIMITED`.

## WebSocket Alternative

While the primary real-time communication uses Server-Sent Events (SSE), a WebSocket endpoint is also available for bidirectional communication:

```
ws://localhost:3000/api/ws/[roomId]
```

## Testing

Use the provided Postman collection or curl commands to test the API endpoints. For SSE testing, use tools like `curl` with the `--no-buffer` flag:

```bash
curl -N --no-buffer http://localhost:3000/api/game-events/room123
```
