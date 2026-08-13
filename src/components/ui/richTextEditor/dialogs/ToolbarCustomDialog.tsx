'use client'

import { useEffect, useState } from 'react'

import { Button } from '../../button'
import { Dialog, dialogStyles } from '../../Dialog'
import {
  FULL_TOOLBAR,
  TOOLBAR_ITEM_LABELS,
  isBuiltinToolbarItem,
  isToolbarItemAllowed,
  type PluginId,
  type ToolbarGroup,
  type ToolbarItemId,
} from '../config'
import styles from '../styles/ToolbarCustomDialog.module.css'

type ToolbarCustomDialogProps = Readonly<{
  isOpen: boolean
  initialToolbar: readonly ToolbarGroup[]
  plugins: ReadonlySet<PluginId>
  onClose: () => void
  onSave: (toolbar: readonly ToolbarGroup[]) => void
}>

function selectedSet(toolbar: readonly ToolbarGroup[]): Set<ToolbarItemId> {
  const items = new Set<ToolbarItemId>()
  for (const group of toolbar) {
    for (const item of group) {
      if (isBuiltinToolbarItem(item)) items.add(item)
    }
  }
  return items
}

function catalogGroups(plugins: ReadonlySet<PluginId>): ToolbarItemId[][] {
  return FULL_TOOLBAR.map((group) =>
    group.filter(
      (item): item is ToolbarItemId => isBuiltinToolbarItem(item) && isToolbarItemAllowed(item, plugins),
    ),
  ).filter((group) => group.length > 0)
}

export function ToolbarCustomDialog({
  isOpen,
  initialToolbar,
  plugins,
  onClose,
  onSave,
}: ToolbarCustomDialogProps) {
  const [selected, setSelected] = useState(() => selectedSet(initialToolbar))

  useEffect(() => {
    if (isOpen) setSelected(selectedSet(initialToolbar))
  }, [initialToolbar, isOpen])

  const groups = catalogGroups(plugins)

  const toggle = (id: ToolbarItemId) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    const toolbar = groups
      .map((group) => group.filter((item) => selected.has(item)))
      .filter((group) => group.length > 0)
    if (toolbar.length === 0) return
    onSave(toolbar)
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="Custom toolbar"
      onClose={onClose}
      size="md"
      titleClassName={styles.title}
      actions={
        <>
          <Button type="button" variant="outline" onClick={onClose} className={dialogStyles.cancelButton}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={selected.size === 0}
            className={dialogStyles.primaryButton}
          >
            Save
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <p className={styles.hint}>Choose which buttons appear on the toolbar. Group order follows Full Feature.</p>
        {groups.map((group, index) => (
          <fieldset key={`group-${index}`} className={styles.group}>
            {group.map((id) => (
              <label key={id} className={styles.option}>
                <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} />
                {TOOLBAR_ITEM_LABELS[id]}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </Dialog>
  )
}
