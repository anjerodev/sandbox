import { WandSparklesIcon } from 'lucide-react'
import babelPlugin from 'prettier/plugins/babel'
import estreePlugin from 'prettier/plugins/estree'
import typescriptPlugin from 'prettier/plugins/typescript'
import { format } from 'prettier/standalone'

import { alterInput } from '@/lib/store'

import { Button } from './ui/button'

export const FormatButton = () => {
  const handlePrettify = async () => {
    try {
      await alterInput(async (input) => {
        try {
          return await format(input, {
            endOfLine: 'lf',
            tabWidth: 2,
            plugins: [typescriptPlugin, babelPlugin, estreePlugin],
            bracketSameLine: true,
            parser: 'typescript',
          })
        } catch (error) {
          console.error('Prettier formatting error:', error)
          return input // Return original input if formatting fails
        }
      })
    } catch (error) {
      console.error('State update error:', error)
    }
  }

  return (
    <Button variant="ghost" size="icon" onPress={handlePrettify}>
      <WandSparklesIcon />
    </Button>
  )
}
