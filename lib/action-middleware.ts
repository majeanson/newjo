/**
 * Action Middleware System
 * 
 * This file contains a middleware system for game actions that provides
 * logging, validation, error handling, and other cross-cutting concerns.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { GameState } from "./game-types"
import { ActionContext, ActionResult } from "./game-action-factory"
import { ActionResultBuilder } from "./action-result-builders"

// ============================================================================
// Middleware Types
// ============================================================================

export interface MiddlewareContext<TInput = any> {
  actionName: string
  input: TInput
  context: ActionContext
  startTime: number
  metadata: Record<string, any>
}

export interface MiddlewareResult {
  continue: boolean
  error?: string
  modifiedInput?: any
  modifiedContext?: Partial<ActionContext>
  metadata?: Record<string, any>
}

export interface Middleware<TInput = any> {
  name: string
  priority: number // Lower numbers run first
  before?: (ctx: MiddlewareContext<TInput>) => Promise<MiddlewareResult> | MiddlewareResult
  after?: (ctx: MiddlewareContext<TInput>, result: ActionResult) => Promise<ActionResult> | ActionResult
  onError?: (ctx: MiddlewareContext<TInput>, error: Error) => Promise<ActionResult> | ActionResult
}

// ============================================================================
// Built-in Middleware
// ============================================================================

/**
 * Logging middleware
 */
export const loggingMiddleware: Middleware = {
  name: 'logging',
  priority: 1,
  before: (ctx) => {
    console.log(`🎮 Action started: ${ctx.actionName}`, {
      userId: ctx.context.userId,
      roomId: ctx.context.roomId,
      timestamp: new Date().toISOString()
    })
    return { continue: true }
  },
  after: (ctx, result) => {
    const duration = Date.now() - ctx.startTime
    console.log(`✅ Action completed: ${ctx.actionName}`, {
      success: result.success,
      duration: `${duration}ms`,
      userId: ctx.context.userId,
      roomId: ctx.context.roomId
    })
    return result
  },
  onError: (ctx, error) => {
    const duration = Date.now() - ctx.startTime
    console.error(`❌ Action failed: ${ctx.actionName}`, {
      error: error.message,
      duration: `${duration}ms`,
      userId: ctx.context.userId,
      roomId: ctx.context.roomId,
      stack: error.stack
    })
    
    return new ActionResultBuilder(ctx.actionName)
      .failure(`Action failed: ${error.message}`)
      .withUser(ctx.context.userId)
      .withRoom(ctx.context.roomId)
      .withDebug(error.stack, { originalError: error.message })
      .buildSimple()
  }
}

/**
 * Rate limiting middleware
 */
export const rateLimitingMiddleware: Middleware = {
  name: 'rateLimit',
  priority: 2,
  before: (ctx) => {
    // Simple in-memory rate limiting (in production, use Redis or similar)
    const key = `${ctx.context.userId}:${ctx.actionName}`
    const now = Date.now()
    const windowMs = 60000 // 1 minute
    const maxRequests = 30 // 30 requests per minute
    
    if (!globalThis.__rateLimitStore) {
      globalThis.__rateLimitStore = new Map()
    }
    
    const store = globalThis.__rateLimitStore as Map<string, { count: number; resetTime: number }>
    const current = store.get(key)
    
    if (!current || now > current.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs })
      return { continue: true }
    }
    
    if (current.count >= maxRequests) {
      return { 
        continue: false, 
        error: 'Rate limit exceeded. Please slow down.' 
      }
    }
    
    current.count++
    return { continue: true }
  }
}

/**
 * Input sanitization middleware
 */
export const sanitizationMiddleware: Middleware = {
  name: 'sanitization',
  priority: 3,
  before: (ctx) => {
    // Sanitize input to prevent injection attacks
    const sanitizedInput = sanitizeInput(ctx.input)
    return { 
      continue: true, 
      modifiedInput: sanitizedInput,
      metadata: { sanitized: true }
    }
  }
}

/**
 * Authentication middleware
 */
export const authenticationMiddleware: Middleware = {
  name: 'authentication',
  priority: 4,
  before: (ctx) => {
    if (!ctx.context.userId) {
      return { 
        continue: false, 
        error: 'Authentication required' 
      }
    }
    
    // In a real app, verify the user token here
    return { continue: true }
  }
}

/**
 * Authorization middleware
 */
export const authorizationMiddleware: Middleware = {
  name: 'authorization',
  priority: 5,
  before: (ctx) => {
    // Check if user has permission to perform this action
    const hasPermission = checkUserPermission(ctx.context.userId, ctx.actionName, ctx.context.roomId)
    
    if (!hasPermission) {
      return { 
        continue: false, 
        error: 'Insufficient permissions' 
      }
    }
    
    return { continue: true }
  }
}

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware: Middleware = {
  name: 'performance',
  priority: 10,
  before: (ctx) => {
    ctx.metadata.performanceStart = Date.now()
    return { continue: true }
  },
  after: (ctx, result) => {
    const duration = Date.now() - (ctx.metadata.performanceStart || ctx.startTime)
    
    // Log slow actions
    if (duration > 1000) {
      console.warn(`🐌 Slow action detected: ${ctx.actionName} took ${duration}ms`)
    }
    
    // Add performance data to result if it's a detailed result
    if ('performance' in result) {
      (result as any).performance.totalExecutionTime = duration
    }
    
    return result
  }
}

