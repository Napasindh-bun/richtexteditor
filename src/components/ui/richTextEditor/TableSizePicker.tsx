'use client'

import { useState } from 'react'
import { Table } from 'lucide-react'

import { cn } from '@libs'

import { IconDropdownMenu } from '../IconDropdownMenu'

import styles from './styles/RichTextEditor.module.css'

const MAX_ROWS = 8
const MAX_COLS = 8

type TableSizePickerProps = Readonly<{
  disabled?: boolean
  onSelect: (rows: number, cols: number) => void
}>

export function TableSizePicker({ disabled, onSelect }: TableSizePickerProps) {
  const [hovered, setHovered] = useState({ rows: 0, cols: 0 })

  return (
    <IconDropdownMenu
      trigger={<Table />}
      triggerLabel="ตาราง"
      wrapperClassName={styles.tablePickerWrap}
      triggerClassName={cn(styles.toolbarButton, disabled && styles.toolbarButtonDisabled)}
      contentClassName={styles.tablePicker}
    >
      {({ close }) => (
        <div onMouseLeave={() => setHovered({ rows: 0, cols: 0 })}>
          <div className={styles.tableGrid}>
            {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, index) => {
              const row = Math.floor(index / MAX_COLS) + 1
              const col = (index % MAX_COLS) + 1
              const active = row <= hovered.rows && col <= hovered.cols

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={cn(styles.tableCell, active && styles.tableCellActive)}
                  aria-label={`${row} แถว ${col} คอลัมน์`}
                  onMouseEnter={() => setHovered({ rows: row, cols: col })}
                  onClick={() => {
                    onSelect(row, col)
                    close()
                    setHovered({ rows: 0, cols: 0 })
                  }}
                />
              )
            })}
          </div>
          <p className={styles.tablePickerLabel}>
            {hovered.rows > 0 && hovered.cols > 0
              ? `${hovered.rows} × ${hovered.cols}`
              : 'เลือกขนาดตาราง'}
          </p>
        </div>
      )}
    </IconDropdownMenu>
  )
}
