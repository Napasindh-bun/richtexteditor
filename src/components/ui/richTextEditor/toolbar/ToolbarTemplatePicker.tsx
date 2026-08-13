'use client'

import { LayoutTemplate } from 'lucide-react'

import { IconDropdownMenu } from '../../IconDropdownMenu'
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '../../dropdown-menu'
import type { ToolbarTemplateId } from '../config'
import styles from '../styles/RichTextEditor.module.css'

type ToolbarTemplatePickerProps = Readonly<{
  template: ToolbarTemplateId
  onSelect: (template: ToolbarTemplateId) => void
  onCustomize: () => void
}>

const OPTIONS: ReadonlyArray<{ id: ToolbarTemplateId; label: string }> = [
  { id: 'default', label: 'Default' },
  { id: 'full', label: 'Full Feature' },
  { id: 'custom', label: 'Custom…' },
]

export function ToolbarTemplatePicker({ template, onSelect, onCustomize }: ToolbarTemplatePickerProps) {
  return (
    <IconDropdownMenu
      trigger={<LayoutTemplate />}
      triggerLabel="Toolbar template"
      wrapperClassName={styles.templatePickerWrap}
      triggerClassName={styles.toolbarButton}
      contentClassName={styles.templatePickerMenu}
      align="end"
    >
      <DropdownMenuRadioGroup
        value={template}
        onValueChange={(value) => {
          if (value !== 'custom') onSelect(value as ToolbarTemplateId)
        }}
      >
        {OPTIONS.map(({ id, label }) => (
          <DropdownMenuRadioItem
            key={id}
            value={id}
            onSelect={() => {
              if (id === 'custom') onCustomize()
            }}
          >
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </IconDropdownMenu>
  )
}
