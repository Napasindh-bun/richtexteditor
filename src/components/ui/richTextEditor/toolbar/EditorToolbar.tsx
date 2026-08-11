'use client'

import { Fragment, type ChangeEvent, type ReactNode } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code2,
  Eye,
  FlaskConical,
  Highlighter,
  ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListCollapse,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minimize2,
  Paintbrush,
  Volume2,
  PenLine,
  Redo2,
  RemoveFormatting,
  Sigma,
  SquareCode,
  Undo2,
  Video as VideoIcon,
} from 'lucide-react'
import type { Editor } from '@tiptap/react'

import { cn } from '@libs'

import { IconDropdownMenu } from '../../IconDropdownMenu'

import type { ToolbarGroup, ToolbarItemId } from '../config'
import { clearFormatting } from '../utils/clearFormatting'
import styles from '../styles/RichTextEditor.module.css'

import {
  ColorPalettePicker,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
} from './ColorPalettePicker'
import { TableSizePicker } from './TableSizePicker'
import { TextCaseMenu } from './TextCaseMenu'
import { TextDecorationMenu } from './TextDecorationMenu'
import { ToolbarButton, ToolbarDivider, ToolbarGroup as ToolbarGroupEl } from './ToolbarButton'

export const FONT_SIZES_PX = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36] as const
export const DEFAULT_FONT_SIZE_PX = 16
export const LINE_HEIGHTS = ['normal', '1', '1.15', '1.5', '2', '2.5', '3'] as const

export function getActiveFontSizePx(editor: Editor): number {
  const raw = editor.getAttributes('textStyle').fontSize as string | undefined
  if (!raw) return DEFAULT_FONT_SIZE_PX
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : DEFAULT_FONT_SIZE_PX
}

type ToolbarActions = Readonly<{
  editor: Editor | null
  isFullscreen: boolean
  formatPainterActive: boolean
  fontSizeValue: number
  lineHeightValue: string
  mediaAlignment: 'left' | 'center' | 'right' | null
  canIndent: (direction: 'increase' | 'decrease') => boolean
  onUndo: () => void
  onRedo: () => void
  onFontSizeChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onLineHeightChange: (value: string) => void
  onFormatPainter: () => void
  onIndent: (direction: 'increase' | 'decrease') => void
  onSetAlignment: (align: 'left' | 'center' | 'right') => void
  onInsertTable: (rows: number, cols: number) => void
  onInsertImage: () => void
  onInsertVideo: () => void
  onInsertAudio: () => void
  onOpenLink: () => void
  onInsertMath: () => void
  onInsertScience: () => void
  onOpenCodeSample: () => void
  onOpenPreview: () => void
  onOpenSourceCode: () => void
  onToggleFullscreen: () => void
}>

type EditorToolbarProps = ToolbarActions &
  Readonly<{
    toolbar: readonly ToolbarGroup[]
  }>

