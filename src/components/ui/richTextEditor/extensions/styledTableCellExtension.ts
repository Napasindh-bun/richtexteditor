import {
  createColGroup,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableView,
} from '@tiptap/extension-table'
import { mergeAttributes, type Editor } from '@tiptap/core'
import type { DOMOutputSpec, Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { columnResizingPluginKey, TableMap } from '@tiptap/pm/tables'
import type { EditorView } from '@tiptap/pm/view'

import {
  DEFAULT_TABLE_PROPERTIES,
  type TableAlignment,
  type TablePropertiesValues,
} from './tableProperties'

export {
  DEFAULT_TABLE_PROPERTIES,
  TABLE_BORDER_STYLES,
  type TableAlignment,
  type TablePropertiesValues,
} from './tableProperties'

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseDataOrStyle(
  element: HTMLElement,
  dataKey: string,
  styleKey: keyof CSSStyleDeclaration,
): string | null {
  const fromData = element.getAttribute(dataKey)?.trim()
  if (fromData) return fromData
  const fromStyle = String(element.style[styleKey] ?? '').trim()
  return fromStyle || null
}

function withUnit(value: string, fallbackUnit = 'px'): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}${fallbackUnit}`
  return trimmed
}

/** `none` / `hidden` must not fall back to the legacy `border="1"` presentational attr. */
function isBorderless(borderStyle: unknown): boolean {
  return borderStyle === 'none' || borderStyle === 'hidden'
}

const tableStyleAttributes = {
  width: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('width')?.trim() || element.style.width?.trim() || null,
    renderHTML: (attributes: { width?: string | null }) => {
      if (!attributes.width) return {}
      return {
        width: attributes.width,
        style: `width: ${withUnit(attributes.width)}`,
      }
    },
  },
  height: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('height')?.trim() || element.style.height?.trim() || null,
    renderHTML: (attributes: { height?: string | null }) => {
      if (!attributes.height) return {}
      return {
        height: attributes.height,
        style: `height: ${withUnit(attributes.height)}`,
      }
    },
  },
  cellSpacing: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('cellspacing')?.trim() ||
      parseDataOrStyle(element, 'data-cell-spacing', 'borderSpacing'),
    renderHTML: (attributes: { cellSpacing?: string | null }) => {
      if (!attributes.cellSpacing) return {}
      const value = withUnit(attributes.cellSpacing)
      return {
        cellspacing: attributes.cellSpacing,
        'data-cell-spacing': attributes.cellSpacing,
        style: `border-spacing: ${value}; border-collapse: separate`,
      }
    },
  },
  cellPadding: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('cellpadding')?.trim() ||
      element.getAttribute('data-cell-padding')?.trim() ||
      null,
    renderHTML: (attributes: { cellPadding?: string | null }) => {
      if (!attributes.cellPadding) return {}
      return {
        cellpadding: attributes.cellPadding,
        'data-cell-padding': attributes.cellPadding,
        style: `--rte-cell-padding: ${withUnit(attributes.cellPadding)}`,
      }
    },
  },
  borderWidth: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('border')?.trim() ||
      parseDataOrStyle(element, 'data-border-width', 'borderWidth'),
    renderHTML: (attributes: { borderWidth?: string | null; borderStyle?: string | null }) => {
      if (!attributes.borderWidth) return {}
      return {
        // Legacy `border` attr would draw 1px lines even when the style is none.
        ...(isBorderless(attributes.borderStyle) ? {} : { border: attributes.borderWidth }),
        'data-border-width': attributes.borderWidth,
        style: `--rte-border-width: ${withUnit(attributes.borderWidth)}`,
      }
    },
  },
  showCaption: {
    default: false,
    parseHTML: (element: HTMLElement) => element.getAttribute('data-show-caption') === 'true',
    renderHTML: (attributes: { showCaption?: boolean }) => {
      if (!attributes.showCaption) return {}
      return { 'data-show-caption': 'true' }
    },
  },
  alignment: {
    default: 'none' as TableAlignment,
    parseHTML: (element: HTMLElement): TableAlignment => {
      const raw = (element.getAttribute('data-align') || element.getAttribute('align') || '')
        .trim()
        .toLowerCase()
      if (raw === 'left' || raw === 'center' || raw === 'right') return raw
      if (element.style.marginLeft === 'auto' && element.style.marginRight === 'auto') return 'center'
      if (element.style.float === 'left') return 'left'
      if (element.style.float === 'right') return 'right'
      return 'none'
    },
    renderHTML: (attributes: { alignment?: TableAlignment }) => {
      const alignment = attributes.alignment ?? 'none'
      if (alignment === 'none') return {}
      if (alignment === 'center') {
        return {
          'data-align': 'center',
          style: 'margin-left: auto; margin-right: auto; float: none',
        }
      }
      return {
        'data-align': alignment,
        align: alignment,
        style: `float: ${alignment}`,
      }
    },
  },
  borderStyle: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      parseDataOrStyle(element, 'data-border-style', 'borderStyle'),
    renderHTML: (attributes: { borderStyle?: string | null }) => {
      if (!attributes.borderStyle) return {}
      return {
        'data-border-style': attributes.borderStyle,
        style: `--rte-border-style: ${attributes.borderStyle}`,
      }
    },
  },
  borderColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      parseDataOrStyle(element, 'data-border-color', 'borderColor'),
    renderHTML: (attributes: { borderColor?: string | null }) => {
      if (!attributes.borderColor) return {}
      return {
        'data-border-color': attributes.borderColor,
        // CSS variable for editor stylesheet; also expose as border-color for previews.
        style: `--rte-border-color: ${attributes.borderColor}; border-color: ${attributes.borderColor}`,
      }
    },
  },
  backgroundColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      parseDataOrStyle(element, 'data-background-color', 'backgroundColor') ||
      element.getAttribute('bgcolor')?.trim() ||
      null,
    renderHTML: (attributes: { backgroundColor?: string | null }) => {
      if (!attributes.backgroundColor) return {}
      return {
        'data-background-color': attributes.backgroundColor,
        bgcolor: attributes.backgroundColor,
        style: `background-color: ${attributes.backgroundColor}`,
      }
    },
  },
}

const cellStyleAttributes = {
  backgroundColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      parseDataOrStyle(element, 'data-background-color', 'backgroundColor') ||
      element.getAttribute('bgcolor')?.trim() ||
      null,
    renderHTML: (attributes: { backgroundColor?: string | null }) => {
      if (!attributes.backgroundColor) return {}
      return {
        'data-background-color': attributes.backgroundColor,
        // Presentational attr — more reliable than CSS alone inside SVG foreignObject.
        bgcolor: attributes.backgroundColor,
        style: `background-color: ${attributes.backgroundColor}`,
      }
    },
  },
  borderColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      parseDataOrStyle(element, 'data-border-color', 'borderColor'),
    renderHTML: (attributes: { borderColor?: string | null }) => {
      if (!attributes.borderColor) return {}
      return {
        'data-border-color': attributes.borderColor,
        style: `border-color: ${attributes.borderColor}`,
      }
    },
  },
  borderWidth: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      parseDataOrStyle(element, 'data-border-width', 'borderWidth'),
    renderHTML: (attributes: { borderWidth?: string | null }) => {
      if (!attributes.borderWidth) return {}
      return {
        'data-border-width': attributes.borderWidth,
        style: `border-width: ${withUnit(attributes.borderWidth)}`,
      }
    },
  },
  borderStyle: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      parseDataOrStyle(element, 'data-border-style', 'borderStyle'),
    renderHTML: (attributes: { borderStyle?: string | null }) => {
      if (!attributes.borderStyle) return {}
      return {
        'data-border-style': attributes.borderStyle,
        style: `border-style: ${attributes.borderStyle}`,
      }
    },
  },
  cellPadding: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('data-cell-padding')?.trim() || element.style.padding?.trim() || null,
    renderHTML: (attributes: { cellPadding?: string | null }) => {
      if (!attributes.cellPadding) return {}
      return {
        'data-cell-padding': attributes.cellPadding,
        style: `padding: ${withUnit(attributes.cellPadding)}`,
      }
    },
  },
  colWidth: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('data-col-width')?.trim() ||
      element.getAttribute('width')?.trim() ||
      element.style.width?.trim() ||
      null,
    renderHTML: (attributes: { colWidth?: string | null }) => {
      if (!attributes.colWidth) return {}
      const width = withUnit(attributes.colWidth)
      return {
        'data-col-width': attributes.colWidth,
        width: attributes.colWidth,
        style: `width: ${width}; min-width: ${width}`,
      }
    },
  },
  rowHeight: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('data-row-height')?.trim() || element.style.height?.trim() || null,
    renderHTML: (attributes: { rowHeight?: string | null }) => {
      if (!attributes.rowHeight) return {}
      const height = withUnit(attributes.rowHeight)
      return {
        'data-row-height': attributes.rowHeight,
        style: `height: ${height}; min-height: ${height}`,
      }
    },
  },
}

function setStyleProperty(table: HTMLTableElement, name: string, value: string | null) {
  if (value) table.style.setProperty(name, value)
  else table.style.removeProperty(name)
}

function setDataAttribute(table: HTMLTableElement, name: string, value: string | null) {
  if (value) table.setAttribute(name, value)
  else table.removeAttribute(name)
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * With `resizable: true`, TipTap's Table bows out of `addNodeView()` and
 * prosemirror-tables' `columnResizing` plugin registers `TableView` itself —
 * without passing TipTap's rendered HTMLAttributes. That is why none of the
 * table attributes (border, fill, alignment…) ever showed up inside the editor:
 * they only existed in `getHTML()` output. Write them onto the live `<table>`.
 */
function applyTableAttrsToDom(table: HTMLTableElement, node: ProseMirrorNode) {
  const attrs = node.attrs as Record<string, unknown>
  const borderStyle = asTrimmedString(attrs.borderStyle)
  const borderWidth = asTrimmedString(attrs.borderWidth)
  const borderColor = asTrimmedString(attrs.borderColor)
  const cellPadding = asTrimmedString(attrs.cellPadding)
  const cellSpacing = asTrimmedString(attrs.cellSpacing)
  const backgroundColor = asTrimmedString(attrs.backgroundColor)
  const alignment = asTrimmedString(attrs.alignment)
  const width = asTrimmedString(attrs.width)
  const height = asTrimmedString(attrs.height)

  // Custom properties the stylesheet reads to draw td/th borders and padding.
  setStyleProperty(table, '--rte-border-width', borderWidth ? withUnit(borderWidth) : null)
  setStyleProperty(table, '--rte-border-style', borderStyle)
  setStyleProperty(table, '--rte-border-color', borderColor)
  setStyleProperty(table, '--rte-cell-padding', cellPadding ? withUnit(cellPadding) : null)

  setStyleProperty(table, 'background-color', backgroundColor)
  setStyleProperty(table, 'border-spacing', cellSpacing ? withUnit(cellSpacing) : null)
  setStyleProperty(table, 'border-collapse', cellSpacing ? 'separate' : null)
  setStyleProperty(table, 'height', height ? withUnit(height) : null)
  // `updateColumns` owns width/min-width — only override when the author set one.
  if (width) {
    table.style.setProperty('width', withUnit(width))
    table.style.removeProperty('min-width')
  }

  setDataAttribute(table, 'data-border-style', borderStyle)
  setDataAttribute(table, 'data-border-width', borderWidth)
  setDataAttribute(table, 'data-border-color', borderColor)
  setDataAttribute(table, 'data-background-color', backgroundColor)
  setDataAttribute(table, 'data-cell-padding', cellPadding)
  setDataAttribute(table, 'data-align', alignment && alignment !== 'none' ? alignment : null)
  setDataAttribute(table, 'data-show-caption', attrs.showCaption ? 'true' : null)
}

/** TableView that keeps the live `<table>` in sync with the node attributes. */
export class StyledTableView extends TableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number, view?: EditorView) {
    super(node, cellMinWidth, view)
    applyTableAttrsToDom(this.table, node)
  }

  override update(node: ProseMirrorNode): boolean {
    const updated = super.update(node)
    // After super so our width wins over `updateColumns`.
    if (updated) applyTableAttrsToDom(this.table, node)
    return updated
  }
}

const CELL_TYPES = new Set(['tableCell', 'tableHeader'])
const borderSyncPluginKey = new PluginKey('styledTableBorderSync')

/**
 * Cells created after Table Properties was applied (add row/column, split,
 * paste) carry no border attributes and fall back to the stylesheet default,
 * leaving one table with mixed borders. Re-stamp them from their table.
 */
function syncCellBordersPlugin() {
  return new Plugin({
    key: borderSyncPluginKey,
    appendTransaction: (transactions, _oldState, newState) => {
      if (!transactions.some((transaction) => transaction.docChanged)) return null

      let tr = newState.tr
      let changed = false

      newState.doc.descendants((node, pos) => {
        // Only block content can hold a table — never walk into text/marks.
        if (node.type.name !== 'table') return node.isBlock

        const border = {
          borderColor: node.attrs.borderColor ?? null,
          borderWidth: node.attrs.borderWidth ?? null,
          borderStyle: node.attrs.borderStyle ?? null,
        }
        if (!border.borderColor && !border.borderWidth && !border.borderStyle) return false

        node.descendants((child, offset) => {
          if (child.type.name === 'tableRow') return true
          if (!CELL_TYPES.has(child.type.name)) return false
          if (
            child.attrs.borderColor === border.borderColor &&
            child.attrs.borderWidth === border.borderWidth &&
            child.attrs.borderStyle === border.borderStyle
          ) {
            return false
          }

          tr = tr.setNodeMarkup(pos + 1 + offset, undefined, { ...child.attrs, ...border })
          changed = true
          return false
        })

        return false
      })

      return changed ? tr : null
    },
  })
}

/** Table node with TinyMCE-style layout / border / fill attributes. */
export const StyledTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableStyleAttributes,
    }
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), syncCellBordersPlugin()]
  },

  /**
   * Same output as TipTap's, minus one bug: upstream returns the table's own
   * `style` *instead of* the computed `width` / `min-width` whenever any
   * attribute contributes a style — which is every table that has been through
   * Table Properties. The export then carried no table width at all and the
   * preview fell back to the stylesheet, so the same document showed a
   * different table than the editor did. Merge both instead, layout first so an
   * author-set width still wins.
   */
  renderHTML({ node, HTMLAttributes }) {
    const { colgroup, tableWidth, tableMinWidth } = createColGroup(
      node,
      this.options.cellMinWidth,
    )
    const layoutStyle = tableWidth
      ? `width: ${tableWidth}`
      : tableMinWidth
        ? `min-width: ${tableMinWidth}`
        : ''

    const table = [
      'table',
      mergeAttributes(
        layoutStyle ? { style: layoutStyle } : {},
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      ...(colgroup ? [colgroup] : []),
      ['tbody', 0],
    ] as DOMOutputSpec

    return this.options.renderWrapper
      ? (['div', { class: 'tableWrapper' }, table] as DOMOutputSpec)
      : table
  },
})

/** Table row — stores rowHeight when the row is resized. */
export const StyledTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-row-height')?.trim() ||
          element.style.height?.trim() ||
          null,
        renderHTML: (attributes: { rowHeight?: string | null }) => {
          if (!attributes.rowHeight) return {}
          const height = withUnit(attributes.rowHeight)
          return {
            'data-row-height': attributes.rowHeight,
            style: `height: ${height}; min-height: ${height}`,
          }
        },
      },
    }
  },
})

/**
 * TipTap's native `colwidth` has parseHTML but no renderHTML, and only reads the
 * `<col width>` attribute — while TableView writes `style="width:…"`. Override so
 * resized widths survive getHTML → setContent round-trips.
 */
function parsePositivePx(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed)
}

const colwidthAttribute = {
  default: null as number[] | null,
  parseHTML: (element: HTMLElement): number[] | null => {
    const raw =
      element.getAttribute('colwidth')?.trim() ||
      element.getAttribute('data-colwidth')?.trim()
    if (raw) {
      const widths = raw.split(',').map((part) => Number.parseInt(part.trim(), 10))
      if (widths.length > 0 && widths.every((n) => Number.isFinite(n) && n > 0)) {
        return widths
      }
    }

    const fromCustom =
      parsePositivePx(element.getAttribute('data-col-width')) ??
      parsePositivePx(element.style.width) ??
      parsePositivePx(element.getAttribute('width'))
    if (fromCustom != null) return [fromCustom]

    const row = element.parentElement
    const table = element.closest('table')
    if (!row || !table) return null
    const cellIndex = Array.from(row.children).indexOf(element)
    const col = table.querySelectorAll('colgroup > col').item(cellIndex)
    if (!(col instanceof HTMLTableColElement)) return null
    const fromCol =
      parsePositivePx(col.getAttribute('width')) ?? parsePositivePx(col.style.width)
    return fromCol != null ? [fromCol] : null
  },
  renderHTML: (attributes: { colwidth?: number[] | null }) => {
    if (!attributes.colwidth?.length) return {}
    const value = attributes.colwidth.join(',')
    return {
      colwidth: value,
      'data-colwidth': value,
    }
  },
}

/** TableCell with border + fill attributes (applied from Table Properties). */
export const StyledTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: colwidthAttribute,
      ...cellStyleAttributes,
    }
  },
})

/** TableHeader with the same style attributes as StyledTableCell. */
export const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: colwidthAttribute,
      ...cellStyleAttributes,
    }
  },
})

export const MIN_TABLE_ROW_HEIGHT = 36

/** Table DOM for a table node — TableView wraps it in `.tableWrapper`. */
function findTableElement(dom: globalThis.Node | null): HTMLTableElement | null {
  if (dom instanceof HTMLTableElement) return dom
  if (dom instanceof HTMLElement) return dom.querySelector('table')
  return null
}

/**
 * Read the widths the browser actually laid the columns out at, expanding
 * colspans so the result is one entry per grid column.
 */
function readRenderedColumnWidths(table: HTMLTableElement): number[] | null {
  const firstRow = table.rows.item(0)
  if (!firstRow) return null

  const widths: number[] = []
  for (const cell of Array.from(firstRow.cells)) {
    const span = Math.max(1, cell.colSpan)
    const total = cell.getBoundingClientRect().width
    if (total <= 0) return null
    const each = Math.max(1, Math.round(total / span))
    for (let index = 0; index < span; index += 1) widths.push(each)
  }

  return widths.length > 0 ? widths : null
}

function sameWidths(current: unknown, next: number[]): boolean {
  return (
    Array.isArray(current) &&
    current.length === next.length &&
    current.every((value, index) => value === next[index])
  )
}

/**
 * TipTap only stores `colwidth` for columns the author has dragged; the rest
 * stay `null` and absorb whatever space is left at the editor's width. Previews
 * render at a different width, so those columns would land on different
 * proportions. Stamping the rendered widths onto every cell turns the table into
 * a pure set of ratios that any surface can scale to its own width.
 *
 * The written widths equal what is already on screen, so the editor itself does
 * not move. Safe to call repeatedly — it dispatches only when a column is still
 * missing a width.
 */
export function normalizeTableColumnWidths(editor: Editor): boolean {
  if (editor.isDestroyed) return false
  // Never fight the column-resize drag; it owns the widths until pointer-up.
  if (columnResizingPluginKey.getState(editor.state)?.dragging) return false

  const { state, view } = editor
  let tr = state.tr
  let changed = false

  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return true

    const map = TableMap.get(node)
    const tableStart = pos + 1
    const needsWidths = (() => {
      for (const offset of new Set(map.map)) {
        const cell = node.nodeAt(offset)
        const colwidth = cell?.attrs.colwidth as number[] | null | undefined
        if (!colwidth?.length || colwidth.some((width) => !width)) return true
      }
      return false
    })()
    if (!needsWidths) return false

    const table = findTableElement(view.nodeDOM(pos) ?? null)
    if (!table) return false

    const widths = readRenderedColumnWidths(table)
    if (!widths || widths.length !== map.width) return false

    for (const offset of new Set(map.map)) {
      const cellNode = state.doc.nodeAt(tableStart + offset)
      if (!cellNode) continue

      const rect = map.findCell(offset)
      const next = widths.slice(rect.left, rect.right)
      if (next.length === 0 || sameWidths(cellNode.attrs.colwidth, next)) continue

      tr = tr.setNodeMarkup(tableStart + offset, undefined, {
        ...cellNode.attrs,
        colwidth: next,
      })
      changed = true
    }

    return false
  })

  if (!changed) return false

  // Layout bookkeeping, not an edit — keep it out of the undo stack.
  view.dispatch(tr.setMeta('addToHistory', false))
  return true
}

/** Persist row height on every cell in the row (+ the `<tr>` node). */
export function applyRowHeight(
  editor: Editor,
  tablePos: number,
  rowIndex: number,
  rowPos: number,
  heightPx: number,
): boolean {
  const tableNode = editor.state.doc.nodeAt(tablePos)
  if (!tableNode || tableNode.type.name !== 'table') return false

  const map = TableMap.get(tableNode)
  const tableStart = tablePos + 1
  const rowHeight = `${Math.max(MIN_TABLE_ROW_HEIGHT, Math.round(heightPx))}px`
  let tr = editor.state.tr

  for (let col = 0; col < map.width; col += 1) {
    const mapIndex = rowIndex * map.width + col
    const offset = map.map[mapIndex]
    if (offset == null) continue

    const rect = map.findCell(offset)
    if (rect.top !== rowIndex) continue

    const cellPos = tableStart + offset
    const cellNode = editor.state.doc.nodeAt(cellPos)
    if (!cellNode) continue

    tr = tr.setNodeMarkup(cellPos, undefined, {
      ...cellNode.attrs,
      rowHeight,
    })
  }

  const rowNode = editor.state.doc.nodeAt(rowPos)
  if (rowNode?.type.name === 'tableRow') {
    tr = tr.setNodeMarkup(rowPos, undefined, {
      ...rowNode.attrs,
      rowHeight,
    })
  }

  editor.view.dispatch(tr)
  return true
}

export function readTableProperties(editor: Editor): TablePropertiesValues {
  const attrs = editor.getAttributes('table') as Record<string, unknown>
  const alignment = attrs.alignment
  return {
    width: typeof attrs.width === 'string' ? attrs.width : DEFAULT_TABLE_PROPERTIES.width,
    height: typeof attrs.height === 'string' ? attrs.height : '',
    cellSpacing: typeof attrs.cellSpacing === 'string' ? attrs.cellSpacing : '',
    cellPadding: typeof attrs.cellPadding === 'string' ? attrs.cellPadding : '',
    borderWidth:
      typeof attrs.borderWidth === 'string'
        ? attrs.borderWidth
        : DEFAULT_TABLE_PROPERTIES.borderWidth,
    showCaption: Boolean(attrs.showCaption),
    alignment:
      alignment === 'left' || alignment === 'center' || alignment === 'right' ? alignment : 'none',
    borderStyle:
      typeof attrs.borderStyle === 'string'
        ? attrs.borderStyle
        : DEFAULT_TABLE_PROPERTIES.borderStyle,
    borderColor: typeof attrs.borderColor === 'string' ? attrs.borderColor : '',
    backgroundColor: typeof attrs.backgroundColor === 'string' ? attrs.backgroundColor : '',
  }
}

export function applyTableProperties(editor: Editor, values: TablePropertiesValues): boolean {
  if (!editor.isActive('table')) return false

  const tableAttrs = {
    width: emptyToNull(values.width),
    height: emptyToNull(values.height),
    cellSpacing: emptyToNull(values.cellSpacing),
    cellPadding: emptyToNull(values.cellPadding),
    borderWidth: emptyToNull(values.borderWidth),
    showCaption: values.showCaption,
    alignment: values.alignment,
    borderStyle: emptyToNull(values.borderStyle),
    borderColor: emptyToNull(values.borderColor),
    backgroundColor: emptyToNull(values.backgroundColor),
  }

  // Only sync border attrs onto cells. Per-cell background/padding from the
  // context menu must stay intact when Table Properties updates the border.
  const cellBorderAttrs = {
    borderColor: tableAttrs.borderColor,
    borderWidth: tableAttrs.borderWidth,
    borderStyle: tableAttrs.borderStyle,
  }

  const { state } = editor
  const { $from } = state.selection
  let tablePos = -1
  let tableNode: ProseMirrorNode | null = null

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === 'table') {
      tableNode = node
      tablePos = $from.before(depth)
      break
    }
  }

  if (!tableNode || tablePos < 0) return false

  let tr = state.tr.setNodeMarkup(tablePos, undefined, {
    ...tableNode.attrs,
    ...tableAttrs,
  })

  tableNode.descendants((node, pos) => {
    if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') return
    const absolutePos = tablePos + 1 + pos
    tr = tr.setNodeMarkup(absolutePos, undefined, {
      ...node.attrs,
      ...cellBorderAttrs,
    })
  })

  editor.view.dispatch(tr)
  editor.commands.focus()
  return true
}
