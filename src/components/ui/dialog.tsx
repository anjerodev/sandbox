'use client'

import * as React from 'react'

import { type VariantProps, cva } from 'class-variance-authority'
import { X } from 'lucide-react'
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogProps as AriaDialogProps,
  DialogTrigger as AriaDialogTrigger,
  Heading as AriaHeading,
  HeadingProps as AriaHeadingProps,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  ModalOverlayProps as AriaModalOverlayProps,
  composeRenderProps,
} from 'react-aria-components'

import { cn } from '@/lib/utils'

import { buttonVariants } from './button.variants'

const Dialog = AriaDialog

const sheetVariants = cva(
  [
    'fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out',
    /* Entering */
    'data-[entering]:duration-300 data-[entering]:animate-in',
    /* Exiting */
    'data-[exiting]:duration-100  data-[exiting]:animate-out',
  ],
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[entering]:slide-in-from-top data-[exiting]:slide-out-to-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[entering]:slide-in-from-bottom data-[exiting]:slide-out-to-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[entering]:slide-in-from-left data-[exiting]:slide-out-to-left sm:max-w-sm',
        right:
          'inset-y-0 right-0 h-full w-3/4  border-l data-[entering]:slide-in-from-right data-[exiting]:slide-out-to-right sm:max-w-sm',
      },
    },
  }
)

const DialogTrigger = AriaDialogTrigger

const DialogOverlay = ({
  className,
  isDismissable = true,
  ...props
}: AriaModalOverlayProps) => (
  <AriaModalOverlay
    isDismissable={isDismissable}
    className={composeRenderProps(className, (className) =>
      cn(
        'bg-background/50 fixed inset-0 z-50 backdrop-blur-md',
        /* Exiting */
        'data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:duration-100',
        /* Entering */
        'data-[entering]:animate-in data-[entering]:fade-in-0',
        className
      )
    )}
    {...props}
  />
)

interface DialogContentProps
  extends Omit<React.ComponentProps<typeof AriaModal>, 'children'>,
    VariantProps<typeof sheetVariants> {
  children?: AriaDialogProps['children']
  role?: AriaDialogProps['role']
  closeButton?: boolean
}

const DialogContent = ({
  className,
  children,
  side,
  role,
  closeButton = true,
  ...props
}: DialogContentProps) => (
  <AriaModal
    className={composeRenderProps(className, (className) =>
      cn(
        side
          ? sheetVariants({ side, className: 'h-full p-6' })
          : 'bg-card data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95 border-foreground/10 fixed top-1/2 left-[50vw] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border p-6 shadow-lg duration-200 data-[exiting]:duration-100 sm:rounded-lg md:w-full',
        className
      )
    )}
    {...props}
  >
    <AriaDialog
      role={role}
      className={cn(!side && 'grid h-full gap-4', 'h-full outline-none')}
    >
      {composeRenderProps(children, (children, renderProps) => (
        <>
          {children}
          {closeButton && (
            <AriaButton
              onPress={renderProps.close}
              className={cn(
                buttonVariants({ size: 'icon', variant: 'ghost' }),
                'absolute top-4 right-4 size-7'
              )}
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </AriaButton>
          )}
        </>
      ))}
    </AriaDialog>
  </AriaModal>
)

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'text-foreground flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
)

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
)

const DialogTitle = ({ className, ...props }: AriaHeadingProps) => (
  <AriaHeading
    slot="title"
    className={cn(
      'text-lg leading-none font-semibold tracking-tight',
      className
    )}
    {...props}
  />
)

const DialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
)

export {
  Dialog,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
}
export type { DialogContentProps }
