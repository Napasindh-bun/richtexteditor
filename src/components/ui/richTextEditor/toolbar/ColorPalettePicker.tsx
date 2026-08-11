'use client'

import { useState, type ReactNode } from 'react'
import { Ban, Pipette } from 'lucide-react'

import { cn } from '@libs'

import { IconDropdownMenu } from '../IconDropdownMenu'

import { ColorPickerDialog } from './ColorPickerDialog'
import styles from './styles/RichTextEditor.module.css'

/** สีตัวอักษรพื้นฐาน — 2 แถว (8×2) */
export const TEXT_COLORS = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#ffffff',
  '#980000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
] as const

/** สีไฮไลต์พื้นฐาน — 2 แถว (8×2) */
export const HIGHLIGHT_COLORS = [
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#ff00ff',
  '#0000ff',
  '#ff0000',
  '#000080',
  '#008080',
  '#fef08a',
  '#fdba74',
  '#fca5a5',
  '#f9a8d4',
  '#d8b4fe',
  '#93c5fd',
  '#86efac',
  '#d1d5db',
] as const

type ColorPalettePickerProps = Readonly<{
  label: string
  trigger: ReactNode
  /** Basic / preset colors shown under "สีพื้นฐาน". */
  colors: readonly string[]
  activeColor?: string | null
  disabled?: boolean
  /** Swatch border for light colors (e.g. white text color). */
  outlineLightSwatches?: boolean
  onSelect: (color: string) => void
  onClear: () => void
}>

function normalizeColor(color: string | null | undefined): string {
  const raw = (color ?? '').trim().toLowerCase()
  if (!raw) return ''
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
  }
  return raw
}

function ColorSwatchButton({
  color,
  active,
  outlineLight,
  onClick,
}: Readonly<{
  color: string
  active: boolean
  outlineLight: boolean
  onClick: () => void
}>) {
  const normalized = normalizeColor(color)
  const isLight =
    outlineLight && (normalized === '#ffffff' || normalized === '#fff')

  return (
    <button
      type="button"
      className={cn(
        styles.colorSwatch,
        isLight && styles.colorSwatchLight,
        active && styles.colorSwatchActive,
      )}
      style={{ backgroundColor: color }}
      aria-label={color}
      aria-pressed={active}
      onClick={onClick}
    />
  )
}

export function ColorPalettePicker({
  label,
  trigger,
  colors,
  activeColor,
  disabled,
  outlineLightSwatches = false,
  onSelect,
  onClear,
}: ColorPalettePickerProps) {
  const active = normalizeColor(activeColor)
  const [pickerOpen, setPickerOpen] = useState(false)

  const selectColor = (color: string) => {
    onSelect(normalizeColor(color) || color)
  }

  return (
    <>
      <IconDropdownMenu
        trigger={trigger}
        triggerLabel={label}
        wrapperClassName={styles.colorPickerWrap}
        triggerClassName={cn(
          styles.toolbarButton,
          active && styles.toolbarButtonActive,
          disabled && styles.toolbarButtonDisabled,
        )}
        contentClassName={styles.colorPicker}
      >
        {({ close }) => (
          <div className={styles.colorPickerBody}>
            <p className={styles.colorPickerTitle}>{label}</p>

            <div className={styles.colorSection}>
              <p className={styles.colorSectionLabel}>Basic colors</p>
              <div className={styles.colorGrid}>
                {colors.map((color) => (
                  <ColorSwatchButton
                    key={color}
                    color={color}
                    active={active === normalizeColor(color)}
                    outlineLight={outlineLightSwatches}
                    onClick={() => {
                      selectColor(color)
                      close()
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              className={styles.colorCustomRow}
              onClick={() => {
                close()
                setPickerOpen(true)
              }}
            >
              <Pipette />
              Custom color…
            </button>

            <button
              type="button"
              className={styles.colorClearRow}
              onClick={() => {
                onClear()
                close()
              }}
            >
              <Ban />
              Remove color
            </button>
          </div>
        )}
      </IconDropdownMenu>

      <ColorPickerDialog
        isOpen={pickerOpen}
        initialColor={active || colors[0] || '#000000'}
        onClose={() => setPickerOpen(false)}
        onSave={(hex) => {
          selectColor(hex)
          setPickerOpen(false)
        }}
      />
    </>
  )
}
