import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { ResizableAudioNodeView } from './ResizableAudioNodeView'

export const MIN_AUDIO_WIDTH_PX = 180

/** Preserve legacy percentages, while normalising bare numeric widths to px. */
export function normalizeAudioWidth(raw: unknown): string | null {
  const value =
    typeof raw === 'number' && Number.isFinite(raw)
      ? `${raw}px`
      : typeof raw === 'string'
        ? raw.trim()
        : ''
  if (!value || value === 'auto') return null

  const bare = /^(\d+(?:\.\d+)?)(px)?$/i.exec(value)
  if (bare) {
    const pixels = Math.round(Number(bare[1]))
    return pixels > 0 ? `${pixels}px` : null
  }

  const percent = /^(\d+(?:\.\d+)?)%$/.exec(value)
  if (percent) return Number(percent[1]) > 0 ? value : null
  return value
}

export function toAudioWidthPx(pixels: number, maxPixels: number): string {
  const upperBound = Math.max(maxPixels, MIN_AUDIO_WIDTH_PX)
  const clamped = Math.min(Math.max(pixels, MIN_AUDIO_WIDTH_PX), upperBound)
  return `${Math.round(clamped)}px`
}

/** An audio player that remains playable in serialized HTML and previews. */
export const RichTextAudio = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  // Native seek bars use pointer dragging. Making the node draggable causes
  // ProseMirror to steal that gesture before the browser can update the time.
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
      },
      width: {
        default: null as string | null,
        parseHTML: (element) =>
          normalizeAudioWidth(element.style.width || element.getAttribute('width')),
        renderHTML: (attributes: { width?: string | null }) => {
          const width = normalizeAudioWidth(attributes.width)
          if (!width) return {}
          return {
            width: width.endsWith('px') ? width.slice(0, -2) : width,
            style: `width: ${width}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'audio[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio', mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableAudioNodeView, {
      trackNodeViewPosition: true,
      // Native controls live in a browser shadow tree and event.target differs
      // between engines. Ignore every event from this atom at ProseMirror level;
      // controls and React resize handles continue receiving normal DOM events.
      stopEvent: () => true,
    })
  },
})
