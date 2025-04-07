import ts from '@/statics/grammars/ts.tmLanguage.json?url'
import * as monaco from 'monaco-editor'
import { wireTmGrammars } from 'monaco-editor-textmate'
import { Registry } from 'monaco-textmate'
import { loadWASM } from 'onigasm'
import onigasmWasm from 'onigasm/lib/onigasm.wasm?url'

export async function loadTokenizer(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof import('monaco-editor')
) {
  try {
    await loadWASM(onigasmWasm)
  } catch (err) {
    console.error('Failed to load onigasm WASM:', err)
  }

  const registry = new Registry({
    getGrammarDefinition: async () => {
      const languageResponse = await fetch(ts)
      const languageText = await languageResponse.text()

      return {
        format: 'json',
        content: languageText,
      }
    },
  })

  const grammars = new Map()
  grammars.set('typescript', 'source.ts')

  try {
    await wireTmGrammars(monacoInstance, registry, grammars, editor)
  } catch (wireErr) {
    console.error('Failed to wire TextMate grammars:', wireErr)
  }
}
