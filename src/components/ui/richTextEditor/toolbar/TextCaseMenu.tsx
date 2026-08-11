'use client'

import type { Editor } from '@tiptap/react'
import { CaseLower, CaseSensitive, CaseUpper } from 'lucide-react'

import { IconDropdownMenu } from '../../IconDropdownMenu'

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
      contentClassName={`${styles.menuDropdown} ${styles.textCaseMenu}`}
    >
      {({ close }) =>
        OPTIONS.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            role="menuitem"
            disabled={!editor}
            className={styles.menuDropdownItem}
            onClick={() => {
              if (editor) applyTextCase(editor, mode)
              close()
            }}
          >
            <span className={styles.textCaseMenuLabel}>
              <Icon />
              {label}
            </span>
          </button>
        ))
      }
    </IconDropdownMenu>
  )
}
