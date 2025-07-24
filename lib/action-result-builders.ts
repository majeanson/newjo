/**
 * Action Result Builders
 * 
 * This file contains builder patterns for creating standardized action results
 * with consistent structure, validation, and metadata.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GameState } from "./game-types"
import { GameActionResult, ExtendedGameActionResult } from "./events"

// ============================================================================
// Result Builder Types
// ============================================================================

export interface ActionMetadata {
  actionName: string
  executionTime: number
  timestamp: Date
  userId?: string
  roomId?: string
  version?: string
}

export interface ValidationInfo {
  inputValidation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
  stateValidation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
  businessRuleValidation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export interface BroadcastInfo {
  attempted: boolean
  successful: boolean
  eventTypes: string[]
  errors: string[]
  listenerCount?: number
}

export interface DetailedActionResult extends GameActionResult {
  metadata: ActionMetadata
  validation: ValidationInfo
  broadcast: BroadcastInfo
  performance: {
    executionTime: number
    databaseTime?: number
    validationTime?: number
    broadcastTime?: number
  }
  debug?: {
    stackTrace?: string
    additionalInfo?: Record<string, any>
  }
}

// ============================================================================
// Base Result Builder
// ============================================================================

export class ActionResultBuilder {
  private result: Partial<DetailedActionResult> = {
    success: false,
    metadata: {
      actionName: 'unknown',
      executionTime: 0,
      timestamp: new Date()
    },
    validation: {},
    broadcast: {
      attempted: false,
      successful: false,
      eventTypes: [],
      errors: []
    },
    performance: {
      executionTime: 0
    }
  }

  private startTime: number = Date.now()

  constructor(actionName: string) {
    this.result.metadata!.actionName = actionName
    this.startTime = Date.now()
  }

  /**
   * Set the action as successful
   */
  success(gameState: GameState): this {
    this.result.success = true
    this.result.gameState = gameState
    return this
  }

  /**
   * Set the action as failed
   */
  failure(error: string): this {
    this.result.success = false
    this.result.error = error
    return this
  }

  /**
   * Add user context
   */
  withUser(userId: string): this {
    this.result.metadata!.userId = userId
    return this
  }

  /**
   * Add room context
   */
  withRoom(roomId: string): this {
    this.result.metadata!.roomId = roomId
    return this
  }

  /**
   * Add version information
   */
  withVersion(version: string): this {
    this.result.metadata!.version = version
    return this
  }

  /**
   * Add input validation results
   */
  withInputValidation(isValid: boolean, errors: string[] = [], warnings: string[] = []): this {
    this.result.validation!.inputValidation = { isValid, errors, warnings }
    return this
  }

  /**
   * Add state validation results
   */
  withStateValidation(isValid: boolean, errors: string[] = [], warnings: string[] = []): this {
    this.result.validation!.stateValidation = { isValid, errors, warnings }
    return this
  }

  /**
   * Add business rule validation results
   */
  withBusinessRuleValidation(isValid: boolean, errors: string[] = [], warnings: string[] = []): this {
    this.result.validation!.businessRuleValidation = { isValid, errors, warnings }
    return this
  }

  /**
   * Add broadcast information
   */
  withBroadcast(attempted: boolean, successful: boolean, eventTypes: string[] = [], errors: string[] = [], listenerCount?: number): this {
    this.result.broadcast = { attempted, successful, eventTypes, errors, listenerCount }
    return this
  }

  /**
   * Add performance timing
   */
  withPerformance(databaseTime?: number, validationTime?: number, broadcastTime?: number): this {
    this.result.performance = {
      executionTime: Date.now() - this.startTime,
      databaseTime,
      validationTime,
      broadcastTime
    }
    return this
  }

  /**
   * Add debug information
   */
  withDebug(stackTrace?: string, additionalInfo?: Record<string, any>): this {
    this.result.debug = { stackTrace, additionalInfo }
    return this
  }

  /**
   * Build the final result
   */
  build(): DetailedActionResult {
    // Finalize timing
    this.result.metadata!.executionTime = Date.now() - this.startTime
    this.result.performance!.executionTime = this.result.metadata!.executionTime

    return this.result as DetailedActionResult
  }

  /**
   * Build a simple result (for backward compatibility)
   */
  buildSimple(): GameActionResult {
    return {
      success: this.result.success!,
      error: this.result.error,
      gameState: this.result.gameState
    }
  }
}

// ============================================================================
// Specialized Result Builders
// ============================================================================

/**
 * Builder for team selection results
 */
export class TeamSelectionResultBuilder extends ActionResultBuilder {
  private teamData: {
    selectedTeam?: string
    previousTeam?: string
    teamsBalanced?: boolean
    teamCounts?: { teamA: number; teamB: number }
  } = {}

  constructor() {
    super('TEAM_SELECTION')
  }

  withTeamData(selectedTeam: string, previousTeam?: string, teamsBalanced?: boolean, teamCounts?: { teamA: number; teamB: number }): this {
    this.teamData = { selectedTeam, previousTeam, teamsBalanced, teamCounts }
    return this
  }

