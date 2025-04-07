import { ThemeId } from '@/themes'

import { ExecutionEvent } from '@/lib/utils/workerUtils'

import { applyTheme } from './apply-theme'
import { createIndexDBStore } from './db'

const initialInput = `function sum(a, b) {
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

  const nullValue = null;
  let undefinedValue = undefined;
  const zeroValue = 0;
  const emptyString = "";

  isAnagram("iceman", "cinema");

  function concat<N extends number[], S extends string[]>(
    nums: [...N],
    strs: [...S]
  ): [...N, ...S] {
    return [...nums, ...strs];
  }

  concat([1, 2, 3], ["hello world"]); // This is the expression statement

  console.log("Hello World");
  console.error("An error occurred!");
  console.warn('This is a warning!');
  console.info("This is an info message");`

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
