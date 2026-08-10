'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

type IconDropdownMenuProps = {
  trigger: ReactNode
  triggerLabel: string
  wrapperClassName?: string
  triggerClassName?: string
  contentClassName?: string
  children: ReactNode | ((actions: { close: () => void }) => ReactNode)
}

function IconDropdownMenu({
  trigger,
  triggerLabel,
  wrapperClassName,
  triggerClassName,
  contentClassName,
  children,
}: Readonly<IconDropdownMenuProps>) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggleMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setMenuOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div ref={menuRef} className={wrapperClassName}>
      <button
        type="button"
        // Preserve the editor selection while opening a toolbar dropdown.
        // This is required inside TipTap's BubbleMenu, which hides on blur.
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleMenu}
        className={triggerClassName}
        aria-label={triggerLabel}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        {trigger}
      </button>
      {menuOpen ? (
        <div className={contentClassName} role="menu">
          {typeof children === 'function' ? children({ close: closeMenu }) : children}
        </div>
      ) : null}
    </div>
  )
}

export { IconDropdownMenu }
export type { IconDropdownMenuProps }
