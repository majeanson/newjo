/**
 * Event Validation Schemas
 * 
 * This file contains validation schemas for all SSE events to ensure
 * data integrity and type safety when broadcasting and receiving events.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { 
  GameEvent, 
  BaseEventData, 
  TeamEventData, 
  BettingEventData, 
  CardEventData, 
  RoundEventData,
  GameStateEventData,
  TeamsChangedData,
  BetsChangedData,
  CardsChangedData,
  TrickChangedData,
  RoundChangedData
} from "./events"
import { 
  isBaseEventData, 
  isTeamEventData, 
  isBettingEventData, 
  isCardEventData, 
  isRoundEventData,
  isString,
  isObject,
  isGamePhase
} from "./type-guards"

// ============================================================================
// Event Validation Results
// ============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface EventValidationResult extends ValidationResult {
  eventType: string
  roomId?: string
  userId?: string
}

// ============================================================================
// Base Event Validators
// ============================================================================

/**
 * Validate base event structure
 */
function validateBaseEvent(event: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isObject(event)) {
    errors.push("Event must be an object")
    return { isValid: false, errors, warnings }
  }

  if (!isString(event.type)) {
    errors.push("Event type must be a string")
  }

  if (event.roomId !== undefined && !isString(event.roomId)) {
    errors.push("Room ID must be a string")
  }

  if (event.userId !== undefined && !isString(event.userId)) {
    errors.push("User ID must be a string")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate event data structure
 */
function validateEventData(data: any, validator: (data: any) => boolean, eventType: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (data === undefined) {
    warnings.push(`${eventType} event has no data`)
    return { isValid: true, errors, warnings }
  }

  if (!validator(data)) {
    errors.push(`Invalid data structure for ${eventType} event`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// ============================================================================
// Granular Event Data Validators
// ============================================================================

/**
 * Validate TeamsChangedData
 */
function validateTeamsChangedData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Allow undefined/null data - just return valid
  if (!data) {
    warnings.push("No data provided for TEAMS_CHANGED event")
    return { isValid: true, errors, warnings }
  }

  if (!isObject(data)) {
    errors.push("Data must be an object")
    return { isValid: false, errors, warnings }
  }

  // Optional validation - don't fail if fields are missing
  if (data.players && !isObject(data.players)) {
    warnings.push("Players should be an object")
  }

  if (data.phase && !isGamePhase(data.phase)) {
    warnings.push("Phase should be a valid GamePhase")
  }

  return {
    isValid: true, // Always return valid for now
    errors,
    warnings
  }
}

/**
 * Validate BetsChangedData
 */
function validateBetsChangedData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Allow undefined/null data - just return valid
  if (!data) {
    warnings.push("No data provided for BETS_CHANGED event")
    return { isValid: true, errors, warnings }
  }

  if (!isObject(data)) {
    warnings.push("Data should be an object")
    return { isValid: true, errors, warnings }
  }

  // Optional validation - don't fail if fields are missing
  if (data.bets && !isObject(data.bets)) {
    warnings.push("Bets should be an object")
  }

  if (data.currentTurn && !isString(data.currentTurn)) {
    warnings.push("Current turn should be a string")
  }

  if (data.phase && !isGamePhase(data.phase)) {
    warnings.push("Phase should be a valid GamePhase")
  }

  return {
    isValid: true, // Always return valid for now
    errors,
    warnings
  }
}

/**
 * Validate CardsChangedData
 */
function validateCardsChangedData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Allow undefined/null data - just return valid
  if (!data) {
    warnings.push("No data provided for CARDS_CHANGED event")
    return { isValid: true, errors, warnings }
  }

  if (!isObject(data)) {
    warnings.push("Data should be an object")
    return { isValid: true, errors, warnings }
  }

  // Optional validation - don't fail if fields are missing
  if (data.playedCards && !isObject(data.playedCards)) {
    warnings.push("Played cards should be an object")
  }

  if (data.currentTurn && !isString(data.currentTurn)) {
    warnings.push("Current turn should be a string")
  }

  if (data.phase && !isGamePhase(data.phase)) {
    warnings.push("Phase should be a valid GamePhase")
  }

  if (data.playerHands && !isObject(data.playerHands)) {
    warnings.push("Player hands should be an object")
  }

  return {
    isValid: true, // Always return valid for now
    errors,
    warnings
  }
}

/**
 * Validate TrickChangedData
 */
function validateTrickChangedData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Allow undefined/null data - just return valid
  if (!data) {
    warnings.push("No data provided for TRICK_CHANGED event")
    return { isValid: true, errors, warnings }
  }

  if (!isObject(data)) {
    warnings.push("Data should be an object")
    return { isValid: true, errors, warnings }
  }

  // Optional validation - don't fail if fields are missing
  if (data.playedCards && !isObject(data.playedCards)) {
    warnings.push("Played cards should be an object")
  }

  if (data.currentTurn && !isString(data.currentTurn)) {
    warnings.push("Current turn should be a string")
  }

  if (data.phase && !isGamePhase(data.phase)) {
    warnings.push("Phase should be a valid GamePhase")
  }

  if (data.wonTricks && !isObject(data.wonTricks)) {
    warnings.push("Won tricks should be an object")
  }

  return {
    isValid: true, // Always return valid for now
    errors,
    warnings
  }
}

