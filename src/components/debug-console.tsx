import { useOutput } from '@/lib/store'

import { useEditor } from '@/hooks/use-editor'

import { EventItem } from './event-item'

export const DebugConsole = () => {
  const { highlightLine, clearLineHighlight } = useEditor()
  const output = useOutput()

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="space-y-1">
        {output.length === 0 && (
          <div className="text-foreground py-10 text-center opacity-70">
            No output yet...
          </div>
        )}
        {output.map((e, i) => (
          <EventItem
            key={`${e.type}-${i}-${e.line ?? 'noln'}-${JSON.stringify(e.data)}`}
            {...e}
            onMouseEnter={highlightLine}
            onMouseLeave={clearLineHighlight}
          />
        ))}
      </div>
    </div>
  )
}
