'use client'

import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import {
  BetweenHorizonalEnd,
  BetweenHorizonalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  ChevronDown,
  Columns2,
  Combine,
  Heading,
  PanelTop,
  Pipette,
  Rows2,
  Settings2,
  SplitSquareHorizontal,
  Table2,
  Trash2,
} from 'lucide-react'

import { cn } from '@libs'

import { HIGHLIGHT_COLORS } from './ColorPalettePicker'
import { ColorPickerDialog } from './ColorPickerDialog'
import styles from './styles/TableContextMenu.module.css'

const TRIGGER_SIZE = 28
/** One-row presets (+ clear + custom picker fill the row). */
const CELL_BG_PRESETS = HIGHLIGHT_COLORS.slice(0, 6)

type TableContextMenuProps = Readonly<{
  editor: Editor
  /** Editor shell — used to listen for scroll so the fixed menu tracks the cell. */
  containerRef: RefObject<HTMLElement | null>
  onTableProperties: () => void
}>

type CellPosition = Readonly<{
  top: number
  left: number
}>

function getSelectedCellElement(editor: Editor): HTMLElement | null {
  if (!editor.isActive('tableCell') && !editor.isActive('tableHeader')) return null

  const { view, state } = editor
  const { $from } = state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') continue
    const pos = $from.before(depth)
    const dom = view.nodeDOM(pos)
    if (dom instanceof HTMLElement) return dom
  }

  return null
}

/** Viewport (fixed) coords for the cell action trigger — escapes Dialog overflow. */
function resolveCellPosition(editor: Editor): CellPosition | null {
  const cell = getSelectedCellElement(editor)
  if (!cell || !editor.view.dom.contains(cell)) return null

  const rect = cell.getBoundingClientRect()
  return {
    top: rect.top + (rect.height - TRIGGER_SIZE) / 2,
    left: rect.right - TRIGGER_SIZE - 4,
  }
}

function MenuItem({
  label,
  icon,
  danger,
  disabled,
  onSelect,
}: Readonly<{
  label: string
  icon: ReactNode
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}>) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(styles.item, danger && styles.itemDanger)}
      onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        if (disabled) return
        onSelect()
      }}
    >
      <span className={styles.itemIcon} aria-hidden>
        {icon}
      </span>
      <span className={styles.itemLabel}>{label}</span>
    </button>
  )
}

function MenuSeparator() {
  return <hr className={styles.separator} />
}

