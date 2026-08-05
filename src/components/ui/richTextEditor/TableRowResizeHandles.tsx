'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { TableMap } from '@tiptap/pm/tables'

import { applyRowHeight, MIN_TABLE_ROW_HEIGHT } from './styledTableCellExtension'
import styles from './styles/TableRowResizeHandles.module.css'

const HANDLE_THICKNESS = 6

type TableRowResizeHandlesProps = Readonly<{
  editor: Editor
  containerRef: RefObject<HTMLElement | null>
}>

type CellLayout = Readonly<{
  cell: HTMLTableCellElement
  tableElement: HTMLTableElement
  tablePos: number
  rowPos: number
  rowIndex: number
  top: number
  left: number
  width: number
  height: number
}>

type RowResizeState = Readonly<{
  pointerId: number
  startY: number
  startHeight: number
  height: number
  tablePos: number
  rowIndex: number
  rowPos: number
  rowCells: HTMLTableCellElement[]
  previousInlineHeights: string[]
}>

function getSelectedCellLayout(editor: Editor): CellLayout | null {
  if (!editor.isActive('tableCell') && !editor.isActive('tableHeader')) return null

  const { view, state } = editor
  const { $from } = state.selection

  let cellDepth = -1
  let rowDepth = -1
  let tableDepth = -1

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name
    if ((name === 'tableCell' || name === 'tableHeader') && cellDepth < 0) cellDepth = depth
    if (name === 'tableRow' && rowDepth < 0) rowDepth = depth
    if (name === 'table') {
      tableDepth = depth
      break
    }
  }

  if (cellDepth < 0 || rowDepth < 0 || tableDepth < 0) return null

  const tablePos = $from.before(tableDepth)
  const rowPos = $from.before(rowDepth)
  const cellPos = $from.before(cellDepth)
  const tableNode = $from.node(tableDepth)
  const map = TableMap.get(tableNode)
  const cellOffset = cellPos - (tablePos + 1)
  const rect = map.findCell(cellOffset)

  const dom = view.nodeDOM(cellPos)
  if (!(dom instanceof HTMLTableCellElement)) return null
  if (!view.dom.contains(dom)) return null

  const tableElement = dom.closest('table')
  if (!(tableElement instanceof HTMLTableElement)) return null

  const box = dom.getBoundingClientRect()
  return {
    cell: dom,
    tableElement,
    tablePos,
    rowPos,
    rowIndex: rect.top,
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  }
}

function getRowCellElements(
  table: HTMLTableElement,
  rowIndex: number,
): HTMLTableCellElement[] {
  const row = table.rows.item(rowIndex)
  if (!row) return []
  return Array.from(row.cells)
}

export function TableRowResizeHandles({
  editor,
  containerRef,
}: TableRowResizeHandlesProps) {
  const [layout, setLayout] = useState<CellLayout | null>(null)
  const [resizing, setResizing] = useState(false)

  const resizeRef = useRef<RowResizeState | null>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const pendingYRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  const refreshLayout = useCallback(() => {
    if (resizeRef.current) return
    setLayout(getSelectedCellLayout(editor))
  }, [editor])

  useLayoutEffect(() => {
    refreshLayout()
  }, [refreshLayout])

  useEffect(() => {
    const onUpdate = () => refreshLayout()
    editor.on('selectionUpdate', onUpdate)
    editor.on('transaction', onUpdate)

    const scrollRoot = containerRef.current?.querySelector('[data-rte-scroll]')
    scrollRoot?.addEventListener('scroll', onUpdate, { passive: true })
    window.addEventListener('resize', onUpdate)
    window.addEventListener('scroll', onUpdate, true)

    return () => {
      editor.off('selectionUpdate', onUpdate)
      editor.off('transaction', onUpdate)
      scrollRoot?.removeEventListener('scroll', onUpdate)
      window.removeEventListener('resize', onUpdate)
      window.removeEventListener('scroll', onUpdate, true)
    }
  }, [containerRef, editor, refreshLayout])

  const applyHeightsInDom = (cells: ReadonlyArray<HTMLTableCellElement>, height: number) => {
    const heightPx = `${height}px`
    for (const cell of cells) {
      cell.style.height = heightPx
      cell.style.minHeight = heightPx
    }
  }

  const applyResizeAt = (clientY: number) => {
    const resize = resizeRef.current
    if (!resize) return
    const height = Math.max(
      MIN_TABLE_ROW_HEIGHT,
      Math.round(resize.startHeight + clientY - resize.startY),
    )
    applyHeightsInDom(resize.rowCells, height)
    resizeRef.current = { ...resize, height }
    if (handleRef.current) {
      handleRef.current.style.transform = `translate3d(0, ${height - resize.startHeight}px, 0)`
    }
  }

  const finishResize = (commit: boolean, clientY?: number) => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    if (commit && clientY !== undefined) applyResizeAt(clientY)

    const resize = resizeRef.current
    if (!resize) return

    if (commit) {
      applyRowHeight(
        editor,
        resize.tablePos,
        resize.rowIndex,
        resize.rowPos,
        resize.height,
      )
    } else {
      resize.rowCells.forEach((cell, index) => {
        const previous = resize.previousInlineHeights[index] ?? ''
        if (previous) cell.style.height = previous
        else cell.style.removeProperty('height')
        cell.style.removeProperty('min-height')
      })
    }

    resizeRef.current = null
    pendingYRef.current = null
    handleRef.current?.style.removeProperty('transform')
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
    setResizing(false)
    requestAnimationFrame(refreshLayout)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!layout) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    const rowCells = getRowCellElements(layout.tableElement, layout.rowIndex)
    resizeRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: layout.height,
      height: layout.height,
      tablePos: layout.tablePos,
      rowIndex: layout.rowIndex,
      rowPos: layout.rowPos,
      rowCells,
      previousInlineHeights: rowCells.map((cell) => cell.style.height),
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    setResizing(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    pendingYRef.current = event.clientY
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const clientY = pendingYRef.current
      if (clientY !== null) applyResizeAt(clientY)
    })
  }

  if (typeof document === 'undefined' || !layout) return null

  return createPortal(
    <button
      ref={handleRef}
      type="button"
      data-table-row-resize-handle
      aria-label="Resize row"
      className={styles.handle}
      style={{
        top: layout.top + layout.height - HANDLE_THICKNESS / 2,
        left: layout.left,
        width: layout.width,
        height: HANDLE_THICKNESS,
        opacity: resizing ? 1 : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        if (resizeRef.current?.pointerId !== event.pointerId) return
        finishResize(true, event.clientY)
      }}
      onPointerCancel={(event) => {
        if (resizeRef.current?.pointerId !== event.pointerId) return
        finishResize(false)
      }}
    />,
    document.body,
  )
}
