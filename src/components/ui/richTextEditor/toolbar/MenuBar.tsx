'use client'

import { useState } from 'react'
import { TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'

import { cn } from '@libs'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../../dropdown-menu'
import { clearFormatting } from '../utils/clearFormatting'
import { applyTextCase } from '../utils/textCaseCommands'
import styles from '../styles/RichTextEditor.module.css'

type MenuBarProps = Readonly<{
  editor: Editor | null
  isFullscreen: boolean
  onInsertImage: () => void
  onInsertVideo: () => void
  onInsertAudio: () => void
  onOpenLink: () => void
  onInsertTable: () => void
  onOpenTableProperties: () => void
  onInsertMath: () => void
  onInsertScience: () => void
  onToggleFullscreen: () => void
  onOpenPreview: () => void
  onOpenSourceCode: () => void
}>

type MenuEntry =
  | { type: 'separator' }
  | {
      label: string
      shortcut?: string
      disabled?: boolean
      onClick: () => void
    }

export function MenuBar({
  editor,
  isFullscreen,
  onInsertImage,
  onInsertVideo,
  onInsertAudio,
  onOpenLink,
  onInsertTable,
  onOpenTableProperties,
  onInsertMath,
  onInsertScience,
  onToggleFullscreen,
  onOpenPreview,
  onOpenSourceCode,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const menus: ReadonlyArray<{ id: string; label: string; items: readonly MenuEntry[] }> = [
    {
      id: 'edit',
      label: 'Edit',
      items: [
        {
          label: 'Undo',
          shortcut: 'Ctrl+Z',
          disabled: !editor?.can().undo(),
          onClick: () => editor?.chain().focus().undo().run(),
        },
        {
          label: 'Redo',
          shortcut: 'Ctrl+Y',
          disabled: !editor?.can().redo(),
          onClick: () => editor?.chain().focus().redo().run(),
        },
        { type: 'separator' },
        {
          label: 'Select all',
          shortcut: 'Ctrl+A',
          onClick: () => {
            if (!editor) return
            const { doc } = editor.state
            editor.view.dispatch(
              editor.state.tr.setSelection(TextSelection.create(doc, 0, doc.content.size)),
            )
            editor.view.focus()
          },
        },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      items: [
        { label: 'Image…', onClick: onInsertImage },
        { label: 'Video…', onClick: onInsertVideo },
        { label: 'Audio…', onClick: onInsertAudio },
        { label: 'Link…', onClick: onOpenLink },
        { label: 'Table…', onClick: onInsertTable },
        { type: 'separator' },
        { label: 'Math formula…', onClick: onInsertMath },
        { label: 'Science formula…', onClick: onInsertScience },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Preview…', onClick: onOpenPreview },
        {
          label: isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
          shortcut: 'Ctrl+Shift+F',
          onClick: onToggleFullscreen,
        },
      ],
    },
    {
      id: 'format',
      label: 'Format',
      items: [
        {
          label: 'Bold',
          shortcut: 'Ctrl+B',
          onClick: () => editor?.chain().focus().toggleBold().run(),
        },
        {
          label: 'Italic',
          shortcut: 'Ctrl+I',
          onClick: () => editor?.chain().focus().toggleItalic().run(),
        },
        {
          label: 'Underline',
          shortcut: 'Ctrl+U',
          onClick: () =>
            editor?.chain().focus().unsetMark('doubleUnderline').toggleUnderline().run(),
        },
        {
          label: 'Double underline',
          onClick: () => editor?.chain().focus().unsetUnderline().toggleDoubleUnderline().run(),
        },
        { type: 'separator' },
        {
          label: 'lowercase',
          onClick: () => {
            if (editor) applyTextCase(editor, 'lowercase')
          },
        },
        {
          label: 'UPPERCASE',
          onClick: () => {
            if (editor) applyTextCase(editor, 'uppercase')
          },
        },
        {
          label: 'Title Case',
          onClick: () => {
            if (editor) applyTextCase(editor, 'titlecase')
          },
        },
        { type: 'separator' },
        {
          label: 'Clear formatting',
          onClick: () => {
            if (editor) clearFormatting(editor)
          },
        },
      ],
    },
    {
      id: 'table',
      label: 'Table',
      items: [
        { label: 'Insert table…', onClick: onInsertTable },
        {
          label: 'Table properties…',
          disabled: !editor?.isActive('table'),
          onClick: onOpenTableProperties,
        },
        { type: 'separator' },
        {
          label: 'Delete table',
          disabled: !editor?.isActive('table'),
          onClick: () => editor?.chain().focus().deleteTable().run(),
        },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      items: [
        { label: 'Preview…', onClick: onOpenPreview },
        { label: 'Source code…', onClick: onOpenSourceCode },
      ],
    },
  ]

  return (
    <div className={styles.menubar} role="menubar" aria-label="Editor menu">
      {menus.map((menu) => (
        <DropdownMenu
          key={menu.id}
          modal={false}
          open={openMenu === menu.id}
          onOpenChange={(open) => setOpenMenu(open ? menu.id : null)}
        >
          <DropdownMenuTrigger
            className={cn(styles.menuButton, openMenu === menu.id && styles.menuButtonOpen)}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu(menu.id)
            }}
          >
            {menu.label}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={styles.menuDropdown}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {menu.items.map((item, index) => {
              if (!('onClick' in item)) {
                return <DropdownMenuSeparator key={`sep-${index}`} />
              }
              return (
                <DropdownMenuItem
                  key={item.label}
                  disabled={item.disabled}
                  onSelect={item.onClick}
                >
                  {item.label}
                  {item.shortcut ? (
                    <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  )
}
