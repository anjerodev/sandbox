import * as monaco from 'monaco-editor'

import DraculaTheme from './dracula.json'
import GitHubDarkTheme from './github-dark.json'
import OneDarkProTheme from './one-dark-pro.json'
import VsDarkTheme from './vs-dark.json'

export type Theme = {
  json: monaco.editor.IStandaloneThemeData
  label: string
}
export const FALLBACK_THEME =
  OneDarkProTheme as monaco.editor.IStandaloneThemeData

const Theme = (json: Theme['json'], label: string) => ({ json, label }) as Theme
export const themes = {
  'vs-dark': Theme(
    VsDarkTheme as monaco.editor.IStandaloneThemeData,
    'Dark (default)'
  ),
  'github-dark': Theme(
    GitHubDarkTheme as monaco.editor.IStandaloneThemeData,
    'GitHub Dark'
  ),
  'one-dark-pro': Theme(
    OneDarkProTheme as monaco.editor.IStandaloneThemeData,
    'One Dark Pro'
  ),
  dracula: Theme(DraculaTheme as monaco.editor.IStandaloneThemeData, 'Dracula'),
} as const

export type ThemeId = keyof typeof themes
