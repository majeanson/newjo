/**
 * Game Action Factory
 * 
 * This file contains a factory pattern for creating standardized game actions
 * with consistent validation, error handling, and event broadcasting.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GameState, GamePhase } from "./game-types"
import { GameActionResult, ExtendedGameActionResult } from "./events"
import { validateGameState } from "./type-guards"
import { broadcastGameEvent } from "./events"

// ============================================================================
// Action Context and Configuration
// ============================================================================

export interface ActionContext {
  roomId: string
  userId: string
  userRole?: 'player' | 'spectator' | 'admin'
  skipValidation?: boolean
  skipBroadcast?: boolean
}

export interface ActionConfig {
  name: string
  description: string
  requiredPhase?: GamePhase
  requiresPlayerTurn?: boolean
  validateInput?: (input: any) => { isValid: boolean; errors: string[] }
  validateGameState?: (gameState: GameState, context: ActionContext) => { isValid: boolean; errors: string[] }
}

export interface ActionResult<T = any> extends GameActionResult {
  actionName: string
  context: ActionContext
  executionTime: number
  validationErrors?: string[]
  broadcastSuccess?: boolean
  data?: T
}

// ============================================================================
// Base Game Action Class
// ============================================================================

export abstract class BaseGameAction<TInput = any, TOutput = any> {
  protected config: ActionConfig
  protected startTime: number = 0

  constructor(config: ActionConfig) {
    this.config = config
  }

  /**
   * Execute the game action with full validation and error handling
   */
  async execute(input: TInput, context: ActionContext): Promise<ActionResult<TOutput>> {
    this.startTime = Date.now()
    
    try {
      // 1. Validate input
      const inputValidation = await this.validateInput(input, context)
      if (!inputValidation.isValid) {
        return this.createErrorResult('Input validation failed', inputValidation.errors, context)
      }

      // 2. Get current game state
      const gameState = await this.getGameState(context.roomId)
      if (!gameState) {
        return this.createErrorResult('Game state not found', [], context)
      }

      // 3. Validate game state
      const stateValidation = await this.validateGameState(gameState, context)
      if (!stateValidation.isValid) {
        return this.createErrorResult('Game state validation failed', stateValidation.errors, context)
      }

      // 4. Execute the action logic
      const actionResult = await this.executeAction(input, gameState, context)
      if (!actionResult.success) {
        return this.createErrorResult(actionResult.error || 'Action execution failed', [], context)
      }

      // 5. Save the new game state
      await this.saveGameState(context.roomId, actionResult.gameState!)

      // 6. Broadcast events
      if (!context.skipBroadcast) {
        const broadcastSuccess = await this.broadcastEvents(actionResult.gameState!, context, actionResult.data)
        return this.createSuccessResult(actionResult.gameState!, context, actionResult.data, broadcastSuccess)
      }

      return this.createSuccessResult(actionResult.gameState!, context, actionResult.data)

    } catch (error) {
      console.error(`Error executing ${this.config.name}:`, error)
      return this.createErrorResult('Internal server error', [], context)
    }
  }

  /**
   * Abstract methods to be implemented by concrete actions
   */
  protected abstract executeAction(
    input: TInput, 
    gameState: GameState, 
    context: ActionContext
  ): Promise<GameActionResult & { data?: TOutput }>

  protected abstract broadcastEvents(
    gameState: GameState, 
    context: ActionContext, 
    data?: TOutput
  ): Promise<boolean>

  /**
   * Default implementations that can be overridden
   */
  protected async validateInput(input: TInput, context: ActionContext): Promise<{ isValid: boolean; errors: string[] }> {
    if (this.config.validateInput) {
      return this.config.validateInput(input)
    }
    return { isValid: true, errors: [] }
  }

  protected async validateGameState(gameState: GameState, context: ActionContext): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Check required phase
    if (this.config.requiredPhase && gameState.phase !== this.config.requiredPhase) {
      errors.push(`Action requires ${this.config.requiredPhase} phase, but game is in ${gameState.phase}`)
    }

    // Check player turn
    if (this.config.requiresPlayerTurn && gameState.currentTurn !== context.userId) {
      errors.push('Not your turn')
    }

    // Custom validation
    if (this.config.validateGameState) {
      const customValidation = this.config.validateGameState(gameState, context)
      errors.push(...customValidation.errors)
    }

    return { isValid: errors.length === 0, errors }
  }

  protected async getGameState(roomId: string): Promise<GameState | null> {
    // This would be implemented to get game state from database
    // For now, we'll import the function
    const { getRoomGameState } = await import('../app/actions/game-actions')
    return await getRoomGameState(roomId)
  }

  protected async saveGameState(roomId: string, gameState: GameState): Promise<void> {
    // This would be implemented to save game state to database
    const { saveRoomGameState } = await import('../app/actions/game-actions')
    await saveRoomGameState(roomId, gameState)
  }

  /**
   * Result creation helpers
   */
  protected createSuccessResult(
    gameState: GameState, 
    context: ActionContext, 
    data?: TOutput,
    broadcastSuccess?: boolean
  ): ActionResult<TOutput> {
    return {
      success: true,
      gameState,
      actionName: this.config.name,
      context,
      executionTime: Date.now() - this.startTime,
      broadcastSuccess,
      data
    }
  }

  protected createErrorResult(
    error: string, 
    validationErrors: string[], 
    context: ActionContext
  ): ActionResult<TOutput> {
    return {
      success: false,
      error,
      actionName: this.config.name,
      context,
      executionTime: Date.now() - this.startTime,
      validationErrors
    }
  }
}

