/**
 * Event Filtering and Routing System
 * 
 * This file contains utilities for filtering and routing events based on
 * various criteria such as user permissions, room membership, and event types.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GameEvent } from "./events"
import { GamePhase } from "./game-types"

// ============================================================================
// Event Filter Types
// ============================================================================

export interface EventFilter {
  name: string
  description: string
  filter: (event: GameEvent, context: FilterContext) => boolean
}

export interface FilterContext {
  userId?: string
  roomId?: string
  userRole?: 'player' | 'spectator' | 'admin'
  gamePhase?: GamePhase
  isPlayerInRoom?: boolean
  playerTeam?: string
}

export interface RoutingRule {
  name: string
  condition: (event: GameEvent, context: FilterContext) => boolean
  action: 'allow' | 'deny' | 'modify' | 'redirect'
  modifier?: (event: GameEvent) => GameEvent
  redirectTo?: string[]
}

// ============================================================================
// Built-in Event Filters
// ============================================================================

/**
 * Filter events based on room membership
 */
export const roomMembershipFilter: EventFilter = {
  name: 'roomMembership',
  description: 'Only allow events for rooms the user is a member of',
  filter: (event: GameEvent, context: FilterContext) => {
    if (!context.roomId || !event.roomId) return true
    return context.roomId === event.roomId && context.isPlayerInRoom === true
  }
}

/**
 * Filter sensitive events for spectators
 */
export const spectatorFilter: EventFilter = {
  name: 'spectator',
  description: 'Filter out sensitive information for spectators',
  filter: (event: GameEvent, context: FilterContext) => {
    if (context.userRole !== 'spectator') return true
    
    // Spectators cannot see player hands or private betting info
    const restrictedEvents = ['CARDS_CHANGED']
    if (restrictedEvents.includes(event.type)) {
      return false
    }
    
    return true
  }
}

/**
 * Filter events based on game phase
 */
export const gamePhaseFilter: EventFilter = {
  name: 'gamePhase',
  description: 'Filter events that are not relevant to current game phase',
  filter: (event: GameEvent, context: FilterContext) => {
    if (!context.gamePhase) return true
    
    const phaseEventMap: Record<GamePhase, string[]> = {
      [GamePhase.TEAMS]: ['TEAM_SELECTED', 'TEAMS_CHANGED', 'BETTING_PHASE_STARTED'],
      [GamePhase.BETS]: ['BET_PLACED', 'BETS_CHANGED', 'BETTING_COMPLETE'],
      [GamePhase.CARDS]: ['CARDS_CHANGED', 'TRICK_CHANGED', 'TRICK_COMPLETE'],
      [GamePhase.TRICK_SCORING]: ['TRICK_CHANGED', 'ROUND_CHANGED'],
      [GamePhase.ROUND_SCORING]: ['ROUND_CHANGED', 'ROUND_COMPLETE']
    }
    
    const allowedEvents = phaseEventMap[context.gamePhase] || []
    const systemEvents = ['CONNECTED', 'HEARTBEAT', 'GAME_STATE_UPDATED', 'GAME_RESET']
    
    return allowedEvents.includes(event.type) || systemEvents.includes(event.type)
  }
}

/**
 * Filter events based on user permissions
 */
export const permissionFilter: EventFilter = {
  name: 'permission',
  description: 'Filter events based on user permissions',
  filter: (event: GameEvent, context: FilterContext) => {
    // Admin users can see all events
    if (context.userRole === 'admin') return true
    
    // Players can see most events
    if (context.userRole === 'player') {
      // Hide other players' private data
      if (event.type === 'CARDS_CHANGED' && event.data?.playerHands) {
        // Only show own hand
        return event.userId === context.userId
      }
      return true
    }
    
    // Spectators have limited access
    return spectatorFilter.filter(event, context)
  }
}

// ============================================================================
// Event Routing Rules
// ============================================================================

/**
 * Route private events only to relevant players
 */
export const privateEventRouting: RoutingRule = {
  name: 'privateEvents',
  condition: (event: GameEvent) => {
    return ['CARDS_CHANGED'].includes(event.type) && event.data?.playerHands
  },
  action: 'modify',
  modifier: (event: GameEvent) => {
    // Remove sensitive data for broadcast, keep only public info
    if (event.data?.playerHands) {
      const modifiedEvent = { ...event }
      modifiedEvent.data = {
        ...event.data,
        playerHands: undefined // Remove private hand data
      }
      return modifiedEvent
    }
    return event
  }
}

