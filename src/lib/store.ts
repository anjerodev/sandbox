import { ThemeId } from '@/themes'

import { ExecutionEvent } from '@/lib/utils/workerUtils'

import { applyTheme } from './apply-theme'
import { createIndexDBStore } from './db'

const initialInput = `// Welcome to the Sandbox!
// Here's a simple example to get you started:

function greet(name: string) {
  return "Hello, " + name + "!";
}

// Try calling the function directly
greet("World");

// You can also use different console methods:
console.log("Try modifying the code and see what happens!");
console.info(
  "Tip: Hover over an output on the right side and it will highlight the corresponding line.",
);

    console.warn(

      
      "It seems like the code is not formatted properly, use the format button.",
    );

/**
 * You can customize the behavior and appearance from the settings.
 */`

type StoreState = {
  input: string
  output: ExecutionEvent[]
  theme: ThemeId
  mounted: boolean
  hydrated: boolean
  setHydrated: (value: boolean) => void
}

const stateStore = createIndexDBStore<StoreState>({
  name: 'state',
  handler: (set) => ({
    input: initialInput,
    output: [],
    theme: 'vs-dark',
    mounted: false,
    hydrated: false,
    setHydrated: (value: boolean) => set({ hydrated: value }),
  }),
  fieldsToPersist: ['input', 'theme', 'output'],
  onHydrated: (state) => {
    state.setHydrated(true)
  },
})

export const useInput = () => stateStore((state) => state.input)
export const useOutput = () => stateStore((state) => state.output)
export const useTheme = () => stateStore((state) => state.theme)
export const useMounted = () => stateStore((state) => state.mounted)
export const useHydrated = () => stateStore((state) => state.hydrated)

export const setInput = (input: string) => stateStore.setState({ input })
export const setOutput = (output: ExecutionEvent[]) =>
  stateStore.setState({ output })
export const setTheme = (theme: ThemeId) => {
  applyTheme(theme)
  stateStore.setState({ theme })
}

export const mount = () => stateStore.setState(() => ({ mounted: true }))

export function alterInput(callback: (input: string) => string): void
export function alterInput(
  callback: (input: string) => Promise<string>
): Promise<void>
export function alterInput(
  callback: (input: string) => string | Promise<string>
) {
  const { input } = stateStore.getState()
  const result = callback(input)

  if (result instanceof Promise) {
    return result.then((newInput) => {
      stateStore.setState({ input: newInput })
    })
  }

  stateStore.setState({ input: result })
}
