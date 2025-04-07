import { FALLBACK_THEME, type ThemeId, themes } from '@/themes'

export function applyTheme(themeId: ThemeId) {
  document.documentElement.setAttribute('data-theme', themeId)

  // Fallback to default vs-dark theme
  const theme = themes[themeId]?.json ?? FALLBACK_THEME
  const colors = theme?.colors ?? FALLBACK_THEME.colors

  // Remove existing theme style element if it exists
  const oldStyle = document.getElementById('theme-styles')
  if (oldStyle) {
    oldStyle.remove()
  }

  // Create new style element
  const styleElement = document.createElement('style')
  styleElement.id = 'theme-styles'

  const styles = {
    'app-bg': colors['editor.background'],
    'app-fg': colors['editor.foreground'],

    // Highlighted lines
    'highlight-bg': colors['editor.selectionHighlightBackground'],

    // Debug Console
    'debug-neutral': colors['editorLineNumber.foreground'],
    'debug-fg': colors['editor.foreground'],
    'debug-bg': colors['activityBar.background'],
    'debug-primitive-fg': colors['textPreformat.foreground'],

    // Log styles
    'log-log': colors['terminal.ansiGreen'],
    'log-info': colors['terminal.ansiBlue'],
    'log-error': colors['terminal.ansiRed'],
    'log-warn': colors['terminal.ansiYellow'],
  }

  let cssText = `[data-theme="${themeId}"] {`
  for (const [cssVar, value] of Object.entries(styles)) {
    if (value) {
      cssText += `--${cssVar}: ${value};`
    }
  }
  cssText += '}'
  styleElement.textContent = cssText
  document.head.appendChild(styleElement)
}
