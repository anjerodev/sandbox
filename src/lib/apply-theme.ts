import { FALLBACK_THEME, type ThemeId, themes } from '@/themes'

export function applyTheme(themeId: ThemeId) {
  // Fallback to default vs-dark theme
  const theme = themes[themeId]?.json ?? FALLBACK_THEME
  const colors = theme?.colors ?? FALLBACK_THEME.colors

  const styles = {
    background: colors['editor.background'],
    foreground: colors['editor.foreground'],

    primary: colors['button.background'],
    'primary-foreground': colors['button.foreground'],

    card: colors['menu.background'],
    'card-foreground': colors['menu.foreground'],
    popover: colors['dropdown.background'],
    'popover-foreground': colors['dropdown.foreground'],

    border: colors['activityBar.border'] ?? 'transparent',

    sidebar: colors['sideBar.background'],
    'sidebar-foreground': colors['editor.foreground'],

    muted: colors['terminal.inactiveSelectionBackground'],
    accent: colors['activityBarBadge.background'],
    'accent-foreground': colors['activityBarBadge.foreground'],
    destructive: colors['statusBarItem.errorBackground'],
    'destructive-foreground': colors['statusBarItem.errorForeground'],

    // Input
    input: colors['input.background'],
    'input-foreground': colors['input.foreground'],

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

  for (const [cssVar, value] of Object.entries(styles)) {
    if (value) {
      document.documentElement.style.setProperty(`--${cssVar}`, value)
    }
  }
}
