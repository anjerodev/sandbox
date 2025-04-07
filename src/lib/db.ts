import { del, get, set } from 'idb-keyval'
import { StateCreator, create } from 'zustand'
import { StateStorage, createJSONStorage, persist } from 'zustand/middleware'

const isClient = typeof indexedDB !== 'undefined'

export const indexDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isClient) return null
    return (await get(name)) || null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!isClient) return
    await set(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isClient) return
    await del(name)
  },
}

export const createIndexDBStore = <T extends object>({
  name,
  handler,
  onHydrated,
  fieldsToPersist = [],
}: {
  name: string
  handler: StateCreator<T>
  onHydrated?: (state: T) => void
  fieldsToPersist?: (keyof T)[]
}) =>
  create(
    persist(handler, {
      name, // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => indexDBStorage),
      partialize: (state) => {
        const persistedState: Partial<T> = {}
        fieldsToPersist.forEach((field) => {
          if (state[field] !== undefined) {
            persistedState[field] = state[field]
          }
        })
        return persistedState
      },
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            onHydrated?.(state)
          }
        }
      },
    })
  )
