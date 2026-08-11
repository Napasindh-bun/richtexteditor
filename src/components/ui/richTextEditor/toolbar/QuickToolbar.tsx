'use client'

import { Bold, Italic, Link2, Paintbrush, RemoveFormatting, SquareCode } from 'lucide-react'
import type { Editor } from '@tiptap/react'

import type { PluginId, ToolbarItemId } from '../config'
import { hasPlugin, isToolbarItemAllowed } from '../config'
import { clearFormatting } from '../utils/clearFormatting'
import styles from '../styles/RichTextEditor.module.css'

import { TextDecorationMenu } from './TextDecorationMenu'
import { ToolbarButton } from './ToolbarButton'

const BUBBLE_ITEMS: readonly ToolbarItemId[] = [
  'bold',
  'italic',
  'textDecoration',
  'link',
  'formatPainter',
  'clearFormatting',
  'codeSample',
]

export function QuickToolbar({
  editor,
  plugins,
  toolbarItems,
  formatPainterActive,
  onFormatPainter,
  onOpenLink,
  onOpenCodeSample,
}: Readonly<{
  editor: Editor
  plugins: ReadonlySet<PluginId>
  /** Flattened toolbar item ids from resolved config (for bubble filtering). */
  toolbarItems: ReadonlySet<ToolbarItemId>
  formatPainterActive: boolean
  onFormatPainter: () => void
  onOpenLink: () => void
  onOpenCodeSample: () => void
}>) {
  const show = (id: ToolbarItemId) =>
    BUBBLE_ITEMS.includes(id) &&
    toolbarItems.has(id) &&
    isToolbarItemAllowed(id, plugins)

  return (
    <div className={styles.quickToolbar} role="toolbar" aria-label="Quick formatting">
      {show('bold') ? (
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
      ) : null}
      {show('italic') ? (
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
      ) : null}
      {show('textDecoration') ? <TextDecorationMenu editor={editor} /> : null}
      {show('link') ? (
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={onOpenLink}>
          <Link2 />
        </ToolbarButton>
      ) : null}
      {show('formatPainter') ? (
        <ToolbarButton
          label={formatPainterActive ? 'Cancel format painter' : 'Format painter'}
          active={formatPainterActive}
          onClick={onFormatPainter}
        >
          <Paintbrush />
        </ToolbarButton>
      ) : null}
      {show('clearFormatting') ? (
        <ToolbarButton label="Clear formatting" onClick={() => clearFormatting(editor)}>
          <RemoveFormatting />
        </ToolbarButton>
      ) : null}
      {show('codeSample') && hasPlugin(plugins, 'codeSample') ? (
        <ToolbarButton
          label="Code sample"
          active={editor.isActive('codeBlock')}
          onClick={onOpenCodeSample}
        >
          <SquareCode />
        </ToolbarButton>
      ) : null}
    </div>
  )
}
