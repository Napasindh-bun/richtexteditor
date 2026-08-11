'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { posToDOMRect } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import 'katex/contrib/mhchem'

import { cn } from '@libs'
import { resolveMathVariant } from '@utils/editor/richTextMath'

import { AudioDialog } from './dialogs/AudioDialog'
import { CodeSampleDialog } from './dialogs/CodeSampleDialog'
import { ImageDialog } from './dialogs/ImageDialog'
import { LinkDialog } from './dialogs/LinkDialog'
import { MathLiveDialog, type MathLiveDialogVariant } from './dialogs/MathLiveDialog'
import { PreviewDialog } from './dialogs/PreviewDialog'
import { SourceCodeDialog } from './dialogs/SourceCodeDialog'
import { TablePropertiesDialog } from './dialogs/TablePropertiesDialog'
import { VideoDialog } from './dialogs/VideoDialog'
import {
  hasPlugin,
  resolveEditorConfig,
  type PluginId,
  type ToolbarGroup,
  type ToolbarItemId,
} from './config'
import { createEditorExtensions } from './extensions/createEditorExtensions'
import {
  applyTableProperties,
  DEFAULT_TABLE_PROPERTIES,
  normalizeTableColumnWidths,
  readTableProperties,
  type TablePropertiesValues,
} from './extensions/styledTableCellExtension'
import { TableContextMenu } from './table/TableContextMenu'
import { TableRowResizeHandles } from './table/TableRowResizeHandles'
import {
  DEFAULT_FONT_SIZE_PX,
  EditorToolbar,
  getActiveFontSizePx,
} from './toolbar/EditorToolbar'
import { ImageQuickToolbar, updateSelectedImageAttributes } from './toolbar/ImageQuickToolbar'
import { QuickToolbar } from './toolbar/QuickToolbar'
import { findMathNodeAtPos } from './utils/findMathNodeAtPos'
import { getElementPath, getTextStats } from './utils/editorStats'
import { getActiveMediaType, getMediaAlignment } from './utils/mediaHelpers'
import { useMediaDialogs } from './utils/useMediaDialogs'
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
  /**
   * TinyMCE-style capability list. Controls which TipTap extensions / dialogs
   * are registered. Omitted = all defaults. Applied on editor mount.
   */
  plugins?: readonly PluginId[]
  /**
   * TinyMCE-style toolbar groups (each inner array is a button group).
   * Items whose required plugin is off are skipped. Omitted = full default toolbar.
   */
  toolbar?: readonly ToolbarGroup[]
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

