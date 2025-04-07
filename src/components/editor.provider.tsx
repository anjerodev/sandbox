import * as React from 'react'

import * as monaco from 'monaco-editor'

import { EditorContext } from './editor.context'

export const EditorProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [editor, setEditor] =
    React.useState<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [decorations, setDecorations] =
    React.useState<monaco.editor.IEditorDecorationsCollection | null>(null)

  const initialize = React.useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      setEditor(editor)
      setDecorations(editor.createDecorationsCollection([]))
    },
    []
  )

  const highlightLine = React.useCallback(
    (line: number | undefined) => {
      if (!editor || typeof line !== 'number' || line <= 0) {
        decorations?.clear()
        return
      }

      decorations?.set([
        {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'highlighted',
          },
        },
      ])
    },
    [editor, decorations]
  )

  const clearLineHighlight = React.useCallback(() => {
    decorations?.clear()
  }, [decorations])

  const value = React.useMemo(
    () => ({
      initialize,
      highlightLine,
      clearLineHighlight,
    }),
    [highlightLine, clearLineHighlight, initialize]
  )

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  )
}