// ============================================================================
// Concrete Action Implementations
// ============================================================================

/**
 * Team selection action
 */
export class TeamSelectionAction extends BaseGameAction<{ team: string }, { teamChanged: boolean }> {
  constructor() {
    super({
      name: 'TEAM_SELECTION',
      description: 'Select a team for the player',
      requiredPhase: GamePhase.TEAM_SELECTION,
      validateInput: (input) => {
        const errors: string[] = []
        if (!input.team || !['A', 'B'].includes(input.team)) {
          errors.push('Invalid team selection')
        }
        return { isValid: errors.length === 0, errors }
      }
    })
  }

  protected async executeAction(input: { team: string }, gameState: GameState, context: ActionContext) {
    // Import the actual team selection logic
    const { selectTeam } = await import('../lib/game-logic')
    const newGameState = selectTeam(gameState, context.userId, input.team as any)
    
    return {
      success: true,
      gameState: newGameState,
      data: { teamChanged: true }
    }
  }

  protected async broadcastEvents(gameState: GameState, context: ActionContext) {
    const { broadcastTeamChange } = await import('./event-broadcasting')
    const player = gameState.players[context.userId]
    
    return await broadcastTeamChange(
      context.roomId,
      context.userId,
      player?.name || 'Unknown',
      player?.team as any,
      gameState.players,
      gameState.phase,
      Object.values(gameState.players).filter(p => p.team === 'A').length === 2,
      Object.values(gameState.players).filter(p => p.team === 'A').length,
      Object.values(gameState.players).filter(p => p.team === 'B').length
    )
  }
}

/**
 * Bet placement action
 */
export class BetPlacementAction extends BaseGameAction<{ betValue: string; trump: boolean }, { betPlaced: boolean }> {
  constructor() {
    super({
      name: 'BET_PLACEMENT',
      description: 'Place a bet for the player',
      requiredPhase: GamePhase.BETS,
      requiresPlayerTurn: true,
      validateInput: (input) => {
        const errors: string[] = []
        const validBets = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
        if (!validBets.includes(input.betValue)) {
          errors.push('Invalid bet value')
        }
        if (typeof input.trump !== 'boolean') {
          errors.push('Trump must be boolean')
        }
        return { isValid: errors.length === 0, errors }
      }
    })
  }

  protected async executeAction(input: { betValue: string; trump: boolean }, gameState: GameState, context: ActionContext) {
    const { placeBet } = await import('../lib/game-logic')
    const newGameState = placeBet(gameState, context.userId, input.betValue as any, input.trump)
    
    return {
      success: true,
      gameState: newGameState,
      data: { betPlaced: true }
    }
  }

  protected async broadcastEvents(gameState: GameState, context: ActionContext) {
    const { broadcastBetChange } = await import('./event-broadcasting')
    const player = gameState.players[context.userId]
    
    return await broadcastBetChange(
      context.roomId,
      context.userId,
      player?.name || 'Unknown',
      gameState.bets,
      gameState.currentTurn,
      gameState.phase
    )
  }
}

// ============================================================================
// Action Factory
// ============================================================================

export class GameActionFactory {
  private actions: Map<string, BaseGameAction> = new Map()

  constructor() {
    // Register default actions
    this.registerAction('TEAM_SELECTION', new TeamSelectionAction())
    this.registerAction('BET_PLACEMENT', new BetPlacementAction())
  }

  registerAction(name: string, action: BaseGameAction): void {
    this.actions.set(name, action)
  }

  async executeAction<TInput, TOutput>(
    actionName: string, 
    input: TInput, 
    context: ActionContext
  ): Promise<ActionResult<TOutput>> {
    const action = this.actions.get(actionName)
    if (!action) {
      return {
        success: false,
        error: `Unknown action: ${actionName}`,
        actionName,
        context,
        executionTime: 0
      }
    }

    return await action.execute(input, context) as ActionResult<TOutput>
  }

  getRegisteredActions(): string[] {
    return Array.from(this.actions.keys())
  }
}

// Global factory instance
export const gameActionFactory = new GameActionFactory()
