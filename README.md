# Multiplayer Card Game

A lean, real-time multiplayer card game built with Next.js, featuring team-based gameplay and live synchronization.

## 🎮 Features

- **Real-time multiplayer** with Server-Sent Events (SSE)
- **Team-based gameplay** - 4 players, 2 teams of 2
- **Live game state sync** across all players
- **Responsive design** for desktop and mobile
- **Game simulator** for testing with dummy players

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your database URL.

3. **Initialize database:**
   ```bash
   npm run db:push
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   Navigate to `http://localhost:3000`

## 🎯 Game Flow

1. **Join Room** - 4 players required
2. **Select Teams** - Choose Team A or Team B
3. **Place Bets** - Bet on tricks you'll win
4. **Play Cards** - Take turns playing cards
5. **Score Points** - Based on bets vs actual tricks

## 🏗️ Core Components

### Game Lobby (`/room/[id]`)
- Main game interface
- Real-time team selection
- Live betting and card play
- Game state synchronization

### Game Simulator (`/testing/game-simulator`)
- Test with dummy players
- Simulate game actions
- Debug game mechanics

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** PostgreSQL (Neon)
- **Real-time:** Server-Sent Events (SSE)
- **UI:** shadcn/ui components

## 📁 Project Structure

```
├── app/
│   ├── room/[id]/           # Game lobby
│   ├── testing/             # Game simulator
│   └── api/                 # API endpoints
├── components/              # Reusable UI components
├── hooks/                   # React hooks
├── lib/                     # Core game logic
│   ├── business-logic/      # Game rules
│   ├── database/            # DB operations
│   └── events.ts           # SSE event system
└── prisma/                  # Database schema
```

## 🔧 Development

### Database Setup
See [SETUP.md](./SETUP.md) for detailed database configuration.

### Testing
Use the game simulator at `/testing/game-simulator` to test game mechanics with dummy players.

### Real-time Events
The game uses Server-Sent Events for real-time updates:
- Team selection changes
- Bet placement
- Card plays
- Game state updates

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Database configuration
- [Architecture](./docs/ARCHITECTURE_OVERVIEW.md) - System design
- [API Documentation](./docs/API_DOCUMENTATION.md) - API endpoints
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues

## 🎲 Game Rules

This is a trick-taking card game where:
- 4 players form 2 teams (A & B)
- Players bet on tricks they'll win
- Points awarded based on meeting bet targets
- Team with most points wins

## 🚀 Deployment

The app is designed to work on Vercel or similar platforms with:
- PostgreSQL database (Neon recommended)
- Server-Sent Events support
- Node.js runtime

## 📄 License

MIT License - see LICENSE file for details.
