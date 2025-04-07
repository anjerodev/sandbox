import { cva } from 'class-variance-authority'
import {
  Label as AriaLabel,
  LabelProps as AriaLabelProps,
} from 'react-aria-components'

import { cn } from '@/lib/utils'

const labelVariants = cva([
  'text-sm font-medium leading-none text-foreground',
  /* Disabled */
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70',
  /* Invalid */
  'group-data-[invalid]:text-destructive',
])

const Label = ({ className, ...props }: AriaLabelProps) => (
  <AriaLabel className={cn(labelVariants(), className)} {...props} />
)

export { Label }
