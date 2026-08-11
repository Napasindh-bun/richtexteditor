'use client'

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useCallback } from 'react'

import { cn } from '@libs'

import {
  clampVideoWidthPercent,
  parseVideoAlign,
  MIN_VIDEO_WIDTH_PERCENT,
} from './richTextVideoExtension'
import styles from './styles/ResizableVideoNodeView.module.css'

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

const MIN_WIDTH_PX = 120

export function ResizableVideoNodeView({
  node,
  updateAttributes,
  selected,
  editor,
}: Readonly<NodeViewProps>) {
  const { src, title, align, width, provider } = node.attrs
  const widthPercent = clampVideoWidthPercent(width)
  const alignment = parseVideoAlign(align)
  const isEmbed = provider === 'youtube'

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
        updateAttributes({ width: clampVideoWidthPercent((nextWidthPx / editorWidth) * 100) })
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
        className={cn(styles.videoContainer, selected && styles.videoContainerSelected)}
        style={{ width: `${Math.max(MIN_VIDEO_WIDTH_PERCENT, widthPercent)}%` }}
      >
        {isEmbed ? (
          <iframe
            src={src}
            title={title ?? 'Embedded video'}
            className={styles.embed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={src} title={title ?? ''} className={styles.video} controls />
        )}
        {/*
          A cross-origin iframe swallows every pointer event, so the node could
          never be selected. Cover it — playback still works in the preview.
        */}
        {isEmbed ? <span className={styles.shield} aria-hidden /> : null}
        {selected ? (
          <>
            <button
              type="button"
              aria-label="ปรับขนาดวิดีโอมุมซ้ายบน"
              className={cn(styles.handle, styles.handleNw)}
              onPointerDown={(pointerEvent) => handleResizeStart('nw', pointerEvent)}
            />
            <button
              type="button"
              aria-label="ปรับขนาดวิดีโอมุมขวาบน"
              className={cn(styles.handle, styles.handleNe)}
              onPointerDown={(pointerEvent) => handleResizeStart('ne', pointerEvent)}
            />
            <button
              type="button"
              aria-label="ปรับขนาดวิดีโอมุมซ้ายล่าง"
              className={cn(styles.handle, styles.handleSw)}
              onPointerDown={(pointerEvent) => handleResizeStart('sw', pointerEvent)}
            />
            <button
              type="button"
              aria-label="ปรับขนาดวิดีโอมุมขวาล่าง"
              className={cn(styles.handle, styles.handleSe)}
              onPointerDown={(pointerEvent) => handleResizeStart('se', pointerEvent)}
            />
          </>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}
