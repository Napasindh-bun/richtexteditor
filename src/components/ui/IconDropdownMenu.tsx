'use client'

import { useState, type ReactNode } from 'react'

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu'

type IconDropdownMenuProps = Readonly<{
  trigger: ReactNode
  triggerLabel: string
  wrapperClassName?: string
  triggerClassName?: string
  contentClassName?: string
  align?: 'start' | 'center' | 'end'
  disabled?: boolean
  children: ReactNode | ((actions: { close: () => void }) => ReactNode)
}>

/** Toolbar dropdown built on Radix Dropdown Menu. `modal={false}` + mousedown
 * preventDefault keep the TipTap selection (including inside BubbleMenu). */
function IconDropdownMenu({
  trigger,
  triggerLabel,
  wrapperClassName,
  triggerClassName,
  contentClassName,
  align = 'start',
  disabled,
  children,
}: IconDropdownMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <div className={wrapperClassName}>
        <DropdownMenuTrigger
          disabled={disabled}
          aria-label={triggerLabel}
          className={triggerClassName}
          onMouseDown={(event) => event.preventDefault()}
        >
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className={contentClassName}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  )
}

export { IconDropdownMenu }
export type { IconDropdownMenuProps }
