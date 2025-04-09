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
  // if (import.meta.env.DEV) originalConsole.log('👀 [WORKER]', ..._args)
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

const reportResultHelperText = `
function __reportResult(value, line, reportEventFn, flushFn) {
 flushFn(reportEventFn); // Flush logs before reporting result
 reportEventFn({ type: 'result', line: line, data: value });
 return value; // Return value for potential chaining
}`

const logAccumulatorHelpersText = `
let __pendingLogs = new Map();

function __accumulateLog(level, line, args) {
  if (!__pendingLogs.has(line)) {
    __pendingLogs.set(line, { level: level, firstCallArgs: args, allArgs: [args] });
  } else {
    const entry = __pendingLogs.get(line);
    // Keep the level from the first call on that line
    entry.allArgs.push(args);
  }
  // We don't return anything, mirroring console.log
}


// Flushes accumulated logs into events (using the passed-in reportEvent)
function __flushLogs(reportEventFn) {
  // workerDebugLog('Flushing accumulated logs...', __pendingLogs.size); // Worker-side debug
  for (const [line, { level, allArgs }] of __pendingLogs.entries()) {
    // workerDebugLog('Flushing line:', line, 'Level:', level, 'Args batches:', allArgs.length);
    reportEventFn({
      type: 'log',
      level: level,
      line: line,
      // Send all collected argument arrays for this line
      // The receiving side will need to handle displaying this potentially nested array
      data: allArgs
    });
  }
  __pendingLogs.clear();
}
`

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

// Helper: Transpile the TS code and extract the source map.
function transpileCode(code: string): {
  jsCode: string
  sourceMapConsumer: SourceMapConsumer | null
  diagnostics: readonly ts.Diagnostic[] | undefined
} {
  // Transpile and collect possible diagnostics
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
  // (Diagnostics are reported later in onmessage)
  let jsCode = transpileResult.outputText
  let sourceMapConsumer: SourceMapConsumer | null = null
  const sourceMapMatch = jsCode.match(
    /\/\/# sourceMappingURL=data:application\/json;base64,(.*)/
  )
  if (sourceMapMatch?.[1]) {
    try {
      sourceMapConsumer = new SourceMapConsumer(
        JSON.parse(atob(sourceMapMatch[1]))
      )
      jsCode = jsCode.substring(0, sourceMapMatch.index).trimEnd()
    } catch (mapError) {
      workerDebugLog('Source map parse error:', mapError)
    }
  } else {
    workerDebugLog('Source map not found.')
  }
  return { jsCode, sourceMapConsumer, diagnostics: transpileResult.diagnostics }
}

// Helper: Perform the transformation/instrumentation on the generated code.
function transformCode(
  jsCode: string,
  sourceMapConsumer: SourceMapConsumer | null
): { transformedJsCode: string; instrumentationHelpersNeeded: boolean } {
  const sourceFile = ts.createSourceFile(
    '__temp_module__.js',
    jsCode,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS
  )
  let instrumentationHelpersNeeded = false
  const transformerFactory: ts.TransformerFactory<ts.SourceFile> = (
    context
  ) => {
    const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
      // Instrument console calls.
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'console'
      ) {
        const methodName = node.expression.name.text
        if (
          Object.prototype.hasOwnProperty.call(originalConsole, methodName) &&
          methodName !== 'clear'
        ) {
          instrumentationHelpersNeeded = true
          let originalLine: number | undefined
          if (sourceMapConsumer) {
            try {
              const { line: jsLine, character: jsChar } =
                ts.getLineAndCharacterOfPosition(sourceFile, node.getStart())
              const originalPos = sourceMapConsumer.originalPositionFor({
                line: jsLine + 1,
                column: jsChar,
              })
              if (originalPos && originalPos.line)
                originalLine = originalPos.line
            } catch {
              // ignore errors
            }
          }
          return context.factory.createCallExpression(
            context.factory.createIdentifier('__accumulateLog'),
            undefined,
            [
              context.factory.createStringLiteral(methodName),
              originalLine !== undefined
                ? context.factory.createNumericLiteral(originalLine)
                : context.factory.createIdentifier('undefined'),
              context.factory.createArrayLiteralExpression(
                node.arguments
                  .map((arg) => ts.visitNode(arg, visitor))
                  .filter((arg): arg is ts.Expression => arg !== undefined),
                false
              ),
            ]
          )
        }
      }
      // Instrument top-level expressions.
      if (
        ts.isExpressionStatement(node) &&
        node.parent &&
        ts.isSourceFile(node.parent) &&
        !(
          ts.isStringLiteral(node.expression) &&
          node.expression.text === 'use strict'
        )
      ) {
        instrumentationHelpersNeeded = true
        let originalLine: number | undefined
        if (sourceMapConsumer) {
          try {
            const { line: jsLine, character: jsChar } =
              ts.getLineAndCharacterOfPosition(
                sourceFile,
                node.expression.getStart()
              )
            const originalPos = sourceMapConsumer.originalPositionFor({
              line: jsLine + 1,
              column: jsChar,
            })
            if (originalPos && originalPos.line) originalLine = originalPos.line
          } catch {
            // ignore errors
          }
        }
        return context.factory.createExpressionStatement(
          context.factory.createCallExpression(
            context.factory.createIdentifier('__reportResult'),
            undefined,
            [
              ts.visitNode(node.expression, visitor) as ts.Expression,
              originalLine !== undefined
                ? context.factory.createNumericLiteral(originalLine)
                : context.factory.createIdentifier('undefined'),
              context.factory.createIdentifier('reportEvent'),
              context.factory.createIdentifier('__flushLogs'),
            ]
          )
        )
      }
      return ts.visitEachChild(node, visitor, context)
    }
    return (node: ts.SourceFile): ts.SourceFile => {
      const visited = ts.visitNode(node, visitor)
      return (visited as ts.SourceFile) || node
    }
  }
  const transformationResult = ts.transform(sourceFile, [transformerFactory])
  const transformedSourceFile = transformationResult.transformed[0]
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const transformedJsCode = printer.printFile(transformedSourceFile)
  transformationResult.dispose()
  return { transformedJsCode, instrumentationHelpersNeeded }
}

