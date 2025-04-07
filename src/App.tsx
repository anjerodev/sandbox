import { Allotment } from 'allotment'
import 'allotment/dist/style.css'

import { useHydrated, useMounted } from '@/lib/store'
import { cn } from '@/lib/utils'

import { DebugConsole } from '@/components/debug-console'
import { Editor } from '@/components/editor'
import { EditorProvider } from '@/components/editor.provider'
import { MenuBar } from '@/components/menu-bar'

import { LoadingSpinner } from './components/loading-spinner'

function App() {
  const isMounted = useMounted()
  const isHydrated = useHydrated()

  if (!isHydrated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Loading UI */}
      <div
        className={cn(
          'text-foreground grid flex-grow place-items-center',
          isMounted && 'hidden'
        )}
      >
        <LoadingSpinner />
      </div>
      {/* Main UI */}
      <EditorProvider>
        <div
          className={cn(
            'flex flex-grow overflow-hidden',
            !isMounted && 'hidden'
          )}
        >
          <MenuBar />

          <Allotment>
            {/* Pane 1: Editor Pane*/}
            <Allotment.Pane minSize={200}>
              <div className="size-full overflow-hidden">
                <Editor />
              </div>
            </Allotment.Pane>

            {/* Pane 2: Debug Console Pane */}
            <Allotment.Pane minSize={150} preferredSize={'30%'}>
              <DebugConsole />
            </Allotment.Pane>
          </Allotment>
        </div>
      </EditorProvider>
    </div>
  )
}

export default App
