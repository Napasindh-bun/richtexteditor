'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'
import { Input } from '../input'
import { Label } from '../label'

import styles from './styles/ColorPickerDialog.module.css'

type Rgb = Readonly<{ r: number; g: number; b: number }>
type Hsv = Readonly<{ h: number; s: number; v: number }>

type ColorPickerDialogProps = Readonly<{
  isOpen: boolean
  initialColor?: string
  onClose: () => void
  onSave: (hex: string) => void
}>

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((ch) => `${ch}${ch}`)
      .join('')
      .toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`
  return null
}

function hexToRgb(hex: string): Rgb | null {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  const s = max === 0 ? 0 : delta / max
  return { h, s, v: max }
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let rn = 0
  let gn = 0
  let bn = 0
  if (h < 60) [rn, gn, bn] = [c, x, 0]
  else if (h < 120) [rn, gn, bn] = [x, c, 0]
  else if (h < 180) [rn, gn, bn] = [0, c, x]
  else if (h < 240) [rn, gn, bn] = [0, x, c]
  else if (h < 300) [rn, gn, bn] = [x, 0, c]
  else [rn, gn, bn] = [c, 0, x]

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  }
}

function hueColor(h: number): string {
  return rgbToHex(hsvToRgb({ h, s: 1, v: 1 }))
}

export function ColorPickerDialog({
  isOpen,
  initialColor = '#ffffff',
  onClose,
  onSave,
}: ColorPickerDialogProps) {
  const titleId = useId()
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const initialRgb = hexToRgb(initialColor) ?? { r: 255, g: 255, b: 255 }
  const initialHsv = rgbToHsv(initialRgb)

  const [hsv, setHsv] = useState<Hsv>(initialHsv)
  const [rgb, setRgb] = useState<Rgb>(initialRgb)
  const [hex, setHex] = useState(rgbToHex(initialRgb).slice(1))

  useEffect(() => {
    if (!isOpen) return
    const nextRgb = hexToRgb(initialColor) ?? { r: 255, g: 255, b: 255 }
    const nextHsv = rgbToHsv(nextRgb)
    setHsv(nextHsv)
    setRgb(nextRgb)
    setHex(rgbToHex(nextRgb).slice(1))
  }, [isOpen, initialColor])

  const syncFromHsv = (next: Hsv) => {
    const nextRgb = hsvToRgb(next)
    setHsv(next)
    setRgb(nextRgb)
    setHex(rgbToHex(nextRgb).slice(1))
  }

  const syncFromRgb = (next: Rgb) => {
    const clamped = {
      r: clamp(next.r, 0, 255),
      g: clamp(next.g, 0, 255),
      b: clamp(next.b, 0, 255),
    }
    setRgb(clamped)
    setHsv(rgbToHsv(clamped))
    setHex(rgbToHex(clamped).slice(1))
  }

  const updateSvFromPointer = (clientX: number, clientY: number) => {
    const el = svRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const s = clamp((clientX - rect.left) / rect.width, 0, 1)
    const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1)
    syncFromHsv({ ...hsv, s, v })
  }

  const updateHueFromPointer = (clientY: number) => {
    const el = hueRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const h = (1 - clamp((clientY - rect.top) / rect.height, 0, 1)) * 360
    syncFromHsv({ ...hsv, h })
  }

  const handleSvPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updateSvFromPointer(event.clientX, event.clientY)
  }

  const handleHuePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updateHueFromPointer(event.clientY)
  }

  const handleHexChange = (value: string) => {
    const cleaned = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setHex(cleaned)
    const parsed = hexToRgb(`#${cleaned}`)
    if (parsed) {
      setRgb(parsed)
      setHsv(rgbToHsv(parsed))
    }
  }

  const handleChannelKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSave(rgbToHex(rgb))
    }
  }

  const preview = rgbToHex(rgb)

  return (
    <Dialog
      isOpen={isOpen}
      title="Color Picker"
      titleId={titleId}
      onClose={onClose}
      size="md"
      className={styles.dialogLift}
      actions={
        <>
          <Button type="button" variant="outline" onClick={onClose} className={dialogStyles.cancelButton}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSave(preview)}
            className={dialogStyles.primaryButton}
          >
            Save
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.pickerRow}>
          <div
            ref={svRef}
            className={styles.svSquare}
            style={{ backgroundColor: hueColor(hsv.h) }}
            onPointerDown={handleSvPointerDown}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              updateSvFromPointer(event.clientX, event.clientY)
            }}
            role="slider"
            aria-label="Saturation and brightness"
            aria-valuetext={`${Math.round(hsv.s * 100)}% ${Math.round(hsv.v * 100)}%`}
            tabIndex={0}
          >
            <div className={styles.svWhite} />
            <div className={styles.svBlack} />
            <span
              className={styles.svThumb}
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>

          <div
            ref={hueRef}
            className={styles.hueSlider}
            onPointerDown={handleHuePointerDown}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              updateHueFromPointer(event.clientY)
            }}
            role="slider"
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            tabIndex={0}
          >
            <span className={styles.hueThumb} style={{ top: `${(1 - hsv.h / 360) * 100}%` }} />
          </div>

          <div className={styles.values}>
            <div className={styles.channel}>
              <Label htmlFor={`${titleId}-r`} className={styles.channelLabel}>
                R
              </Label>
              <Input
                id={`${titleId}-r`}
                className={styles.channelInput}
                value={String(rgb.r)}
                onChange={(event) =>
                  syncFromRgb({ ...rgb, r: Number(event.target.value.replace(/\D/g, '') || 0) })
                }
                onKeyDown={handleChannelKeyDown}
              />
            </div>
            <div className={styles.channel}>
              <Label htmlFor={`${titleId}-g`} className={styles.channelLabel}>
                G
              </Label>
              <Input
                id={`${titleId}-g`}
                className={styles.channelInput}
                value={String(rgb.g)}
                onChange={(event) =>
                  syncFromRgb({ ...rgb, g: Number(event.target.value.replace(/\D/g, '') || 0) })
                }
                onKeyDown={handleChannelKeyDown}
              />
            </div>
            <div className={styles.channel}>
              <Label htmlFor={`${titleId}-b`} className={styles.channelLabel}>
                B
              </Label>
              <Input
                id={`${titleId}-b`}
                className={styles.channelInput}
                value={String(rgb.b)}
                onChange={(event) =>
                  syncFromRgb({ ...rgb, b: Number(event.target.value.replace(/\D/g, '') || 0) })
                }
                onKeyDown={handleChannelKeyDown}
              />
            </div>
            <div className={styles.channel}>
              <Label htmlFor={`${titleId}-hex`} className={styles.channelLabel}>
                #
              </Label>
              <Input
                id={`${titleId}-hex`}
                className={styles.channelInput}
                value={hex}
                onChange={(event) => handleHexChange(event.target.value)}
                onKeyDown={handleChannelKeyDown}
              />
            </div>
            <div className={styles.preview} style={{ backgroundColor: preview }} aria-hidden />
          </div>
        </div>
      </div>
    </Dialog>
  )
}
