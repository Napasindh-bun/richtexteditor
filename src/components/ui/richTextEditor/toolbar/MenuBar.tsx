'use client'

import { useEffect, useRef, useState } from 'react'
import { TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'

import { cn } from '@libs'

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
  const menubarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openMenu) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menubarRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openMenu])

  const run = (action: () => void) => {
    action()
    setOpenMenu(null)
  }

  const menus = [
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
        { type: 'separator' as const },
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
        { type: 'separator' as const },
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
          onClick: () =>
            editor?.chain().focus().unsetUnderline().toggleDoubleUnderline().run(),
        },
        { type: 'separator' as const },
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
        { type: 'separator' as const },
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
        { type: 'separator' as const },
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
    <div ref={menubarRef} className={styles.menubar} role="menubar" aria-label="Editor menu">
      {menus.map((menu) => (
        <div key={menu.id} className={styles.menuItem}>
          <button
            type="button"
            className={cn(styles.menuButton, openMenu === menu.id && styles.menuButtonOpen)}
            aria-haspopup="menu"
            aria-expanded={openMenu === menu.id}
            onClick={() => setOpenMenu((prev) => (prev === menu.id ? null : menu.id))}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu(menu.id)
            }}
          >
            {menu.label}
          </button>
          {openMenu === menu.id ? (
            <div className={styles.menuDropdown} role="menu">
              {menu.items.map((item, index) => {
                if ('type' in item && item.type === 'separator') {
                  return <div key={`sep-${index}`} className={styles.menuDropdownSeparator} />
                }
                const entry = item as {
                  label: string
                  shortcut?: string
                  disabled?: boolean
                  onClick: () => void
                }
                return (
                  <button
                    key={entry.label}
                    type="button"
                    role="menuitem"
                    disabled={entry.disabled}
                    className={styles.menuDropdownItem}
                    onClick={() => run(entry.onClick)}
                  >
                    <span>{entry.label}</span>
                    {entry.shortcut ? (
                      <span className={styles.menuDropdownShortcut}>{entry.shortcut}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
