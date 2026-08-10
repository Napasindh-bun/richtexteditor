'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { posToDOMRect } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Mathematics } from '@tiptap/extension-mathematics'
import SuperscriptExtension from '@tiptap/extension-superscript'
import SubscriptExtension from '@tiptap/extension-subscript'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import 'katex/contrib/mhchem'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code2,
  Eye,
  FlaskConical,
  FlipHorizontal2,
  FlipVertical2,
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
  RotateCcw,
  RotateCw,
  Sigma,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Underline as UnderlineIcon,
  Undo2,
  Video as VideoIcon,
} from 'lucide-react'

import { cn } from '@libs'
import { resolveMathVariant } from '@utils/editor/richTextMath'

import { IconDropdownMenu } from '../IconDropdownMenu'

import { AudioDialog } from './AudioDialog'
import { codeLowlight } from './codeSampleHighlight'
import { CodeSampleDialog } from './CodeSampleDialog'
import {
  ColorPalettePicker,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
} from './ColorPalettePicker'
import { DoubleUnderline } from './doubleUnderlineExtension'
import { LinkDialog } from './LinkDialog'
import { LineHeight } from './lineHeightExtension'
import { MathLiveDialog, type MathLiveDialogVariant } from './MathLiveDialog'
import { ParagraphIndent } from './paragraphIndentExtension'
import { PreviewDialog } from './PreviewDialog'
import { RichTextAudio } from './richTextAudioExtension'
import { RichTextImage } from './richTextImageExtension'
import { parseVideoSource, RichTextVideo } from './richTextVideoExtension'
import { SourceCodeDialog } from './SourceCodeDialog'
import {
  applyTableProperties,
  DEFAULT_TABLE_PROPERTIES,
  normalizeTableColumnWidths,
  readTableProperties,
  StyledTable,
  StyledTableCell,
  StyledTableHeader,
  StyledTableRow,
  StyledTableView,
  type TablePropertiesValues,
} from './styledTableCellExtension'
import { TableContextMenu } from './TableContextMenu'
import { TablePropertiesDialog } from './TablePropertiesDialog'
import { TableRowResizeHandles } from './TableRowResizeHandles'
import { TableSizePicker } from './TableSizePicker'
import { TextCaseMenu } from './TextCaseMenu'
import { applyTextCase } from './textCaseCommands'
import { VideoDialog } from './VideoDialog'
import contentStyles from './styles/RichTextContent.module.css'
import styles from './styles/RichTextEditor.module.css'

type RichTextEditorProps = Readonly<{
  value: string
  onChange: (html: string) => void
  height?: number
  /**
   * Upload a picked video file and resolve to its URL. Without it the file is
   * inlined as a data URL, which bloats the stored HTML for anything but clips.
   */
  onUploadVideo?: (file: File) => Promise<string>
  /** Upload a picked audio file and resolve to its public URL. */
  onUploadAudio?: (file: File) => Promise<string>
}>

type ToolbarButtonProps = Readonly<{
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}>

type FormulaDialogState = Readonly<{
  variant: MathLiveDialogVariant
  initialLatex: string
  /** Document position of an existing math node being edited; omit when inserting. */
  editPos?: number
  editType?: 'inlineMath' | 'blockMath'
}>

type CodeSampleDialogState = Readonly<{
  code: string
  language: string
  editPos?: number
  replaceRange?: Readonly<{ from: number; to: number }>
}>

type FormatPainterSnapshot = Readonly<{
  marks: Readonly<
    Record<
      | 'bold'
      | 'italic'
      | 'underline'
      | 'doubleUnderline'
      | 'strike'
      | 'superscript'
      | 'subscript',
      boolean
    >
  >
  color?: string
  fontSize?: string
  highlight?: string
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: string
}>

const BUBBLE_MENU_OPTIONS = {
  placement: 'top',
  strategy: 'fixed',
  offset: 8,
} as const


function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(styles.toolbarButton, active && styles.toolbarButtonActive)}
      // Keep the ProseMirror selection intact while a toolbar command is clicked.
      // Otherwise the button can take focus before `onClick`, causing block commands
      // such as toggleTaskList to run at a stale/fallback document position.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <span className={styles.divider} aria-hidden />
}

function ToolbarGroup({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={styles.toolbarGroup}>{children}</div>
}

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

function clearFormatting(editor: Editor) {
  editor.chain().focus().unsetAllMarks().clearNodes().run()
}

function TextDecorationMenu({ editor }: Readonly<{ editor: Editor | null }>) {
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
      contentClassName={`${styles.menuDropdown} ${styles.textDecorationMenu}`}
    >
      {({ close }) =>
        items.map((item) => (
          <button
            key={item.name}
            type="button"
            role="menuitemcheckbox"
            aria-checked={Boolean(editor?.isActive(item.name))}
            disabled={!editor}
            className={styles.menuDropdownItem}
            onClick={() => {
              if (editor) runTextDecoration(editor, item.name)
              close()
            }}
          >
            <span className={styles.textCaseMenuLabel}>
              {item.icon}
              {item.label}
            </span>
            {editor?.isActive(item.name) ? <Check className={styles.menuItemCheck} /> : null}
          </button>
        ))
      }
    </IconDropdownMenu>
  )
}

