'use client'

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useCallback, useRef } from 'react'

import { cn } from '@libs'

import styles from './styles/ResizableImageNodeView.module.css'

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

const MIN_WIDTH_PERCENT = 20
const MAX_WIDTH_PERCENT = 100
const MIN_WIDTH_PX = 48

function clampWidthPercent(value: number) {
  return Math.min(MAX_WIDTH_PERCENT, Math.max(MIN_WIDTH_PERCENT, Math.round(value)))
}

function parseWidthPercent(width: unknown): number {
  if (typeof width === 'number' && Number.isFinite(width)) {
    return clampWidthPercent(width)
  }
  if (typeof width === 'string') {
    const parsed = Number.parseInt(width, 10)
    if (Number.isFinite(parsed)) {
      return clampWidthPercent(parsed)
    }
  }
  return MAX_WIDTH_PERCENT
}

function parseAlign(align: unknown): 'left' | 'center' | 'right' {
  return align === 'center' || align === 'right' ? align : 'left'
}

export function ResizableImageNodeView({
  node,
  updateAttributes,
  selected,
  editor,
}: Readonly<NodeViewProps>) {
  const { src, alt, title, align, width } = node.attrs
  const containerRef = useRef<HTMLDivElement>(null)
  const widthPercent = parseWidthPercent(width)
  const alignment = parseAlign(align)

  const getEditorWidth = useCallback(() => {
    const editorWidth = editor.view.dom.clientWidth
    return editorWidth > 0 ? editorWidth : 1
  }, [editor.view.dom])

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const handleEl = event.currentTarget
      const pointerId = event.pointerId
      const startX = event.clientX
      const editorWidth = getEditorWidth()
      const startWidthPx = (widthPercent / 100) * editorWidth
      const isLeftHandle = handle === 'nw' || handle === 'sw'

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX
        const nextWidthPx = Math.max(MIN_WIDTH_PX, startWidthPx + (isLeftHandle ? -deltaX : deltaX))
        updateAttributes({ width: clampWidthPercent((nextWidthPx / editorWidth) * 100) })
      }

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove)
        if (handleEl.isConnected && handleEl.hasPointerCapture(pointerId)) {
          handleEl.releasePointerCapture(pointerId)
        }
      }

      handleEl.setPointerCapture(pointerId)
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp, { once: true })
    },
    [getEditorWidth, updateAttributes, widthPercent],
  )

  return (
    <NodeViewWrapper
      as="div"
      className={cn(styles.wrapper, styles[`align${alignment}`])}
      data-drag-handle
    >
      <div
        ref={containerRef}
        className={cn(styles.imageContainer, selected && styles.imageContainerSelected)}
        style={{ width: `${widthPercent}%` }}
      >
        <img
          src={src}
          alt={alt ?? ''}
          title={title ?? ''}
          className={styles.image}
          draggable={false}
          data-align={alignment}
        />
        {selected ? (
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
      </div>
    </NodeViewWrapper>
  )
}