export function TableContextMenu({
  editor,
  containerRef,
  onTableProperties,
}: TableContextMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  /** Bumps on scroll/resize so fixed trigger position recalculates. */
  const [layoutTick, setLayoutTick] = useState(0)

  useEffect(() => {
    const bumpLayout = (event?: Event) => {
      const target = event?.target
      if (target instanceof Element && target.closest('[data-table-cell-menu]')) return
      setLayoutTick((tick) => tick + 1)
    }

    const scrollRoot = containerRef.current?.querySelector('[data-rte-scroll]')
    scrollRoot?.addEventListener('scroll', bumpLayout, { passive: true })
    window.addEventListener('resize', bumpLayout)
    window.addEventListener('scroll', bumpLayout, true)

    return () => {
      scrollRoot?.removeEventListener('scroll', bumpLayout)
      window.removeEventListener('resize', bumpLayout)
      window.removeEventListener('scroll', bumpLayout, true)
    }
  }, [containerRef])

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        setMenuOpen(false)
        return
      }
      if (target.closest('[data-table-cell-menu]')) return
      setMenuOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const runCommand = useCallback(
    (command: () => boolean) => {
      command()
      setMenuOpen(false)
    },
    [],
  )

  const handleSetBackground = useCallback(
    (color: string | null) => {
      runCommand(() =>
        editor.chain().focus().setCellAttribute('backgroundColor', color).run(),
      )
    },
    [editor, runCommand],
  )

  const handleOpenColorPicker = useCallback(() => {
    setMenuOpen(false)
    setColorPickerOpen(true)
  }, [])

  const handleSaveCustomColor = useCallback(
    (hex: string) => {
      editor.chain().focus().setCellAttribute('backgroundColor', hex).run()
      setColorPickerOpen(false)
    },
    [editor],
  )

  const activeBackground =
    (editor.getAttributes('tableCell').backgroundColor as string | undefined) ||
    (editor.getAttributes('tableHeader').backgroundColor as string | undefined) ||
    ''

  if (typeof document === 'undefined') return null

  const cellPos = resolveCellPosition(editor)
  // layoutTick forces re-read after scroll/resize (parent also re-renders on transactions).
  void layoutTick
  const menuVisible = Boolean(cellPos) && menuOpen

  const spaceBelow =
    cellPos && typeof window !== 'undefined'
      ? window.innerHeight - (cellPos.top + TRIGGER_SIZE) - 8
      : 320
  const spaceAbove =
    cellPos && typeof window !== 'undefined' ? cellPos.top - 8 : 320
  const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
  const menuMaxHeight = Math.max(
    140,
    Math.min(24 * 16, openUp ? spaceAbove - 4 : spaceBelow - 4),
  )

  const canMerge = editor.can().mergeCells()
  const canSplit = editor.can().splitCell()

  return (
    <>
      {cellPos && !colorPickerOpen
        ? createPortal(
            <div
              data-table-cell-menu
              className={styles.root}
              style={{ top: cellPos.top, left: cellPos.left }}
            >
              <button
                type="button"
                className={styles.trigger}
                aria-label="Table cell actions"
                aria-expanded={menuVisible}
                aria-haspopup="menu"
                onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setMenuOpen((open) => !open)
                }}
              >
                <ChevronDown className={styles.triggerIcon} />
              </button>

              {menuVisible ? (
                <div
                  className={cn(styles.menu, openUp && styles.menuOpenUp)}
                  role="menu"
                  style={{ maxHeight: menuMaxHeight }}
                  onWheel={(event) => {
                    event.stopPropagation()
                  }}
                >
                  <div className={styles.sectionLabel}>Background color</div>
                  <div className={styles.colorRow}>
                    <button
                      type="button"
                      className={cn(styles.colorSwatch, styles.colorSwatchClear)}
                      aria-label="Clear background"
                      title="Clear"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleSetBackground(null)
                      }}
                    />
                    {CELL_BG_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          styles.colorSwatch,
                          activeBackground.toLowerCase() === color.toLowerCase() &&
                            styles.colorSwatchActive,
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Background ${color}`}
                        onPointerDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          handleSetBackground(color)
                        }}
                      />
                    ))}
                    <button
                      type="button"
                      className={cn(styles.colorSwatch, styles.colorSwatchPicker)}
                      aria-label="เลือกสีเอง"
                      title="เลือกสีเอง"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleOpenColorPicker()
                      }}
                    >
                      <Pipette className={styles.colorPickerIcon} />
                    </button>
                  </div>

                  <MenuSeparator />

                  {canMerge ? (
                    <MenuItem
                      label="Merge cells"
                      icon={<Combine />}
                      onSelect={() =>
                        runCommand(() => editor.chain().focus().mergeCells().run())
                      }
                    />
                  ) : null}
                  {canSplit ? (
                    <MenuItem
                      label="Split cell"
                      icon={<SplitSquareHorizontal />}
                      onSelect={() =>
                        runCommand(() => editor.chain().focus().splitCell().run())
                      }
                    />
                  ) : null}
                  {canMerge || canSplit ? <MenuSeparator /> : null}

                  <MenuItem
                    label="Insert row above"
                    icon={<BetweenHorizonalStart />}
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().addRowBefore().run())
                    }
                  />
                  <MenuItem
                    label="Insert row below"
                    icon={<BetweenHorizonalEnd />}
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().addRowAfter().run())
                    }
                  />
                  <MenuItem
                    label="Insert column left"
                    icon={<BetweenVerticalStart />}
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().addColumnBefore().run())
                    }
                  />
                  <MenuItem
                    label="Insert column right"
                    icon={<BetweenVerticalEnd />}
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().addColumnAfter().run())
                    }
                  />

                  <MenuSeparator />

                  <MenuItem
                    label="Delete column"
                    icon={<Columns2 />}
                    danger
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().deleteColumn().run())
                    }
                  />
                  <MenuItem
                    label="Delete row"
                    icon={<Rows2 />}
                    danger
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().deleteRow().run())
                    }
                  />
                  <MenuItem
                    label="Delete table"
                    icon={<Trash2 />}
                    danger
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().deleteTable().run())
                    }
                  />

                  <MenuSeparator />

                  <MenuItem
                    label="Toggle row header"
                    icon={<PanelTop />}
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().toggleHeaderRow().run())
                    }
                  />
                  <MenuItem
                    label="Toggle column header"
                    icon={<Heading />}
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().toggleHeaderColumn().run())
                    }
                  />
                  <MenuItem
                    label="Toggle cell header"
                    icon={<Table2 />}
                    onSelect={() =>
                      runCommand(() => editor.chain().focus().toggleHeaderCell().run())
                    }
                  />

                  <MenuSeparator />

                  <MenuItem
                    label="Table Properties…"
                    icon={<Settings2 />}
                    onSelect={() => {
                      setMenuOpen(false)
                      onTableProperties()
                    }}
                  />
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      <ColorPickerDialog
        isOpen={colorPickerOpen}
        initialColor={activeBackground || CELL_BG_PRESETS[0] || '#ffff00'}
        onClose={() => setColorPickerOpen(false)}
        onSave={handleSaveCustomColor}
      />
    </>
  )
}