function QuickToolbar({
  editor,
  formatPainterActive,
  onFormatPainter,
  onOpenLink,
  onOpenCodeSample,
}: Readonly<{
  editor: Editor
  formatPainterActive: boolean
  onFormatPainter: () => void
  onOpenLink: () => void
  onOpenCodeSample: () => void
}>) {
  return (
    <div className={styles.quickToolbar} role="toolbar" aria-label="Quick formatting">
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <TextDecorationMenu editor={editor} />
      <ToolbarButton label="Link" active={editor.isActive('link')} onClick={onOpenLink}>
        <Link2 />
      </ToolbarButton>
      <ToolbarButton
        label={formatPainterActive ? 'Cancel format painter' : 'Format painter'}
        active={formatPainterActive}
        onClick={onFormatPainter}
      >
        <Paintbrush />
      </ToolbarButton>
      <ToolbarButton label="Clear formatting" onClick={() => clearFormatting(editor)}>
        <RemoveFormatting />
      </ToolbarButton>
      <ToolbarButton
        label="Code sample"
        active={editor.isActive('codeBlock')}
        onClick={onOpenCodeSample}
      >
        <SquareCode />
      </ToolbarButton>
    </div>
  )
}

function getSelectedImagePixels(editor: Editor, dimension: 'width' | 'height'): number | undefined {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') return

  const stored = String(selection.node.attrs[dimension] ?? '')
  const pixelValue = /^(\d+(?:\.\d+)?)(?:px)?$/i.exec(stored)
  if (pixelValue) return Math.round(Number(pixelValue[1]))

  const nodeDom = editor.view.nodeDOM(selection.from)
  const image =
    nodeDom instanceof HTMLImageElement
      ? nodeDom
      : nodeDom instanceof HTMLElement
        ? nodeDom.querySelector('img')
        : null
  const measured = dimension === 'width' ? image?.clientWidth : image?.clientHeight
  return measured && measured > 0 ? Math.round(measured) : undefined
}

function ImageQuickToolbar({ editor }: Readonly<{ editor: Editor }>) {
  const attrs = editor.getAttributes('image')
  const width = getSelectedImagePixels(editor, 'width')
  const height = getSelectedImagePixels(editor, 'height')
  const rotation = Number(attrs.rotation) || 0

  const updateDimension = (dimension: 'width' | 'height', rawValue: string) => {
    const parsed = Number(rawValue)
    const value = rawValue.trim() && Number.isFinite(parsed) && parsed > 0
      ? `${Math.round(parsed)}px`
      : null
    editor.chain().focus().updateAttributes('image', { [dimension]: value }).run()
  }

  return (
    <div className={cn(styles.quickToolbar, styles.imageQuickToolbar)} role="toolbar" aria-label="Image formatting">
      <ToolbarButton
        label="Rotate left"
        onClick={() =>
          editor.chain().focus().updateAttributes('image', { rotation: rotation - 90 }).run()
        }
      >
        <RotateCcw />
      </ToolbarButton>
      <ToolbarButton
        label="Rotate right"
        onClick={() =>
          editor.chain().focus().updateAttributes('image', { rotation: rotation + 90 }).run()
        }
      >
        <RotateCw />
      </ToolbarButton>
      <ToolbarButton
        label="Flip horizontal"
        active={Boolean(attrs.flipX)}
        onClick={() =>
          editor.chain().focus().updateAttributes('image', { flipX: !attrs.flipX }).run()
        }
      >
        <FlipHorizontal2 />
      </ToolbarButton>
      <ToolbarButton
        label="Flip vertical"
        active={Boolean(attrs.flipY)}
        onClick={() =>
          editor.chain().focus().updateAttributes('image', { flipY: !attrs.flipY }).run()
        }
      >
        <FlipVertical2 />
      </ToolbarButton>
      <label className={styles.imageSizeField}>
        W
        <input
          key={`width-${width ?? 'auto'}`}
          type="number"
          min="1"
          defaultValue={width}
          placeholder="Auto"
          aria-label="Image width in pixels"
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          onBlur={(event) => updateDimension('width', event.currentTarget.value)}
        />
      </label>
      <label className={styles.imageSizeField}>
        H
        <input
          key={`height-${height ?? 'auto'}`}
          type="number"
          min="1"
          defaultValue={height}
          placeholder="Auto"
          aria-label="Image height in pixels"
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          onBlur={(event) => updateDimension('height', event.currentTarget.value)}
        />
      </label>
    </div>
  )
}

const NODE_PATH_LABELS: Record<string, string> = {
  doc: 'document',
  paragraph: 'p',
  bulletList: 'ul',
  orderedList: 'ol',
  taskList: 'ul',
  taskItem: 'li',
  listItem: 'li',
  table: 'table',
  tableRow: 'tr',
  tableCell: 'td',
  tableHeader: 'th',
  image: 'img',
  video: 'video',
  audio: 'audio',
  codeBlock: 'pre',
  inlineMath: 'math',
  blockMath: 'math',
  hardBreak: 'br',
  text: 'text',
}

function getElementPath(editor: Editor): string[] {
  const { $from } = editor.state.selection
  const path: string[] = []
  for (let depth = 1; depth <= $from.depth; depth += 1) {
    const name = $from.node(depth).type.name
    path.push(NODE_PATH_LABELS[name] ?? name)
  }
  if (editor.isActive('image')) path.push('img')
  if (editor.isActive('link')) path.push('a')
  if (editor.isActive('bold')) path.push('strong')
  if (editor.isActive('italic')) path.push('em')
  if (editor.isActive('underline') || editor.isActive('doubleUnderline')) path.push('u')
  if (editor.isActive('strike')) path.push('s')
  if (editor.isActive('superscript')) path.push('sup')
  if (editor.isActive('subscript')) path.push('sub')
  return path
}

