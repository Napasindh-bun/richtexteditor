import type { ReactNode } from 'react'
import type { Editor } from '@tiptap/react'

import type { ToolbarGroup } from './config'

/**
 * Host-registered menu item, equivalent to TinyMCE
 * `editor.ui.registry.addMenuButton` fetch items.
 */
export type CustomToolbarMenuItem = Readonly<{
  label: string
  icon?: ReactNode
  onAction: (editor: Editor) => void
  isDisabled?: (editor: Editor) => boolean
}>

/**
 * Host-registered toolbar control, equivalent to TinyMCE
 * `editor.ui.registry.addButton(id, { ... })`.
 * Set `items` to render a dropdown instead of a single-action button.
 */
export type CustomToolbarButton = Readonly<{
  /** Tooltip / accessible name (`tooltip` in TinyMCE). */
  label: string
  /** Button face: icon element or short text. */
  icon: ReactNode
  /** Used when `items` is omitted. */
  onAction?: (editor: Editor) => void
  /** When set, the control opens a menu (TinyMCE `addMenuButton`). */
  items?: readonly CustomToolbarMenuItem[]
  isActive?: (editor: Editor) => boolean
  isDisabled?: (editor: Editor) => boolean
}>

export type CustomToolbarButtons = Readonly<Record<string, CustomToolbarButton>>

export type EditorSetup = (editor: Editor) => void

/** Append registered custom ids that are not already listed in `toolbar`. */
export function appendUnlistedCustomToolbarButtons(
  toolbar: readonly ToolbarGroup[],
  customButtons: CustomToolbarButtons | undefined,
): readonly ToolbarGroup[] {
  if (!customButtons) return toolbar
  const ids = Object.keys(customButtons)
  if (ids.length === 0) return toolbar

  const listed = new Set<string>()
  for (const group of toolbar) {
    for (const item of group) listed.add(item)
  }

  const extra = ids.filter((id) => !listed.has(id))
  if (extra.length === 0) return toolbar
  return [...toolbar, extra]
}
