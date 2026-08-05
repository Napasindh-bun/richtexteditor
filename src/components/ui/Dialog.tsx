'use client'

import { useId, type ComponentProps, type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

import { cn } from '@libs'

import styles from './styles/Dialog.module.css'

type DialogSize = 'sm' | 'md' | 'lg'
type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content>

type DialogProps = {
  isOpen: boolean
  title: ReactNode
  titleId?: string
  titleClassName?: string
  onClose: () => void
  children?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  /** Render only the Radix shell; caller supplies the complete visual card. */
  bare?: boolean
  size?: DialogSize
  className?: string
  /**
   * When true, skips Radix auto-focus so custom editors (e.g. MathLive)
   * can focus their own shadow-DOM editable surface.
   */
  disableAutoFocus?: boolean
  /** Keep the dialog open when interacting with portaled surfaces (e.g. MathLive keyboard). */
  onPointerDownOutside?: DialogContentProps['onPointerDownOutside']
  onInteractOutside?: DialogContentProps['onInteractOutside']
  onFocusOutside?: DialogContentProps['onFocusOutside']
}

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
}

function Dialog({
  isOpen,
  title,
  titleId,
  titleClassName,
  onClose,
  children,
  actions,
  icon,
  bare = false,
  size = 'sm',
  className,
  disableAutoFocus = false,
  onPointerDownOutside,
  onInteractOutside,
  onFocusOutside,
}: Readonly<DialogProps>) {
  const generatedId = useId()
  const resolvedTitleId = titleId ?? generatedId

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content
          className={cn(styles.dialog, SIZE_CLASS[size], className)}
          aria-labelledby={resolvedTitleId}
          onPointerDownOutside={onPointerDownOutside}
          onInteractOutside={onInteractOutside}
          onFocusOutside={onFocusOutside}
          onOpenAutoFocus={
            disableAutoFocus
              ? (event) => {
                  event.preventDefault()
                }
              : undefined
          }
          onCloseAutoFocus={
            disableAutoFocus
              ? (event) => {
                  event.preventDefault()
                }
              : undefined
          }
        >
          {bare ? (
            <>
              <DialogPrimitive.Title id={resolvedTitleId} className={styles.srOnly}>
                {title}
              </DialogPrimitive.Title>
              {children}
            </>
          ) : (
            <div className={styles.card}>
              {icon ? <div className={styles.icon}>{icon}</div> : null}
              <DialogPrimitive.Title id={resolvedTitleId} className={cn(styles.title, titleClassName)}>
                {title}
              </DialogPrimitive.Title>
              {children}
              {actions ? <div className={styles.actions}>{actions}</div> : null}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { Dialog, styles as dialogStyles }
export type { DialogProps, DialogSize }
