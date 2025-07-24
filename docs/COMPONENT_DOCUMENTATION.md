# Component Documentation

## Overview

This document provides comprehensive documentation for all React components in the real-time multiplayer card game system.

## Component Architecture

The application follows a hierarchical component structure with clear separation of concerns:

```
App
├── GameWrapper (Main game container)
├── GamePhases (Phase-specific components)
│   ├── TeamSelection
│   ├── BettingPhase
│   ├── CardGame
│   └── Scoring
├── UI Components (Reusable components)
│   ├── Card
│   ├── PlayerHand
│   ├── GameBoard
│   └── StatusIndicators
└── Utility Components
    ├── GameEventsPanel
    ├── DebugPanel
    └── ErrorBoundary
```

## Core Components

### GameWrapper

**Location:** `app/room/[id]/game-wrapper.tsx`

The main container component that manages game state and coordinates between different game phases.

**Props:**
```typescript
interface GameWrapperProps {
  roomId: string
  initialGameState?: GameState | null
}
```

**Key Features:**
- Manages SSE connections for real-time updates
- Handles game state synchronization
- Provides context to child components
- Manages loading and error states

**Usage:**
```tsx
<GameWrapper roomId="room123" initialGameState={gameState} />
```

### GamePhases

**Location:** `app/room/[id]/game-phases.tsx`

Renders the appropriate game phase component based on current game state.

**Props:**
```typescript
interface GamePhasesProps {
  gameState: GameState
  onAction: (action: GameAction) => Promise<void>
}
```

**Supported Phases:**
- `TEAMS`: Team selection interface
- `BETS`: Betting interface
- `CARDS`: Card playing interface
- `TRICK_SCORING`: Trick scoring display
- `ROUND_SCORING`: Round scoring display

### TeamSelection

**Location:** `components/team-selection.tsx`

Handles team selection during the team phase.

**Props:**
```typescript
interface TeamSelectionProps {
  gameState: GameState
  currentUserId: string
  onTeamSelect: (team: Team) => Promise<void>
}
```

**Features:**
- Visual team balance indicators
- Real-time team updates
- Automatic phase progression

### BettingPhase

**Location:** `components/betting-phase.tsx`

Manages the betting interface during the betting phase.

**Props:**
```typescript
interface BettingPhaseProps {
  gameState: GameState
  currentUserId: string
  onPlaceBet: (betValue: Bets, trump: boolean) => Promise<void>
}
```

**Features:**
- Bet value selection
- Trump/no-trump toggle
- Turn indicators
- Highest bet display

### CardGame

**Location:** `components/card-game.tsx`

The main card playing interface.

**Props:**
```typescript
interface CardGameProps {
  gameState: GameState
  currentUserId: string
  onPlayCard: (card: Card) => Promise<void>
}
```

**Features:**
- Player hand display
- Played cards visualization
- Turn indicators
- Card play validation
- Trick winner display

## UI Components

### Card

**Location:** `components/ui/card.tsx`

Displays a single playing card with proper styling and interactions.

**Props:**
```typescript
interface CardProps {
  card: Card
  isPlayable?: boolean
  isSelected?: boolean
  onClick?: () => void
  size?: 'small' | 'medium' | 'large'
}
```

**Features:**
- Color-coded suits
- Hover effects
- Disabled states
- Multiple sizes

### PlayerHand

**Location:** `components/ui/player-hand.tsx`

Displays a player's hand of cards.

**Props:**
```typescript
interface PlayerHandProps {
  cards: Card[]
  onCardClick?: (card: Card) => void
  playableCards?: string[]
  maxCards?: number
}
```

**Features:**
- Fan layout for cards
- Playable card highlighting
- Responsive design
- Card sorting

### GameBoard

**Location:** `components/ui/game-board.tsx`

Central game board showing played cards and game state.

**Props:**
```typescript
interface GameBoardProps {
  playedCards: Record<string, Card>
  players: Record<string, Player>
  currentTurn: string
  trump?: CardColor
}
```

