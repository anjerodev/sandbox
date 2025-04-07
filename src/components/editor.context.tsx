import * as React from 'react'

import * as monaco from 'monaco-editor'

interface EditorContextType {
  initialize: (editor: monaco.editor.IStandaloneCodeEditor) => void
  highlightLine: (line: number | undefined) => void
  clearLineHighlight: () => void
}

export const EditorContext = React.createContext<EditorContextType>({
  initialize: () => {},
  highlightLine: () => {},
  clearLineHighlight: () => {},
})