/**
 * Route team-specific events
 */
export const teamEventRouting: RoutingRule = {
  name: 'teamEvents',
  condition: (event: GameEvent, context: FilterContext) => {
    return event.type === 'TEAMS_CHANGED' && context.playerTeam !== undefined
  },
  action: 'allow'
}

/**
 * Route system events to all users
 */
export const systemEventRouting: RoutingRule = {
  name: 'systemEvents',
  condition: (event: GameEvent) => {
    return ['CONNECTED', 'HEARTBEAT', 'GAME_RESET'].includes(event.type)
  },
  action: 'allow'
}

// ============================================================================
// Event Filter Engine
// ============================================================================

export class EventFilterEngine {
  private filters: EventFilter[] = []
  private routingRules: RoutingRule[] = []

  constructor() {
    // Register default filters
    this.addFilter(roomMembershipFilter)
    this.addFilter(spectatorFilter)
    this.addFilter(gamePhaseFilter)
    this.addFilter(permissionFilter)

    // Register default routing rules
    this.addRoutingRule(privateEventRouting)
    this.addRoutingRule(teamEventRouting)
    this.addRoutingRule(systemEventRouting)
  }

  addFilter(filter: EventFilter): void {
    this.filters.push(filter)
  }

  removeFilter(name: string): void {
    this.filters = this.filters.filter(f => f.name !== name)
  }

  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule)
  }

  removeRoutingRule(name: string): void {
    this.routingRules = this.routingRules.filter(r => r.name !== name)
  }

  /**
   * Filter an event for a specific user context
   */
  filterEvent(event: GameEvent, context: FilterContext): {
    allowed: boolean
    modifiedEvent?: GameEvent
    appliedFilters: string[]
    appliedRules: string[]
  } {
    const appliedFilters: string[] = []
    const appliedRules: string[] = []
    let modifiedEvent = event

    // Apply routing rules first
    for (const rule of this.routingRules) {
      if (rule.condition(modifiedEvent, context)) {
        appliedRules.push(rule.name)
        
        switch (rule.action) {
          case 'deny':
            return { allowed: false, appliedFilters, appliedRules }
          
          case 'modify':
            if (rule.modifier) {
              modifiedEvent = rule.modifier(modifiedEvent)
            }
            break
          
          case 'redirect':
            // Redirection would be handled at a higher level
            break
          
          case 'allow':
          default:
            // Continue processing
            break
        }
      }
    }

    // Apply filters
    for (const filter of this.filters) {
      if (!filter.filter(modifiedEvent, context)) {
        appliedFilters.push(filter.name)
        return { allowed: false, appliedFilters, appliedRules }
      }
    }

    return {
      allowed: true,
      modifiedEvent: modifiedEvent !== event ? modifiedEvent : undefined,
      appliedFilters,
      appliedRules
    }
  }

  /**
   * Filter events for multiple users
   */
  filterEventForUsers(
    event: GameEvent,
    userContexts: Array<{ userId: string; context: FilterContext }>
  ): Array<{
    userId: string
    allowed: boolean
    modifiedEvent?: GameEvent
    appliedFilters: string[]
    appliedRules: string[]
  }> {
    return userContexts.map(({ userId, context }) => ({
      userId,
      ...this.filterEvent(event, context)
    }))
  }

  /**
   * Get statistics about filter usage
   */
  getFilterStats(): {
    totalFilters: number
    totalRules: number
    filterNames: string[]
    ruleNames: string[]
  } {
    return {
      totalFilters: this.filters.length,
      totalRules: this.routingRules.length,
      filterNames: this.filters.map(f => f.name),
      ruleNames: this.routingRules.map(r => r.name)
    }
  }
}

// ============================================================================
// Global Filter Engine Instance
// ============================================================================

export const globalFilterEngine = new EventFilterEngine()

/**
 * Convenience function to filter an event
 */
export function filterEventForUser(event: GameEvent, context: FilterContext) {
  return globalFilterEngine.filterEvent(event, context)
}