// Helper: Wrap and execute the transformed code.
async function executeTransformedCode(
  transformedJsCode: string,
  instrumentationHelpersNeeded: boolean,
  reportEvent: (event: ExecutionEvent) => void
): Promise<void> {
  const helpers = instrumentationHelpersNeeded
    ? logAccumulatorHelpersText + '\n' + reportResultHelperText + '\n'
    : ''
  const finalCodeToExecute = `
${helpers}
// Execution wrapped in try/finally
try {
  ${transformedJsCode}
} finally {
  if (typeof __flushLogs === 'function') {
    __flushLogs(reportEvent);
  }
}
`
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  const executor = new AsyncFunction(
    'reportEvent',
    `"use strict";\n${finalCodeToExecute}`
  )
  await executor.call(undefined, reportEvent)
}

self.onmessage = async (e: MessageEvent<{ code: string }>) => {
  const { code } = e.data
  const events: ExecutionEvent[] = []
  let sourceMapConsumer: SourceMapConsumer | null = null

  const reportEvent = (event: ExecutionEvent) => {
    try {
      const sanitizedData =
        event.type === 'log' && Array.isArray(event.data)
          ? event.data.map((arg) => sanitizeForCloning(arg))
          : sanitizeForCloning(event.data)
      events.push({ ...event, data: sanitizedData })
    } catch (err) {
      workerDebugLog('Event sanitization error:', err)
      events.push({
        type: 'log',
        level: 'error',
        line: event.line,
        data: [
          '[Internal Error processing event]',
          err instanceof Error ? err.message : String(err),
        ],
      })
    }
  }

  try {
    workerDebugLog('Transpiling TS...')
    const transpile = transpileCode(code)
    const jsCode = transpile.jsCode
    sourceMapConsumer = transpile.sourceMapConsumer

    workerDebugLog('Transforming JS...')
    const { transformedJsCode, instrumentationHelpersNeeded } = transformCode(
      jsCode,
      sourceMapConsumer
    )
    workerDebugLog('Executing transformed code...')
    await executeTransformedCode(
      transformedJsCode,
      instrumentationHelpersNeeded,
      reportEvent
    )
    workerDebugLog('Execution finished normally.')
  } catch (error: unknown) {
    let finalHelperLineOffset = 0
    if (sourceMapConsumer) {
      const helperText =
        logAccumulatorHelpersText + '\n' + reportResultHelperText + '\n'
      finalHelperLineOffset = (helperText.match(/\n/g) || []).length
    }
    if (error instanceof Error) {
      const errorInfo = await parseErrorStack(
        error,
        sourceMapConsumer,
        finalHelperLineOffset
      )
      let displayMessage = errorInfo.message || 'Runtime error'
      if (errorInfo.line != null)
        displayMessage += ` (at line ${errorInfo.line})`
      reportEvent({
        type: 'log',
        level: 'error',
        line: errorInfo.line,
        data: [displayMessage],
      })
    } else {
      reportEvent({
        type: 'log',
        level: 'error',
        data: ['An unknown execution error occurred', error],
      })
    }
  } finally {
    workerDebugLog('Posting events.')
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
    errorMessage = event.reason.message
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