/**
 * Error recovery middleware
 */
export const errorRecoveryMiddleware: Middleware = {
  name: 'errorRecovery',
  priority: 100, // Run last
  onError: (ctx, error) => {
    // Attempt to recover from certain types of errors
    if (error.message.includes('Game state not found')) {
      console.log(`🔄 Attempting to recover from missing game state for room ${ctx.context.roomId}`)
      // In a real app, you might try to recreate the game state or redirect to a safe state
    }
    
    // Return a standardized error result
    return new ActionResultBuilder(ctx.actionName)
      .failure(`System error: ${error.message}`)
      .withUser(ctx.context.userId)
      .withRoom(ctx.context.roomId)
      .withDebug(error.stack, { 
        recoveryAttempted: true,
        originalError: error.message 
      })
      .buildSimple()
  }
}

// ============================================================================
// Middleware Engine
// ============================================================================

export class MiddlewareEngine {
  private middleware: Middleware[] = []

  constructor() {
    // Register default middleware
    this.use(loggingMiddleware)
    this.use(rateLimitingMiddleware)
    this.use(sanitizationMiddleware)
    this.use(authenticationMiddleware)
    this.use(authorizationMiddleware)
    this.use(performanceMiddleware)
    this.use(errorRecoveryMiddleware)
  }

  /**
   * Add middleware to the engine
   */
  use(middleware: Middleware): void {
    this.middleware.push(middleware)
    // Sort by priority
    this.middleware.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Remove middleware by name
   */
  remove(name: string): void {
    this.middleware = this.middleware.filter(m => m.name !== name)
  }

  /**
   * Execute before middleware
   */
  async executeBefore<TInput>(ctx: MiddlewareContext<TInput>): Promise<{
    canContinue: boolean
    error?: string
    modifiedInput?: TInput
    modifiedContext?: ActionContext
  }> {
    let modifiedInput = ctx.input
    let modifiedContext = ctx.context
    
    for (const middleware of this.middleware) {
      if (middleware.before) {
        try {
          const result = await middleware.before({
            ...ctx,
            input: modifiedInput,
            context: modifiedContext
          })
          
          if (!result.continue) {
            return { 
              canContinue: false, 
              error: result.error || `Middleware ${middleware.name} blocked execution` 
            }
          }
          
          if (result.modifiedInput !== undefined) {
            modifiedInput = result.modifiedInput
          }
          
          if (result.modifiedContext) {
            modifiedContext = { ...modifiedContext, ...result.modifiedContext }
          }
          
          if (result.metadata) {
            Object.assign(ctx.metadata, result.metadata)
          }
        } catch (error) {
          console.error(`Error in middleware ${middleware.name}:`, error)
          return { 
            canContinue: false, 
            error: `Middleware error: ${error}` 
          }
        }
      }
    }
    
    return { 
      canContinue: true, 
      modifiedInput, 
      modifiedContext 
    }
  }

  /**
   * Execute after middleware
   */
  async executeAfter<TInput>(ctx: MiddlewareContext<TInput>, result: ActionResult): Promise<ActionResult> {
    let modifiedResult = result
    
    for (const middleware of this.middleware) {
      if (middleware.after) {
        try {
          modifiedResult = await middleware.after(ctx, modifiedResult)
        } catch (error) {
          console.error(`Error in after middleware ${middleware.name}:`, error)
          // Don't fail the entire action for after middleware errors
        }
      }
    }
    
    return modifiedResult
  }

  /**
   * Execute error middleware
   */
  async executeOnError<TInput>(ctx: MiddlewareContext<TInput>, error: Error): Promise<ActionResult> {
    for (const middleware of this.middleware) {
      if (middleware.onError) {
        try {
          const result = await middleware.onError(ctx, error)
          if (result) {
            return result
          }
        } catch (middlewareError) {
          console.error(`Error in error middleware ${middleware.name}:`, middlewareError)
          // Continue to next middleware
        }
      }
    }
    
    // Default error result if no middleware handled it
    return new ActionResultBuilder(ctx.actionName)
      .failure(`Unhandled error: ${error.message}`)
      .withUser(ctx.context.userId)
      .withRoom(ctx.context.roomId)
      .buildSimple()
  }

  /**
   * Get list of registered middleware
   */
  getMiddleware(): Array<{ name: string; priority: number }> {
    return this.middleware.map(m => ({ name: m.name, priority: m.priority }))
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize input to prevent injection attacks
 */
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return input
}

/**
 * Check user permissions (placeholder implementation)
 */
function checkUserPermission(userId: string, actionName: string, roomId: string): boolean {
  // In a real app, this would check against a permission system
  // For now, allow all authenticated users
  return !!userId
}

// ============================================================================
// Global Middleware Engine
// ============================================================================

export const globalMiddlewareEngine = new MiddlewareEngine()

/**
 * Convenience function to add middleware globally
 */
export function useMiddleware(middleware: Middleware): void {
  globalMiddlewareEngine.use(middleware)
}

/**
 * Convenience function to remove middleware globally
 */
export function removeMiddleware(name: string): void {
  globalMiddlewareEngine.remove(name)
}
