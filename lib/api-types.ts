/**
 * Standardized API Response Types
 * 
 * This file contains all standardized response types for API endpoints
 * to ensure consistency across the application and improve type safety.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GameState, Player } from "./game-types"
import { GameEvent } from "./events"

// ============================================================================
// Base API Response Types
// ============================================================================

/**
 * Standard success response structure
 */
export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  timestamp: string
}

/**
 * Standard error response structure
 */
export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
  timestamp: string
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

// ============================================================================
// Game State API Responses
// ============================================================================

/**
 * Response for getting game state
 */
export interface GameStateResponse {
  gameState: GameState | null
  roomExists: boolean
  playerCount: number
  isPlayerInRoom: boolean
}

/**
 * Response for game actions (betting, card playing, etc.)
 */
export interface GameActionResponse {
  gameState: GameState
  actionType: string
  playerId: string
  playerName: string
  success: boolean
}

/**
 * Response for round completion
 */
export interface RoundCompletionResponse extends GameActionResponse {
  roundResult: {
    teamAScore: number
    teamBScore: number
    bettingTeamWon: boolean
    round: number
    highestBet: any
  }
}

// ============================================================================
// Room Management API Responses
// ============================================================================

/**
 * Response for room creation
 */
export interface RoomCreationResponse {
  roomId: string
  roomCode: string
  createdBy: string
  createdAt: string
}

/**
 * Response for joining a room
 */
export interface RoomJoinResponse {
  roomId: string
  playerId: string
  playerName: string
  playerCount: number
  gamePhase: string
  isGameInProgress: boolean
}

/**
 * Response for room details
 */
export interface RoomDetailsResponse {
  roomId: string
  roomCode: string
  createdBy: string
  createdAt: string
  players: Player[]
  gameState: GameState | null
  isGameInProgress: boolean
  canJoin: boolean
}

// ============================================================================
// Player Management API Responses
// ============================================================================

/**
 * Response for player actions (ready, team selection, etc.)
 */
export interface PlayerActionResponse {
  playerId: string
  playerName: string
  actionType: string
  newState: any
  affectedPlayers: string[]
}

/**
 * Response for player status
 */
export interface PlayerStatusResponse {
  playerId: string
  playerName: string
  isReady: boolean
  team?: string
  seatPosition?: number
  isConnected: boolean
  lastSeen: string
}

// ============================================================================
// Event History API Responses
// ============================================================================

/**
 * Response for game event history
 */
export interface EventHistoryResponse {
  events: Array<{
    id: string
    type: string
    userId?: string
    playerName?: string
    data?: any
    timestamp: string
  }>
  totalEvents: number
  roomId: string
}

/**
 * Response for adding event to history
 */
export interface EventAddResponse {
  eventId: string
  added: boolean
  totalEvents: number
}

// ============================================================================
// Statistics and Analytics API Responses
// ============================================================================

/**
 * Response for game statistics
 */
export interface GameStatsResponse {
  roomId: string
  totalGames: number
  totalRounds: number
  averageGameDuration: number
  playerStats: Record<string, {
    gamesPlayed: number
    gamesWon: number
    averageScore: number
    favoriteTeam: string
  }>
}

/**
 * Response for system health
 */
export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  activeRooms: number
  activePlayers: number
  sseConnections: number
  databaseStatus: 'connected' | 'disconnected' | 'error'
  lastChecked: string
}

// ============================================================================
// SSE Connection API Responses
// ============================================================================

/**
 * Response for SSE connection status
 */
export interface SseConnectionResponse {
  roomId: string
  connectionId: string
  isConnected: boolean
  listenerCount: number
  connectionCount: number
  lastHeartbeat: string
}

// ============================================================================
// Validation and Error Types
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

/**
 * Response for validation errors
 */
export interface ValidationErrorResponse extends ApiErrorResponse {
  validationErrors: ValidationError[]
}

// ============================================================================
// Response Builder Utilities
// ============================================================================

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string,
  code?: string,
  details?: any
): ApiErrorResponse {
  return {
    success: false,
    error,
    code,
    details,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  error: string,
  validationErrors: ValidationError[]
): ValidationErrorResponse {
  return {
    success: false,
    error,
    validationErrors,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
    hasNext: (page * pageSize) < total,
    hasPrevious: page > 1
  }
}

// ============================================================================
// Type Guards for API Responses
// ============================================================================

/**
 * Check if response is a success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true
}

/**
 * Check if response is an error response
 */
export function isErrorResponse(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false
}

/**
 * Check if response is a validation error response
 */
export function isValidationErrorResponse(response: ApiResponse): response is ValidationErrorResponse {
  return response.success === false && 'validationErrors' in response
}

// ============================================================================
// HTTP Status Code Mappings
// ============================================================================

/**
 * Map API response to appropriate HTTP status code
 */
export function getHttpStatusCode(response: ApiResponse): number {
  if (isSuccessResponse(response)) {
    return 200
  }

  if (isValidationErrorResponse(response)) {
    return 400
  }

  if (isErrorResponse(response)) {
    switch (response.code) {
      case 'NOT_FOUND':
        return 404
      case 'UNAUTHORIZED':
        return 401
      case 'FORBIDDEN':
        return 403
      case 'CONFLICT':
        return 409
      case 'RATE_LIMITED':
        return 429
      case 'INTERNAL_ERROR':
        return 500
      default:
        return 400
    }
  }

  return 500
}
