import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  [
    "relative z-0 inline-flex items-center justify-center shrink-0 cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:ring-primary/30 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    // State indicator
    'before:absolute before:inset-0 before:rounded-md before:transition-opacity before:opacity-0 before:z-[-1] hover:before:opacity-100 before:bg-current/8 before:pointer-events-none active:scale-98 active:before:bg-current/10',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground outline -outline-offset-1 outline-primary-foreground/30',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs outline -outline-offset-1 outline-destructive-foreground/30 focus-visible:ring-destructive/30',
        outline:
          'border text-foreground outline-none border-input-border bg-input shadow-xs',
        secondary:
          'bg-secondary ouline-none text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'bg-transparent outline-none text-primary-foreground',
        link: 'text-primary outline-none underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9 active:scale-95',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
