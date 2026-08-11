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
import { TextSelection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import type { Editor } from '@tiptap/react'
import {
  BetweenHorizonalEnd,
  BetweenHorizonalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
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

/** One-row presets (+ clear + custom picker fill the row). */
const CELL_BG_PRESETS = HIGHLIGHT_COLORS.slice(0, 6)

type TableContextMenuProps = Readonly<{
  editor: Editor
  /** Editor shell — used to listen for scroll so the fixed menu tracks the cell. */
  containerRef: RefObject<HTMLElement | null>
  onTableProperties: () => void
}>

type MenuPosition = Readonly<{
  top: number
  left: number
}>

/** Viewport (fixed) coords for the cell action trigger — escapes Dialog overflow. */
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
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const cell = target.closest('td, th')
      if (!(cell instanceof HTMLTableCellElement) || !editor.view.dom.contains(cell)) return

      event.preventDefault()
      event.stopPropagation()

      const selection = editor.state.selection
      const keepCellSelection =
        selection instanceof CellSelection && cell.classList.contains('selectedCell')

      if (!keepCellSelection) {
        const position = editor.view.posAtDOM(cell, 0)
        const resolved = editor.state.doc.resolve(
          Math.max(0, Math.min(position, editor.state.doc.content.size)),
        )
        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(resolved, 1)))
      }
      editor.view.focus()

      const menuWidth = 240
      const viewportPadding = 8
      setMenuPosition({
        top: event.clientY,
        left: Math.min(
          event.clientX,
          Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding),
        ),
      })
      setMenuOpen(true)
    }

    const scrollRoot = containerRef.current?.querySelector('[data-rte-scroll]')
    const closeMenu = () => setMenuOpen(false)
    editor.view.dom.addEventListener('contextmenu', handleContextMenu)
    scrollRoot?.addEventListener('scroll', closeMenu, { passive: true })
    window.addEventListener('resize', closeMenu)

    return () => {
      editor.view.dom.removeEventListener('contextmenu', handleContextMenu)
      scrollRoot?.removeEventListener('scroll', closeMenu)
      window.removeEventListener('resize', closeMenu)
    }
  }, [containerRef, editor])

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

  const menuVisible = Boolean(menuPosition) && menuOpen

  const spaceBelow =
    menuPosition && typeof window !== 'undefined'
      ? window.innerHeight - menuPosition.top - 8
      : 320
  const spaceAbove =
    menuPosition && typeof window !== 'undefined' ? menuPosition.top - 8 : 320
  const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
  const menuMaxHeight = Math.max(
    140,
    Math.min(24 * 16, openUp ? spaceAbove - 4 : spaceBelow - 4),
  )

  const canMerge = editor.can().mergeCells()
  const canSplit = editor.can().splitCell()

  return (
    <>
      {menuPosition && menuVisible && !colorPickerOpen
        ? createPortal(
            <div
              data-table-cell-menu
              className={styles.root}
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
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