**Features:**
- 4-player layout
- Trump indicator
- Turn highlighting
- Card positioning

### StatusIndicators

**Location:** `components/ui/status-indicators.tsx`

Shows various game status indicators.

**Props:**
```typescript
interface StatusIndicatorsProps {
  gameState: GameState
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  playerCount: number
}
```

**Features:**
- Connection status
- Player count
- Game phase indicator
- Score display

## Utility Components

### GameEventsPanel

**Location:** `components/game-events-panel.tsx`

Displays real-time game events for debugging and user feedback.

**Props:**
```typescript
interface GameEventsPanelProps {
  events: GameEvent[]
  maxEvents?: number
  showTimestamps?: boolean
}
```

**Features:**
- Event filtering
- Auto-scroll
- Event icons
- Timestamp display

### DebugPanel

**Location:** `components/debug-panel.tsx`

Development tool for debugging game state and events.

**Props:**
```typescript
interface DebugPanelProps {
  gameState: GameState
  events: GameEvent[]
  sseStatus: SSEStatus
}
```

**Features:**
- Game state inspector
- Event history
- SSE connection status
- Performance metrics

### ErrorBoundary

**Location:** `components/error-boundary.tsx`

Catches and handles React errors gracefully.

**Props:**
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error }>
}
```

**Features:**
- Error catching
- Fallback UI
- Error reporting
- Recovery options

## Hooks

### useGameState

**Location:** `hooks/use-game-state.ts`

Main hook for managing game state and SSE connections.

**Usage:**
```typescript
const {
  gameState,
  isConnected,
  error,
  refreshGameState,
  reconnect
} = useGameState({
  roomId: 'room123',
  initialGameState: null
})
```

### useGameActions

**Location:** `hooks/use-game-actions.ts`

Hook for performing game actions with proper error handling.

**Usage:**
```typescript
const {
  selectTeam,
  placeBet,
  playCard,
  isLoading,
  error
} = useGameActions(roomId)
```

## Styling

### CSS Modules

Components use CSS modules for styling with the following naming convention:
- `component-name.module.css`
- BEM methodology for class names
- Responsive design with mobile-first approach

### Tailwind CSS

Utility classes are used for:
- Layout and spacing
- Colors and typography
- Responsive design
- State variants (hover, focus, etc.)

## Testing

### Component Testing

Each component includes comprehensive tests:

```typescript
// Example test structure
describe('CardGame', () => {
  it('renders player hand correctly', () => {
    // Test implementation
  })
  
  it('handles card play interactions', () => {
    // Test implementation
  })
  
  it('displays game state accurately', () => {
    // Test implementation
  })
})
```

### Testing Utilities

Custom testing utilities are provided:
- `renderWithGameState()`: Renders components with mock game state
- `mockSSEConnection()`: Mocks SSE connections for testing
- `createMockGameState()`: Creates realistic game state for tests

## Performance Considerations

### Optimization Techniques

1. **React.memo**: Used for components that receive stable props
2. **useMemo**: Used for expensive calculations
3. **useCallback**: Used for event handlers passed to child components
4. **Code splitting**: Lazy loading for non-critical components

### Bundle Size

- Main bundle: ~150KB gzipped
- Component chunks: ~20-30KB each
- Total initial load: ~200KB gzipped

## Accessibility

### ARIA Support

All components include proper ARIA attributes:
- `aria-label` for interactive elements
- `aria-describedby` for help text
- `role` attributes for custom components
- `aria-live` for dynamic content

### Keyboard Navigation

Full keyboard support is provided:
- Tab navigation
- Arrow key navigation for card selection
- Enter/Space for activation
- Escape for cancellation

### Screen Reader Support

Components are optimized for screen readers:
- Semantic HTML structure
- Descriptive text for visual elements
- Live region updates for game events
- Alternative text for images
