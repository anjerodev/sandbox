import { Allotment } from 'allotment'
import 'allotment/dist/style.css'

import { DebugConsole } from '@/components/debug-console'
import { Editor } from '@/components/editor'
import { EditorProvider } from '@/components/editor.provider'

function App() {
  return (
    <div className="app flex h-screen flex-col">
      <EditorProvider>
        <div className="flex-grow overflow-hidden">
          <Allotment>
            {/* Pane 1: Editor Pane*/}
            <Allotment.Pane minSize={200}>
              <div className="size-full overflow-hidden">
                <Editor />
              </div>
            </Allotment.Pane>

            {/* Pane 2: Debug Console Pane */}
            <Allotment.Pane minSize={150} preferredSize={'40%'}>
              <DebugConsole />
            </Allotment.Pane>
          </Allotment>
        </div>
      </EditorProvider>
    </div>
  )
}

export default App
