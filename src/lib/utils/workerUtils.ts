export interface ExecutionEvent {
  line?: number
  type: 'result' | 'log'
  level?: string // 'log', 'warn', 'error', etc. for logs
  data: unknown
}

export function createCodeWorker(
  code: string,
  callback: (events: ExecutionEvent[]) => void
) {
  const worker = new Worker(
    new URL('../../worker.ts?worker', import.meta.url),
    {
      type: 'module',
    }
  )

  worker.onmessage = (e) => {
    callback(e.data)
  }

  worker.onerror = (err) => {
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

  return () => worker.terminate()
}
