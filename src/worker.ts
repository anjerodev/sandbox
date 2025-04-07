/* eslint-disable @typescript-eslint/no-explicit-any */
import { SourceMapConsumer } from 'source-map-js'
import ts from 'typescript'

interface ExecutionEvent {
  line?: number
  type: 'result' | 'log'
  level?: string // 'log', 'warn', 'error', etc. for logs
  data: unknown
}

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
  clear: console.clear,
  dir: console.dir,
}

const STACK_LINE_REGEX =
  /(?:at |@|eval at .*?\()(?:\S+ \()?(?:.*[\\/])?([\w.-]+|<anonymous>):(\d+):(\d+)\)?/

const workerDebugLog = (..._args: any[]) => {
  // if (import.meta.env.DEV) originalConsole.log('👀 [WORKER]', ...args)
  return
}

async function parseErrorStack(
  error: Error,
  consumer: SourceMapConsumer | null = null,
  instrumentationLineOffset: number = 0
): Promise<{
  line?: number
  column?: number
  message: string
}> {
  const message = error?.message || 'Unknown error'
  const stack = error?.stack

  if (!stack || !consumer) return { message }

  try {
    const lines = stack.split('\n')

    for (const line of lines) {
      const match = line.match(STACK_LINE_REGEX)

      if (match) {
        const lineMatches = [...line.matchAll(/:\d+:\d+/g)]
        if (lineMatches.length > 0) {
          const source = match[1]
          const jsLine = parseInt(match[2], 10)
          const jsColumn = parseInt(match[3], 10)

          workerDebugLog(`  Matched stack line: ${line}`)
          workerDebugLog(
            `  Raw source: ${source}, Raw JS line: ${jsLine}, Raw JS col: ${jsColumn}`
          )

          // *** Apply the offset ***
          const adjustedJsLine = jsLine - instrumentationLineOffset
          workerDebugLog(`  Adjusted JS line (for mapping): ${adjustedJsLine}`)

          if (
            !isNaN(adjustedJsLine) &&
            !isNaN(jsColumn) &&
            adjustedJsLine > 0 &&
            jsColumn >= 0
          ) {
            // Use the adjusted line number for sourcemap lookup
            const originalPos = consumer.originalPositionFor({
              line: adjustedJsLine,
              column: jsColumn > 0 ? jsColumn - 1 : 0, // 0-based column for source-map library
            })

            workerDebugLog(`  Mapped position:`, originalPos)

            if (
              originalPos &&
              originalPos.line !== null &&
              originalPos.line > 0
            ) {
              // Found a valid mapping!
              return {
                line: originalPos.line, // Use the mapped TS line number
                column:
                  originalPos.column !== null
                    ? originalPos.column + 1 // Convert back to 1-based column for display
                    : undefined,
                message,
                // No stack needed for user
              }
            } else {
              workerDebugLog(
                `  Mapping failed or yielded null line for adjusted line ${adjustedJsLine}`
              )
            }
          } else {
            workerDebugLog(
              `  Skipping mapping: Invalid adjusted line/col: ${adjustedJsLine}:${jsColumn}`
            )
          }
        }
      }
    }
    workerDebugLog(`No valid mapping found in stack trace.`)
    // If loop completes without finding a valid mapping
    return { message }
  } catch (parseError) {
    originalConsole.error(
      '!! Worker Error: Error parsing stack trace:',
      parseError
    )
    return { message }
  }
}

// --- Texts for the helper functions to inject ---
const reportResultHelperText = `
function __reportResult(value, line) {
  reportEvent({ type: 'result', line: line, data: value });
  return value; // Return value for potential chaining
}`

const reportLogHelperText = `
function __reportLog(level, line, args) {
  // console.origLog('Reporting log:', level, line, args); // Debugging the helper itself
  reportEvent({ type: 'log', level: level, line: line, data: args });
  // console.log itself returns undefined, so no need to return anything meaningful
}`

const MAX_DEPTH = 10 // Prevent infinite recursion in deep/circular structures
const MAX_ARRAY_LENGTH = 100 // Limit array elements shown
const MAX_OBJECT_KEYS = 50 // Limit object keys shown

function sanitizeForCloning(
  value: any,
  depth = 0,
  visited = new Set<any>()
): any {
  if (depth > MAX_DEPTH) {
    return '[Max depth reached]'
  }

  // Handle primitive types and null
  if (value === null || typeof value !== 'object') {
    switch (typeof value) {
      case 'function':
        return `[Function: ${value.name || 'anonymous'}]`
      case 'symbol':
        return `[Symbol: ${value.description || ''}]`
      case 'bigint':
        return `${value.toString()}n` // Represent BigInt as string for safety, though structured clone handles it
      case 'undefined':
        return 'undefined' // Represent undefined explicitly as a string
      default:
        // string, number, boolean are fine
        return value
    }
  }

  // Handle potential circular references
  if (visited.has(value)) {
    return '[Circular Reference]'
  }
  visited.add(value) // Add current object/array to visited set

  try {
    // Handle Arrays
    if (Array.isArray(value)) {
      const sanitizedArray = []
      const len = Math.min(value.length, MAX_ARRAY_LENGTH)
      for (let i = 0; i < len; i++) {
        sanitizedArray.push(sanitizeForCloning(value[i], depth + 1, visited))
      }
      if (value.length > MAX_ARRAY_LENGTH) {
        sanitizedArray.push(
          `... ${value.length - MAX_ARRAY_LENGTH} more items]`
        )
      }
      return sanitizedArray
    }

    // Handle Error objects
    if (value instanceof Error) {
      return sanitizeForCloning(
        {
          name: value.name,
          message: value.message,
          stack: value.stack?.split('\n')[0] + '...', // Keep stack brief
        },
        depth + 1,
        visited
      )
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString() // Dates are cloneable, but ISO string is often more readable
    }

    // Handle RegExp objects
    if (value instanceof RegExp) {
      return value.toString() // RegExps are cloneable, string representation is safe
    }

    // Handle other non-plain objects (DOM nodes, etc.)
    // This is a basic check; more specific checks could be added
    if (
      typeof value.constructor === 'function' &&
      value.constructor !== Object
    ) {
      // Avoid trying to clone potentially complex browser objects
      try {
        // Use toString() as a fallback, might provide useful info
        const name = value.constructor?.name || 'Object'
        const str = value.toString()
        // Avoid overly verbose default toString like "[object Object]"
        if (str === '[object Object]' || str === `[object ${name}]`) {
          return `[${name}]`
        }
        // Limit length
        return `[${name}: ${str.substring(0, 50)}${
          str.length > 50 ? '...' : ''
        }]`
      } catch {
        return `[Instance of ${value.constructor?.name || 'Object'}]`
      }
    }

    // Handle Plain Objects
    const sanitizedObject: { [key: string]: any } = {}
    const keys = Object.keys(value)
    const len = Math.min(keys.length, MAX_OBJECT_KEYS)
    let keysProcessed = 0
    for (const key of keys) {
      if (keysProcessed >= len) break
      sanitizedObject[key] = sanitizeForCloning(value[key], depth + 1, visited)
      keysProcessed++
    }
    if (keys.length > MAX_OBJECT_KEYS) {
      sanitizedObject['...'] = `${keys.length - MAX_OBJECT_KEYS} more keys]`
    }
    return sanitizedObject
  } finally {
    // Important: Remove the object from the visited set after processing its branch
    visited.delete(value)
  }
}

self.onmessage = async (e: MessageEvent<{ code: string }>) => {
  const { code } = e.data
  const events: ExecutionEvent[] = []
  let sourceMapConsumer: SourceMapConsumer | null = null
  let helperLineOffset = 0

  // *** The single function to report events ***
  const reportEvent = (event: ExecutionEvent) => {
    try {
      let sanitizedData: any
      if (event.type === 'log' && Array.isArray(event.data)) {
        // Sanitize each argument in the log data array
        sanitizedData = event.data.map((arg) => sanitizeForCloning(arg))
      } else if (event.type === 'result') {
        // Sanitize the single result value
        sanitizedData = sanitizeForCloning(event.data)
      } else {
        // Fallback for other potential types or unexpected data shapes
        sanitizedData = sanitizeForCloning(event.data)
      }

      const sanitizedEvent: ExecutionEvent = {
        ...event,
        data: sanitizedData,
      }
      // workerDebugLog("Sanitized event:", JSON.stringify(sanitizedEvent));
      events.push(sanitizedEvent)
    } catch (sanitizeError) {
      // If sanitization itself fails (e.g., getter throws), report that
      workerDebugLog(
        '!! Worker Error: Failed during event sanitization:',
        sanitizeError
      )
      events.push({
        type: 'log',
        level: 'error',
        line: event.line,
        data: [
          '[Internal Error: Could not process value for display]',
          sanitizeError instanceof Error
            ? sanitizeError.message
            : String(sanitizeError),
        ],
      })
    }
  }

  try {
    workerDebugLog('Transpiling TS...')
    const transpileResult = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        inlineSourceMap: true,
        inlineSources: true,
        checkJs: false,
        suppressOutputPathCheck: true,
        skipLibCheck: true,
      },
      reportDiagnostics: true,
    })

    // Handle transpilation diagnostics (report via reportEvent)
    if (transpileResult.diagnostics && transpileResult.diagnostics.length > 0) {
      workerDebugLog('Transpilation Errors Found!')
      transpileResult.diagnostics.forEach((diagnostic) => {
        /* ... report error via reportEvent ... */
        const messageText = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n'
        )
        let line: number | undefined
        let character: number | undefined

        if (diagnostic.file && typeof diagnostic.start === 'number') {
          const pos = diagnostic.file.getLineAndCharacterOfPosition(
            diagnostic.start
          )
          line = pos.line + 1
          character = pos.character + 1
        }
        reportEvent({
          type: 'log',
          level: 'error',
          line,
          data: [
            `TS${diagnostic.code}: ${messageText}${
              line ? ` (at line ${line})` : ''
            }${character ? ` (at column ${character})` : ''}`,
          ],
        })
      })
      postMessage(events)
      return // Stop
    }

    const jsCodeWithMap = transpileResult.outputText
    workerDebugLog('Transpilation OK.')

    // 2. Extract sourcemap and JS code
    const sourceMapMatch = jsCodeWithMap.match(
      /\/\/# sourceMappingURL=data:application\/json;base64,(.*)/
    )
    let jsCode = jsCodeWithMap

    if (sourceMapMatch?.[1]) {
      try {
        /* ... parse source map ... */
        sourceMapConsumer = new SourceMapConsumer(
          JSON.parse(atob(sourceMapMatch[1]))
        )
        jsCode = jsCodeWithMap.substring(0, sourceMapMatch.index).trimEnd()
        workerDebugLog('Source map parsed.')
      } catch (mapError) {
        /* ... handle map error ... */
        workerDebugLog('!! Worker Error: Failed to parse source map:', mapError)
        reportEvent({
          type: 'log',
          level: 'warn',
          data: [
            'Could not parse source map. Error line numbers may be inaccurate.',
          ],
        })
      }
    } else {
      /* ... handle no map ... */
      workerDebugLog('Source map not found in transpiled output.')
      reportEvent({
        type: 'log',
        level: 'warn',
        data: ['Source map not found. Error line numbers will be inaccurate.'],
      })
    }
    workerDebugLog(
      'Base JS Code (before instrumentation):\n---\n',
      jsCode,
      '\n---'
    )

    // 3. *** Instrument JS Code (Revised Logic) ***
    let instrumentedJs = ''
    let didInstrument = false // Flag if any instrumentation occurred
    try {
      workerDebugLog('Parsing generated JS for instrumentation...')
      const sourceFile = ts.createSourceFile(
        '__temp_module__.js',
        jsCode,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS
      )

      workerDebugLog('Processing statements...')
      for (const stmt of sourceFile.statements) {
        const stmtStartPos = stmt.getStart(sourceFile, false)
        const stmtEndPos = stmt.getEnd()
        const originalStmtTextWithTrivia = sourceFile.text.substring(
          stmt.getFullStart(),
          stmtEndPos
        )

        let handled = false // Flag if this statement was instrumented as log/result

        // --- Check if it's an ExpressionStatement ---
        if (ts.isExpressionStatement(stmt)) {
          const expr = stmt.expression

          // --- Check if it's a CallExpression like console.log() ---
          if (ts.isCallExpression(expr)) {
            const signature = expr.expression
            let level: string | null = null

            // Check if it's console.log, console.warn, etc.
            if (
              ts.isPropertyAccessExpression(signature) &&
              ts.isIdentifier(signature.expression) &&
              signature.expression.text === 'console'
            ) {
              const methodName = signature.name.text
              // Check if it's one of the methods we want to capture
              if (
                Object.prototype.hasOwnProperty.call(
                  originalConsole,
                  methodName
                ) &&
                methodName !== 'clear'
              ) {
                level = methodName
              }
            }

            if (level) {
              // *** Instrument as a Log Call ***
              workerDebugLog(`Instrumenting Log Call: console.${level}(...)`)
              didInstrument = true
              handled = true

              // Find original TS line number for the *start* of the call expression
              let originalLine: number | string = "'unknown'"
              if (sourceMapConsumer) {
                try {
                  // Use stmt start for line mapping (more reliable than call expression start sometimes)
                  const posInJs = ts.getLineAndCharacterOfPosition(
                    sourceFile,
                    stmtStartPos
                  )
                  const originalPos = sourceMapConsumer.originalPositionFor({
                    line: posInJs.line + 1,
                    column: posInJs.character,
                  })
                  if (originalPos && originalPos.line !== null) {
                    originalLine = originalPos.line.toString()
                  } else {
                    workerDebugLog(
                      `Mapping failed for console.${level} at line ${
                        posInJs.line + 1
                      }`
                    )
                  }
                } catch (mapErr) {
                  workerDebugLog('!! Error mapping console call pos:', mapErr)
                }
              }

              // Get the text of the arguments array
              const argsText = expr.arguments
                .map((arg) => arg.getText(sourceFile))
                .join(', ')

              const instrumentedStatement = `__reportLog('${level}', ${originalLine}, [${argsText}]);`
              instrumentedJs += instrumentedStatement + '\n'
              workerDebugLog(` -> Replaced with: ${instrumentedStatement}`)
            }
          }

          // --- If NOT handled as a log call, check if it should be instrumented as a result ---
          if (
            !handled &&
            !(ts.isStringLiteral(expr) && expr.text === 'use strict')
          ) {
            // *** Instrument as a Result Expression ***
            workerDebugLog(
              `Instrumenting Result Expression: ${expr.getText(sourceFile)}`
            )
            didInstrument = true
            handled = true

            let originalLine: number | string = "'unknown'"
            if (sourceMapConsumer) {
              try {
                const posInJs = ts.getLineAndCharacterOfPosition(
                  sourceFile,
                  expr.getStart(sourceFile, false)
                )
                const originalPos = sourceMapConsumer.originalPositionFor({
                  line: posInJs.line + 1,
                  column: posInJs.character,
                })
                if (originalPos && originalPos.line !== null) {
                  originalLine = originalPos.line.toString()
                } else {
                  workerDebugLog(
                    `Mapping failed for expr at line ${posInJs.line + 1}`
                  )
                }
              } catch (mapErr) {
                workerDebugLog('!! Error mapping expr pos:', mapErr)
              }
            }

            let instrumentedStatement: string
            if (ts.isAwaitExpression(expr)) {
              const awaitedExprText = expr.expression.getText(sourceFile)
              instrumentedStatement = `__reportResult(await (${awaitedExprText}), ${originalLine});`
            } else {
              const exprText = expr.getText(sourceFile)
              instrumentedStatement = `__reportResult((${exprText}), ${originalLine});`
            }
            instrumentedJs += instrumentedStatement + '\n'
            workerDebugLog(` -> Wrapped with: ${instrumentedStatement}`)
          }
        } // end if (isExpressionStatement)

        // --- If the statement was not instrumented, append its original text ---
        if (!handled) {
          instrumentedJs += originalStmtTextWithTrivia + '\n'
          if (stmt.kind !== ts.SyntaxKind.EndOfFileToken) {
            // Avoid logging EOF
            workerDebugLog(
              `Keeping statement as is: ${ts.SyntaxKind[stmt.kind]}`
            )
          }
        }
      } // end for (stmt of sourceFile.statements)
    } catch (parseError) {
      workerDebugLog(
        '!! Worker Error: Failed during JS instrumentation:',
        parseError
      )
      reportEvent({
        type: 'log',
        level: 'error',
        data: [
          'Internal error during code instrumentation. Execution aborted.',
        ],
      })
      postMessage(events)
      return // Abort
    }

    // --- Calculate offset *after* instrumentation loop ---
    if (didInstrument) {
      const helperText =
        reportLogHelperText + '\n' + reportResultHelperText + '\n'
      // Count newlines accurately
      helperLineOffset = (helperText.match(/\n/g) || []).length
      workerDebugLog(`Calculated helper line offset: ${helperLineOffset}`)
    }

    // Prepend the helper functions ONLY if instrumentation happened
    // Avoids injecting unused code for simple variable declarations etc.
    const finalCodeToExecute =
      (didInstrument
        ? reportLogHelperText + '\n' + reportResultHelperText + '\n'
        : '') + instrumentedJs

    workerDebugLog(
      'Final Instrumented Code for Execution:\n---\n',
      finalCodeToExecute,
      '\n---'
    )

    // 4. Execute the Instrumented Code
    workerDebugLog(`Executing instrumented JS...`)

    const AsyncFunction = Object.getPrototypeOf(
      async function () {}
    ).constructor
    const executor = new AsyncFunction(
      'reportEvent',
      `"use strict";\n${finalCodeToExecute}`
    )

    // Execute, passing the dependencies
    await executor.call(undefined, reportEvent)

    workerDebugLog('Execution finished.')
  } catch (error: unknown) {
    // 5. Report Runtime Errors (using parseErrorStack with sourceMapConsumer)
    if (error instanceof Error) {
      const errorInfo = await parseErrorStack(
        error,
        sourceMapConsumer,
        helperLineOffset
      )
      workerDebugLog('Parsed runtime error:', errorInfo)

      let displayMessage = errorInfo.message || 'Runtime error'
      if (errorInfo.line != null) {
        // Check specifically for valid line number
        displayMessage = `${displayMessage} (at line ${errorInfo.line})`
      } else {
        workerDebugLog(
          'Runtime error occurred, but no specific line mapping found.'
        )
        // Optional: Add a generic hint if line is unknown
        // displayMessage += " (location unknown)";
      }

      // Report error - Data here is typically message/stack (strings), usually safe
      reportEvent({
        type: 'log',
        level: 'error',
        line: errorInfo.line,
        data: [
          displayMessage, // The potentially enhanced message
        ],
      })
    } else {
      // Handle non-Error throws (sanitization happens in reportEvent)
      reportEvent({
        type: 'log',
        level: 'error',
        data: ['An unknown execution error occurred', error],
      })
    }
  } finally {
    // 6. Clean up
    workerDebugLog('Execution sequence finished. Posting events.')
    // 7. Send all collected events back
    workerDebugLog(
      'Final events being posted (should be sanitized):',
      JSON.stringify(events)
    )
    postMessage(events)
  }
}

