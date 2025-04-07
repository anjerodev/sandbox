import * as React from 'react'

import {
  AlertOctagon,
  AlertTriangle,
  Info,
  MessageSquare,
  TerminalSquare,
} from 'lucide-react'

import { ExecutionEvent } from '@/lib/utils/workerUtils'

// Helper function to check if a value is a primitive type
const isPrimitive = (value: unknown): boolean => {
  return (
    value === null || (typeof value !== 'object' && typeof value !== 'function')
  )
}
// Configuration for inline array display
const MAX_INLINE_ARRAY_LENGTH = 10 // Max items to display inline
const MAX_INLINE_STRING_LENGTH = 50 // Max length for individual strings within inline array

interface EventItemProps extends ExecutionEvent {
  onMouseEnter?: (line: number | undefined) => void
  onMouseLeave?: () => void
}

// Refactored EventItem Component
export const EventItem = (props: EventItemProps) => {
  const { type, data, line, level, onMouseEnter, onMouseLeave } = props

  let IconComponent: React.ElementType = MessageSquare
  let iconColor = 'text-(--debug-neutral)' // Default icon color
  let textColor = 'text-(--debug-fg)' // Default text color
  let borderColor = 'text-(--debug-neutral)' // Default border color for log levels

  if (type === 'result') {
    IconComponent = TerminalSquare
    iconColor = 'text-(--log-log)'
    borderColor = 'text-(--log-log)'
    textColor = 'text-(--log-log)'
  } else if (type === 'log') {
    switch (level?.toLowerCase()) {
      case 'warn':
        IconComponent = AlertTriangle
        iconColor = 'text-(--log-warn)'
        borderColor = 'text-(--log-warn)'
        textColor = 'text-(--log-warn)'
        break
      case 'error':
        IconComponent = AlertOctagon
        iconColor = 'text-(--log-error)'
        borderColor = 'text-(--log-error)'
        textColor = 'text-(--log-error)'
        break
      case 'info':
        IconComponent = Info
        iconColor = 'text-(--log-info)'
        borderColor = 'text-(--log-info)'
        textColor = 'text-(--log-info)'
        break
      default: // 'log' or unknown level
        // Keep defaults
        break
    }
  }

  // --- Data Rendering Logic ---
  const renderFormattedData = () => {
    // 1. Handle Arrays
    if (Array.isArray(data)) {
      // 1a. Log arrays: Mimic console.log (space separated string output)
      if (type === 'log') {
        const logString = data
          .map((item) => {
            // Represent non-strings reasonably within the log line
            if (typeof item === 'string') return item
            if (typeof item === 'object' && item !== null)
              return JSON.stringify(item) // Basic stringify for objects
            return String(item) // Handles null, undefined, boolean, number
          })
          .join(' ')
        return (
          <span className={`text-sm ${textColor} font-mono break-words`}>
            {logString}
          </span>
        )
      }

      // 1b. Result arrays: Try inline formatting first
      const isSimple = data.every(isPrimitive)
      const isShort = data.length <= MAX_INLINE_ARRAY_LENGTH
      // Also check if individual strings aren't excessively long
      const containsLongString = data.some(
        (item) =>
          typeof item === 'string' && item.length > MAX_INLINE_STRING_LENGTH
      )

      if (isSimple && isShort && !containsLongString && data.length > 0) {
        return (
          <span className={`text-sm ${textColor} font-mono break-words`}>
            <span>[</span>
            {data.map((item, index) => (
              <React.Fragment key={index}>
                <span className="mx-px">{JSON.stringify(item)}</span>
                {index < data.length - 1 && <span>, </span>}
              </React.Fragment>
            ))}
            <span>]</span>
            {data.length > 0 && (
              <span className="ml-1.5 text-xs">({data.length})</span>
            )}
          </span>
        )
      }

      return (
        <pre
          className={`text-sm break-words whitespace-pre-wrap ${textColor} -my-1 font-mono`}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )

      // 2. Handle Objects (excluding null, which is primitive)
    } else if (typeof data === 'object' && data !== null) {
      return (
        <pre
          className={`text-sm break-words whitespace-pre-wrap ${textColor} -my-1 font-mono`}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )

      // 3. Handle Primitives (string, number, boolean, null, undefined)
    } else {
      return (
        <span
          className={`font-mono text-sm break-words whitespace-pre-wrap text-(--debug-primitive-fg)`}
        >
          {/* Render raw string data directly; stringify others */}
          {typeof data === 'string' ? data : JSON.stringify(data)}
        </span>
      )
    }
  }
  // --- End Data Rendering Logic ---

  return (
    <div
      className={`flex items-start space-x-3 border-l-4 px-4 py-2.5 font-mono ${borderColor} cursor-default`}
      onMouseEnter={() => onMouseEnter?.(line)}
      onMouseLeave={onMouseLeave}
    >
      <IconComponent size={18} className={iconColor} aria-hidden="true" />

      <div className="min-w-0 flex-1 leading-1">{renderFormattedData()}</div>

      {line !== undefined && (
        <span className="text-end text-xs text-(--debug-neutral) select-none">
          L{line}
        </span>
      )}
    </div>
  )
}