function getTextStats(editor: Editor): { words: number; chars: number } {
  const text = editor.state.doc.textContent.replace(/\s+/g, ' ').trim()
  if (!text) return { words: 0, chars: 0 }
  return { words: text.split(' ').length, chars: text.length }
}

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

function MenuBar({
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

const FONT_SIZES_PX = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36] as const
const DEFAULT_FONT_SIZE_PX = 16
const LINE_HEIGHTS = ['normal', '1', '1.15', '1.5', '2', '2.5', '3'] as const

function getActiveFontSizePx(editor: Editor): number {
  const raw = editor.getAttributes('textStyle').fontSize as string | undefined
  if (!raw) return DEFAULT_FONT_SIZE_PX
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : DEFAULT_FONT_SIZE_PX
}

/** Media nodes carry their own `align` attribute instead of the TextAlign mark. */
const MEDIA_NODE_TYPES = ['image', 'video', 'audio'] as const

function getActiveMediaType(editor: Editor): (typeof MEDIA_NODE_TYPES)[number] | null {
  return MEDIA_NODE_TYPES.find((type) => editor.isActive(type)) ?? null
}

function getMediaAlignment(editor: Editor): 'left' | 'center' | 'right' | null {
  const mediaType = getActiveMediaType(editor)
  if (!mediaType) return null

  const align = editor.getAttributes(mediaType).align
  return align === 'left' || align === 'center' || align === 'right' ? align : 'left'
}

function findMathNodeAtPos(
  doc: ProseMirrorNode,
  pos: number,
): { node: ProseMirrorNode; pos: number; type: 'inlineMath' | 'blockMath' } | null {
  const direct = doc.nodeAt(pos)
  if (direct?.type.name === 'inlineMath' || direct?.type.name === 'blockMath') {
    return { node: direct, pos, type: direct.type.name }
  }

  const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size))
  const before = $pos.nodeBefore
  if (before?.type.name === 'inlineMath' || before?.type.name === 'blockMath') {
    return {
      node: before,
      pos: $pos.pos - before.nodeSize,
      type: before.type.name,
    }
  }
  const next = $pos.nodeAfter
  if (next?.type.name === 'inlineMath' || next?.type.name === 'blockMath') {
    return { node: next, pos: $pos.pos, type: next.type.name }
  }

  return null
}