self.addEventListener('unhandledrejection', async (event) => {
  event.preventDefault()
  originalConsole.error(
    '!! Worker Error: Unhandled Promise Rejection:',
    event.reason
  )

  const sanitizedReason = sanitizeForCloning(event.reason)
  let errorMessage: string
  let errorDetails: any = null // Use this for structured (sanitized) data if not Error

  if (event.reason instanceof Error) {
    // Attempt to parse stack for line number, *if* we had a consumer available
    // NOTE: Getting the correct sourceMapConsumer here is tricky, as this event
    // is outside the main onmessage flow. For simplicity, we might omit line mapping here.
    // If needed, you'd have to store the last used consumer globally in the worker.
    // Let's prioritize just getting a clean message for now.
    errorMessage = event.reason.message
    // We could try a parseErrorStack here if we stored the consumer, but let's keep it simple:
    // const errorInfo = await parseErrorStack(event.reason, /* storedConsumer */, /* how to get offset? */);
    // errorMessage = errorInfo.message; // Potentially add line info if successful
  } else if (typeof sanitizedReason === 'string') {
    errorMessage = sanitizedReason
  } else {
    errorMessage = 'Non-Error promise rejection encountered.'
    errorDetails = sanitizedReason // Show the sanitized structure as details
  }

  const rejectionEvent: ExecutionEvent = {
    type: 'log',
    level: 'error',
    data: errorDetails
      ? ['Unhandled Promise Rejection:', errorMessage, errorDetails]
      : ['Unhandled Promise Rejection:', errorMessage],
    // line: errorInfo?.line // Add line here if mapping was attempted and successful
  }

  try {
    postMessage([rejectionEvent])
  } catch (postError) {
    originalConsole.error(
      '!! Worker Error: Failed to post sanitized unhandled rejection:',
      postError
    )
    postMessage([
      {
        type: 'log',
        level: 'error',
        data: ['[Internal Error: Could not report unhandled rejection]'],
      },
    ])
  }
})
