/**
 * Hook Composition Utilities
 * 
 * This file contains reusable hook patterns and composition utilities
 * for building complex React hooks with better performance and maintainability.
 * 
 * @see docs/REALTIME_ARCHITECTURE.md for complete documentation
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ============================================================================
// Base Hook Utilities
// ============================================================================

/**
 * Hook for managing async operations with loading and error states
 */
export function useAsync<T, E = Error>(
  asyncFunction: () => Promise<T>,
  dependencies: React.DependencyList = []
) {
  const [state, setState] = useState<{
    data: T | null
    loading: boolean
    error: E | null
  }>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const data = await asyncFunction()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      setState({ data: null, loading: false, error: error as E })
      throw error
    }
  }, dependencies)

  useEffect(() => {
    execute()
  }, [execute])

  return { ...state, execute }
}

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for managing previous values
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  
  useEffect(() => {
    ref.current = value
  })
  
  return ref.current
}

/**
 * Hook for managing intervals
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

/**
 * Hook for managing timeouts
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return

    const id = setTimeout(() => savedCallback.current(), delay)
    return () => clearTimeout(id)
  }, [delay])
}

// ============================================================================
// State Management Utilities
// ============================================================================

/**
 * Hook for managing complex state with reducers
 */
export function useReducerWithMiddleware<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  middleware: Array<(state: S, action: A, next: (action: A) => void) => void> = []
) {
  const [state, dispatch] = useState(initialState)

  const enhancedDispatch = useCallback((action: A) => {
    let currentState = state
    let actionToDispatch = action

    // Apply middleware
    const middlewareChain = middleware.slice()
    
    const next = (nextAction: A) => {
      actionToDispatch = nextAction
    }

    for (const mw of middlewareChain) {
      mw(currentState, actionToDispatch, next)
    }

    // Apply reducer
    const newState = reducer(currentState, actionToDispatch)
    setState(newState)
  }, [state, reducer, middleware])

  return [state, enhancedDispatch] as const
}

/**
 * Hook for managing state with validation
 */
export function useValidatedState<T>(
  initialValue: T,
  validator: (value: T) => { isValid: boolean; errors: string[] }
) {
  const [value, setValue] = useState(initialValue)
  const [validation, setValidation] = useState(() => validator(initialValue))

  const setValidatedValue = useCallback((newValue: T) => {
    const newValidation = validator(newValue)
    setValidation(newValidation)
    
    if (newValidation.isValid) {
      setValue(newValue)
    }
    
    return newValidation.isValid
  }, [validator])

  return {
    value,
    setValue: setValidatedValue,
    validation,
    isValid: validation.isValid,
    errors: validation.errors
  }
}

// ============================================================================
// Event Handling Utilities
// ============================================================================

/**
 * Hook for managing event listeners
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | Element | null = window
) {
  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    if (!element?.addEventListener) return

    const eventListener = (event: Event) => savedHandler.current(event as WindowEventMap[K])
    element.addEventListener(eventName, eventListener)

    return () => {
      element.removeEventListener(eventName, eventListener)
    }
  }, [eventName, element])
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options: { preventDefault?: boolean; stopPropagation?: boolean } = {}
) {
  const { preventDefault = true, stopPropagation = true } = options

  useEventListener('keydown', (event) => {
    const pressedKeys = []
    
    if (event.ctrlKey) pressedKeys.push('ctrl')
    if (event.shiftKey) pressedKeys.push('shift')
    if (event.altKey) pressedKeys.push('alt')
    if (event.metaKey) pressedKeys.push('meta')
    
    pressedKeys.push(event.key.toLowerCase())

    const keysMatch = keys.every(key => pressedKeys.includes(key.toLowerCase()))
    
    if (keysMatch) {
      if (preventDefault) event.preventDefault()
      if (stopPropagation) event.stopPropagation()
      callback()
    }
  })
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Hook for memoizing expensive calculations
 */
export function useExpensiveCalculation<T>(
  calculation: () => T,
  dependencies: React.DependencyList
): T {
  return useMemo(calculation, dependencies)
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastRan = useRef(Date.now())

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRan.current >= delay) {
        func(...args)
        lastRan.current = Date.now()
      }
    }) as T,
    [func, delay]
  )
}

/**
 * Hook for managing component mount status
 */
export function useIsMounted() {
  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  return useCallback(() => isMounted.current, [])
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Hook for managing localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setValue]
}

/**
 * Hook for managing sessionStorage
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setValue]
}

// ============================================================================
// Composition Utilities
// ============================================================================

/**
 * Compose multiple hooks into a single hook
 */
export function composeHooks<T extends Record<string, any>>(
  hooks: Array<() => Partial<T>>
): () => T {
  return () => {
    const results = hooks.map(hook => hook())
    return Object.assign({}, ...results) as T
  }
}

/**
 * Create a hook that conditionally runs other hooks
 */
export function useConditionalHook<T>(
  condition: boolean,
  hook: () => T,
  fallback: T
): T {
  if (condition) {
    return hook()
  }
  return fallback
}

/**
 * Create a hook that runs hooks in sequence
 */
export function useSequentialHooks<T>(
  hooks: Array<() => T>
): T[] {
  return hooks.map(hook => hook())
}
