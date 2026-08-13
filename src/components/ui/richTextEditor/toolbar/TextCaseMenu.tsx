'use client'

import type { Editor } from '@tiptap/react'
import { CaseLower, CaseSensitive, CaseUpper } from 'lucide-react'

import { IconDropdownMenu } from '../../IconDropdownMenu'
import { DropdownMenuItem } from '../../dropdown-menu'

import { applyTextCase, type TextCase } from '../utils/textCaseCommands'
import styles from '../styles/RichTextEditor.module.css'

type TextCaseMenuProps = Readonly<{ editor: Editor | null }>

const OPTIONS: ReadonlyArray<{
  mode: TextCase
  label: string
  icon: typeof CaseSensitive
}> = [
  { mode: 'lowercase', label: 'lowercase', icon: CaseLower },
  { mode: 'uppercase', label: 'UPPERCASE', icon: CaseUpper },
  { mode: 'titlecase', label: 'Title Case', icon: CaseSensitive },
]

export function TextCaseMenu({ editor }: TextCaseMenuProps) {
  return (
    <IconDropdownMenu
      trigger={<CaseSensitive />}
      triggerLabel="Change text case"
      wrapperClassName={styles.textCaseWrap}
      triggerClassName={styles.toolbarButton}
      contentClassName={styles.textCaseMenu}
    >
      {OPTIONS.map(({ mode, label, icon: Icon }) => (
        <DropdownMenuItem
          key={mode}
          disabled={!editor}
          onSelect={() => {
            if (editor) applyTextCase(editor, mode)
          }}
        >
          <Icon />
          {label}
        </DropdownMenuItem>
      ))}
    </IconDropdownMenu>
  )
}
