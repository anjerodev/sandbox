'use client'

import { ChevronDown } from 'lucide-react'
import {
  Button as AriaButton,
  ButtonProps as AriaButtonProps,
  ListBox as AriaListBox,
  ListBoxItemProps as AriaListBoxItemProps,
  ListBoxProps as AriaListBoxProps,
  PopoverProps as AriaPopoverProps,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  SelectValueProps as AriaSelectValueProps,
  composeRenderProps,
} from 'react-aria-components'

import { cn } from '@/lib/utils'

import {
  ListBoxCollection,
  ListBoxHeader,
  ListBoxItem,
  ListBoxSection,
} from './list-box'
import { Popover } from './popover'

const Select = AriaSelect

const SelectHeader = ListBoxHeader

const SelectSection = ListBoxSection

const SelectCollection = ListBoxCollection

const SelectValue = <T extends object>({
  className,
  ...props
}: AriaSelectValueProps<T>) => (
  <AriaSelectValue
    className={composeRenderProps(className, (className) =>
      cn(
        'data-[placeholder]:text-foreground/50 line-clamp-1',
        /* Description */
        '[&>[slot=description]]:hidden',
        className
      )
    )}
    {...props}
  />
)

const SelectTrigger = ({ className, children, ...props }: AriaButtonProps) => (
  <AriaButton
    className={composeRenderProps(className, (className) =>
      cn(
        'border-input-foreground/10 bg-input flex h-10 w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs',
        /* Disabled */
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        /* Focused */
        'data-[focus-visible]:ring-primary/30 data-[focus-visible]:ring-[3px] data-[focus-visible]:outline-none',
        /* Resets */
        'focus-visible:outline-none',
        className
      )
    )}
    {...props}
  >
    {composeRenderProps(children, (children) => (
      <>
        {children}
        <ChevronDown aria-hidden="true" className="size-4 opacity-50" />
      </>
    ))}
  </AriaButton>
)

const SelectPopover = ({ className, ...props }: AriaPopoverProps) => (
  <Popover
    className={composeRenderProps(className, (className) =>
      cn('w-(--trigger-width)', className)
    )}
    {...props}
  />
)

const SelectListBox = <T extends object>({
  className,
  ...props
}: AriaListBoxProps<T>) => (
  <AriaListBox
    className={composeRenderProps(className, (className) =>
      cn('max-h-[inherit] overflow-auto p-1 outline-none', className)
    )}
    {...props}
  />
)

const SelectItem = ({ className, ...props }: AriaListBoxItemProps) => (
  <ListBoxItem
    className={composeRenderProps(className, (className) =>
      cn(
        'cursor-pointer',
        // State indicator
        'before:pointer-events-none before:absolute before:inset-0 before:z-[-1] before:rounded-sm before:bg-current/8 before:opacity-0 before:transition-opacity hover:before:opacity-100 active:scale-98 active:before:bg-current/10',
        className
      )
    )}
    {...props}
  />
)

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectPopover,
  SelectHeader,
  SelectListBox,
  SelectSection,
  SelectCollection,
}
