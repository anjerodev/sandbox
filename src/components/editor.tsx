import * as React from 'react'

import { ThemeId, themes } from '@/themes'
import { Editor as MonancoEditor, type OnMount } from '@monaco-editor/react'
import { debounce } from 'es-toolkit'

import { applyTheme } from '@/lib/apply-theme'
import { mount, setInput, setOutput, useInput, useTheme } from '@/lib/store'
import { loadTokenizer } from '@/lib/tokenizer'
import { createCodeWorker } from '@/lib/utils/workerUtils'

import { useEditor } from '@/hooks/use-editor'

export const Editor = () => {
  const code = useInput()
  const theme = useTheme()
  const { initialize, clearLineHighlight } = useEditor()

  React.useEffect(() => {
    const disposeWorker = createCodeWorker(code, setOutput)
    return () => {
      disposeWorker()
    }
  }, [code])

  const handleCodeChange = React.useCallback((value: string) => {
    setInput(value)
    clearLineHighlight()
    createCodeWorker(value, setOutput)
  }, [])

  const debouncedHandleCodeChange = React.useCallback(
    debounce((value: string) => {
      handleCodeChange(value)
    }, 300),
    [handleCodeChange]
  )

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    initialize(editor)
    loadTokenizer(editor, monaco)
      .then(() => {
        // --- Define Themes ---
        for (const themeId of Object.keys(themes)) {
          monaco.editor.defineTheme(themeId, themes[themeId as ThemeId].json)
        }

        monaco.editor.setTheme(theme) // Apply initial theme to monaco editor
        applyTheme(theme) // Apply theme to rest of the UI
        mount() // Flag to indicate the editor is ready
      })
      .catch((error) => {
        console.error('Error loading tokenizer:', error)
      })
  }

  return (
    <MonancoEditor
      height="100%"
      language="typescript"
      theme={theme}
      options={{
        fontSize: 16,
        minimap: { enabled: false },
        wordWrap: 'on',
        lineNumbersMinChars: 3,
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'hidden',
        },
        renderLineHighlight: 'gutter',
        scrollBeyondLastLine: false,
        automaticLayout: true, // ESSENTIAL for resizing
        overviewRulerLanes: 0,
        padding: {
          top: 10,
          bottom: 10,
        },
      }}
      value={code}
      onChange={(v) => debouncedHandleCodeChange(v ?? '')}
      onMount={handleEditorDidMount}
      className="[&_.highlighted]:bg-(--highlight-bg)"
      loading=""
    />
  )
}