export function RichTextEditor({
  value,
  onChange,
  height = 420,
  onUploadVideo,
  onUploadAudio,
}: RichTextEditorProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const editorScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [formulaDialog, setFormulaDialog] = useState<FormulaDialogState | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkInitialUrl, setLinkInitialUrl] = useState('')
  const [tablePropertiesOpen, setTablePropertiesOpen] = useState(false)
  const [tablePropertiesInitial, setTablePropertiesInitial] =
    useState<TablePropertiesValues>(DEFAULT_TABLE_PROPERTIES)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sourceCodeOpen, setSourceCodeOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [audioDialogOpen, setAudioDialogOpen] = useState(false)
  const [codeSampleDialog, setCodeSampleDialog] = useState<CodeSampleDialogState | null>(null)
  const [formatPainterActive, setFormatPainterActive] = useState(false)
  const linkSelectionRef = useRef<{ from: number; to: number; wasLink: boolean } | null>(null)
  const openFormulaEditorRef = useRef<(state: FormulaDialogState) => void>(() => {})
  const openCodeSampleRef = useRef<(state: CodeSampleDialogState) => void>(() => {})
  const formatPainterRef = useRef<FormatPainterSnapshot | null>(null)
  const applyFormatPainterRef = useRef<() => void>(() => {})

  useEffect(() => {
    openFormulaEditorRef.current = setFormulaDialog
    openCodeSampleRef.current = setCodeSampleDialog
  })

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        // StarterKit v3 ships Link + Underline — configure here instead of adding them again.
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      DoubleUnderline,
      SuperscriptExtension,
      SubscriptExtension,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      LineHeight,
      ParagraphIndent,
      CodeBlockLowlight.configure({ lowlight: codeLowlight }),
      // TinyMCE treats images as inline atoms: they can be dragged between
      // characters and the caret can continue immediately after them.
      RichTextImage.configure({ allowBase64: true, inline: true }),
      RichTextVideo,
      RichTextAudio,
      // TipTap built-in column resize (prosemirror-tables columnResizing).
      // `View` is forwarded to columnResizing — the only way table attributes
      // reach the editor DOM while resizing is on.
      StyledTable.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 48,
        lastColumnResizable: true,
        renderWrapper: true,
        View: StyledTableView,
      }),
      StyledTableRow,
      StyledTableHeader,
      StyledTableCell,
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Mathematics.configure({
        katexOptions: { throwOnError: false },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        // Shared with RichTextHtmlPreview so both surfaces lay out identically.
        class: `${contentStyles.content} ${styles.editorContent}`,
      },
      handleDOMEvents: {
        mouseup: () => {
          if (!formatPainterRef.current) return false
          requestAnimationFrame(() => applyFormatPainterRef.current())
          return false
        },
        dblclick: (view, event) => {
          const target = event.target
          if (!(target instanceof Element)) return false

          const codeElement = target.closest<HTMLElement>('pre')
          if (codeElement && view.dom.contains(codeElement)) {
            const domPos = view.posAtDOM(codeElement, 0)
            const $codePos = view.state.doc.resolve(Math.min(domPos, view.state.doc.content.size))
            for (let depth = $codePos.depth; depth > 0; depth -= 1) {
              const codeNode = $codePos.node(depth)
              if (codeNode.type.name !== 'codeBlock') continue
              event.preventDefault()
              openCodeSampleRef.current({
                code: codeNode.textContent,
                language: String(codeNode.attrs.language ?? 'plaintext'),
                editPos: $codePos.before(depth),
              })
              return true
            }
          }

          const mathEl = target.closest<HTMLElement>(
            '[data-type="inline-math"], [data-type="block-math"]',
          )
          if (!mathEl || !view.dom.contains(mathEl)) return false

          event.preventDefault()
          event.stopPropagation()

          const latex = mathEl.getAttribute('data-latex') ?? ''
          const domPos = view.posAtDOM(mathEl, 0)
          const found = findMathNodeAtPos(view.state.doc, domPos)
          if (!found) return false

          openFormulaEditorRef.current({
            variant: resolveMathVariant(latex || found.node.attrs.latex || ''),
            initialLatex: latex || String(found.node.attrs.latex ?? ''),
            editPos: found.pos,
            editType: found.type,
          })
          return true
        },
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML())
    },
  })

  /**
   * Stamp the rendered column widths onto every cell once the browser has laid
   * the table out, so `getHTML()` carries full ratios instead of "whatever is
   * left over at this editor width". Previews (Konva canvas, player) rescale
   * those ratios to their own width and stay aligned with the modal.
   */
  const normalizeFrameRef = useRef<number | null>(null)
  const scheduleColumnWidthNormalize = useCallback(() => {
    if (!editor) return
    if (normalizeFrameRef.current !== null) cancelAnimationFrame(normalizeFrameRef.current)
    normalizeFrameRef.current = requestAnimationFrame(() => {
      normalizeFrameRef.current = null
      normalizeTableColumnWidths(editor)
    })
  }, [editor])

  useEffect(() => {
    if (!editor) return
    editor.on('update', scheduleColumnWidthNormalize)
    scheduleColumnWidthNormalize()

    return () => {
      editor.off('update', scheduleColumnWidthNormalize)
      if (normalizeFrameRef.current !== null) {
        cancelAnimationFrame(normalizeFrameRef.current)
        normalizeFrameRef.current = null
      }
    }
  }, [editor, scheduleColumnWidthNormalize])

  // Keep the editor in sync when the parent resets `value` (e.g. modal remount / demo load).
  useEffect(() => {
    if (!editor) return
    if (value === editor.getHTML()) return
    editor.commands.setContent(value, { emitUpdate: false })
    scheduleColumnWidthNormalize()
  }, [editor, scheduleColumnWidthNormalize, value])

  const hasDialogOpen =
    tablePropertiesOpen ||
    linkDialogOpen ||
    sourceCodeOpen ||
    previewOpen ||
    videoDialogOpen ||
    audioDialogOpen ||
    codeSampleDialog !== null ||
    formulaDialog !== null

  const shouldShowBubbleMenu = useCallback(
    ({ editor: currentEditor, from, to }: { editor: Editor; from: number; to: number }) => {
      if (hasDialogOpen) return false
      const { selection } = currentEditor.state
      if (selection instanceof NodeSelection) {
        return selection.node.type.name === 'image'
      }
      return (
        from !== to &&
        !currentEditor.isActive('codeBlock') &&
        !currentEditor.isActive('table') &&
        !currentEditor.isActive('video') &&
        !currentEditor.isActive('audio')
      )
    },
    [hasDialogOpen],
  )

  const getBubbleMenuReference = useCallback(() => {
    if (!editor || typeof document === 'undefined') return null
    const { from, to } = editor.state.selection
    if (from === to) return null

    const { selection } = editor.state
    if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
      const nodeDom = editor.view.nodeDOM(selection.from)
      const reference =
        nodeDom instanceof HTMLElement
          ? nodeDom.closest<HTMLElement>('[data-node-view-wrapper]') ?? nodeDom
          : null
      if (reference) {
        return {
          getBoundingClientRect: () => reference.getBoundingClientRect(),
          contextElement: editor.view.dom,
        }
      }
    }

    const editorRect = editor.view.dom.getBoundingClientRect()
    let selectionRect: DOMRect | DOMRectReadOnly
    try {
      selectionRect = posToDOMRect(editor.view, from, to)
    } catch {
      selectionRect = new DOMRect(editorRect.left + editorRect.width / 2, editorRect.top, 0, 0)
    }

    let hasMultipleLines = false
    try {
      const start = editor.view.domAtPos(from)
      const end = editor.view.domAtPos(to)
      const range = document.createRange()
      range.setStart(start.node, start.offset)
      range.setEnd(end.node, end.offset)

      const measuredRect = range.getBoundingClientRect()
      if (measuredRect.width > 0 || measuredRect.height > 0) selectionRect = measuredRect
      const lineTops: number[] = []
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width <= 0 || rect.height <= 0) continue
        if (!lineTops.some((top) => Math.abs(top - rect.top) < 2)) lineTops.push(rect.top)
      }
      hasMultipleLines = lineTops.length > 1
    } catch {
      // `posToDOMRect` above remains a reliable single-line fallback during
      // transient double-click DOM selection updates.
    }

    // TinyMCE centers a multi-line quick toolbar against the editing area,
    // instead of against the very wide union of all selected line fragments.
    const referenceRect = hasMultipleLines
      ? new DOMRect(editorRect.left + editorRect.width / 2, selectionRect.top, 0, 0)
      : selectionRect

    return {
      getBoundingClientRect: () => referenceRect,
      contextElement: editor.view.dom,
    }
  }, [editor])

  const bubbleMenuOptions = useMemo(
    () => ({
      ...BUBBLE_MENU_OPTIONS,
      hide: { strategy: 'referenceHidden' as const },
      ...(typeof window !== 'undefined'
        ? { scrollTarget: editorScrollRef.current ?? window }
        : {}),
    }),
    [editor],
  )

  // Ctrl+Shift+F toggles, Esc leaves — matches TinyMCE's fullscreen plugin.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (formatPainterRef.current) {
          formatPainterRef.current = null
          setFormatPainterActive(false)
          return
        }
        // Leave Escape alone when a dialog owns it. Otherwise consume it during
        // capture so an enclosing Radix dialog does not close along with us.
        if (!isFullscreen || hasDialogOpen) return
        event.preventDefault()
        event.stopPropagation()
        setIsFullscreen(false)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        event.stopPropagation()
        setIsFullscreen((previous) => !previous)
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [hasDialogOpen, isFullscreen])

  // The shell covers the viewport — let it own scrolling while it is up.
  useEffect(() => {
    if (!isFullscreen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isFullscreen])

  const handleInsertImage = () => {
    fileInputRef.current?.click()
  }

  const handleSetAlignment = (align: 'left' | 'center' | 'right') => {
    if (!editor) return

    const chain = editor.chain().focus()
    const mediaType = getActiveMediaType(editor)
    if (mediaType) {
      chain.updateAttributes(mediaType, { align }).run()
      return
    }

    chain.setTextAlign(align).run()
  }

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return

    try {
      const src = await readFileAsDataUrl(file)
      if (!src) return
      editor.chain().focus().setImage({ src }).run()
    } catch {
      // Ignore unreadable files; the editor stays unchanged.
    }
  }

  const insertVideo = (src: string, provider: 'file' | 'youtube') => {
    editor?.chain().focus().insertContent({ type: 'video', attrs: { src, provider } }).run()
  }

  const handleSaveVideoUrl = (url: string) => {
    const source = parseVideoSource(url)
    setVideoDialogOpen(false)
    if (source) insertVideo(source.src, source.provider)
  }

  const handleVideoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return

    try {
      const src = onUploadVideo ? await onUploadVideo(file) : await readFileAsDataUrl(file)
      if (!src) return
      setVideoDialogOpen(false)
      insertVideo(src, 'file')
    } catch {
      // Upload failed or the file is unreadable; the editor stays unchanged.
    }
  }

  const handleOpenLinkDialog = () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    linkSelectionRef.current = { from, to, wasLink: editor.isActive('link') }
    const previous = editor.getAttributes('link').href as string | undefined
    setLinkInitialUrl(previous ?? '')
    setLinkDialogOpen(true)
  }

  const handleSaveLink = (url: string) => {
    if (!editor) return

    const selection = linkSelectionRef.current
    linkSelectionRef.current = null

    const chain = editor.chain().focus()
    if (selection) {
      chain.setTextSelection({ from: selection.from, to: selection.to })
    }

    if (!url) {
      chain.extendMarkRange('link').unsetLink().run()
    } else if (selection && (selection.from !== selection.to || selection.wasLink)) {
      chain.extendMarkRange('link').setLink({ href: url }).run()
    } else {
      // No text selected — insert the URL as linked text.
      chain
        .insertContent({
          type: 'text',
          text: url,
          marks: [{ type: 'link', attrs: { href: url } }],
        })
        .run()
    }
    setLinkDialogOpen(false)
  }

  const handleCloseLinkDialog = () => {
    linkSelectionRef.current = null
    setLinkDialogOpen(false)
  }

  const handleInsertTable = (rows: number, cols: number) => {
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  }

  const handleOpenTableProperties = () => {
    if (!editor?.isActive('table')) return
    setTablePropertiesInitial(readTableProperties(editor))
    setTablePropertiesOpen(true)
  }

  const handleSaveTableProperties = (values: TablePropertiesValues) => {
    if (!editor) return
    applyTableProperties(editor, values)
    setTablePropertiesOpen(false)
  }

  const handleInsertMath = (latex: string) => {
    const trimmed = latex.trim()
    if (trimmed && editor) {
      const editPos = formulaDialog?.editPos
      const editType = formulaDialog?.editType

      if (editPos != null && editType === 'inlineMath') {
        editor.chain().focus().updateInlineMath({ latex: trimmed, pos: editPos }).run()
      } else if (editPos != null && editType === 'blockMath') {
        editor.chain().focus().updateBlockMath({ latex: trimmed, pos: editPos }).run()
      } else {
        // Prefer insertContent with explicit attrs — more reliable than the
        // Mathematics command helper across TipTap versions.
        const inserted = editor
          .chain()
          .focus()
          .insertContent({ type: 'inlineMath', attrs: { latex: trimmed } })
          .run()
        if (!inserted) {
          editor.chain().focus().insertInlineMath({ latex: trimmed }).run()
        }
      }
    }
    setFormulaDialog(null)
  }

  const handleSaveSourceCode = (html: string) => {
    // `emitUpdate: true` so the parent's `value` follows — otherwise the sync
    // effect below would see a stale `value` and overwrite the new content.
    editor?.commands.setContent(html, { emitUpdate: true })
    scheduleColumnWidthNormalize()
    setSourceCodeOpen(false)
  }

  const handleFontSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!editor) return
    const nextPx = Number.parseInt(event.target.value, 10)
    if (!Number.isFinite(nextPx)) return

    const chain = editor.chain().focus()
    if (nextPx === DEFAULT_FONT_SIZE_PX) {
      // Default size — clear the mark so HTML stays clean unless the user picks another size.
      chain.unsetFontSize().run()
      return
    }
    chain.setFontSize(`${nextPx}px`).run()
  }

  const insertAudio = (src: string) => {
    editor?.chain().focus().insertContent({ type: 'audio', attrs: { src } }).run()
  }

  const handleSaveAudioUrl = (url: string) => {
    setAudioDialogOpen(false)
    insertAudio(url.trim())
  }

  const handleAudioSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return

    try {
      const src = onUploadAudio ? await onUploadAudio(file) : await readFileAsDataUrl(file)
      if (!src) return
      setAudioDialogOpen(false)
      insertAudio(src)
    } catch {
      // Upload failed or the file is unreadable; the editor stays unchanged.
    }
  }

  const captureFormatPainter = () => {
    if (!editor) return
    if (formatPainterRef.current) {
      formatPainterRef.current = null
      setFormatPainterActive(false)
      return
    }

    const textStyle = editor.getAttributes('textStyle')
    const highlight = editor.getAttributes('highlight')
    const paragraph = editor.getAttributes('paragraph')
    const align = paragraph.textAlign
    formatPainterRef.current = {
      marks: {
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        doubleUnderline: editor.isActive('doubleUnderline'),
        strike: editor.isActive('strike'),
        superscript: editor.isActive('superscript'),
        subscript: editor.isActive('subscript'),
      },
      color: textStyle.color as string | undefined,
      fontSize: textStyle.fontSize as string | undefined,
      highlight: highlight.color as string | undefined,
      textAlign: align === 'center' || align === 'right' ? align : 'left',
      lineHeight: paragraph.lineHeight as string | undefined,
    }
    setFormatPainterActive(true)
  }

  const applyFormatPainter = useCallback(() => {
    if (!editor) return
    const snapshot = formatPainterRef.current
    const { from, to } = editor.state.selection
    if (!snapshot || from === to) return

    const chain = editor
      .chain()
      .focus()
      .unsetMark('bold')
      .unsetMark('italic')
      .unsetMark('underline')
      .unsetMark('doubleUnderline')
      .unsetMark('strike')
      .unsetMark('superscript')
      .unsetMark('subscript')
      .unsetColor()
      .unsetHighlight()
      .unsetFontSize()

    if (snapshot.marks.bold) chain.setBold()
    if (snapshot.marks.italic) chain.setItalic()
    if (snapshot.marks.underline) chain.setUnderline()
    if (snapshot.marks.doubleUnderline) chain.setDoubleUnderline()
    if (snapshot.marks.strike) chain.setStrike()
    if (snapshot.marks.superscript) chain.setSuperscript()
    if (snapshot.marks.subscript) chain.setSubscript()
    if (snapshot.color) chain.setColor(snapshot.color)
    if (snapshot.fontSize) chain.setFontSize(snapshot.fontSize)
    if (snapshot.highlight) chain.setHighlight({ color: snapshot.highlight })
    if (snapshot.textAlign) chain.setTextAlign(snapshot.textAlign)
    if (snapshot.lineHeight && snapshot.lineHeight !== 'normal') {
      chain.setLineHeight(snapshot.lineHeight)
    } else {
      chain.unsetLineHeight()
    }
    chain.run()

    formatPainterRef.current = null
    setFormatPainterActive(false)
  }, [editor])

  useEffect(() => {
    applyFormatPainterRef.current = applyFormatPainter
  }, [applyFormatPainter])

  const getIndentListType = () =>
    editor?.isActive('taskItem') ? 'taskItem' : editor?.isActive('listItem') ? 'listItem' : null

  const handleIndent = (direction: 'increase' | 'decrease') => {
    if (!editor) return
    const listType = getIndentListType()
    const chain = editor.chain().focus()
    if (listType) {
      if (direction === 'increase') chain.sinkListItem(listType).run()
      else chain.liftListItem(listType).run()
      return
    }
    if (direction === 'increase') chain.increaseParagraphIndent().run()
    else chain.decreaseParagraphIndent().run()
  }

  /** Outdent stops at zero, and a list item that cannot nest any deeper cannot indent. */
  const canIndent = (direction: 'increase' | 'decrease') => {
    if (!editor) return false
    const listType = getIndentListType()
    if (listType) {
      return direction === 'increase'
        ? editor.can().sinkListItem(listType)
        : editor.can().liftListItem(listType)
    }
    return direction === 'increase'
      ? editor.can().increaseParagraphIndent()
      : editor.can().decreaseParagraphIndent()
  }

  const openCodeSampleDialog = () => {
    if (!editor) return
    const { $from, from, to } = editor.state.selection
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth)
      if (node.type.name !== 'codeBlock') continue
      setCodeSampleDialog({
        code: node.textContent,
        language: String(node.attrs.language ?? 'plaintext'),
        editPos: $from.before(depth),
      })
      return
    }
    setCodeSampleDialog({
      code: from === to ? '' : editor.state.doc.textBetween(from, to, '\n'),
      language: 'plaintext',
      replaceRange: { from, to },
    })
  }

  const saveCodeSample = (code: string, language: string) => {
    if (!editor || !codeSampleDialog) return
    const type = editor.schema.nodes.codeBlock
    if (!type) return
    const content = code ? editor.schema.text(code) : undefined
    const node = type.create({ language }, content)

    if (typeof codeSampleDialog.editPos === 'number') {
      const existing = editor.state.doc.nodeAt(codeSampleDialog.editPos)
      if (existing) {
        editor.view.dispatch(
          editor.state.tr.replaceWith(
            codeSampleDialog.editPos,
            codeSampleDialog.editPos + existing.nodeSize,
            node,
          ),
        )
      }
    } else if (codeSampleDialog.replaceRange) {
      editor.chain().focus().insertContentAt(codeSampleDialog.replaceRange, node.toJSON()).run()
    }
    setCodeSampleDialog(null)
  }

  const handleLineHeightChange = (value: string) => {
    if (!editor) return
    const chain = editor.chain().focus()
    if (value === 'normal') {
      chain.unsetLineHeight().run()
      return
    }
    chain.setLineHeight(value).run()
  }

  const fontSizeValue = editor ? getActiveFontSizePx(editor) : DEFAULT_FONT_SIZE_PX
  const lineHeightValue =
    (editor?.getAttributes('paragraph').lineHeight as string | undefined) ?? 'normal'
  const mediaAlignment = editor ? getMediaAlignment(editor) : null
  const elementPath = editor ? getElementPath(editor) : []
  const textStats = editor ? getTextStats(editor) : { words: 0, chars: 0 }

  const shell = (
    <div
      ref={shellRef}
      className={cn(
        styles.shell,
        isFullscreen && styles.shellFullscreen,
        formatPainterActive && styles.formatPainterActive,
      )}
      style={isFullscreen ? undefined : { height }}
      data-rte-fullscreen={isFullscreen ? '' : undefined}
    >
      <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
        <ToolbarGroup>
          <ToolbarButton
            label="Undo"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={!editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <select
            className={styles.blockSelect}
            aria-label="Font size"
            value={fontSizeValue}
            disabled={!editor}
            onChange={handleFontSizeChange}
          >
            {FONT_SIZES_PX.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
          <IconDropdownMenu
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
                    handleLineHeightChange(lineHeight)
                    close()
                  }}
                >
                  <span>{lineHeight === 'normal' ? 'Default' : lineHeight}</span>
                  {lineHeightValue === lineHeight ? <Check /> : null}
                </button>
              ))
            }
          </IconDropdownMenu>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton
            label="Bold"
            active={editor?.isActive('bold')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor?.isActive('italic')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic />
          </ToolbarButton>
          <TextDecorationMenu editor={editor} />
          <ColorPalettePicker
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
                      (editor?.getAttributes('textStyle').color as string | undefined) ||
                      '#111827',
                  }}
                />
              </span>
            }
          />
          <TextCaseMenu editor={editor} />
          <ToolbarButton
            label={formatPainterActive ? 'Cancel format painter' : 'Format painter'}
            active={formatPainterActive}
            disabled={!editor}
            onClick={captureFormatPainter}
          >
            <Paintbrush />
          </ToolbarButton>
          <ToolbarButton
            label="Clear formatting"
            disabled={!editor}
            onClick={() => {
              if (editor) clearFormatting(editor)
            }}
          >
            <RemoveFormatting />
          </ToolbarButton>
          <ColorPalettePicker
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
                      (editor?.getAttributes('highlight').color as string | undefined) ||
                      '#fef08a',
                  }}
                />
              </span>
            }
          />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton
            label="Decrease indent"
            disabled={!canIndent('decrease')}
            onClick={() => handleIndent('decrease')}
          >
            <IndentDecrease />
          </ToolbarButton>
          <ToolbarButton
            label="Increase indent"
            disabled={!canIndent('increase')}
            onClick={() => handleIndent('increase')}
          >
            <IndentIncrease />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor?.isActive('bulletList')}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor?.isActive('orderedList')}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered />
          </ToolbarButton>
          <ToolbarButton
            label="Task list"
            active={editor?.isActive('taskList')}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <ListChecks />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton
            label="Align left"
            active={mediaAlignment ? mediaAlignment === 'left' : editor?.isActive({ textAlign: 'left' })}
            onClick={() => handleSetAlignment('left')}
          >
            <AlignLeft />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            active={
              mediaAlignment ? mediaAlignment === 'center' : editor?.isActive({ textAlign: 'center' })
            }
            onClick={() => handleSetAlignment('center')}
          >
            <AlignCenter />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            active={
              mediaAlignment ? mediaAlignment === 'right' : editor?.isActive({ textAlign: 'right' })
            }
            onClick={() => handleSetAlignment('right')}
          >
            <AlignRight />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <TableSizePicker disabled={!editor} onSelect={handleInsertTable} />
          <ToolbarButton label="Image" onClick={handleInsertImage}>
            <ImageIcon />
          </ToolbarButton>
          <ToolbarButton label="Video" disabled={!editor} onClick={() => setVideoDialogOpen(true)}>
            <VideoIcon />
          </ToolbarButton>
          <ToolbarButton label="Audio" disabled={!editor} onClick={() => setAudioDialogOpen(true)}>
            <Volume2 />
          </ToolbarButton>
          <ToolbarButton
            label="Link"
            active={editor?.isActive('link')}
            onClick={handleOpenLinkDialog}
          >
            <Link2 />
          </ToolbarButton>
          <ToolbarButton
            label="Math formula"
            onClick={() => setFormulaDialog({ variant: 'math', initialLatex: '' })}
          >
            <Sigma />
          </ToolbarButton>
          <ToolbarButton
            label="Science formula"
            onClick={() => setFormulaDialog({ variant: 'science', initialLatex: '' })}
          >
            <FlaskConical />
          </ToolbarButton>
          <ToolbarButton
            label="Code sample"
            active={editor?.isActive('codeBlock')}
            disabled={!editor}
            onClick={openCodeSampleDialog}
          >
            <SquareCode />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton label="Preview" disabled={!editor} onClick={() => setPreviewOpen(true)}>
            <Eye />
          </ToolbarButton>
          <ToolbarButton label="Source code" disabled={!editor} onClick={() => setSourceCodeOpen(true)}>
            <Code2 />
          </ToolbarButton>
          <ToolbarButton
            label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            active={isFullscreen}
            onClick={() => setIsFullscreen((previous) => !previous)}
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </ToolbarButton>
        </ToolbarGroup>
      </div>

      {editor ? (
        <>
          <BubbleMenu
            editor={editor}
            pluginKey="richTextBubbleMenu"
            options={bubbleMenuOptions}
            shouldShow={shouldShowBubbleMenu}
            getReferencedVirtualElement={getBubbleMenuReference}
          >
            {editor.state.selection instanceof NodeSelection &&
            editor.state.selection.node.type.name === 'image' ? (
              <ImageQuickToolbar editor={editor} />
            ) : (
              <QuickToolbar
                editor={editor}
                formatPainterActive={formatPainterActive}
                onFormatPainter={captureFormatPainter}
                onOpenLink={handleOpenLinkDialog}
                onOpenCodeSample={openCodeSampleDialog}
              />
            )}
          </BubbleMenu>
        </>
      ) : null}

      <div ref={editorScrollRef} className={styles.editorScroll} data-rte-scroll>
        <EditorContent editor={editor} />
      </div>

      <div className={styles.statusbar} aria-live="polite">
        <div className={styles.statusbarPath}>
          {elementPath.length > 0
            ? elementPath.map((part, index) => (
                <span key={`${part}-${index}`} className={styles.statusbarPathItem}>
                  {index > 0 ? <span className={styles.statusbarPathSep}>›</span> : null}
                  {part}
                </span>
              ))
            : 'p'}
        </div>
        <div className={styles.statusbarMeta}>
          <span>
            {textStats.words} {textStats.words === 1 ? 'word' : 'words'}
          </span>
          <span>{textStats.chars} chars</span>
        </div>
      </div>

      {editor && !hasDialogOpen ? (
        <>
          <TableRowResizeHandles editor={editor} containerRef={shellRef} />
          <TableContextMenu
            editor={editor}
            containerRef={shellRef}
            onTableProperties={handleOpenTableProperties}
          />
        </>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleImageSelected}
      />

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className={styles.hiddenInput}
        onChange={handleVideoSelected}
      />

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className={styles.hiddenInput}
        onChange={handleAudioSelected}
      />

      <VideoDialog
        isOpen={videoDialogOpen}
        onClose={() => setVideoDialogOpen(false)}
        onSave={handleSaveVideoUrl}
        onPickFile={() => videoInputRef.current?.click()}
      />

      <AudioDialog
        isOpen={audioDialogOpen}
        onClose={() => setAudioDialogOpen(false)}
        onSave={handleSaveAudioUrl}
        onPickFile={() => audioInputRef.current?.click()}
      />

      <CodeSampleDialog
        isOpen={codeSampleDialog !== null}
        initialCode={codeSampleDialog?.code ?? ''}
        initialLanguage={codeSampleDialog?.language ?? 'plaintext'}
        onClose={() => setCodeSampleDialog(null)}
        onSave={saveCodeSample}
      />

      <MathLiveDialog
        isOpen={formulaDialog !== null}
        variant={formulaDialog?.variant ?? 'math'}
        initialLatex={formulaDialog?.initialLatex ?? ''}
        onClose={() => setFormulaDialog(null)}
        onInsert={handleInsertMath}
      />

      <LinkDialog
        isOpen={linkDialogOpen}
        initialUrl={linkInitialUrl}
        onClose={handleCloseLinkDialog}
        onSave={handleSaveLink}
      />

      <SourceCodeDialog
        isOpen={sourceCodeOpen}
        html={editor?.getHTML() ?? value}
        onClose={() => setSourceCodeOpen(false)}
        onSave={handleSaveSourceCode}
      />

      <PreviewDialog
        isOpen={previewOpen}
        html={editor?.getHTML() ?? value}
        onClose={() => setPreviewOpen(false)}
      />

      <TablePropertiesDialog
        isOpen={tablePropertiesOpen}
        initialValues={tablePropertiesInitial}
        onClose={() => setTablePropertiesOpen(false)}
        onSave={handleSaveTableProperties}
      />
    </div>
  )

  // `position: fixed` resolves against the nearest transformed ancestor, and
  // RichTextEditorModal's Radix dialog is translated — so escape to the body.
  return isFullscreen ? createPortal(shell, document.body) : shell
}
