'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
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
  FlaskConical,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  PenLine,
  Redo2,
  Sigma,
  Underline as UnderlineIcon,
  Undo2,
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
import {
  applyTableProperties,
  DEFAULT_TABLE_PROPERTIES,
  normalizeTableColumnWidths,
  readTableProperties,
  StyledTable,
  StyledTableCell,
  StyledTableHeader,
  StyledTableRow,
  type TablePropertiesValues,
} from './styledTableCellExtension'
import { TableContextMenu } from './TableContextMenu'
import { TablePropertiesDialog } from './TablePropertiesDialog'
import { TableRowResizeHandles } from './TableRowResizeHandles'
import { TableSizePicker } from './TableSizePicker'
import styles from './styles/RichTextEditor.module.css'

type RichTextEditorProps = Readonly<{
  value: string
  onChange: (html: string) => void
  height?: number
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

function getImageAlignment(editor: Editor): 'left' | 'center' | 'right' | null {
  if (!editor.isActive('image')) return null

  const align = editor.getAttributes('image').align
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

export function RichTextEditor({ value, onChange, height = 420 }: RichTextEditorProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formulaDialog, setFormulaDialog] = useState<FormulaDialogState | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkInitialUrl, setLinkInitialUrl] = useState('')
  const [tablePropertiesOpen, setTablePropertiesOpen] = useState(false)
  const [tablePropertiesInitial, setTablePropertiesInitial] =
    useState<TablePropertiesValues>(DEFAULT_TABLE_PROPERTIES)
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
      // TipTap built-in column resize (prosemirror-tables columnResizing).
      StyledTable.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 48,
        lastColumnResizable: true,
        renderWrapper: true,
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
        class: styles.editorContent,
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

  const handleInsertImage = () => {
    fileInputRef.current?.click()
  }

  const handleSetAlignment = (align: 'left' | 'center' | 'right') => {
    if (!editor) return

    const chain = editor.chain().focus()
    if (editor.isActive('image')) {
      chain.updateAttributes('image', { align }).run()
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
  const imageAlignment = editor ? getImageAlignment(editor) : null

  return (
    <div ref={shellRef} className={styles.shell} style={{ height }}>
      <div className={styles.toolbar} role="toolbar" aria-label="จัดรูปแบบข้อความ">
        <ToolbarButton
          label="เลิกทำ"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label="ทำซ้ำ"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolbarButton>

        <ToolbarDivider />

        <select
          className={styles.blockSelect}
          aria-label="ขนาดตัวอักษร"
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

        <ToolbarDivider />

        <ToolbarButton
          label="ตัวหนา"
          active={editor?.isActive('bold')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="ตัวเอียง"
          active={editor?.isActive('italic')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label="ขีดเส้นใต้"
          active={editor?.isActive('underline')}
          onClick={() =>
            editor?.chain().focus().unsetMark('doubleUnderline').toggleUnderline().run()
          }
        >
          <UnderlineIcon />
        </ToolbarButton>
        <ToolbarButton
          label="ขีดเส้นใต้คู่"
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
          label="สีตัวอักษร"
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
          label="ไฮไลต์"
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

        <ToolbarDivider />

        <ToolbarButton
          label="รายการแบบจุด"
          active={editor?.isActive('bulletList')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="รายการแบบตัวเลข"
          active={editor?.isActive('orderedList')}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="จัดชิดซ้าย"
          active={imageAlignment ? imageAlignment === 'left' : editor?.isActive({ textAlign: 'left' })}
          onClick={() => handleSetAlignment('left')}
        >
          <AlignLeft />
        </ToolbarButton>
        <ToolbarButton
          label="จัดกึ่งกลาง"
          active={imageAlignment ? imageAlignment === 'center' : editor?.isActive({ textAlign: 'center' })}
          onClick={() => handleSetAlignment('center')}
        >
          <AlignCenter />
        </ToolbarButton>
        <ToolbarButton
          label="จัดชิดขวา"
          active={imageAlignment ? imageAlignment === 'right' : editor?.isActive({ textAlign: 'right' })}
          onClick={() => handleSetAlignment('right')}
        >
          <AlignRight />
        </ToolbarButton>

        <ToolbarDivider />

        <TableSizePicker disabled={!editor} onSelect={handleInsertTable} />
        <ToolbarButton label="รูปภาพ" onClick={handleInsertImage}>
          <ImageIcon />
        </ToolbarButton>
        <ToolbarButton
          label="ลิงก์"
          active={editor?.isActive('link')}
          onClick={handleOpenLinkDialog}
        >
          <Link2 />
        </ToolbarButton>
        <ToolbarButton
          label="สูตรคณิตศาสตร์"
          onClick={() => setFormulaDialog({ variant: 'math', initialLatex: '' })}
        >
          <Sigma />
        </ToolbarButton>
        <ToolbarButton
          label="สูตรวิทยาศาสตร์"
          onClick={() => setFormulaDialog({ variant: 'science', initialLatex: '' })}
        >
          <FlaskConical />
        </ToolbarButton>
      </div>

      <div className={styles.editorScroll} data-rte-scroll>
        <EditorContent editor={editor} />
      </div>

      {editor &&
      !tablePropertiesOpen &&
      !linkDialogOpen &&
      formulaDialog === null ? (
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

      <TablePropertiesDialog
        isOpen={tablePropertiesOpen}
        initialValues={tablePropertiesInitial}
        onClose={() => setTablePropertiesOpen(false)}
        onSave={handleSaveTableProperties}
      />
    </div>
  )
}