/**
 * Validate RoundChangedData
 */
function validateRoundChangedData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Allow undefined/null data - just return valid
  if (!data) {
    warnings.push("No data provided for ROUND_CHANGED event")
    return { isValid: true, errors, warnings }
  }

  if (!isObject(data)) {
    warnings.push("Data should be an object")
    return { isValid: true, errors, warnings }
  }

  // Optional validation - don't fail if fields are missing
  if (data.phase && !isGamePhase(data.phase)) {
    warnings.push("Phase should be a valid GamePhase")
  }

  if (data.round && typeof data.round !== 'number') {
    warnings.push("Round should be a number")
  }

  if (data.scores && !isObject(data.scores)) {
    warnings.push("Scores should be an object")
  }

  if (data.bets && !isObject(data.bets)) {
    warnings.push("Bets should be an object")
  }

  if (data.currentTurn && !isString(data.currentTurn)) {
    warnings.push("Current turn should be a string")
  }

  return {
    isValid: true, // Always return valid for now
    errors,
    warnings
  }
}

// ============================================================================
// Main Event Validation Function
// ============================================================================

/**
 * Validate a complete GameEvent
 */
export function validateGameEvent(event: any): EventValidationResult {
  const baseValidation = validateBaseEvent(event)
  
  if (!baseValidation.isValid) {
    return {
      ...baseValidation,
      eventType: event?.type || 'unknown',
      roomId: event?.roomId,
      userId: event?.userId
    }
  }

  let dataValidation: ValidationResult = { isValid: true, errors: [], warnings: [] }

  // Validate event-specific data
  switch (event.type) {
    case 'TEAMS_CHANGED':
      if (event.data) {
        dataValidation = validateTeamsChangedData(event.data)
      }
      break
    
    case 'BETS_CHANGED':
      if (event.data) {
        dataValidation = validateBetsChangedData(event.data)
      }
      break
    
    case 'CARDS_CHANGED':
      dataValidation = validateCardsChangedData(event.data)
      break
    
    case 'TRICK_CHANGED':
      dataValidation = validateTrickChangedData(event.data)
      break
    
    case 'ROUND_CHANGED':
      dataValidation = validateRoundChangedData(event.data)
      break
    
    case 'TEAM_SELECTED':
      dataValidation = validateEventData(event.data, isTeamEventData, 'TEAM_SELECTED')
      break
    
    case 'BET_PLACED':
    case 'BETTING_COMPLETE':
    case 'BETTING_PHASE_STARTED':
      dataValidation = validateEventData(event.data, isBettingEventData, event.type)
      break
    
    case 'TRICK_COMPLETE':
      dataValidation = validateEventData(event.data, isCardEventData, 'TRICK_COMPLETE')
      break
    
    case 'ROUND_COMPLETE':
    case 'ROUND_SCORING_COMPLETE':
      dataValidation = validateEventData(event.data, isObject, event.type)
      break
    
    case 'CONNECTED':
    case 'HEARTBEAT':
      // System events don't require data validation
      break
    
    default:
      dataValidation.warnings.push(`Unknown event type: ${event.type}`)
  }

  return {
    isValid: baseValidation.isValid && dataValidation.isValid,
    errors: [...baseValidation.errors, ...dataValidation.errors],
    warnings: [...baseValidation.warnings, ...dataValidation.warnings],
    eventType: event.type,
    roomId: event.roomId,
    userId: event.userId
  }
}

/**
 * Validate and sanitize an event before broadcasting
 */
export function validateAndSanitizeEvent(event: any): { 
  isValid: boolean
  sanitizedEvent?: GameEvent
  validation: EventValidationResult 
} {
  const validation = validateGameEvent(event)
  
  if (!validation.isValid) {
    return { isValid: false, validation }
  }

  // Create sanitized event with only valid fields
  const sanitizedEvent: GameEvent = {
    type: event.type,
    roomId: event.roomId,
    ...(event.userId && { userId: event.userId }),
    ...(event.data && { data: event.data })
  } as GameEvent

  return {
    isValid: true,
    sanitizedEvent,
    validation
  }
}

/**
 * Log validation results for debugging
 */
export function logValidationResult(validation: EventValidationResult): void {
  if (!validation.isValid) {
    console.error(`❌ Event validation failed for ${validation.eventType}:`, validation.errors)
  }
  
  if (validation.warnings.length > 0) {
    console.warn(`⚠️ Event validation warnings for ${validation.eventType}:`, validation.warnings)
  }
}
