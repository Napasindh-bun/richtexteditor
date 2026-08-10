'use client'

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { GripVertical } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { cn } from '@libs'

import {
  MIN_AUDIO_WIDTH_PX,
  normalizeAudioWidth,
  parseAudioAlign,
  toAudioWidthPx,
} from './richTextAudioExtension'
import styles from './styles/ResizableAudioNodeView.module.css'

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

function measureWidth(element: HTMLElement | null): number {
  return Math.max(element?.getBoundingClientRect().width ?? 0, MIN_AUDIO_WIDTH_PX)
}

function getAvailableWidth(wrapper: HTMLElement | null, editorDom: HTMLElement): number {
  let element: HTMLElement | null = wrapper?.parentElement ?? editorDom
  while (element) {
    if (element.clientWidth > 0) {
      const computed = window.getComputedStyle(element)
      const width =
        element.clientWidth -
        (Number.parseFloat(computed.paddingLeft) || 0) -
        (Number.parseFloat(computed.paddingRight) || 0)
      if (width >= MIN_AUDIO_WIDTH_PX) return Math.floor(width)
    }
    if (element === editorDom) break
    element = element.parentElement
  }
  return MIN_AUDIO_WIDTH_PX
}

export function ResizableAudioNodeView({
  node,
  updateAttributes,
  selected,
  editor,
}: Readonly<NodeViewProps>) {
  const { src, title, align, width } = node.attrs
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const playerRef = useRef<HTMLAudioElement>(null)
  const [previewWidthPx, setPreviewWidthPx] = useState<number | null>(null)
  const alignment = parseAudioAlign(align)

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const handleElement = event.currentTarget
      const pointerId = event.pointerId
      const startX = event.clientX
      const startWidthPx = measureWidth(playerRef.current)
      const maxWidthPx = getAvailableWidth(wrapperRef.current, editor.view.dom as HTMLElement)
      const isLeftHandle = handle === 'nw' || handle === 'sw'
      let nextWidthPx = startWidthPx
      let hasMoved = false

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX
        if (deltaX === 0 && !hasMoved) return
        hasMoved = true
        nextWidthPx = Math.min(
          Math.max(startWidthPx + (isLeftHandle ? -deltaX : deltaX), MIN_AUDIO_WIDTH_PX),
          Math.max(maxWidthPx, MIN_AUDIO_WIDTH_PX),
        )
        setPreviewWidthPx(nextWidthPx)
      }

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove)
        if (handleElement.isConnected && handleElement.hasPointerCapture(pointerId)) {
          handleElement.releasePointerCapture(pointerId)
        }
        setPreviewWidthPx(null)
        if (hasMoved) updateAttributes({ width: toAudioWidthPx(nextWidthPx, maxWidthPx) })
      }

      handleElement.setPointerCapture(pointerId)
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp, { once: true })
    },
    [editor.view.dom, updateAttributes],
  )

  const renderedWidth =
    previewWidthPx == null ? (normalizeAudioWidth(width) ?? undefined) : `${previewWidthPx}px`

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="span"
      className={cn(styles.wrapper, styles[`align${alignment}`])}
      style={{ width: renderedWidth }}
    >
      <button
        type="button"
        aria-label="ลากเพื่อย้ายตัวเล่นเสียง"
        className={styles.grip}
        data-drag-handle
        draggable
      >
        <GripVertical aria-hidden />
      </button>
      <div
        className={cn(styles.playerContainer, selected && styles.playerContainerSelected)}
      >
        <audio
          ref={playerRef}
          src={src}
          title={title ?? ''}
          className={styles.player}
          controls
          preload="metadata"
          draggable={false}
          data-align={alignment}
        />
        {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
          <button
            key={handle}
            type="button"
            aria-label={`ปรับขนาดตัวเล่นเสียงมุม ${handle}`}
            className={cn(styles.handle, styles[`handle${handle.toUpperCase()}`])}
            onPointerDown={(event) => handleResizeStart(handle, event)}
          />
        ))}
      </div>
    </NodeViewWrapper>
  )
}
