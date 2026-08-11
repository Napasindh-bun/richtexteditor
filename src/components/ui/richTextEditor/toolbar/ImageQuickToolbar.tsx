'use client'

import { useEffect, useRef } from 'react'
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from 'lucide-react'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'

import { cn } from '@libs'

import styles from '../styles/RichTextEditor.module.css'

import { ToolbarButton } from './ToolbarButton'

function getSelectedImagePixels(editor: Editor, dimension: 'width' | 'height'): number | undefined {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') return

  const stored = String(selection.node.attrs[dimension] ?? '')
  const pixelValue = /^(\d+(?:\.\d+)?)(?:px)?$/i.exec(stored)
  if (pixelValue) return Math.round(Number(pixelValue[1]))

  const nodeDom = editor.view.nodeDOM(selection.from)
  const image =
    nodeDom instanceof HTMLImageElement
      ? nodeDom
      : nodeDom instanceof HTMLElement
        ? nodeDom.querySelector('img')
        : null
  const measured = dimension === 'width' ? image?.clientWidth : image?.clientHeight
  return measured && measured > 0 ? Math.round(measured) : undefined
}

/**
 * Update the selected image while keeping NodeSelection. TipTap's
 * `chain().focus().updateAttributes()` can drop the node selection after a
 * React node-view re-render (flip/rotate), which dismisses the floating toolbar.
 */
export function updateSelectedImageAttributes(
  editor: Editor,
  attributes: Record<string, unknown>,
): boolean {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') {
    return false
  }

  const pos = selection.from
  const applied = editor
    .chain()
    .command(({ tr, dispatch }) => {
      const node = tr.doc.nodeAt(pos)
      if (!node || node.type.name !== 'image') return false
      if (dispatch) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attributes })
        tr.setSelection(NodeSelection.create(tr.doc, pos))
        // Keep the floating toolbar visible across the node-view re-render.
        tr.setMeta('richTextBubbleMenu', 'show')
      }
      return true
    })
    .run()

  if (applied && !editor.view.hasFocus()) {
    editor.view.focus()
  }

  return applied
}

export function ImageQuickToolbar({ editor }: Readonly<{ editor: Editor }>) {
  const attrs = editor.getAttributes('image')
  const width = getSelectedImagePixels(editor, 'width')
  const height = getSelectedImagePixels(editor, 'height')
  const rotation = Number(attrs.rotation) || 0
  const widthInputRef = useRef<HTMLInputElement>(null)
  const heightInputRef = useRef<HTMLInputElement>(null)

  // Sync W/H with resize-handle changes without remounting the inputs.
  useEffect(() => {
    const widthInput = widthInputRef.current
    if (widthInput && document.activeElement !== widthInput) {
      widthInput.value = width != null ? String(width) : ''
    }
  }, [width])

  useEffect(() => {
    const heightInput = heightInputRef.current
    if (heightInput && document.activeElement !== heightInput) {
      heightInput.value = height != null ? String(height) : ''
    }
  }, [height])

  const updateDimension = (dimension: 'width' | 'height', rawValue: string) => {
    const parsed = Number(rawValue)
    const value = rawValue.trim() && Number.isFinite(parsed) && parsed > 0
      ? `${Math.round(parsed)}px`
      : null
    updateSelectedImageAttributes(editor, { [dimension]: value })
  }

  const keepImageToolbarOpen = () => {
    editor.view.dispatch(editor.state.tr.setMeta('richTextBubbleMenu', 'show'))
  }

  return (
    <div className={cn(styles.quickToolbar, styles.imageQuickToolbar)} role="toolbar" aria-label="Image formatting">
      <ToolbarButton
        label="Rotate left"
        onClick={() => updateSelectedImageAttributes(editor, { rotation: rotation - 90 })}
      >
        <RotateCcw />
      </ToolbarButton>
      <ToolbarButton
        label="Rotate right"
        onClick={() => updateSelectedImageAttributes(editor, { rotation: rotation + 90 })}
      >
        <RotateCw />
      </ToolbarButton>
      <ToolbarButton
        label="Flip horizontal"
        active={Boolean(attrs.flipX)}
        onClick={() => updateSelectedImageAttributes(editor, { flipX: !attrs.flipX })}
      >
        <FlipHorizontal2 />
      </ToolbarButton>
      <ToolbarButton
        label="Flip vertical"
        active={Boolean(attrs.flipY)}
        onClick={() => updateSelectedImageAttributes(editor, { flipY: !attrs.flipY })}
      >
        <FlipVertical2 />
      </ToolbarButton>
      <label className={styles.imageSizeField}>
        W
        <input
          ref={widthInputRef}
          type="number"
          min="1"
          defaultValue={width}
          placeholder="Auto"
          aria-label="Image width in pixels"
          onFocus={keepImageToolbarOpen}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          onBlur={(event) => updateDimension('width', event.currentTarget.value)}
        />
      </label>
      <label className={styles.imageSizeField}>
        H
        <input
          ref={heightInputRef}
          type="number"
          min="1"
          defaultValue={height}
          placeholder="Auto"
          aria-label="Image height in pixels"
          onFocus={keepImageToolbarOpen}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          onBlur={(event) => updateDimension('height', event.currentTarget.value)}
        />
      </label>
    </div>
  )
}