  build(): DetailedActionResult & { teamData: typeof this.teamData } {
    const result = super.build()
    return { ...result, teamData: this.teamData }
  }
}

/**
 * Builder for betting results
 */
export class BettingResultBuilder extends ActionResultBuilder {
  private bettingData: {
    betValue?: string
    trump?: boolean
    previousBet?: any
    isHighestBet?: boolean
    allBetsComplete?: boolean
    nextPlayer?: string
  } = {}

  constructor() {
    super('BET_PLACEMENT')
  }

  withBettingData(
    betValue: string, 
    trump: boolean, 
    previousBet?: any, 
    isHighestBet?: boolean, 
    allBetsComplete?: boolean, 
    nextPlayer?: string
  ): this {
    this.bettingData = { betValue, trump, previousBet, isHighestBet, allBetsComplete, nextPlayer }
    return this
  }

  build(): DetailedActionResult & { bettingData: typeof this.bettingData } {
    const result = super.build()
    return { ...result, bettingData: this.bettingData }
  }
}

/**
 * Builder for card playing results
 */
export class CardPlayResultBuilder extends ActionResultBuilder {
  private cardData: {
    playedCard?: any
    trickComplete?: boolean
    trickWinner?: string
    roundComplete?: boolean
    cardsRemaining?: number
    nextPlayer?: string
  } = {}

  constructor() {
    super('CARD_PLAY')
  }

  withCardData(
    playedCard: any, 
    trickComplete?: boolean, 
    trickWinner?: string, 
    roundComplete?: boolean, 
    cardsRemaining?: number, 
    nextPlayer?: string
  ): this {
    this.cardData = { playedCard, trickComplete, trickWinner, roundComplete, cardsRemaining, nextPlayer }
    return this
  }

  build(): DetailedActionResult & { cardData: typeof this.cardData } {
    const result = super.build()
    return { ...result, cardData: this.cardData }
  }
}

/**
 * Builder for round completion results
 */
export class RoundCompletionResultBuilder extends ActionResultBuilder {
  private roundData: {
    completedRound?: number
    roundScores?: {
      teamAScore: number
      teamBScore: number
      bettingTeamWon: boolean
    }
    totalScores?: Record<string, number>
    gameComplete?: boolean
    winningTeam?: string
  } = {}

  constructor() {
    super('ROUND_COMPLETION')
  }

  withRoundData(
    completedRound: number,
    roundScores: { teamAScore: number; teamBScore: number; bettingTeamWon: boolean },
    totalScores: Record<string, number>,
    gameComplete?: boolean,
    winningTeam?: string
  ): this {
    this.roundData = { completedRound, roundScores, totalScores, gameComplete, winningTeam }
    return this
  }

  build(): ExtendedGameActionResult & { roundData: typeof this.roundData } {
    const result = super.build()
    return { 
      ...result, 
      roundData: this.roundData,
      roundResult: this.roundData.roundScores
    }
  }
}

// ============================================================================
// Result Builder Factory
// ============================================================================

export class ResultBuilderFactory {
  /**
   * Create a generic action result builder
   */
  static createGeneric(actionName: string): ActionResultBuilder {
    return new ActionResultBuilder(actionName)
  }

  /**
   * Create a team selection result builder
   */
  static createTeamSelection(): TeamSelectionResultBuilder {
    return new TeamSelectionResultBuilder()
  }

  /**
   * Create a betting result builder
   */
  static createBetting(): BettingResultBuilder {
    return new BettingResultBuilder()
  }

  /**
   * Create a card play result builder
   */
  static createCardPlay(): CardPlayResultBuilder {
    return new CardPlayResultBuilder()
  }

  /**
   * Create a round completion result builder
   */
  static createRoundCompletion(): RoundCompletionResultBuilder {
    return new RoundCompletionResultBuilder()
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a detailed result to a simple result
 */
export function toSimpleResult(detailedResult: DetailedActionResult): GameActionResult {
  return {
    success: detailedResult.success,
    error: detailedResult.error,
    gameState: detailedResult.gameState
  }
}

/**
 * Merge multiple validation results
 */
export function mergeValidationResults(...validations: Array<{ isValid: boolean; errors: string[]; warnings?: string[] }>): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const allErrors = validations.flatMap(v => v.errors)
  const allWarnings = validations.flatMap(v => v.warnings || [])
  
  return {
    isValid: validations.every(v => v.isValid),
    errors: allErrors,
    warnings: allWarnings
  }
}

/**
 * Create a quick success result
 */
export function quickSuccess(actionName: string, gameState: GameState, userId?: string, roomId?: string): GameActionResult {
  return ResultBuilderFactory
    .createGeneric(actionName)
    .success(gameState)
    .withUser(userId || '')
    .withRoom(roomId || '')
    .buildSimple()
}

/**
 * Create a quick failure result
 */
export function quickFailure(actionName: string, error: string, userId?: string, roomId?: string): GameActionResult {
  return ResultBuilderFactory
    .createGeneric(actionName)
    .failure(error)
    .withUser(userId || '')
    .withRoom(roomId || '')
    .buildSimple()
}
