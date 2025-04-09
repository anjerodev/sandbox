export interface ExecutionEvent {
  line?: number
  type: 'result' | 'log'
  level?: string // 'log', 'warn', 'error', etc. for logs
  data: unknown
}

export function createCodeWorker(
  code: string,
  callback: (events: ExecutionEvent[]) => void,
  timeoutMs: number = 1000 // Default timeout of 1 seconds
) {
  const worker = new Worker(
    new URL('../../worker.ts?worker', import.meta.url),
    {
      type: 'module',
      name: 'ExecuteCode',
    }
  )

  // Set up timeout to prevent infinite loops
  const timeoutId = setTimeout(() => {
    worker.terminate()
    callback([
      {
        type: 'log',
        level: 'error',
        data: `Execution timed out after ${timeoutMs}ms. Your code may contain an infinite loop.`,
      },
    ])
  }, timeoutMs)

  worker.onmessage = (e) => {
    clearTimeout(timeoutId) // Clear the timeout when a message is received
    callback(e.data)
  }

  worker.onerror = (err) => {
    clearTimeout(timeoutId) // Clear the timeout on error
    callback([
      {
        line: 0,
        type: 'log',
        level: 'error', // 'log', 'warn', 'error', etc. for logs
        data: err.message,
      },
    ])
  }

  worker.postMessage({ code })

  return () => {
    clearTimeout(timeoutId)
    worker.terminate()
  }
}
