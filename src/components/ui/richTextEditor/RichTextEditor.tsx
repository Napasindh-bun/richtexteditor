'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { TextSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { Mathematics } from '@tiptap/extension-mathematics'
import 'katex/contrib/mhchem'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  FlaskConical,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  PenLine,
  Redo2,
  Sigma,
  Underline as UnderlineIcon,
  Undo2,
  Video as VideoIcon,
} from 'lucide-react'

import { cn } from '@libs'
import { resolveMathVariant } from '@utils/editor/richTextMath'

import {
  ColorPalettePicker,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
} from './ColorPalettePicker'
import { DoubleUnderline } from './doubleUnderlineExtension'
import { LinkDialog } from './LinkDialog'
import { MathLiveDialog, type MathLiveDialogVariant } from './MathLiveDialog'
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

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(styles.toolbarButton, active && styles.toolbarButtonActive)}
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

const NODE_PATH_LABELS: Record<string, string> = {
  doc: 'document',
  paragraph: 'p',
  bulletList: 'ul',
  orderedList: 'ol',
  listItem: 'li',
  table: 'table',
  tableRow: 'tr',
  tableCell: 'td',
  tableHeader: 'th',
  image: 'img',
  video: 'video',
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
  onOpenLink: () => void
  onInsertTable: () => void
  onOpenTableProperties: () => void
  onInsertMath: () => void
  onInsertScience: () => void
  onToggleFullscreen: () => void
  onOpenSourceCode: () => void
}>

function MenuBar({
  editor,
  isFullscreen,
  onInsertImage,
  onInsertVideo,
  onOpenLink,
  onInsertTable,
  onOpenTableProperties,
  onInsertMath,
  onInsertScience,
  onToggleFullscreen,
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
          label: 'Clear formatting',
          onClick: () =>
            editor
              ?.chain()
              .focus()
              .unsetAllMarks()
              .clearNodes()
              .run(),
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
      items: [{ label: 'Source code…', onClick: onOpenSourceCode }],
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

function getActiveFontSizePx(editor: Editor): number {
  const raw = editor.getAttributes('textStyle').fontSize as string | undefined
  if (!raw) return DEFAULT_FONT_SIZE_PX
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : DEFAULT_FONT_SIZE_PX
}

/** Media nodes carry their own `align` attribute instead of the TextAlign mark. */
const MEDIA_NODE_TYPES = ['image', 'video'] as const

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
}: RichTextEditorProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [formulaDialog, setFormulaDialog] = useState<FormulaDialogState | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkInitialUrl, setLinkInitialUrl] = useState('')
  const [tablePropertiesOpen, setTablePropertiesOpen] = useState(false)
  const [tablePropertiesInitial, setTablePropertiesInitial] =
    useState<TablePropertiesValues>(DEFAULT_TABLE_PROPERTIES)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sourceCodeOpen, setSourceCodeOpen] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const linkSelectionRef = useRef<{ from: number; to: number; wasLink: boolean } | null>(null)
  const openFormulaEditorRef = useRef<(state: FormulaDialogState) => void>(() => {})

  useEffect(() => {
    openFormulaEditorRef.current = setFormulaDialog
  })

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: false,
        // StarterKit v3 ships Link + Underline — configure here instead of adding them again.
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      DoubleUnderline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      RichTextImage.configure({ allowBase64: true }),
      RichTextVideo,
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
        dblclick: (view, event) => {
          const target = event.target
          if (!(target instanceof Element)) return false

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
    videoDialogOpen ||
    formulaDialog !== null

  // Ctrl+Shift+F toggles, Esc leaves — matches TinyMCE's fullscreen plugin.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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

  const fontSizeValue = editor ? getActiveFontSizePx(editor) : DEFAULT_FONT_SIZE_PX
  const mediaAlignment = editor ? getMediaAlignment(editor) : null
  const elementPath = editor ? getElementPath(editor) : []
  const textStats = editor ? getTextStats(editor) : { words: 0, chars: 0 }

  const shell = (
    <div
      ref={shellRef}
      className={cn(styles.shell, isFullscreen && styles.shellFullscreen)}
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
          <ToolbarButton
            label="Underline"
            active={editor?.isActive('underline')}
            onClick={() =>
              editor?.chain().focus().unsetMark('doubleUnderline').toggleUnderline().run()
            }
          >
            <UnderlineIcon />
          </ToolbarButton>
          <ToolbarButton
            label="Double underline"
            active={editor?.isActive('doubleUnderline')}
            onClick={() =>
              editor?.chain().focus().unsetUnderline().toggleDoubleUnderline().run()
            }
          >
            <span className={styles.doubleUnderlineIcon} aria-hidden>
              U
            </span>
          </ToolbarButton>
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
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
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

      <div className={styles.editorScroll} data-rte-scroll>
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

      <VideoDialog
        isOpen={videoDialogOpen}
        onClose={() => setVideoDialogOpen(false)}
        onSave={handleSaveVideoUrl}
        onPickFile={() => videoInputRef.current?.click()}
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
