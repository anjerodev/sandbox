import { SquareTerminalIcon } from 'lucide-react'

import { FormatButton } from './format-button'
import { SettingsDialog } from './settings-dialog'
import { Tooltip, TooltipTrigger } from './ui/tooltip'

export const MenuBar = () => {
  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full w-14 flex-col items-center space-y-2 py-2">
      <header>
        <SquareTerminalIcon className="text-accent size-6" />
      </header>
      <section>
        <TooltipTrigger>
          <FormatButton />
          <Tooltip placement="right">Format</Tooltip>
        </TooltipTrigger>
      </section>
      <section className="mt-auto">
        <TooltipTrigger>
          <SettingsDialog />
          <Tooltip placement="right">Settings</Tooltip>
        </TooltipTrigger>
      </section>
    </div>
  )
}
