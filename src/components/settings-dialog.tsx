import { ThemeId, themes } from '@/themes'
import { Settings2Icon } from 'lucide-react'

import { setTheme, useTheme } from '@/lib/store'

import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const SettingsDialog = () => {
  const theme = useTheme()

  return (
    <DialogTrigger>
      <Button size="icon" variant="ghost" aria-label="settings">
        <Settings2Icon />
      </Button>
      <DialogOverlay isDismissable={false}>
        <DialogContent className="md:max-w-xl" closeButton={false}>
          {({ close }) => (
            <>
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Select
                  id="theme"
                  defaultSelectedKey={theme}
                  onSelectionChange={(theme) => setTheme(theme as ThemeId)}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="flex-grow">
                    <Label htmlFor="theme">Theme</Label>
                    <p className="text-foreground/50 text-xs">
                      Choose a theme for the interface.
                    </p>
                  </div>
                  <SelectTrigger className="max-w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopover>
                    <SelectListBox>
                      {Object.keys(themes).map((themeId) => (
                        <SelectItem key={themeId} id={themeId}>
                          {themes[themeId as keyof typeof themes].label}
                        </SelectItem>
                      ))}
                    </SelectListBox>
                  </SelectPopover>
                </Select>
              </div>
              <DialogFooter>
                <Button onPress={close} type="submit">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </DialogOverlay>
    </DialogTrigger>
  )
}
