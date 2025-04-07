import { ThemeId } from '@/themes'
import { ExecutionEvent } from '@/utils/workerUtils'
import { create } from 'zustand'

import { applyTheme } from './apply-theme'

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
}

const stateStore = create<StoreState>(() => ({
  input: initialInput,
  output: [],
  theme: 'one-dark-pro',
}))

export const useInput = () => stateStore((state) => state.input)
export const useOutput = () => stateStore((state) => state.output)
export const useTheme = () => stateStore((state) => state.theme)

export const setInput = (input: string) => stateStore.setState({ input })
export const setOutput = (output: ExecutionEvent[]) =>
  stateStore.setState({ output })
export const setTheme = (theme: ThemeId) => {
  applyTheme(theme)
  stateStore.setState({ theme })
}
