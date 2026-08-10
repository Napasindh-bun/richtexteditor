'use client'

import { NodeSelection } from '@tiptap/pm/state'
import { NodeViewWrapper, useEditorState, type NodeViewProps } from '@tiptap/react'
import { useCallback, useRef, useState } from 'react'

import { cn } from '@libs'

import {
  MIN_IMAGE_WIDTH_PX,
  normalizeImageHeight,
  normalizeImageWidth,
  toImageWidthPx,
} from './richTextImageExtension'
import styles from './styles/ResizableImageNodeView.module.css'

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

function parseAlign(align: unknown): 'left' | 'center' | 'right' {
  return align === 'center' || align === 'right' ? align : 'left'
}

/**
 * The rendered width is the only reliable starting point for a drag: the stored
 * attribute may be px, a legacy percentage, an authored unit, or absent, and
 * `max-width: 100%` may already have clamped it below its nominal value.
 */
function measureRenderedWidthPx(element: HTMLElement | null): number | null {
  const width = element?.getBoundingClientRect().width ?? 0
  return width > 0 ? width : null
}

/**
 * Usable content width of the wrapper's containing block. Walks up because
 * inline ancestors (`<strong>`, `<a>`) report `clientWidth: 0`, and because an
 * image inside a table cell must cap to the cell rather than to the editor.
 */
function getAvailableWidthPx(wrapperEl: HTMLElement | null, editorDom: HTMLElement): number {
  const parent = wrapperEl?.parentElement ?? null
  let element: HTMLElement | null = parent && editorDom.contains(parent) ? parent : editorDom

  while (element) {
    if (element.clientWidth > 0) {
      const computed = window.getComputedStyle(element)
      // `clientWidth` is the padding box; subtracting both paddings yields the
      // content box, which is what a table cell needs.
      const inner =
        element.clientWidth -
        (Number.parseFloat(computed.paddingLeft) || 0) -
        (Number.parseFloat(computed.paddingRight) || 0)
      if (inner >= MIN_IMAGE_WIDTH_PX) {
        return Math.floor(inner)
      }
    }
    if (element === editorDom) break
    element = element.parentElement
  }

  return MIN_IMAGE_WIDTH_PX
}

export function ResizableImageNodeView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: Readonly<NodeViewProps>) {
  const { src, alt, title, align, width, height, rotation, flipX, flipY } = node.attrs
  const containerRef = useRef<HTMLSpanElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [previewWidthPx, setPreviewWidthPx] = useState<number | null>(null)
  const alignment = parseAlign(align)

  // `selected` is also true for a text selection that merely spans this image,
  // and it does not change when the selection type does — so React would render
  // from a stale `editor.state` if we read it directly. Subscribe instead.
  const isNodeSelected = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const pos = getPos()
      if (typeof pos !== 'number') return false
      const { selection } = currentEditor.state
      return selection instanceof NodeSelection && selection.from === pos
    },
  })

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const handleEl = event.currentTarget
      const pointerId = event.pointerId
      const startX = event.clientX
      const startWidthPx = measureRenderedWidthPx(imageRef.current) ?? MIN_IMAGE_WIDTH_PX
      // The containing block cannot change mid-drag, so measure it once.
      const maxWidthPx = getAvailableWidthPx(
        containerRef.current?.parentElement ?? null,
        editor.view.dom as HTMLElement,
      )
      const isLeftHandle = handle === 'nw' || handle === 'sw'
      let nextWidthPx = startWidthPx
      let hasMoved = false

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX
        if (deltaX === 0 && !hasMoved) return
        hasMoved = true
        nextWidthPx = Math.min(
          Math.max(startWidthPx + (isLeftHandle ? -deltaX : deltaX), MIN_IMAGE_WIDTH_PX),
          Math.max(maxWidthPx, MIN_IMAGE_WIDTH_PX),
        )
        setPreviewWidthPx(nextWidthPx)
      }

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove)
        if (handleEl.isConnected && handleEl.hasPointerCapture(pointerId)) {
          handleEl.releasePointerCapture(pointerId)
        }
        setPreviewWidthPx(null)
        // One transaction per drag: `onUpdate` serialises the whole document to
        // HTML, so committing per pointermove floods the host's onChange and
        // fragments undo history.
        if (hasMoved) {
          updateAttributes({ width: toImageWidthPx(nextWidthPx, maxWidthPx) })
        }
      }

      handleEl.setPointerCapture(pointerId)
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp, { once: true })
    },
    [editor.view.dom, updateAttributes],
  )

  // The wrapper owns the width so a legacy percentage still resolves against the
  // containing block rather than against the image's own intrinsic size.
  const renderedWidth =
    previewWidthPx != null
      ? `${Math.round(previewWidthPx)}px`
      : (normalizeImageWidth(width) ?? undefined)
  const renderedHeight = normalizeImageHeight(height) ?? undefined
  const normalizedRotation = ((Number(rotation) || 0) % 360 + 360) % 360
  const imageTransform = `rotate(${normalizedRotation}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`

  return (
    <NodeViewWrapper
      as="span"
      className={cn(styles.wrapper, styles[`align${alignment}`])}
      style={{ width: renderedWidth, height: renderedHeight }}
      data-drag-handle
    >
      <span
        ref={containerRef}
        className={cn(styles.imageContainer, selected && styles.imageContainerSelected)}
        style={{ height: renderedHeight ? '100%' : undefined }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt ?? ''}
          title={title ?? ''}
          className={styles.image}
          style={{
            width: renderedWidth ? '100%' : undefined,
            height: renderedHeight ? '100%' : undefined,
            transform: imageTransform,
          }}
          draggable={false}
          data-align={alignment}
        />
        {isNodeSelected ? (
          <>
            <button
              type="button"
              aria-label="ปรับขนาดรูปมุมซ้ายบน"
              className={cn(styles.handle, styles.handleNw)}
              onPointerDown={(pointerEvent) => handleResizeStart('nw', pointerEvent)}
            />
            <button
              type="button"
              aria-label="ปรับขนาดรูปมุมขวาบน"
              className={cn(styles.handle, styles.handleNe)}
              onPointerDown={(pointerEvent) => handleResizeStart('ne', pointerEvent)}
            />
            <button
              type="button"
              aria-label="ปรับขนาดรูปมุมซ้ายล่าง"
              className={cn(styles.handle, styles.handleSw)}
              onPointerDown={(pointerEvent) => handleResizeStart('sw', pointerEvent)}
            />
            <button
              type="button"
              aria-label="ปรับขนาดรูปมุมขวาล่าง"
              className={cn(styles.handle, styles.handleSe)}
              onPointerDown={(pointerEvent) => handleResizeStart('se', pointerEvent)}
            />
          </>
        ) : null}
      </span>
    </NodeViewWrapper>
  )
}
