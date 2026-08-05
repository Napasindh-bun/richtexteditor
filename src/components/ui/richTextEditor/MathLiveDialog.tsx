'use client'

import { useEffect, useRef } from 'react'
import type { MathfieldElement } from 'mathlive'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'

import {
  MATH_KEYBOARD_LAYOUTS,
  normalizeScienceLatex,
  SCIENCE_KEYBOARD_LAYOUTS,
} from './scienceKeyboardLayout'
import styles from './styles/RichTextEditor.module.css'

export type MathLiveDialogVariant = 'math' | 'science'

type MathLiveDialogProps = Readonly<{
  isOpen: boolean
  onClose: () => void
  onInsert: (latex: string) => void
  variant?: MathLiveDialogVariant
  /** When set, the dialog opens for editing an existing formula. */
  initialLatex?: string
}>

const KEYBOARD_Z_INDEX = '9999'

/**
 * MathLive initializes `--_keyboard-height` to `0` and relies on a ResizeObserver
 * on the plate to update it. If that observer never fires, the backdrop stays
 * height 0 and is clipped by `overflow: hidden`.
 */
function applyKeyboardGeometry() {
  const element = document.body.querySelector<HTMLElement>(':scope > .ML__keyboard')
  if (!element) return false

  const plate = element.querySelector<HTMLElement>('.MLK__plate')
  const plateHeight = plate?.getBoundingClientRect().height ?? 0
  const height = plateHeight > 0 ? plateHeight : 280

  element.style.setProperty(
    '--_keyboard-height',
    `calc(${height}px + var(--_padding-top, 5px) + var(--_padding-bottom, 0px))`,
  )
  element.style.zIndex = KEYBOARD_Z_INDEX
  element.classList.add('is-visible')

  const backdrop = element.querySelector<HTMLElement>('.MLK__backdrop')
  if (backdrop) {
    backdrop.style.visibility = 'visible'
    backdrop.style.opacity = '1'
  }
  return true
}

function clearKeyboardGeometry() {
  const element = document.body.querySelector<HTMLElement>(':scope > .ML__keyboard')
  if (!element) return

  element.classList.remove('is-visible')
  element.style.removeProperty('--_keyboard-height')

  const backdrop = element.querySelector<HTMLElement>('.MLK__backdrop')
  if (backdrop) {
    backdrop.style.visibility = ''
    backdrop.style.opacity = ''
  }
}

function applyKeyboardLayouts(variant: MathLiveDialogVariant) {
  const keyboard = window.mathVirtualKeyboard
  if (!keyboard) return
  keyboard.layouts =
    variant === 'science' ? [...SCIENCE_KEYBOARD_LAYOUTS] : [...MATH_KEYBOARD_LAYOUTS]
}

/**
 * Formula authoring surface. Dialog stays compact; the MathLive virtual keyboard
 * docks full-width to `document.body`.
 *
 * Outside dismiss is fully disabled: the keyboard lives outside Dialog.Content, so
 * a normal outside-click would close this dialog and our cleanup would call
 * `keyboard.hide()` — which is why tapping keys was dismissing the keyboard.
 */
