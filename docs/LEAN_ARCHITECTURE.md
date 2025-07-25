# Lean Architecture Overview

A simplified overview of the current lean card game architecture.

## System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • Game Lobby    │    │ • Game Logic    │    │ • Game State    │
│ • SSE Client    │    │ • SSE Server    │    │ • User Data     │
│ • Simulator     │    │ • Validation    │    │ • Room Data     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Game Lobby (`/room/[id]`)
**Main game interface for 4 players**
- Real-time team selection
- Live betting phase
- Card play with turn management
- Game state synchronization

### 2. Game Simulator (`/testing/game-simulator`)
**Development and testing tool**
- Test with dummy players
- Simulate all game phases
- Debug game mechanics

### 3. Real-time System
**Server-Sent Events (SSE)**
- Live updates across all players
- Event-driven state changes
- Automatic reconnection
- Granular event updates

## Key Files

### Frontend
```
app/room/[id]/
├── page.tsx              # Room page
├── game-wrapper.tsx      # Main game container
├── game-phases.tsx       # Game phase router
├── team-selection.tsx    # Team selection UI
├── betting-phase.tsx     # Betting interface
└── card-play.tsx         # Card playing UI

hooks/
└── use-game-state.ts     # SSE & state management
```

### Backend
```
app/api/
├── game-state/[roomId]/  # Get game state
├── place-bet/            # Place bet action
├── select-team/          # Team selection
├── play-card/            # Card play action
└── game-events/[roomId]/ # SSE endpoint

lib/
├── events.ts             # SSE event system
├── game-logic.ts         # Core game rules
├── business-logic/       # Game rule validation
└── database/             # DB operations
```

## Data Flow

### User Action Flow
1. **User clicks** button/card in UI
2. **Component** calls API endpoint
3. **API route** validates and processes
4. **Database** state updated
5. **SSE event** broadcast to all players
6. **All UIs** update in real-time

### Event Types
- `TEAMS_CHANGED` - Team selection updates
- `BETS_CHANGED` - Betting phase updates
- `CARDS_CHANGED` - Card play updates
- `GAME_RESET` - Game state reset

## Technology Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

### Backend
- **Next.js API Routes** - Server logic
- **Prisma ORM** - Database operations
- **Server-Sent Events** - Real-time updates

### Database
- **PostgreSQL (Neon)** - Primary database
- **Prisma Schema** - Database modeling

## Game Rules

### Overview
- **4 players** in 2 teams (A vs B)
- **Trick-taking** card game
- **Betting** on tricks to win
- **Scoring** based on meeting bets

### Flow
1. **Team Selection** - Players choose teams
2. **Betting** - Each player bets on tricks
3. **Card Play** - Turn-based card playing
4. **Scoring** - Points for meeting bets

## Deployment

### Production
- **Vercel** - Hosting (frontend + API)
- **Neon** - PostgreSQL database
- **Environment** - DATABASE_URL required

### Development
```bash
npm install          # Install dependencies
npm run db:push      # Setup database
npm run dev          # Start development server
```

## Performance Features

- **Real-time updates** via SSE
- **Optimistic UI** for immediate feedback
- **Granular events** - only send changes
- **Type safety** throughout stack
- **Lean codebase** - minimal complexity
- **NO POLLING** - never use polling for updates

## Critical Guidelines

### ⚠️ NEVER USE POLLING
- **Never implement polling** for real-time updates
- **Always use SSE** (Server-Sent Events) for live data
- **Polling causes performance issues** and infinite loops
- **SSE is more efficient** and provides true real-time updates
- **Event-driven architecture only** - no interval-based updates

## Security

- **Input validation** on all endpoints
- **Type checking** with TypeScript
- **Room-based access** control
- **Event filtering** by room membership

This lean architecture prioritizes simplicity, real-time performance, and maintainability while providing a solid foundation for the multiplayer card game.
