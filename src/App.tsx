import * as React from 'react'

import DraculaTheme from '@/themes/dracula.json'
import GithubDark from '@/themes/github-dark.json'
import Editor, { Monaco, OnMount } from '@monaco-editor/react'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import { debounce } from 'es-toolkit'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

import { EventItem } from './components/EventItem'
import { ExecutionEvent, createCodeWorker } from './utils/workerUtils'

const defaultValue = `function sum(a, b) {
  return a + b;
}
sum(2, 3);

console.log("Mid log");

const isAnagram = (str1, str2) => {
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, "")
      .split("")
      .sort()
      .join("");
  return normalize(str1) === normalize(str2);
};

isAnagram("iceman", "cinema");

function concat<N extends number[], S extends string[]>(
  nums: [...N],
  strs: [...S]
): [...N, ...S] {
  return [...nums, ...strs];
}

concat([1, 2, 3], ["hello world"]); // This is the expression statement

console.log("Hello World");
console.error("An error occurred!");`

// Define the highlight class name constant
const HOVER_HIGHLIGHT_CLASS = 'line-highlight-hover'

// Make sure your App component passes the whole event object
function App() {
  const [code, setCode] = React.useState(defaultValue)
  const [output, setOutput] = React.useState<ExecutionEvent[]>([])
  const [editorTheme, _setEditorTheme] = React.useState('github-dark')

  // --- Refs for Editor Interaction ---
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  )
  const monacoRef = React.useRef<Monaco | null>(null) // Store monaco instance too
  const highlightDecorationsCollection =
    React.useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  // --- End Refs ---

  const handlePaneChange = (_sizes: number[]) => {
    editorRef.current?.layout()
  }

  React.useEffect(() => {
    const disposeWorker = createCodeWorker(code, setOutput)
    return () => {
      disposeWorker()
    }
  }, [code])

  const handleCodeChange = React.useCallback((value: string | undefined) => {
    setCode(value || '')
    clearLineHighlight()

    createCodeWorker(value || '', setOutput)
  }, [])

  const debouncedHandleCodeChange = React.useCallback(
    debounce((value: string | undefined) => {
      handleCodeChange(value)
    }, 300),
    []
  )

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Store references
    editorRef.current = editor
    monacoRef.current = monaco

    // --- Initialize the Decorations Collection ---
    // Create an empty collection when the editor mounts
    highlightDecorationsCollection.current = editor.createDecorationsCollection(
      []
    )
    // --- End Initialization ---

    // --- Define Themes ---
    monaco.editor.defineTheme(
      'dracula',
      DraculaTheme as monaco.editor.IStandaloneThemeData
    )
    monaco.editor.defineTheme(
      'github-dark',
      GithubDark as monaco.editor.IStandaloneThemeData
    )
    monaco.editor.setTheme(editorTheme) // Apply initial theme
    // --- End Theme Definition ---

    editor.onDidBlurEditorWidget(() => {
      clearLineHighlight()
    })
  }

  // --- Highlight Logic ---
  const highlightLine = (line: number | undefined) => {
    if (
      !editorRef.current ||
      !monacoRef.current ||
      typeof line !== 'number' ||
      line <= 0
    ) {
      clearLineHighlight() // Clear if no valid line
      return
    }

    const collection = highlightDecorationsCollection.current

    // Create the new decoration
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [
      {
        range: new monaco.Range(line, 1, line, 1), // Range for the whole line
        options: {
          isWholeLine: true,
          className: HOVER_HIGHLIGHT_CLASS, // Apply our CSS class
          // Optional: Adjust behavior when typing near the highlighted line
          // stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        },
      },
    ]

    collection?.set(newDecorations)
  }

  const clearLineHighlight = () => {
    // Check if the collection exists
    if (highlightDecorationsCollection.current) {
      // Use the collection's `clear` method.
      highlightDecorationsCollection.current.clear()
    }
  }
  // --- End Highlight Logic ---

  return (
    <div className="app flex h-screen flex-col">
      <div className="flex-grow overflow-hidden">
        <Allotment onChange={handlePaneChange}>
          {/* Pane 1: Editor */}
          <Allotment.Pane minSize={200}>
            <div className="size-full overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="typescript"
                theme={editorTheme}
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
                }}
                value={code}
                onChange={debouncedHandleCodeChange}
                onMount={handleEditorDidMount}
              />
            </div>
          </Allotment.Pane>

          {/* Pane 2: Preview */}
          <Allotment.Pane minSize={150} preferredSize={'40%'}>
            <div className="preview flex h-full flex-col overflow-y-auto">
              <div className="space-y-1">
                {output.length === 0 && (
                  <div className="py-10 text-center text-neutral-500">
                    No output yet...
                  </div>
                )}
                {output.map((e, i) => (
                  <EventItem
                    key={`${e.type}-${i}-${e.line ?? 'noln'}-${JSON.stringify(
                      e.data
                    )}`}
                    {...e}
                    onMouseEnter={highlightLine}
                    onMouseLeave={clearLineHighlight}
                  />
                ))}
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  )
}

export default App