export function MathLiveDialog({
  isOpen,
  onClose,
  onInsert,
  variant = 'math',
  initialLatex = '',
}: MathLiveDialogProps) {
  const fieldHostRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<MathfieldElement | null>(null)
  /** User intent — blocks focusin / rAF geometry from forcing the keyboard back open. */
  const keyboardWantedRef = useRef(true)
  const geometryTimersRef = useRef<number[]>([])
  const toggleKeyboardRef = useRef<(() => void) | null>(null)
  const variantRef = useRef(variant)
  const initialLatexRef = useRef(initialLatex)
  variantRef.current = variant
  initialLatexRef.current = initialLatex

  const isScience = variant === 'science'
  const isEditing = Boolean(initialLatex.trim())
  const dialogTitle = isEditing
    ? isScience
      ? 'แก้ไขสูตรวิทยาศาสตร์'
      : 'แก้ไขสูตรคณิตศาสตร์'
    : isScience
      ? 'เพิ่มสูตรวิทยาศาสตร์'
      : 'เพิ่มสูตรคณิตศาสตร์'
  const submitLabel = isEditing ? 'บันทึกสูตร' : 'เพิ่มสูตร'
  const toggleLabel = isScience
    ? 'ซ่อน / แสดงแป้นพิมพ์วิทยาศาสตร์'
    : 'ซ่อน / แสดงแป้นพิมพ์คณิตศาสตร์'

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    let field: MathfieldElement | null = null
    let onFocusIn: (() => void) | null = null
    let retryId = 0
    keyboardWantedRef.current = true

    const clearGeometryTimers = () => {
      for (const id of geometryTimersRef.current) {
        window.clearTimeout(id)
        window.cancelAnimationFrame(id)
      }
      geometryTimersRef.current = []
    }

    const revealMathKeyboard = () => {
      if (cancelled || !keyboardWantedRef.current) return

      const keyboard = window.mathVirtualKeyboard
      if (!keyboard) return

      keyboard.container = document.body
      document.documentElement.style.setProperty('--keyboard-zindex', KEYBOARD_Z_INDEX)
      applyKeyboardLayouts(variantRef.current)

      keyboard.show({ animate: false })
      applyKeyboardGeometry()

      clearGeometryTimers()
      const rafId = window.requestAnimationFrame(() => {
        if (cancelled || !keyboardWantedRef.current) return
        applyKeyboardGeometry()
        const timeoutId = window.setTimeout(() => {
          if (!cancelled && keyboardWantedRef.current) applyKeyboardGeometry()
        }, 50)
        geometryTimersRef.current.push(timeoutId)
      })
      geometryTimersRef.current.push(rafId)
    }

    const hideMathKeyboard = () => {
      keyboardWantedRef.current = false
      clearGeometryTimers()
      clearKeyboardGeometry()
      window.mathVirtualKeyboard?.hide({ animate: false })
    }

    const mount = () => {
      const fieldHost = fieldHostRef.current
      if (!fieldHost) {
        retryId = window.requestAnimationFrame(mount)
        return
      }

      void Promise.all([import('mathlive'), import('mathlive/fonts.css')])
        .then(([{ MathfieldElement, initVirtualKeyboardInCurrentBrowsingContext }]) => {
          if (cancelled || !fieldHostRef.current) return

          initVirtualKeyboardInCurrentBrowsingContext()

          field = new MathfieldElement()
          field.value = initialLatexRef.current
          field.mathVirtualKeyboardPolicy = 'manual'
          // MathLive ignores Space by default (LaTeX math mode). Insert a medium
          // space so physical / virtual spacebar produces visible spacing.
          field.mathModeSpace = '\\:'
          // Science formulas use upright letters (like \ce{}); math keeps TeX italic.
          if (variantRef.current === 'science') {
            field.letterShapeStyle = 'upright'
          }
          field.className = styles.mathField
          fieldHostRef.current.replaceChildren(field)
          fieldRef.current = field

          onFocusIn = () => {
            if (!cancelled && keyboardWantedRef.current) revealMathKeyboard()
          }
          field.addEventListener('focusin', onFocusIn)

          // MathLive's internal controller is only ready after the element mounts.
          // Calling focus() too early throws: Cannot read properties of undefined (reading 'options').
          const focusWhenReady = () => {
            if (cancelled || !field) return
            try {
              field.focus()
            } catch {
              const retryId = window.setTimeout(() => {
                if (cancelled || !field) return
                try {
                  field.focus()
                } catch {
                  // Field may still be tearing down; keyboard can still be shown.
                }
                revealMathKeyboard()
              }, 50)
              geometryTimersRef.current.push(retryId)
              return
            }
            revealMathKeyboard()
          }

          const scheduleFocus = () => {
            const rafId = window.requestAnimationFrame(() => {
              window.requestAnimationFrame(focusWhenReady)
            })
            geometryTimersRef.current.push(rafId)
          }

          field.addEventListener('mount', scheduleFocus, { once: true })
          // If mount already fired before we subscribed, fall back to a deferred focus.
          scheduleFocus()
        })
        .catch((error: unknown) => {
          console.error('[MathLiveDialog] failed to load MathLive', error)
        })
    }

    mount()

    // Keep focus on the mathfield after key taps so nested dialogs / focus traps
    // cannot treat the interaction as "left the dialog" and tear the keyboard down.
    // Do not re-show the keyboard when the user explicitly hid it.
    const keepFieldFocused = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.ML__keyboard')) return
      window.requestAnimationFrame(() => {
        if (cancelled) return
        try {
          fieldRef.current?.focus()
        } catch {
          // Ignore focus races while MathLive is mounting/unmounting.
        }
        if (keyboardWantedRef.current && !window.mathVirtualKeyboard?.visible) {
          revealMathKeyboard()
        }
      })
    }
    document.addEventListener('pointerup', keepFieldFocused, true)

    toggleKeyboardRef.current = () => {
      if (keyboardWantedRef.current) {
        hideMathKeyboard()
        return
      }
      keyboardWantedRef.current = true
      try {
        fieldRef.current?.focus()
      } catch {
        // Ignore focus races while MathLive is mounting/unmounting.
      }
      revealMathKeyboard()
    }

    return () => {
      cancelled = true
      window.cancelAnimationFrame(retryId)
      clearGeometryTimers()
      document.removeEventListener('pointerup', keepFieldFocused, true)
      if (field && onFocusIn) {
        field.removeEventListener('focusin', onFocusIn)
      }
      fieldRef.current = null
      toggleKeyboardRef.current = null
      fieldHostRef.current?.replaceChildren()
      clearKeyboardGeometry()
      // Restore default math layouts so the next math dialog is not stuck on science.
      if (window.mathVirtualKeyboard) {
        window.mathVirtualKeyboard.layouts = [...MATH_KEYBOARD_LAYOUTS]
      }
      window.mathVirtualKeyboard?.hide({ animate: false })
      document.documentElement.style.removeProperty('--keyboard-zindex')
    }
  }, [isOpen, variant, initialLatex])

  const handleToggleKeyboard = () => {
    toggleKeyboardRef.current?.()
  }

  const handleInsert = () => {
    const raw = fieldRef.current?.getValue('latex') ?? ''
    const latex = isScience ? normalizeScienceLatex(raw) : raw.trim()
    onInsert(latex)
  }

  // Never dismiss via outside click/focus — keyboard is portaled to body.
  // Close only via ยกเลิก / เพิ่มสูตร (or Escape still works via Radix).
  const preventOutsideDismiss = (event: { preventDefault: () => void }) => {
    event.preventDefault()
  }

  return (
    <Dialog
      isOpen={isOpen}
      title={dialogTitle}
      onClose={onClose}
      size="lg"
      disableAutoFocus
      onPointerDownOutside={preventOutsideDismiss}
      onInteractOutside={preventOutsideDismiss}
      onFocusOutside={preventOutsideDismiss}
    >
      <div className={styles.mathBody}>
        <div ref={fieldHostRef} className={styles.mathHost} />
        <button type="button" className={styles.mathKeyboardToggle} onClick={handleToggleKeyboard}>
          {toggleLabel}
        </button>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={onClose} className={dialogStyles.cancelButton}>
          ยกเลิก
        </Button>
        <Button type="button" onClick={handleInsert} className={dialogStyles.primaryButton}>
          {submitLabel}
        </Button>
      </div>
    </Dialog>
  )
}
