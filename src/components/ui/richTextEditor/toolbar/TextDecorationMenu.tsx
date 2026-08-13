'use client'

import { Strikethrough, Subscript, Superscript, Underline as UnderlineIcon } from 'lucide-react'
import type { Editor } from '@tiptap/react'

import { cn } from '@libs'

import { IconDropdownMenu } from '../../IconDropdownMenu'
import { DropdownMenuCheckboxItem } from '../../dropdown-menu'

import styles from '../styles/RichTextEditor.module.css'

function runTextDecoration(
  editor: Editor,
  name: 'underline' | 'doubleUnderline' | 'strike' | 'superscript' | 'subscript',
) {
  const chain = editor.chain().focus()
  if (name === 'underline') {
    chain.unsetMark('doubleUnderline').toggleUnderline().run()
  } else if (name === 'doubleUnderline') {
    chain.unsetUnderline().toggleDoubleUnderline().run()
  } else if (name === 'superscript') {
    chain.unsetSubscript().toggleSuperscript().run()
  } else if (name === 'subscript') {
    chain.unsetSuperscript().toggleSubscript().run()
  } else {
    chain.toggleStrike().run()
  }
}

export function TextDecorationMenu({ editor }: Readonly<{ editor: Editor | null }>) {
  const items = [
    { name: 'underline' as const, label: 'Underline', icon: <UnderlineIcon /> },
    {
      name: 'doubleUnderline' as const,
      label: 'Double underline',
      icon: <span className={styles.doubleUnderlineIcon}>U</span>,
    },
    { name: 'strike' as const, label: 'Strikethrough', icon: <Strikethrough /> },
    { name: 'superscript' as const, label: 'Superscript', icon: <Superscript /> },
    { name: 'subscript' as const, label: 'Subscript', icon: <Subscript /> },
  ]
  const active = items.some(({ name }) => editor?.isActive(name))

  return (
    <IconDropdownMenu
      trigger={<UnderlineIcon />}
      triggerLabel="Text decoration"
      wrapperClassName={styles.textDecorationWrap}
      triggerClassName={cn(styles.toolbarButton, active && styles.toolbarButtonActive)}
      contentClassName={styles.textDecorationMenu}
    >
      {items.map((item) => (
        <DropdownMenuCheckboxItem
          key={item.name}
          checked={Boolean(editor?.isActive(item.name))}
          disabled={!editor}
          onSelect={() => {
            if (editor) runTextDecoration(editor, item.name)
          }}
        >
          <span className={styles.textCaseMenuLabel}>
            {item.icon}
            {item.label}
          </span>
        </DropdownMenuCheckboxItem>
      ))}
    </IconDropdownMenu>
  )
}
