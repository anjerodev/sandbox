import {
  Tooltip as AriaTooltip,
  type TooltipProps as AriaTooltipProps,
  TooltipTrigger as AriaTooltipTrigger,
  type TooltipTriggerComponentProps as AriaTooltipTriggerProps,
  composeRenderProps,
} from 'react-aria-components'

import { cn } from '@/lib/utils'

const TooltipTrigger = ({
  delay = 0,
  closeDelay = 0,
  ...props
}: AriaTooltipTriggerProps) => (
  <AriaTooltipTrigger delay={delay} closeDelay={closeDelay} {...props} />
)

const Tooltip = ({ className, offset = 4, ...props }: AriaTooltipProps) => (
  <AriaTooltip
    offset={offset}
    className={composeRenderProps(className, (className) =>
      cn(
        'bg-popover text-popover-foreground animate-in fade-in-0 border-popover-foreground/10 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md',
        /* Entering */
        'data-[entering]:zoom-in-95',
        /* Exiting */
        'data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95',
        /* Placement */
        'data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2',
        className
      )
    )}
    {...props}
  />
)

export { Tooltip, TooltipTrigger }
