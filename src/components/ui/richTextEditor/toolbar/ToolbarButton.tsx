'use client'

import type { ReactNode } from 'react'

import { cn } from '@libs'

import styles from '../styles/RichTextEditor.module.css'

type ToolbarButtonProps = Readonly<{
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}>

export function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(styles.toolbarButton, active && styles.toolbarButtonActive)}
      // Keep the ProseMirror selection intact while a toolbar command is clicked.
      // Otherwise the button can take focus before `onClick`, causing block commands
      // such as toggleTaskList to run at a stale/fallback document position.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function ToolbarDivider() {
  return <span className={styles.divider} aria-hidden />
}

export function ToolbarGroup({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={styles.toolbarGroup}>{children}</div>
}