function renderToolbarItem(id: ToolbarItemId, actions: ToolbarActions): ReactNode {
  const {
    editor,
    isFullscreen,
    formatPainterActive,
    fontSizeValue,
    lineHeightValue,
    mediaAlignment,
    canIndent,
    onUndo,
    onRedo,
    onFontSizeChange,
    onLineHeightChange,
    onFormatPainter,
    onIndent,
    onSetAlignment,
    onInsertTable,
    onInsertImage,
    onInsertVideo,
    onInsertAudio,
    onOpenLink,
    onInsertMath,
    onInsertScience,
    onOpenCodeSample,
    onOpenPreview,
    onOpenSourceCode,
    onToggleFullscreen,
  } = actions

  switch (id) {
    case 'undo':
      return (
        <ToolbarButton key={id} label="Undo" disabled={!editor?.can().undo()} onClick={onUndo}>
          <Undo2 />
        </ToolbarButton>
      )
    case 'redo':
      return (
        <ToolbarButton key={id} label="Redo" disabled={!editor?.can().redo()} onClick={onRedo}>
          <Redo2 />
        </ToolbarButton>
      )
    case 'fontSize':
      return (
        <select
          key={id}
          className={styles.blockSelect}
          aria-label="Font size"
          value={fontSizeValue}
          disabled={!editor}
          onChange={onFontSizeChange}
        >
          {FONT_SIZES_PX.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
      )
    case 'lineHeight':
      return (
        <IconDropdownMenu
          key={id}
          trigger={<ListCollapse />}
          triggerLabel="Line height"
          wrapperClassName={styles.lineHeightWrap}
          triggerClassName={cn(
            styles.toolbarButton,
            lineHeightValue !== 'normal' && styles.toolbarButtonActive,
            !editor && styles.toolbarButtonDisabled,
          )}
          contentClassName={`${styles.menuDropdown} ${styles.lineHeightMenu}`}
        >
          {({ close }) =>
            LINE_HEIGHTS.map((lineHeight) => (
              <button
                key={lineHeight}
                type="button"
                role="menuitemradio"
                aria-checked={lineHeightValue === lineHeight}
                disabled={!editor}
                className={styles.menuDropdownItem}
                onClick={() => {
                  onLineHeightChange(lineHeight)
                  close()
                }}
              >
                <span>{lineHeight === 'normal' ? 'Default' : lineHeight}</span>
                {lineHeightValue === lineHeight ? <Check /> : null}
              </button>
            ))
          }
        </IconDropdownMenu>
      )
    case 'bold':
      return (
        <ToolbarButton
          key={id}
          label="Bold"
          active={editor?.isActive('bold')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
      )
    case 'italic':
      return (
        <ToolbarButton
          key={id}
          label="Italic"
          active={editor?.isActive('italic')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
      )
    case 'textDecoration':
      return <TextDecorationMenu key={id} editor={editor} />
    case 'textColor':
      return (
        <ColorPalettePicker
          key={id}
          label="Text color"
          disabled={!editor}
          colors={TEXT_COLORS}
          activeColor={(editor?.getAttributes('textStyle').color as string | undefined) ?? null}
          outlineLightSwatches
          onSelect={(color) => editor?.chain().focus().setColor(color).run()}
          onClear={() => editor?.chain().focus().unsetColor().run()}
          trigger={
            <span className={styles.colorTriggerIcon}>
              <PenLine />
              <span
                className={styles.colorTriggerBar}
                style={{
                  backgroundColor:
                    (editor?.getAttributes('textStyle').color as string | undefined) || '#111827',
                }}
              />
            </span>
          }
        />
      )
    case 'textCase':
      return <TextCaseMenu key={id} editor={editor} />
    case 'formatPainter':
      return (
        <ToolbarButton
          key={id}
          label={formatPainterActive ? 'Cancel format painter' : 'Format painter'}
          active={formatPainterActive}
          disabled={!editor}
          onClick={onFormatPainter}
        >
          <Paintbrush />
        </ToolbarButton>
      )
    case 'clearFormatting':
      return (
        <ToolbarButton
          key={id}
          label="Clear formatting"
          disabled={!editor}
          onClick={() => {
            if (editor) clearFormatting(editor)
          }}
        >
          <RemoveFormatting />
        </ToolbarButton>
      )
    case 'highlight':
      return (
        <ColorPalettePicker
          key={id}
          label="Highlight color"
          disabled={!editor}
          colors={HIGHLIGHT_COLORS}
          activeColor={(editor?.getAttributes('highlight').color as string | undefined) ?? null}
          onSelect={(color) => editor?.chain().focus().setHighlight({ color }).run()}
          onClear={() => editor?.chain().focus().unsetHighlight().run()}
          trigger={
            <span className={styles.colorTriggerIcon}>
              <Highlighter />
              <span
                className={styles.colorTriggerBar}
                style={{
                  backgroundColor:
                    (editor?.getAttributes('highlight').color as string | undefined) || '#fef08a',
                }}
              />
            </span>
          }
        />
      )
    case 'indentDecrease':
      return (
        <ToolbarButton
          key={id}
          label="Decrease indent"
          disabled={!canIndent('decrease')}
          onClick={() => onIndent('decrease')}
        >
          <IndentDecrease />
        </ToolbarButton>
      )
    case 'indentIncrease':
      return (
        <ToolbarButton
          key={id}
          label="Increase indent"
          disabled={!canIndent('increase')}
          onClick={() => onIndent('increase')}
        >
          <IndentIncrease />
        </ToolbarButton>
      )
    case 'bulletList':
      return (
        <ToolbarButton
          key={id}
          label="Bullet list"
          active={editor?.isActive('bulletList')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
      )
    case 'orderedList':
      return (
        <ToolbarButton
          key={id}
          label="Numbered list"
          active={editor?.isActive('orderedList')}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
      )
    case 'taskList':
      return (
        <ToolbarButton
          key={id}
          label="Task list"
          active={editor?.isActive('taskList')}
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
        >
          <ListChecks />
        </ToolbarButton>
      )
    case 'alignLeft':
      return (
        <ToolbarButton
          key={id}
          label="Align left"
          active={mediaAlignment ? mediaAlignment === 'left' : editor?.isActive({ textAlign: 'left' })}
          onClick={() => onSetAlignment('left')}
        >
          <AlignLeft />
        </ToolbarButton>
      )
    case 'alignCenter':
      return (
        <ToolbarButton
          key={id}
          label="Align center"
          active={
            mediaAlignment ? mediaAlignment === 'center' : editor?.isActive({ textAlign: 'center' })
          }
          onClick={() => onSetAlignment('center')}
        >
          <AlignCenter />
        </ToolbarButton>
      )
    case 'alignRight':
      return (
        <ToolbarButton
          key={id}
          label="Align right"
          active={
            mediaAlignment ? mediaAlignment === 'right' : editor?.isActive({ textAlign: 'right' })
          }
          onClick={() => onSetAlignment('right')}
        >
          <AlignRight />
        </ToolbarButton>
      )
    case 'table':
      return <TableSizePicker key={id} disabled={!editor} onSelect={onInsertTable} />
    case 'image':
      return (
        <ToolbarButton key={id} label="Image" disabled={!editor} onClick={onInsertImage}>
          <ImageIcon />
        </ToolbarButton>
      )
    case 'video':
      return (
        <ToolbarButton key={id} label="Video" disabled={!editor} onClick={onInsertVideo}>
          <VideoIcon />
        </ToolbarButton>
      )
    case 'audio':
      return (
        <ToolbarButton key={id} label="Audio" disabled={!editor} onClick={onInsertAudio}>
          <Volume2 />
        </ToolbarButton>
      )
    case 'link':
      return (
        <ToolbarButton key={id} label="Link" active={editor?.isActive('link')} onClick={onOpenLink}>
          <Link2 />
        </ToolbarButton>
      )
    case 'math':
      return (
        <ToolbarButton key={id} label="Math formula" onClick={onInsertMath}>
          <Sigma />
        </ToolbarButton>
      )
    case 'science':
      return (
        <ToolbarButton key={id} label="Science formula" onClick={onInsertScience}>
          <FlaskConical />
        </ToolbarButton>
      )
    case 'codeSample':
      return (
        <ToolbarButton
          key={id}
          label="Code sample"
          active={editor?.isActive('codeBlock')}
          disabled={!editor}
          onClick={onOpenCodeSample}
        >
          <SquareCode />
        </ToolbarButton>
      )
    case 'preview':
      return (
        <ToolbarButton key={id} label="Preview" disabled={!editor} onClick={onOpenPreview}>
          <Eye />
        </ToolbarButton>
      )
    case 'sourceCode':
      return (
        <ToolbarButton key={id} label="Source code" disabled={!editor} onClick={onOpenSourceCode}>
          <Code2 />
        </ToolbarButton>
      )
    case 'fullscreen':
      return (
        <ToolbarButton
          key={id}
          label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          active={isFullscreen}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? <Minimize2 /> : <Maximize2 />}
        </ToolbarButton>
      )
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

export function EditorToolbar({ toolbar, ...actions }: EditorToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      {toolbar.map((group, groupIndex) => (
        <Fragment key={`group-${groupIndex}`}>
          {groupIndex > 0 ? <ToolbarDivider /> : null}
          <ToolbarGroupEl>
            {group.map((itemId) => renderToolbarItem(itemId, actions))}
          </ToolbarGroupEl>
        </Fragment>
      ))}
    </div>
  )
}