export function RichTextEditor({
  value,
  onChange,
  height = 420,
  onUploadVideo,
  onUploadAudio,
  plugins: pluginsProp,
  toolbar: toolbarProp,
}: RichTextEditorProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const editorScrollRef = useRef<HTMLDivElement>(null)
  const [formulaDialog, setFormulaDialog] = useState<FormulaDialogState | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkInitialUrl, setLinkInitialUrl] = useState('')
  const [tablePropertiesOpen, setTablePropertiesOpen] = useState(false)
  const [tablePropertiesInitial, setTablePropertiesInitial] =
    useState<TablePropertiesValues>(DEFAULT_TABLE_PROPERTIES)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sourceCodeOpen, setSourceCodeOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [codeSampleDialog, setCodeSampleDialog] = useState<CodeSampleDialogState | null>(null)
  const [formatPainterActive, setFormatPainterActive] = useState(false)
  const linkSelectionRef = useRef<{ from: number; to: number; wasLink: boolean } | null>(null)
  const openFormulaEditorRef = useRef<(state: FormulaDialogState) => void>(() => {})
  const openCodeSampleRef = useRef<(state: CodeSampleDialogState) => void>(() => {})
  const formatPainterRef = useRef<FormatPainterSnapshot | null>(null)
  const applyFormatPainterRef = useRef<() => void>(() => {})

  const editorConfig = useMemo(
    () => resolveEditorConfig({ plugins: pluginsProp, toolbar: toolbarProp }),
    [pluginsProp, toolbarProp],
  )
  const { plugins, toolbar } = editorConfig
  const toolbarItemSet = useMemo(() => {
    const items = new Set<ToolbarItemId>()
    for (const group of toolbar) {
      for (const item of group) items.add(item)
    }
    return items
  }, [toolbar])
  const extensions = useMemo(() => createEditorExtensions(plugins), [plugins])

  useEffect(() => {
    openFormulaEditorRef.current = setFormulaDialog
    openCodeSampleRef.current = setCodeSampleDialog
  })

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions,
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

          if (hasPlugin(plugins, 'codeSample')) {
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
          }

          if (!hasPlugin(plugins, 'math') && !hasPlugin(plugins, 'science')) return false

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

          const variant = resolveMathVariant(latex || found.node.attrs.latex || '')
          if (variant === 'science' && !hasPlugin(plugins, 'science')) return false
          if (variant === 'math' && !hasPlugin(plugins, 'math') && !hasPlugin(plugins, 'science')) {
            return false
          }

          openFormulaEditorRef.current({
            variant,
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

  const {
    imageDialogOpen,
    videoDialogOpen,
    audioDialogOpen,
    setImageDialogOpen,
    setVideoDialogOpen,
    setAudioDialogOpen,
    fileInputRef,
    videoInputRef,
    audioInputRef,
    handleSaveImageUrl,
    handleImageSelected,
    handleSaveVideoUrl,
    handleVideoSelected,
    handleAudioSelected,
  } = useMediaDialogs({ editor, onUploadVideo, onUploadAudio })

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
    imageDialogOpen ||
    videoDialogOpen ||
    audioDialogOpen ||
    codeSampleDialog !== null ||
    formulaDialog !== null

  const shouldShowBubbleMenu = useCallback(
    ({
      editor: currentEditor,
      element,
      from,
      to,
    }: {
      editor: Editor
      element: HTMLElement
      from: number
      to: number
    }) => {
      if (hasDialogOpen) return false
      const { selection } = currentEditor.state
      if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
        // Keep the image toolbar while the node stays selected (including when
        // focus is momentarily in W/H inputs inside this menu).
        return true
      }
      const menuFocused = element.contains(document.activeElement)
      if (!currentEditor.view.hasFocus() && !menuFocused) return false
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
      // TipTap still hides on Floating UI `escaped` even with
      // strategy: 'referenceHidden', which dismisses the image toolbar after
      // flip/rotate when the menu sits above an image near the scroll edge.
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

  const handleSetAlignment = (align: 'left' | 'center' | 'right') => {
    if (!editor) return

    const mediaType = getActiveMediaType(editor)
    if (mediaType === 'image') {
      updateSelectedImageAttributes(editor, { align })
      return
    }

    if (mediaType) {
      const { selection } = editor.state
      if (selection instanceof NodeSelection && selection.node.type.name === mediaType) {
        const pos = selection.from
        editor
          .chain()
          .command(({ tr, dispatch }) => {
            const node = tr.doc.nodeAt(pos)
            if (!node || node.type.name !== mediaType) return false
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, align })
              tr.setSelection(NodeSelection.create(tr.doc, pos))
            }
            return true
          })
          .run()
        if (!editor.view.hasFocus()) editor.view.focus()
        return
      }
      editor.chain().focus().updateAttributes(mediaType, { align }).run()
      return
    }

    editor.chain().focus().setTextAlign(align).run()
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
      <EditorToolbar
        toolbar={toolbar}
        editor={editor}
        isFullscreen={isFullscreen}
        formatPainterActive={formatPainterActive}
        fontSizeValue={fontSizeValue}
        lineHeightValue={lineHeightValue}
        mediaAlignment={mediaAlignment}
        canIndent={canIndent}
        onUndo={() => editor?.chain().focus().undo().run()}
        onRedo={() => editor?.chain().focus().redo().run()}
        onFontSizeChange={handleFontSizeChange}
        onLineHeightChange={handleLineHeightChange}
        onFormatPainter={captureFormatPainter}
        onIndent={handleIndent}
        onSetAlignment={handleSetAlignment}
        onInsertTable={handleInsertTable}
        onInsertImage={() => setImageDialogOpen(true)}
        onInsertVideo={() => setVideoDialogOpen(true)}
        onInsertAudio={() => setAudioDialogOpen(true)}
        onOpenLink={handleOpenLinkDialog}
        onInsertMath={() => setFormulaDialog({ variant: 'math', initialLatex: '' })}
        onInsertScience={() => setFormulaDialog({ variant: 'science', initialLatex: '' })}
        onOpenCodeSample={openCodeSampleDialog}
        onOpenPreview={() => setPreviewOpen(true)}
        onOpenSourceCode={() => setSourceCodeOpen(true)}
        onToggleFullscreen={() => setIsFullscreen((previous) => !previous)}
      />

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
            editor.state.selection.node.type.name === 'image' &&
            hasPlugin(plugins, 'image') ? (
              <ImageQuickToolbar editor={editor} />
            ) : (
              <QuickToolbar
                editor={editor}
                plugins={plugins}
                toolbarItems={toolbarItemSet}
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

      {editor && !hasDialogOpen && hasPlugin(plugins, 'table') ? (
        <>
          <TableRowResizeHandles editor={editor} containerRef={shellRef} />
          <TableContextMenu
            editor={editor}
            containerRef={shellRef}
            onTableProperties={handleOpenTableProperties}
          />
        </>
      ) : null}

      {hasPlugin(plugins, 'image') ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handleImageSelected}
        />
      ) : null}

      {hasPlugin(plugins, 'video') ? (
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className={styles.hiddenInput}
          onChange={handleVideoSelected}
        />
      ) : null}

      {hasPlugin(plugins, 'audio') ? (
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className={styles.hiddenInput}
          onChange={handleAudioSelected}
        />
      ) : null}

      {hasPlugin(plugins, 'image') ? (
        <ImageDialog
          isOpen={imageDialogOpen}
          onClose={() => setImageDialogOpen(false)}
          onSave={handleSaveImageUrl}
          onPickFile={() => fileInputRef.current?.click()}
        />
      ) : null}

      {hasPlugin(plugins, 'video') ? (
        <VideoDialog
          isOpen={videoDialogOpen}
          onClose={() => setVideoDialogOpen(false)}
          onSave={handleSaveVideoUrl}
          onPickFile={() => videoInputRef.current?.click()}
        />
      ) : null}

      {hasPlugin(plugins, 'audio') ? (
        <AudioDialog
          isOpen={audioDialogOpen}
          onClose={() => setAudioDialogOpen(false)}
          onPickFile={() => audioInputRef.current?.click()}
        />
      ) : null}

      {hasPlugin(plugins, 'codeSample') ? (
        <CodeSampleDialog
          isOpen={codeSampleDialog !== null}
          initialCode={codeSampleDialog?.code ?? ''}
          initialLanguage={codeSampleDialog?.language ?? 'plaintext'}
          onClose={() => setCodeSampleDialog(null)}
          onSave={saveCodeSample}
        />
      ) : null}

      {hasPlugin(plugins, 'math') || hasPlugin(plugins, 'science') ? (
        <MathLiveDialog
          isOpen={formulaDialog !== null}
          variant={formulaDialog?.variant ?? 'math'}
          initialLatex={formulaDialog?.initialLatex ?? ''}
          onClose={() => setFormulaDialog(null)}
          onInsert={handleInsertMath}
        />
      ) : null}

      {hasPlugin(plugins, 'link') ? (
        <LinkDialog
          isOpen={linkDialogOpen}
          initialUrl={linkInitialUrl}
          onClose={handleCloseLinkDialog}
          onSave={handleSaveLink}
        />
      ) : null}

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

      {hasPlugin(plugins, 'table') ? (
        <TablePropertiesDialog
          isOpen={tablePropertiesOpen}
          initialValues={tablePropertiesInitial}
          onClose={() => setTablePropertiesOpen(false)}
          onSave={handleSaveTableProperties}
        />
      ) : null}
    </div>
  )

  // `position: fixed` resolves against the nearest transformed ancestor, and
  // RichTextEditorModal's Radix dialog is translated — so escape to the body.
  return isFullscreen ? createPortal(shell, document.body) : shell
}
